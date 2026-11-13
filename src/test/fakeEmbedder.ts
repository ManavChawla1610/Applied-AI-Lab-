/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Deterministic stand-in for Gemini embeddings, for offline tests only.
 * Hashed bag-of-words (with light stemming) into 768 dimensions, L2-normalised,
 * so texts sharing words get higher cosine similarity.
 */

import { tokenize } from '../../lib/rag.ts';

const DIMS = 768;

function stem(w: string): string {
  return w.replace(/(ing|ed|es|s)$/, '');
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function fakeVector(text: string): number[] {
  const v = new Array(DIMS).fill(0);
  for (const t of tokenize(text)) {
    const w = stem(t);
    v[hash(w) % DIMS] += 1;
  }
  const norm = Math.sqrt(v.reduce((a, b) => a + b * b, 0)) || 1;
  return v.map((x) => x / norm);
}

export let fakeEmbedCalls = 0;
export let fakeEmbeddedTexts = 0;

export function resetFakeCounters() {
  fakeEmbedCalls = 0;
  fakeEmbeddedTexts = 0;
}

export async function fakeEmbedder(texts: string[]): Promise<number[][]> {
  fakeEmbedCalls++;
  fakeEmbeddedTexts += texts.length;
  return texts.map(fakeVector);
}
