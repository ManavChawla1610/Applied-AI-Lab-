# Full source text

Plain text of the official pages and PDFs listed in `../sources.csv` (use_in_rag = yes),
saved by `scripts/fetchSources.ts`. The app indexes these at startup alongside the curated
summaries, so answers can quote the exact source text.

- Refreshed weekly by `.github/workflows/refresh-knowledge.yml` (Mondays), or on demand from
  GitHub → Actions → "Refresh knowledge base" → Run workflow.
- `_report.json` lists which pages loaded and why any failed. A page that fails keeps its
  previously saved text.
- After a refresh commits changes, sync AI Studio and republish to put them live.
