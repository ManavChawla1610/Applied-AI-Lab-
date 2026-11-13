/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Retrieval (RAG) for the "Questions?" assistant.
 *
 * Knowledge comes from two places:
 *  1. Curated summaries bundled in /knowledge/*.md (always available, loaded at startup).
 *  2. Full source documents listed in /knowledge/sources.csv (use_in_rag = yes, HTML only),
 *     fetched in the background at startup and refreshed daily. If a fetch fails, the
 *     bundled summary for that source still answers.
 *
 * Primary search is semantic: Gemini embeddings stored in a vectra vector index (lib/vectorStore.ts).
 * The BM25 keyword index here is the fallback when embeddings are unavailable.
 * Earnings questions do NOT come here — they use the app's calculation tool.
 */

import fs from 'fs';
import path from 'path';

export interface KnowledgeChunk {
  id: string;
  sourceId: string;
  title: string;
  section: string;
  publisher: string;
  url: string;
  authority: string;
  retrieved: string;
  kind: 'summary' | 'full_text';
  text: string;
}

export interface SearchHit {
  chunk: KnowledgeChunk;
  score: number;
}

export interface SourceRow {
  id: string;
  file: string;
  title: string;
  publisher: string;
  url: string;
  format: string;
  authority: string;
  use_in_rag: string;
  notes: string;
}

export const KNOWLEDGE_DIR = path.resolve(process.cwd(), 'knowledge');
export const FULL_TEXT_CHUNK_WORDS = 160;
export const FULL_TEXT_OVERLAP_WORDS = 40;
// Upper bound per source (~7,000 words) so one very long page can't blow the embedding quota.
// Each DC Code section that matters (e.g. § 30-201.10 penalties) is also listed on its own.
export const MAX_FULL_TEXT_PASSAGES_PER_SOURCE = 60;
export const FULL_DOC_REFRESH_MS = 24 * 60 * 60 * 1000;
export const FETCH_TIMEOUT_MS = 12000;
// Curated summaries are cleaner than raw web pages, so they rank slightly higher on ties.
export const SUMMARY_BOOST = 1.15;
const ASSISTANT_GUIDANCE_HEADING = /^how to answer users$/i;

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

const STOPWORDS = new Set(
  (
    'a an and are as at be by can do does for from has have how i if in is it its me my of on or our so ' +
    'that the their them then there these this to was we what when where which who will with would you your ' +
    'about any into than also not no yes should could may might just get got'
  ).split(' ')
);

/** Lowercase word tokens with light stemming, so "rentals"/"rental" and "renting"/"rent" match. */
export function tokenize(text: string): string[] {
  const words = text.toLowerCase().replace(/[’']/g, '').match(/[a-z0-9$%.§-]+/g) || [];
  const out: string[] = [];
  for (let w of words) {
    w = w.replace(/^[.\-]+|[.\-]+$/g, '');
    if (!w || STOPWORDS.has(w)) continue;
    if (w.length > 4 && w.endsWith('ies')) w = w.slice(0, -3) + 'y';
    else if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
    else if (w.length > 4 && w.endsWith('es') && !w.endsWith('ses')) w = w.slice(0, -2);
    else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
    out.push(w);
  }
  return out;
}

/** Minimal CSV parser (handles quoted fields with commas). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    if (row.some((f) => f.trim() !== '')) rows.push(row);
  }
  const [header, ...body] = rows;
  if (!header) return [];
  return body.map((r) => Object.fromEntries(header.map((h, idx) => [h.trim(), (r[idx] || '').trim()])));
}

/** Reads the YAML-ish header of a knowledge file (simple "key: value" lines). */
export function parseFrontMatter(md: string): { meta: Record<string, string>; body: string } {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: md };
  const meta: Record<string, string> = {};
  let lastKey = '';
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (kv) {
      lastKey = kv[1];
      meta[lastKey] = kv[2].trim();
    } else if (lastKey && /^\s+-\s+/.test(line) && !meta[lastKey]) {
      meta[lastKey] = line.replace(/^\s+-\s+/, '').trim(); // first item of a list
    }
  }
  return { meta, body: md.slice(m[0].length) };
}

