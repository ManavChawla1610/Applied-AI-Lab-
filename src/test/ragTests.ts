/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Offline tests for the knowledge base: vector index sync, semantic search, keyword fallback
 * and citation handling. Run: KB_FETCH_FULL_DOCS=false npx tsx src/test/ragTests.ts
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { resetKnowledgeBase, allChunks, refreshFullDocuments, fullDocumentsReport } from '../../lib/rag.ts';
import {
  ensureIndexReady,
  resetRetrieval,
  retrieve,
  retrievalStatus,
  startRetrieval,
  syncVectorIndex,
} from '../../lib/vectorStore.ts';
import { CitationRegistry, applyCitations } from '../../lib/citations.ts';
import { fakeEmbedder, fakeEmbeddedTexts, resetFakeCounters } from './fakeEmbedder.ts';
import { ensureFullKnowledge } from '../../lib/vectorStore.ts';

process.env.KB_FETCH_FULL_DOCS = 'false';

let passed = 0;
function check(cond: unknown, msg: string) {
  if (!cond) throw new Error(`✗ ${msg}`);
  passed++;
  console.log(`✓ ${msg}`);
}

async function fresh(opts: Parameters<typeof startRetrieval>[0]) {
  resetRetrieval();
  resetKnowledgeBase();
  await startRetrieval(opts);
}

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-index-'));

  // 1. First start embeds every passage into the vector store
  resetFakeCounters();
  await fresh({ embedder: fakeEmbedder, dir, minScore: 0.05 });
  const total = allChunks().length;
  check(total >= 40 && !allChunks().some((c) => /answer users/i.test(c.section)), `knowledge base loaded (${total} passages, no assistant-guidance sections)`);
  check(fakeEmbeddedTexts === total, `all ${total} passages embedded on first start (got ${fakeEmbeddedTexts})`);
  check(fs.existsSync(path.join(dir, 'index.json')), 'vector index written to disk');
  check(retrievalStatus().method === 'vector', 'status reports vector search');

  // 2. Restart with the same folder: nothing re-embedded
  resetFakeCounters();
  await fresh({ embedder: fakeEmbedder, dir, minScore: 0.05 });
  check(fakeEmbeddedTexts === 0, `restart re-embeds nothing when documents are unchanged (got ${fakeEmbeddedTexts})`);
  const again = await syncVectorIndex();
  check(again.embedded === 0 && again.removed === 0, 'repeat sync is a no-op');

  // 3. Semantic search finds the right sources
  const pen = await retrieve('What is the fine if I host without a license?', 5);
  check(pen.method === 'vector', 'penalty question answered by vector search');
  check(
    pen.hits.some((h) => h.chunk.id.startsWith('13_') || /\$6,000/.test(h.chunk.text)),
    `penalty passages retrieved (${pen.hits.map((h) => h.chunk.id).join(', ')})`
  );
  const lien = await retrieve('interest and lien on unpaid fines', 5);
  check(lien.hits.some((h) => h.chunk.id.startsWith('13_') && /lien/i.test(h.chunk.text)), 'interest/lien question finds file 13');
  const ins = await retrieve('how much liability insurance do I need', 5);
  check(ins.hits.some((h) => /250,000/.test(h.chunk.text)), 'insurance question finds the $250,000 requirement');
  check(!ins.hits.some((h) => /500,000/.test(h.chunk.text) && !/250,000/.test(h.chunk.text)), 'no outdated $500,000 figure');
  const fee = await retrieve('license fee cost', 5);
  check(fee.hits.some((h) => /\$99/.test(h.chunk.text)), 'license fee question finds $99');

  const perSource = new Map<string, number>();
  for (const h of pen.hits) perSource.set(h.chunk.sourceId, (perSource.get(h.chunk.sourceId) || 0) + 1);
  check([...perSource.values()].every((n) => n <= 2), 'at most 2 passages per source');
  check(pen.hits.every((h, i) => i === 0 || pen.hits[i - 1].score >= h.score), 'hits sorted by similarity');
  check(!allChunks().some((c) => /help\/article\/863/.test(c.url)), 'outdated Airbnb DC page (863) is not in the index');

  // 4. Changing a passage re-embeds only that passage
  const before = allChunks()[0];
  const orig = before.text;
  before.text = orig + ' (edited)';
  resetFakeCounters();
  const changed = await syncVectorIndex();
  check(changed.embedded === 1 && fakeEmbeddedTexts === 1, 'edited passage is the only one re-embedded');
  before.text = orig;
  await syncVectorIndex();

  // 5. Embedding outage → keyword fallback still answers
  await fresh({
    embedder: async () => {
      throw new Error('429 RESOURCE_EXHAUSTED');
    },
    dir: fs.mkdtempSync(path.join(os.tmpdir(), 'kb-index-')),
  });
  const kw = await retrieve('lodging tax rate', 5);
  check(kw.method === 'keyword' && kw.hits.length > 0, 'falls back to keyword search when embeddings fail');

  // 6. No API key → keyword search
  await fresh({ embedder: null });
  const nk = await retrieve('90 night cap vacation rental', 5);
  check(nk.method === 'keyword' && nk.hits.length > 0, 'keyword search when no API key');

  // 6b. Slow startup (Cloud Run): a question asked before indexing finishes waits for it
  //     and still gets vector search, instead of silently falling back to keywords.
  resetRetrieval();
  resetKnowledgeBase();
  let firstCall = true;
  const slowEmbedder = async (texts: string[], t: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY') => {
    if (firstCall) {
      firstCall = false;
      await new Promise((r) => setTimeout(r, 1500));
    }
    return fakeEmbedder(texts);
  };
  const startup = startRetrieval({ embedder: slowEmbedder, dir: fs.mkdtempSync(path.join(os.tmpdir(), 'kb-index-')), minScore: 0.05 });
  await new Promise((r) => setTimeout(r, 50));
  check(retrievalStatus().syncing === true && retrievalStatus().method === 'keyword', 'status shows indexing in progress');
  const early = await retrieve('liability insurance requirement', 5);
  check(early.method === 'vector', 'question during startup waits for the index and uses vector search');
  await startup;

  // 6c. A stuck embedder doesn't hang requests forever
  resetRetrieval();
  resetKnowledgeBase();
  const stuck = startRetrieval({ embedder: () => new Promise(() => undefined), dir: fs.mkdtempSync(path.join(os.tmpdir(), 'kb-index-')) });
  await new Promise((r) => setTimeout(r, 50));
  const t0 = Date.now();
  const ok = await ensureIndexReady(300);
  check(!ok && Date.now() - t0 < 1000, 'waiting for a stuck index gives up after the time limit');
  void stuck;

  // 6d. Full official pages: HTML and PDF are fetched in parallel, indexed and reported;
  //     a blocked page is skipped without breaking the rest.
  resetRetrieval();
  resetKnowledgeBase();
  await startRetrieval({ embedder: fakeEmbedder, dir: fs.mkdtempSync(path.join(os.tmpdir(), 'kb-index-')), minScore: 0.05 });
  const pdfBytes = fs.readFileSync('/tmp/sample.pdf');
  const words = Array.from({ length: 400 }, (_, i) => `word${i % 50}`).join(' ');
  const fakeSite: typeof fetch = (async (url: any) => {
    const u = String(url);
    if (u.includes('airbnb.com')) return new Response('<html><body>Loading…</body></html>', { status: 200 });
    if (u.endsWith('.pdf') || u.includes('/sites/default/files/')) return new Response(pdfBytes, { status: 200 });
    if (u.includes('otr.cfo.dc.gov/page/taxable')) return new Response('blocked', { status: 403 });
    return new Response(`<html><head><style>x{}</style></head><body><nav>menu</nav><main><h1>Rules</h1><p>Hosts must hold a license. ${words}</p></main></body></html>`, { status: 200 });
  }) as typeof fetch;
  process.env.KB_FETCH_FULL_DOCS = 'true';
  await refreshFullDocuments(fakeSite);
  process.env.KB_FETCH_FULL_DOCS = 'false';
  const report = fullDocumentsReport()!;
  const okIds = report.results.filter((r) => r.ok).map((r) => r.id);
  check(report.results.length >= 14, `all listed HTML and PDF sources attempted (${report.results.length})`);
  check(report.results.some((r) => r.format === 'pdf' && r.ok), 'PDF sources are read and indexed');
  check(report.results.some((r) => r.id === '06' && !r.ok && /403/.test(r.error || '')), 'blocked page reported with its error');
  check(report.results.filter((r) => /airbnb\.com/.test(r.url)).every((r) => !r.ok), 'JavaScript-only pages are skipped, not indexed as junk');
  const fullChunks = allChunks().filter((c) => c.kind === 'full_text');
  check(fullChunks.length > 0 && fullChunks.every((c) => okIds.includes(c.sourceId)), `full-text passages added (${fullChunks.length})`);
  check(!fullChunks.some((c) => /menu|x\{\}/.test(c.text)), 'navigation and styles stripped from page text');
  await ensureFullKnowledge(10_000);
  const st = retrievalStatus();
  check(st.method === 'vector' && st.fullTextPassages === fullChunks.length && st.lastSync!.total === allChunks().length,
    `full-text passages embedded into the vector index (${st.lastSync!.total} total)`);
  const pdfHit = await retrieve('proof of work outside the District for the vacation rental exemption', 5);
  check(pdfHit.hits.some((h) => h.chunk.kind === 'full_text'), 'search returns exact full-text passages');

  // 7. Citations: renumber by first use, drop invented refs, strip SOURCES line
  const reg = new CitationRegistry();
  const items = reg.add(pen.hits.slice(0, 3), 'vector');
  check(items.map((i) => i.ref).join() === 'S1,S2,S3', 'registry assigns S1..S3');
  const again2 = reg.add([pen.hits[1]], 'vector');
  check(again2[0].ref === 'S2', 'same passage keeps its ref across searches');
  const { answer, citations } = applyCitations(
    'Fines start at $500 [S3]. Repeat offences cost more [S1, S3]. Invented [S99]. Also (S2).\nSOURCES: S1, S3',
    reg
  );
  check(answer === 'Fines start at $500 [1]. Repeat offences cost more [2][1]. Invented. Also [3].', `answer renumbered: "${answer}"`);
  check(citations.length === 3 && citations[0].ref === 'S3' && citations[1].ref === 'S1', 'citations ordered by first use');
  check(citations.every((c) => c.quote.length > 20 && c.url !== undefined), 'citations carry the passage text');
  const none = applyCitations('No refs here.', new CitationRegistry());
  check(none.citations.length === 0 && none.answer === 'No refs here.', 'answers without refs are unchanged');

  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`\nAll ${passed} RAG checks passed.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
