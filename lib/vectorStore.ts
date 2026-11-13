/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Semantic search for the knowledge base.
 *
 *  - Embedding model: Gemini `gemini-embedding-001` (768 dimensions), via the same
 *    GEMINI_API_KEY the chatbot already uses.
 *  - Vector database: vectra, an open-source file-based vector store (folder .kb-index/).
 *
 * Every passage from lib/rag.ts (curated summaries + fetched full documents) is embedded
 * as RETRIEVAL_DOCUMENT and stored with a content hash, so a restart or refresh only
 * re-embeds passages that changed. Questions are embedded as RETRIEVAL_QUERY and matched by
 * cosine similarity. If embeddings are unavailable (no key, quota, outage), search falls back
 * to the BM25 keyword index in lib/rag.ts, and the result says which method answered.
 */

import crypto from 'crypto';
import path from 'path';
import { LocalIndex } from 'vectra';
import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  KB_INDEX_DIR,
  RAG_MAX_PER_SOURCE,
  RAG_MIN_SCORE,
  RAG_TOP_K,
} from '../config/ai.ts';
import { allChunks, onKnowledgeChange, searchKnowledge, startKnowledgeBase } from './rag.ts';
import type { KnowledgeChunk, SearchHit } from './rag.ts';

export type RetrievalMethod = 'vector' | 'keyword';

export interface RetrievalResult {
  hits: SearchHit[];
  method: RetrievalMethod;
}

/** Turns a list of texts into vectors. Injected so tests can run without the network. */
export type Embedder = (texts: string[], taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY') => Promise<number[][]>;

type ItemMeta = { hash: string; sourceId: string };

const EMBED_BATCH = 100;

let embedder: Embedder | null = null;
let indexDir = path.resolve(process.cwd(), KB_INDEX_DIR);
let minScore = Number(process.env.RAG_MIN_SCORE) || RAG_MIN_SCORE;
let index: LocalIndex<ItemMeta> | null = null;
let ready = false;
let syncInFlight: Promise<SyncReport> | null = null;
let syncQueued = false;
let lastError = '';
let lastSync: SyncReport | null = null;
let unsubscribe: (() => void) | null = null;

export interface SyncReport {
  total: number;
  embedded: number;
  removed: number;
  ms: number;
}

// ---------------------------------------------------------------------------
// Embeddings
// ---------------------------------------------------------------------------

/** Builds the default embedder on the Gemini API. Returns null when there is no key. */
export async function geminiEmbedder(): Promise<Embedder | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });
  return async (texts, taskType) => {
    const res = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: texts,
      config: { taskType, outputDimensionality: EMBEDDING_DIMENSIONS },
    });
    const vectors = (res.embeddings || []).map((e) => e.values || []);
    if (vectors.length !== texts.length || vectors.some((v) => v.length === 0)) {
      throw new Error(`embedding response had ${vectors.length} vectors for ${texts.length} texts`);
    }
    return vectors;
  };
}

/** The text that gets embedded for a passage: its title and section give the vector context. */
export function embeddingText(chunk: KnowledgeChunk): string {
  return `title: ${chunk.title} — ${chunk.section} | text: ${chunk.text}`;
}

/** Changes when the passage, the model or the dimensions change, so stale vectors are replaced. */
export function chunkHash(chunk: KnowledgeChunk): string {
  return crypto
    .createHash('sha256')
    .update(`${EMBEDDING_MODEL}|${EMBEDDING_DIMENSIONS}|${embeddingText(chunk)}`)
    .digest('hex')
    .slice(0, 16);
}

// ---------------------------------------------------------------------------
// Index sync
// ---------------------------------------------------------------------------

async function openIndex(): Promise<LocalIndex<ItemMeta>> {
  if (index) return index;
  const idx = new LocalIndex<ItemMeta>(indexDir);
  if (!(await idx.isIndexCreated())) {
    await idx.createIndex({ version: 1, metadata_config: { indexed: ['hash', 'sourceId'] } });
  }
  index = idx;
  return idx;
}