/** Splits a summary file into one chunk per "## " section. */
export function chunkSummary(fileName: string, md: string, sourceRow?: SourceRow): KnowledgeChunk[] {
  const { meta, body } = parseFrontMatter(md);
  const title = meta.title || sourceRow?.title || fileName;
  const url = meta.source_url || meta.source_urls || sourceRow?.url || '';
  const base = {
    sourceId: sourceRow?.id || fileName.slice(0, 2),
    title,
    publisher: meta.publisher || meta.publishers || sourceRow?.publisher || '',
    url,
    authority: meta.authority || sourceRow?.authority || '',
    retrieved: (meta.retrieved || '').slice(0, 10),
    kind: 'summary' as const,
  };
  const sections = body.split(/\n(?=## )/);
  const chunks: KnowledgeChunk[] = [];
  sections.forEach((sec, idx) => {
    const lines = sec.trim().split('\n');
    const heading = lines[0].startsWith('#') ? lines[0].replace(/^#+\s*/, '') : '';
    const text = (heading ? lines.slice(1) : lines).join('\n').trim();
    if (text.length < 20) return;
    // "How to answer users" sections are guidance for the assistant (now in config/ai.ts), not
    // source text, so they are never retrieved or shown to users as evidence.
    if (ASSISTANT_GUIDANCE_HEADING.test(heading)) return;
    chunks.push({ ...base, id: `${fileName}#${idx}`, section: heading || title, text });
  });
  return chunks;
}

/** Strips an HTML page down to readable text (drops scripts, styles, navigation, headers, footers). */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|nav|header|footer|form)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article|br)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&sect;/g, '§')
    .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d)))
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

/** Splits full document text into overlapping word windows. */
export function chunkFullText(row: SourceRow, text: string, retrieved: string): KnowledgeChunk[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: KnowledgeChunk[] = [];
  const step = FULL_TEXT_CHUNK_WORDS - FULL_TEXT_OVERLAP_WORDS;
  for (let start = 0, n = 0; start < words.length; start += step, n++) {
    const piece = words.slice(start, start + FULL_TEXT_CHUNK_WORDS).join(' ');
    if (piece.length < 80) break;
    chunks.push({
      id: `full:${row.id}#${n}`,
      sourceId: row.id,
      title: row.title,
      section: `${row.title} (full text, part ${n + 1})`,
      publisher: row.publisher,
      url: row.url,
      authority: row.authority,
      retrieved,
      kind: 'full_text',
      text: piece,
    });
    if (start + FULL_TEXT_CHUNK_WORDS >= words.length) break;
    if (chunks.length >= MAX_FULL_TEXT_PASSAGES_PER_SOURCE) break;
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// BM25 index
// ---------------------------------------------------------------------------

export class Bm25Index {
  private docs: { chunk: KnowledgeChunk; tf: Map<string, number>; len: number }[] = [];
  private df = new Map<string, number>();
  private avgLen = 0;
  constructor(private k1 = 1.4, private b = 0.75) {}

  build(chunks: KnowledgeChunk[]) {
    this.docs = [];
    this.df = new Map();
    for (const chunk of chunks) {
      // Title and section words count too, so "AirCover" finds the AirCover file.
      const tokens = tokenize(`${chunk.title} ${chunk.section} ${chunk.text}`);
      const tf = new Map<string, number>();
      for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
      for (const t of tf.keys()) this.df.set(t, (this.df.get(t) || 0) + 1);
      this.docs.push({ chunk, tf, len: tokens.length });
    }
    this.avgLen = this.docs.reduce((s, d) => s + d.len, 0) / Math.max(1, this.docs.length);
  }

  get size() {
    return this.docs.length;
  }

  search(query: string, k = 5): SearchHit[] {
    const qTokens = Array.from(new Set(tokenize(query)));
    if (qTokens.length === 0 || this.docs.length === 0) return [];
    const N = this.docs.length;
    const hits: SearchHit[] = [];
    for (const d of this.docs) {
      let score = 0;
      for (const t of qTokens) {
        const f = d.tf.get(t);
        if (!f) continue;
        const df = this.df.get(t) || 0;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        score += idf * ((f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + (this.b * d.len) / this.avgLen)));
      }
      if (score > 0) {
        if (d.chunk.kind === 'summary') score *= SUMMARY_BOOST;
        hits.push({ chunk: d.chunk, score });
      }
    }
    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, k);
  }
}

// ---------------------------------------------------------------------------
// Knowledge base lifecycle
// ---------------------------------------------------------------------------

let summaryChunks: KnowledgeChunk[] = [];
let fullTextChunks: KnowledgeChunk[] = [];
let sources: SourceRow[] = [];
const index = new Bm25Index();
let loaded = false;
let lastFullFetch = 0;
let fullFetchInFlight: Promise<void> | null = null;

const changeListeners = new Set<() => void>();

function rebuild() {
  index.build([...summaryChunks, ...fullTextChunks]);
  for (const cb of changeListeners) {
    try {
      cb();
    } catch (err) {
      console.warn('[RAG] change listener failed:', String(err).slice(0, 120));
    }
  }
}

/** Called whenever the set of passages changes (startup load, full-document refresh). */
export function onKnowledgeChange(cb: () => void): () => void {
  changeListeners.add(cb);
  return () => changeListeners.delete(cb);
}

