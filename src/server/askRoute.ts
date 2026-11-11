/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ask AI endpoint: a guardrailed two-step Gemini flow, enforced in code.
 *   Step 1 — answer ONLY from the app's own sources (no tools, structured JSON output).
 *   Step 2 — only if step 1 says the sources can't answer: one call with Google Search grounding.
 */

import type { Express, Request, Response } from 'express';
import {
  FALLBACK_MODEL,
  HISTORY_MESSAGES,
  PRIMARY_MODEL,
  RETRY_DELAY_MS,
  SYSTEM_INSTRUCTION,
  WEB_FALLBACK_INSTRUCTION,
} from '../../config/ai.ts';
import { buildAiContext } from './aiContext.ts';
import { verifyReplyNumbers } from '../lib/aiVerify.ts';

export const NO_SOURCE_NOTE =
  "I couldn't find a reliable source for this — please check with DLCP at (202) 221-8550.";

export const USER_MESSAGES = {
  busy: "I'm getting a lot of questions right now — try again in a minute.",
  notSetUp: "The assistant isn't set up yet.",
  unavailable: "The assistant isn't available right now.",
  generic: 'Something went wrong — try again.',
};

interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

interface CitedLink {
  uri: string;
  title: string;
}

const STEP1_SCHEMA = {
  type: 'object',
  properties: {
    answerable_from_sources: { type: 'boolean' },
    answer: { type: 'string' },
    sources_used: {
      type: 'array',
      items: { type: 'string', enum: ['userScenario', 'dcRules', 'listingData', 'marketData', 'costs'] },
    },
  },
  required: ['answerable_from_sources', 'answer', 'sources_used'],
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Pulls an HTTP-like status out of whatever the SDK threw. */
export function errorStatus(err: unknown): number | null {
  const e = err as { status?: unknown; code?: unknown; message?: unknown };
  if (typeof e?.status === 'number') return e.status;
  if (typeof e?.code === 'number') return e.code;
  const msg = String(e?.message || '');
  const m = msg.match(/\b(400|401|403|404|429|500|503)\b/);
  if (m) return Number(m[1]);
  if (/RESOURCE_EXHAUSTED/i.test(msg)) return 429;
  if (/API_KEY_INVALID|PERMISSION_DENIED/i.test(msg)) return 403;
  if (/NOT_FOUND/i.test(msg)) return 404;
  return null;
}

/** Maps the final error to a friendly message. Only a real 429 is described as "busy". */
export function friendlyError(status: number | null): string {
  if (status === 429) return USER_MESSAGES.busy;
  if (status === 401 || status === 403) return USER_MESSAGES.notSetUp;
  if (status === 404) return USER_MESSAGES.unavailable;
  return USER_MESSAGES.generic;
}

function sanitizeHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t) => t && (t.role === 'user' || t.role === 'assistant') && typeof t.text === 'string')
    .slice(-HISTORY_MESSAGES)
    .map((t) => ({ role: t.role, text: String(t.text).slice(0, 1200) }));
}

function buildContents(contextJson: string, history: ChatTurn[], question: string) {
  const contents = [
    { role: 'user', parts: [{ text: `Context for this conversation:\n${contextJson}` }] },
    { role: 'model', parts: [{ text: 'Understood.' }] },
  ];
  for (const turn of history) {
    contents.push({ role: turn.role === 'user' ? 'user' : 'model', parts: [{ text: turn.text }] });
  }
  contents.push({ role: 'user', parts: [{ text: question }] });
  return contents;
}

/**
 * Calls Gemini with: primary model → (on 429) wait + retry once → fallback model once.
 * A 404 on the primary goes straight to the fallback model.
 */
