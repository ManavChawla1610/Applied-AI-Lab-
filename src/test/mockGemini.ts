/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Offline mock of the Gemini REST API for end-to-end tests of /api/ask-ai.
 * Load with: GEMINI_API_KEY=test tsx --import ./src/test/mockGemini.ts server.ts
 *
 *  - batchEmbedContents → deterministic bag-of-words vectors (see fakeEmbedder.ts)
 *  - generateContent    → a scripted "model":
 *      earnings question  → calls estimate_earnings
 *      anything else      → calls search_knowledge_base, then answers citing [S1], [S2]
 *                           plus an invented [S99] that the server must strip.
 * Every request the mock receives is appended to MOCK_GEMINI_LOG (if set) for assertions.
 */

import fs from 'fs';
import { fakeVector } from './fakeEmbedder.ts';

const realFetch = globalThis.fetch;
const LOG = process.env.MOCK_GEMINI_LOG;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function log(entry: unknown) {
  if (LOG) fs.appendFileSync(LOG, JSON.stringify(entry) + '\n');
}

function modelReply(parts: unknown[]) {
  return json({ candidates: [{ content: { role: 'model', parts }, finishReason: 'STOP' }] });
}

globalThis.fetch = (async (input: any, init?: any) => {
  const url = typeof input === 'string' ? input : input?.url || String(input);
  if (!url.includes('generativelanguage.googleapis.com')) return realFetch(input, init);
  const body = init?.body ? JSON.parse(String(init.body)) : {};

  if (url.includes(':batchEmbedContents')) {
    const texts: string[] = (body.requests || []).map((r: any) => (r.content?.parts || []).map((p: any) => p.text).join(' '));
    log({ kind: 'embed', count: texts.length, taskType: body.requests?.[0]?.taskType });
    return json({ embeddings: texts.map((t) => ({ values: fakeVector(t) })) });
  }

  if (url.includes(':generateContent')) {
    const contents: any[] = body.contents || [];
    const tools = (body.tools || []).flatMap((t: any) => (t.functionDeclarations || []).map((f: any) => f.name));
    const first = contents[0]?.parts?.map((p: any) => p.text).join('') || '';
    const question = (first.split('CURRENT QUESTION:')[1] || first).trim();
    const last = contents[contents.length - 1];
    const fr = last?.parts?.find((p: any) => p.functionResponse)?.functionResponse;
    log({ kind: 'generate', tools, question, functionResponse: fr?.name || null });

    if (body.tools?.some((t: any) => t.urlContext)) {
      return modelReply([{ text: 'Web fallback answer.' }]);
    }
    if (!fr) {
      if (/\b(make|earn|earnings)\b/i.test(question)) {
        return modelReply([{ functionCall: { name: 'estimate_earnings', args: { place: 'Dupont Circle' } } }]);
      }
      return modelReply([{ functionCall: { name: 'search_knowledge_base', args: { query: question } } }]);
    }
    if (fr.name === 'estimate_earnings') {
      return modelReply([{ text: 'A 1-bedroom in Dupont Circle could make about $X a month.' }]);
    }
    if (fr.name === 'search_knowledge_base') {
      const passages = fr.response?.passages || [];
      if (passages.length === 0) return modelReply([{ text: 'NEEDS_WEB' }]);
      const a = passages[0];
      const b = passages[1] || passages[0];
      return modelReply([
        {
          text: `According to ${a.title}, the rule applies [${a.ref}]. Another point [${b.ref}, ${a.ref}]. Made up claim [S99].\nSOURCES: ${a.ref}`,
        },
      ]);
    }
  }
  return json({ error: { code: 404, message: 'mock: unhandled ' + url } }, 404);
}) as typeof fetch;

console.log('[mockGemini] Gemini API is mocked for tests.');
