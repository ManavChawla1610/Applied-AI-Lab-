/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Builds the vector index (Gemini embeddings → vectra) for every passage in /knowledge and
 * saves it to knowledge/index/, which is committed. The app then loads it at startup and
 * spends no embedding quota there. Only new or changed passages are embedded.
 *
 * Needs GEMINI_API_KEY (a GitHub Actions secret in the weekly job). Waits out per-minute
 * quota errors; if the daily quota runs out, progress so far is kept and the next run resumes.
 *
 * Run: GEMINI_API_KEY=... npx tsx scripts/buildIndex.ts
 */
import path from 'path';
import { KB_INDEX_DIR } from '../config/ai.ts';
import { allChunks } from '../lib/rag.ts';
import { geminiEmbedder, retrievalStatus, setMaxQuotaWait, startRetrieval, syncVectorIndex } from '../lib/vectorStore.ts';

process.env.KB_FETCH_FULL_DOCS = 'false';
const embedder = await geminiEmbedder();
if (!embedder) {
  console.log('GEMINI_API_KEY is not set: skipping the vector index build. Add it as a repository secret to enable this step.');
  process.exit(0);
}

setMaxQuotaWait(75);
await startRetrieval({ embedder, dir: path.resolve(process.cwd(), KB_INDEX_DIR) });
for (let round = 1; round <= 3; round++) {
  const st = retrievalStatus();
  if (st.lastSync && !st.lastError) break;
  console.log(`Retrying the index build (round ${round}) after: ${st.lastError}`);
  await new Promise((r) => setTimeout(r, 65_000));
  await syncVectorIndex().catch(() => undefined);
}

const st = retrievalStatus();
console.log(JSON.stringify({ passages: allChunks().length, lastSync: st.lastSync, lastError: st.lastError }, null, 2));
if (!st.lastSync) {
  console.log('Index build did not finish (see lastError). Saved progress is kept and the next run will resume.');
}