/** Every passage currently in the knowledge base (summaries + fetched full text). */
export function allChunks(): KnowledgeChunk[] {
  loadKnowledgeBase();
  return [...summaryChunks, ...fullTextChunks];
}

/** The rows of sources.csv. */
export function listSources(): SourceRow[] {
  loadKnowledgeBase();
  return sources;
}

export const FULL_TEXT_DIR = 'full';

/**
 * Reads the official pages saved by scripts/fetchSources.ts (knowledge/full/<id>.txt, first
 * line "retrieved: YYYY-MM-DD") and the fetch report (knowledge/full/_report.json).
 */
function loadSavedFullText(dir: string) {
  const fullDir = path.join(dir, FULL_TEXT_DIR);
  if (!fs.existsSync(fullDir)) return;
  const chunks: KnowledgeChunk[] = [];
  for (const row of sources.filter((s) => s.use_in_rag === 'yes')) {
    const file = path.join(fullDir, `${row.id}.txt`);
    if (!fs.existsSync(file)) continue;
    const raw = fs.readFileSync(file, 'utf8');
    const m = raw.match(/^retrieved:\s*(\d{4}-\d{2}-\d{2})\s*\n/);
    chunks.push(...chunkFullText(row, m ? raw.slice(m[0].length) : raw, m ? m[1] : ''));
  }
  fullTextChunks = chunks;
  try {
    const rep = JSON.parse(fs.readFileSync(path.join(fullDir, '_report.json'), 'utf8'));
    if (rep && Array.isArray(rep.results)) fullFetchReport = rep;
  } catch {
    /* no report yet */
  }
  if (chunks.length) lastFullFetch = Date.now();
}

/** Loads the bundled summaries and source list. Safe to call many times. */
export function loadKnowledgeBase(dir = KNOWLEDGE_DIR) {
  if (loaded) return;
  try {
    sources = parseCsv(fs.readFileSync(path.join(dir, 'sources.csv'), 'utf8')) as unknown as SourceRow[];
  } catch (err) {
    console.warn('[RAG] sources.csv not found:', String(err).slice(0, 120));
    sources = [];
  }
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^\d\d_.*\.md$/.test(f)) : [];
  summaryChunks = files.flatMap((f) => {
    const row = sources.find((s) => s.file === f && s.use_in_rag === 'yes');
    return chunkSummary(f, fs.readFileSync(path.join(dir, f), 'utf8'), row);
  });
  loadSavedFullText(dir);
  rebuild();
  loaded = true;
  console.log(
    `[RAG] Loaded ${summaryChunks.length} summary chunks from ${files.length} files, ${fullTextChunks.length} full-text chunks from saved pages; ${sources.length} sources listed.`
  );
}

export interface FullDocResult {
  id: string;
  title: string;
  url: string;
  format: string;
  ok: boolean;
  passages: number;
  error?: string;
}

let fullFetchReport: { at: string; results: FullDocResult[] } | null = null;