async function callWithFallback(
  ai: any,
  request: Record<string, unknown>,
  log: (msg: string) => void
): Promise<{ response: any; model: string }> {
  const attempts: { model: string; delay: number }[] = [
    { model: PRIMARY_MODEL, delay: 0 },
    { model: PRIMARY_MODEL, delay: RETRY_DELAY_MS },
    { model: FALLBACK_MODEL, delay: 0 },
  ];
  let lastErr: unknown = null;
  for (let i = 0; i < attempts.length; i++) {
    const { model, delay } = attempts[i];
    if (delay) await sleep(delay);
    try {
      const response = await ai.models.generateContent({ ...request, model });
      return { response, model };
    } catch (err) {
      lastErr = err;
      const status = errorStatus(err);
      log(`model=${model} attempt=${i + 1} failed status=${status} message=${String((err as any)?.message || err).slice(0, 300)}`);
      if (status === 429) continue; // retry, then fallback model
      if (status === 404 && model === PRIMARY_MODEL) {
        i = 1; // skip the same-model retry; go to the fallback model
        continue;
      }
      break; // auth errors and others: don't retry
    }
  }
  throw lastErr;
}

function extractLinks(response: any): CitedLink[] {
  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const links: CitedLink[] = [];
  for (const c of chunks) {
    if (c?.web?.uri && !links.some((l) => l.uri === c.web.uri)) {
      links.push({ uri: c.web.uri, title: c.web.title || c.web.uri });
    }
    if (links.length >= 2) break;
  }
  return links;
}

export function registerAskRoute(app: Express) {
  app.post(['/api/ask', '/api/ask-ai'], async (req: Request, res: Response): Promise<void> => {
    const question = typeof req.body?.question === 'string' ? req.body.question.trim().slice(0, 1000) : '';
    if (!question) {
      res.status(400).json({ ok: false, message: 'Please type a question.' });
      return;
    }

    const started = Date.now();
    const log = (msg: string) => console.log(`[Ask AI] ${msg}`);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      log('GEMINI_API_KEY is missing');
      res.json({ ok: false, message: USER_MESSAGES.notSetUp });
      return;
    }

    const context = buildAiContext(req.body?.userScenario);
    const contextJson = JSON.stringify(context);
    const history = sanitizeHistory(req.body?.history);

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      // ---------- STEP 1: app sources only ----------
      const step1 = await callWithFallback(
        ai,
        {
          contents: buildContents(contextJson, history, question),
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.2,
            responseMimeType: 'application/json',
            responseJsonSchema: STEP1_SCHEMA,
          },
        },
        log
      );

      let parsed: { answerable_from_sources?: boolean; answer?: string; sources_used?: string[] } = {};
      try {
        parsed = JSON.parse(step1.response?.text || '{}');
      } catch {
        log('step1 returned non-JSON; treating as not answerable');
      }

      if (parsed.answerable_from_sources && parsed.answer && parsed.answer.trim()) {
        const answer = parsed.answer.trim();
        const check = verifyReplyNumbers(answer, context);
        if (check.hasUnverifiedNumber) {
          log(`WARNING unverified numbers ${JSON.stringify(check.unverifiedNumbers)} for question "${question}"`);
        }
        log(`step=1 model=${step1.model} sources=${JSON.stringify(parsed.sources_used || [])} ms=${Date.now() - started}`);
        res.json({ ok: true, answer, step: 1, usedWeb: false, links: [] });
        return;
      }

      // ---------- STEP 2: web fallback (one call) ----------
      const step2 = await callWithFallback(
        ai,
        {
          contents: buildContents(contextJson, history, question),
          config: {
            systemInstruction: `${SYSTEM_INSTRUCTION}\n\n${WEB_FALLBACK_INSTRUCTION}`,
            temperature: 0.2,
            tools: [{ googleSearch: {} }],
          },
        },
        log
      );

      let answer = String(step2.response?.text || '').trim();
      const links = extractLinks(step2.response);
      if (!answer) answer = NO_SOURCE_NOTE;
      else if (links.length === 0) answer = `${answer}\n\n${NO_SOURCE_NOTE}`;

      log(`step=2 model=${step2.model} links=${links.length} ms=${Date.now() - started}`);
      res.json({ ok: true, answer, step: 2, usedWeb: true, links });
    } catch (err) {
      const status = errorStatus(err);
      console.error('[Ask AI] Final error:', status, err);
      res.json({ ok: false, message: friendlyError(status) });
    }
  });
}
