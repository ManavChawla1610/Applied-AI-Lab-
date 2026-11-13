/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Downloads the official pages and PDFs listed in knowledge/sources.csv (use_in_rag = yes)
 * and saves their plain text to knowledge/full/<id>.txt, plus knowledge/full/_report.json.
 * The app indexes these files at startup, so it never has to download pages at runtime.
 *
 * Run: npx tsx scripts/fetchSources.ts   (GitHub Actions runs it weekly)
 * A page that fails keeps its previously saved text, so one bad week loses nothing.
 */
import fs from 'fs';
import path from 'path';
import { KNOWLEDGE_DIR, fetchSourceText, parseCsv } from '../lib/rag.ts';
import type { SourceRow } from '../lib/rag.ts';

const outDir = path.join(KNOWLEDGE_DIR, 'full');
fs.mkdirSync(outDir, { recursive: true });
const today = new Date().toISOString().slice(0, 10);
const rows = (parseCsv(fs.readFileSync(path.join(KNOWLEDGE_DIR, 'sources.csv'), 'utf8')) as unknown as SourceRow[]).filter(
  (r) => r.use_in_rag === 'yes' && (r.format === 'html' || r.format === 'pdf') && /^https:\/\//.test(r.url)
);

const results = [];
for (const row of rows) {
  const file = path.join(outDir, `${row.id}.txt`);
  let ok = false;
  let error: string | undefined;
  let words = 0;
  for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
    try {
      const text = await fetchSourceText(row, fetch, 45_000);
      // Wrap long lines so weekly diffs on GitHub are readable.
      const wrapped = text.replace(/([.;:])\s+/g, '$1\n');
      fs.writeFileSync(file, `retrieved: ${today}\n${wrapped}\n`);
      words = text.split(/\s+/).length;
      ok = true;
      error = undefined;
    } catch (err) {
      error = String((err as Error)?.message || err).slice(0, 140);
    }
  }
  const kept = !ok && fs.existsSync(file);
  console.log(`${ok ? 'OK  ' : kept ? 'KEPT' : 'FAIL'} ${row.id.padEnd(4)} ${row.url}${ok ? ` (${words} words)` : ` — ${error}`}`);
  results.push({
    id: row.id,
    title: row.title,
    url: row.url,
    format: row.format,
    ok: ok || kept,
    passages: 0,
    ...(ok ? {} : { error: kept ? `${error} (kept text from an earlier run)` : error }),
  });
}

fs.writeFileSync(path.join(outDir, '_report.json'), JSON.stringify({ at: new Date().toISOString(), results }, null, 2) + '\n');
const okCount = results.filter((r) => r.ok).length;
console.log(`\n${okCount}/${results.length} sources saved to knowledge/full/`);