async function doSync(): Promise<SyncReport> {
  const started = Date.now();
  if (!embedder) throw new Error('no embedder');
  const idx = await openIndex();
  const chunks = allChunks();
  const wanted = new Map(chunks.map((c) => [c.id, c]));
  const existing = new Map((await idx.listItems()).map((it) => [it.id, it.metadata.hash]));

  const toEmbed = chunks.filter((c) => existing.get(c.id) !== chunkHash(c));
  const toRemove = [...existing.keys()].filter((id) => !wanted.has(id));

  const vectors: number[][] = [];
  for (let i = 0; i < toEmbed.length; i += EMBED_BATCH) {
    const batch = toEmbed.slice(i, i + EMBED_BATCH);
    vectors.push(...(await embedder(batch.map(embeddingText), 'RETRIEVAL_DOCUMENT')));
  }

  if (toEmbed.length > 0 || toRemove.length > 0) {
    await idx.beginUpdate();
    try {
      if (toRemove.length) await idx.deleteItems(toRemove);
      for (let i = 0; i < toEmbed.length; i++) {
        const c = toEmbed[i];
        await idx.upsertItem({ id: c.id, vector: vectors[i], metadata: { hash: chunkHash(c), sourceId: c.sourceId } });
      }
      await idx.endUpdate();
    } catch (err) {
      idx.cancelUpdate();
      throw err;
    }
  }

  ready = true;
  lastError = '';
  const report = { total: chunks.length, embedded: toEmbed.length, removed: toRemove.length, ms: Date.now() - started };
  lastSync = report;
  console.log(`[RAG] Vector index synced: ${report.total} passages, ${report.embedded} embedded, ${report.removed} removed (${report.ms} ms).`);
  return report;
}

/** Embeds new or changed passages into the vector index. Concurrent calls share one run. */
export function syncVectorIndex(): Promise<SyncReport> {
  if (syncInFlight) {
    syncQueued = true;
    return syncInFlight;
  }
  syncInFlight = doSync()
    .catch((err) => {
      lastError = String((err as Error)?.message || err).slice(0, 200);
      console.warn(`[RAG] Vector sync failed, keyword search will answer: ${lastError}`);
      throw err;
    })
    .finally(() => {
      syncInFlight = null;
      if (syncQueued) {
        syncQueued = false;
        syncVectorIndex().catch(() => undefined);
      }
    });
  return syncInFlight;
}

/**
 * Starts the knowledge base and the vector index. Call once at server startup.
 * Never throws: without a key or on failure, keyword search keeps answering.
 */
export async function startRetrieval(
  opts: { embedder?: Embedder | null; dir?: string; minScore?: number } = {}
): Promise<void> {
  if (opts.dir) indexDir = opts.dir;
  if (typeof opts.minScore === 'number') minScore = opts.minScore;
  embedder = opts.embedder !== undefined ? opts.embedder : await geminiEmbedder().catch(() => null);
  startKnowledgeBase();
  if (!unsubscribe) {
    unsubscribe = onKnowledgeChange(() => {
      if (embedder) syncVectorIndex().catch(() => undefined);
    });
  }
  if (!embedder) {
    lastError = 'No Gemini API key: using keyword search.';
    console.warn(`[RAG] ${lastError}`);
    return;
  }
  await syncVectorIndex().catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

function capPerSource(hits: SearchHit[], k: number): SearchHit[] {
  const perSource = new Map<string, number>();
  const out: SearchHit[] = [];
  for (const h of hits) {
    const n = perSource.get(h.chunk.sourceId) || 0;
    if (n >= RAG_MAX_PER_SOURCE) continue;
    perSource.set(h.chunk.sourceId, n + 1);
    out.push(h);
    if (out.length >= k) break;
  }
  return out;
}

/**
 * Finds the passages most relevant to a question.
 * Vector search when the index is ready; otherwise (or on error) BM25 keyword search.
 */
export async function retrieve(query: string, k = RAG_TOP_K): Promise<RetrievalResult> {
  const q = String(query || '').trim().slice(0, 500);
  if (!q) return { hits: [], method: 'keyword' };
  if (ready && embedder && index) {
    try {
      const [vec] = await embedder([q], 'RETRIEVAL_QUERY');
      const results = await index.queryItems(vec, q, k * 4);
      const byId = new Map(allChunks().map((c) => [c.id, c]));
      const hits: SearchHit[] = [];
      for (const r of results) {
        const chunk = byId.get(r.item.id);
        if (!chunk || r.score < minScore) continue;
        hits.push({ chunk, score: Number(r.score.toFixed(3)) });
      }
      return { hits: capPerSource(hits, k), method: 'vector' };
    } catch (err) {
      lastError = String((err as Error)?.message || err).slice(0, 200);
      console.warn(`[RAG] Vector search failed, using keyword search: ${lastError}`);
    }
  }
  return { hits: searchKnowledge(q, k), method: 'keyword' };
}

export function retrievalStatus() {
  return {
    method: (ready && embedder ? 'vector' : 'keyword') as RetrievalMethod,
    embeddingModel: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    vectorStore: 'vectra (open-source, file-based)',
    minScore,
    passages: allChunks().length,
    lastSync,
    lastError: lastError || null,
  };
}

/** For tests: forget the in-memory state. */
export function resetRetrieval() {
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
  embedder = null;
  index = null;
  ready = false;
  lastSync = null;
  lastError = '';
  indexDir = path.resolve(process.cwd(), KB_INDEX_DIR);
  minScore = Number(process.env.RAG_MIN_SCORE) || RAG_MIN_SCORE;
}
