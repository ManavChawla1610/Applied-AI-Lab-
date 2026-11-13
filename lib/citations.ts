/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Links each claim in a chatbot answer back to the exact passage it came from.
 *
 * During one question the model may search the knowledge base several times. Every passage
 * it sees gets a stable reference (S1, S2, …) in a per-request registry. The model writes
 * those references inline; afterwards we keep only references it really saw, renumber them
 * [1], [2] in order of first use, and return the passage text as evidence for the UI.
 */

import { EVIDENCE_MAX_CHARS } from '../config/ai.ts';
import type { SearchHit } from './rag.ts';
import type { RetrievalMethod } from './vectorStore.ts';

export interface Citation {
  n: number;
  ref: string;
  sourceId: string;
  title: string;
  section: string;
  publisher: string;
  url: string;
  authority: string;
  retrieved: string;
  kind: 'summary' | 'full_text';
  score: number;
  method: RetrievalMethod;
  quote: string;
}

interface Entry {
  ref: string;
  hit: SearchHit;
  method: RetrievalMethod;
}

export class CitationRegistry {
  private byChunk = new Map<string, Entry>();
  private byRef = new Map<string, Entry>();

  /** Registers passages and returns them with their references, for the model. */
  add(hits: SearchHit[], method: RetrievalMethod): { ref: string; hit: SearchHit }[] {
    return hits.map((hit) => {
      let e = this.byChunk.get(hit.chunk.id);
      if (!e) {
        e = { ref: `S${this.byChunk.size + 1}`, hit, method };
        this.byChunk.set(hit.chunk.id, e);
        this.byRef.set(e.ref, e);
      }
      return { ref: e.ref, hit: e.hit };
    });
  }

  get size() {
    return this.byChunk.size;
  }

  get(ref: string): Entry | undefined {
    return this.byRef.get(ref.toUpperCase());
  }
}

/** What the search_knowledge_base tool returns to the model. */
export function toolPayload(items: { ref: string; hit: SearchHit }[]) {
  if (items.length === 0) {
    return { passages: [], note: 'No matching passages. If you cannot answer from other context, reply NEEDS_WEB.' };
  }
  return {
    passages: items.map(({ ref, hit }) => ({
      ref,
      title: hit.chunk.title,
      section: hit.chunk.section,
      publisher: hit.chunk.publisher,
      authority: hit.chunk.authority,
      retrieved: hit.chunk.retrieved,
      text: hit.chunk.text,
    })),
    instructions: 'Cite each fact with its ref in square brackets, e.g. [S1]. Use only these refs.',
  };
}

function trimQuote(text: string): string {
  // Plain text for display: drop markdown emphasis and links, keep line breaks for bullets.
  const t = text
    .replace(/\*\*|__/g, '')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
  if (t.length <= EVIDENCE_MAX_CHARS) return t;
  const cut = t.slice(0, EVIDENCE_MAX_CHARS);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '));
  return (lastStop > EVIDENCE_MAX_CHARS * 0.6 ? cut.slice(0, lastStop + 1) : cut) + ' …';
}

export function citationFromHit(n: number, ref: string, hit: SearchHit, method: RetrievalMethod): Citation {
  const c = hit.chunk;
  return {
    n,
    ref,
    sourceId: c.sourceId,
    title: c.title,
    section: c.section,
    publisher: c.publisher,
    url: c.url,
    authority: c.authority,
    retrieved: c.retrieved,
    kind: c.kind,
    score: hit.score,
    method,
    quote: trimQuote(c.text),
  };
}

/**
 * Rewrites [S3] / [S3, S1] markers into [1] / [1][2], numbered by first appearance.
 * Markers the model invented (not in the registry) are removed. Also strips a trailing
 * "SOURCES: …" line if the model added one anyway.
 */
export function applyCitations(answer: string, registry: CitationRegistry): { answer: string; citations: Citation[] } {
  let text = String(answer || '').replace(/\n?\s*SOURCES?:\s*[^\n]*\s*$/i, '');
  const order: string[] = [];
  const numberOf = (ref: string) => {
    const key = ref.toUpperCase();
    if (!registry.get(key)) return null;
    let i = order.indexOf(key);
    if (i === -1) {
      order.push(key);
      i = order.length - 1;
    }
    return i + 1;
  };

  // Matches [S1], [S1, S2], [S1][S2], 【S1】, (S1) … only when the group contains S-refs.
  text = text.replace(/[\[【(]\s*(S\d+(?:\s*[,;&]\s*S\d+|\s*and\s*S\d+)*)\s*[\]】)]/gi, (_m, group: string) => {
    const nums = Array.from(group.matchAll(/S\d+/gi))
      .map((x) => numberOf(x[0]))
      .filter((n): n is number => n !== null);
    const unique = [...new Set(nums)];
    return unique.map((n) => `[${n}]`).join('');
  });

  // Tidy spaces left before punctuation by removed markers.
  text = text.replace(/[ \t]+([.,;:!?])/g, '$1').replace(/[ \t]{2,}/g, ' ').trim();

  const citations = order.map((ref, i) => {
    const e = registry.get(ref)!;
    return citationFromHit(i + 1, ref, e.hit, e.method);
  });
  return { answer: text, citations };
}