/** Extracts plain text from a PDF (DLCP guide, exemption form, OTR notice). */
async function pdfToText(buf: ArrayBuffer): Promise<string> {
  const { extractText } = await import('unpdf');
  const { text } = await extractText(new Uint8Array(buf), { mergePages: true });
  return String(text || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/** Downloads one source and returns its plain text. Throws with a readable reason on failure. */
export async function fetchSourceText(row: SourceRow, fetchImpl: typeof fetch = fetch, timeoutMs = FETCH_TIMEOUT_MS): Promise<string> {
  const res = await fetchImpl(row.url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; DCHostCalculator/1.0; knowledge refresh)',
      Accept: row.format === 'pdf' ? 'application/pdf' : 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = row.format === 'pdf' ? await pdfToText(await res.arrayBuffer()) : htmlToText(await res.text());
  if (text.split(/\s+/).length < 60) throw new Error('page had too little text (it may need JavaScript to load)');
  return text;
}

async function fetchOne(row: SourceRow, fetchImpl: typeof fetch, today: string): Promise<{ result: FullDocResult; chunks: KnowledgeChunk[] }> {
  const base = { id: row.id, title: row.title, url: row.url, format: row.format };
  try {
    const text = await fetchSourceText(row, fetchImpl);
    const chunks = chunkFullText(row, text, today);
    return { result: { ...base, ok: true, passages: chunks.length }, chunks };
  } catch (err) {
    const error = String((err as Error)?.message || err).slice(0, 140);
    console.warn(`[RAG] Full text unavailable for ${row.id} (${row.url}): ${error}`);
    return { result: { ...base, ok: false, passages: 0, error }, chunks: [] };
  }
}

/**
 * Fetches the full official pages and PDFs marked use_in_rag = yes, in parallel, and adds
 * them to the knowledge base. Pages that fail are reported and skipped; the curated
 * summaries still answer. Set KB_FETCH_FULL_DOCS=false to turn this off.
 */
export function refreshFullDocuments(fetchImpl: typeof fetch = fetch): Promise<void> {
  // Off by default: on Cloud Run, downloads at runtime time out. Full text comes from
  // knowledge/full/*.txt, refreshed weekly by GitHub Actions. Set KB_FETCH_FULL_DOCS=true to enable.
  if (process.env.KB_FETCH_FULL_DOCS !== 'true') return Promise.resolve();
  if (fullFetchInFlight) return fullFetchInFlight;
  loadKnowledgeBase();
  fullFetchInFlight = (async () => {
    const targets = sources.filter(
      (s) => s.use_in_rag === 'yes' && (s.format === 'html' || s.format === 'pdf') && /^https:\/\//.test(s.url)
    );
    const today = new Date().toISOString().slice(0, 10);
    const settled = await Promise.all(targets.map((row) => fetchOne(row, fetchImpl, today)));
    const next = settled.flatMap((x) => x.chunks);
    fullFetchReport = { at: new Date().toISOString(), results: settled.map((x) => x.result) };
    // Keep what we had if this round got nothing (e.g. the network was down).
    if (next.length > 0) {
      fullTextChunks = next;
      rebuild();
    }
    lastFullFetch = Date.now();
    const ok = settled.filter((x) => x.result.ok).length;
    console.log(`[RAG] Full documents: ${ok}/${targets.length} fetched, ${next.length} passages indexed.`);
  })().finally(() => {
    fullFetchInFlight = null;
  });
  return fullFetchInFlight;
}

/** Per-source result of the last full-document fetch (null if none has run yet). */
export function fullDocumentsReport() {
  return fullFetchReport;
}

/** True once a full-document fetch has completed at least once. */
export function fullDocumentsAttempted() {
  return lastFullFetch > 0;
}

/** Starts the knowledge base: loads summaries now, fetches full documents in the background. */
export function startKnowledgeBase() {
  loadKnowledgeBase();
  refreshFullDocuments().catch(() => undefined);
}

/** Returns the top passages for a question. Triggers a background refresh once a day. */
export function searchKnowledge(query: string, k = 5): SearchHit[] {
  loadKnowledgeBase();
  if (lastFullFetch && Date.now() - lastFullFetch > FULL_DOC_REFRESH_MS) {
    refreshFullDocuments().catch(() => undefined);
  }
  // Keep at most two passages from the same source so one long page cannot crowd out the rest.
  const raw = index.search(query, k * 3);
  const perSource = new Map<string, number>();
  const out: SearchHit[] = [];
  for (const h of raw) {
    const n = perSource.get(h.chunk.sourceId) || 0;
    if (n >= 2) continue;
    perSource.set(h.chunk.sourceId, n + 1);
    out.push(h);
    if (out.length >= k) break;
  }
  return out;
}

/** Formats passages for the model prompt, numbered S1..Sn. */
export function formatPassages(hits: SearchHit[]): string {
  return hits
    .map(
      (h, i) =>
        `[S${i + 1}] ${h.chunk.title} — ${h.chunk.section}\nPublisher: ${h.chunk.publisher}. Authority: ${h.chunk.authority}. Retrieved: ${h.chunk.retrieved}.\n${h.chunk.text}`
    )
    .join('\n\n');
}

/**
 * Reads the "SOURCES: S1, S3" line the model is asked to end with, strips it from the answer,
 * and returns the matching links (deduplicated, at most 2).
 */
export function extractCitations(answer: string, hits: SearchHit[]): { answer: string; links: { uri: string; title: string }[] } {
  const m = answer.match(/\n?\s*SOURCES:\s*([^\n]*)\s*$/i);
  const cleaned = m ? answer.slice(0, m.index).trim() : answer.trim();
  if (!m) return { answer: cleaned, links: [] };
  const ids = Array.from(m[1].matchAll(/S(\d+)/gi)).map((x) => Number(x[1]) - 1);
  const links: { uri: string; title: string }[] = [];
  for (const i of ids) {
    const h = hits[i];
    if (!h || !h.chunk.url || links.some((l) => l.uri === h.chunk.url)) continue;
    links.push({ uri: h.chunk.url, title: h.chunk.title });
    if (links.length >= 2) break;
  }
  return { answer: cleaned, links };
}

/** For tests and diagnostics. */
export function knowledgeStats() {
  return { summaryChunks: summaryChunks.length, fullTextChunks: fullTextChunks.length, sources: sources.length, indexed: index.size };
}

/** For tests: forget everything so the next call reloads. */
export function resetKnowledgeBase() {
  summaryChunks = [];
  fullTextChunks = [];
  sources = [];
  loaded = false;
  lastFullFetch = 0;
  fullFetchReport = null;
  fullFetchInFlight = null;
  index.build([]);
}
