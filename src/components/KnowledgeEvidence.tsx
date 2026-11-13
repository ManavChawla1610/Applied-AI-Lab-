/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Evidence UI for the "Questions?" assistant:
 *  - CitedText: renders [1] markers in an answer as tappable chips.
 *  - SourcesRow: the numbered sources under an answer.
 *  - EvidenceSheet: the exact passage a claim came from, with publisher, date and a link.
 *  - KnowledgeSearch: search the document library directly, no AI in between.
 */

import React, { useState } from 'react';
import { ExternalLink, FileText, Search, X, ShieldCheck, Loader2 } from 'lucide-react';

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
  method: 'vector' | 'keyword';
  quote: string;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function authorityLabel(authority: string): { text: string; tone: string } {
  const a = (authority || '').toLowerCase();
  if (a.includes('proposal') || a.includes('proposed'))
    return { text: 'Proposal, not law', tone: 'bg-amber-50 text-amber-800 border-amber-200' };
  if (a.includes('commercial') || a.includes('market'))
    return { text: 'Market estimate', tone: 'bg-sky-50 text-sky-800 border-sky-200' };
  if (a.includes('platform')) return { text: 'Airbnb policy', tone: 'bg-rose-50 text-rose-800 border-rose-200' };
  if (a.includes('older')) return { text: 'Official (older guide)', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  if (a.includes('official')) return { text: 'Official source', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  return { text: authority || 'Reference', tone: 'bg-gray-50 text-gray-700 border-gray-200' };
}

function scoreLabel(c: Citation): string {
  if (c.method === 'vector') return `${Math.round(c.score * 100)}% match`;
  return 'keyword match';
}

/** Answer text with [n] markers turned into chips that open the evidence. */
export const CitedText: React.FC<{
  text: string;
  citations?: Citation[];
  onOpen: (c: Citation) => void;
}> = ({ text, citations, onOpen }) => {
  if (!citations || citations.length === 0) return <div className="whitespace-pre-wrap">{text}</div>;
  const byN = new Map(citations.map((c) => [c.n, c]));
  const parts = text.split(/(\[\d+\])/g);
  return (
    <div className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        const m = part.match(/^\[(\d+)\]$/);
        const c = m ? byN.get(Number(m[1])) : undefined;
        if (!c) return <React.Fragment key={i}>{part}</React.Fragment>;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onOpen(c)}
            title={`${c.title} — ${c.section}`}
            aria-label={`Source ${c.n}: ${c.title}`}
            className="inline-flex items-center justify-center align-super mx-[1px] min-w-[16px] h-[16px] px-1 rounded-full bg-white border border-gray-300 text-[9px] font-bold text-gray-700 hover:border-gray-900 hover:text-gray-900 leading-none cursor-pointer"
          >
            {c.n}
          </button>
        );
      })}
    </div>
  );
};

/** Numbered list of sources under an answer. */
export const SourcesRow: React.FC<{ citations: Citation[]; onOpen: (c: Citation) => void }> = ({ citations, onOpen }) => (
  <div className="pt-2 border-t border-gray-200/80 space-y-1">
    <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Sources</div>
    {citations.map((c) => (
      <button
        key={c.n}
        type="button"
        onClick={() => onOpen(c)}
        className="w-full flex items-start gap-1.5 text-left text-[11px] text-gray-700 hover:text-gray-900 group cursor-pointer"
      >
        <span className="shrink-0 mt-[1px] inline-flex items-center justify-center w-4 h-4 rounded-full bg-white border border-gray-300 text-[9px] font-bold group-hover:border-gray-900">
          {c.n}
        </span>
        <span className="min-w-0">
          <span className="font-medium underline decoration-gray-300 group-hover:decoration-gray-900">{c.title}</span>
          <span className="text-gray-500"> · {c.publisher}</span>
        </span>
      </button>
    ))}
  </div>
);

/** Card showing one passage as evidence. Used by the sheet and the search results. */
export const EvidenceCard: React.FC<{ c: Citation; compact?: boolean }> = ({ c, compact }) => {
  const auth = authorityLabel(c.authority);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${auth.tone}`}>
          <ShieldCheck className="w-3 h-3" />
          {auth.text}
        </span>
        <span className="text-[10px] text-gray-500">{scoreLabel(c)}</span>
      </div>
      <div>
        <div className="text-sm font-semibold text-gray-900 leading-snug">{c.title}</div>
        <div className="text-[11px] text-gray-500">
          {c.section} · {c.publisher}
          {c.retrieved ? ` · checked ${c.retrieved}` : ''}
        </div>
      </div>
      <blockquote
        className={`border-l-[3px] border-[#FF385C] bg-gray-50 rounded-r-lg px-3 py-2 text-[12px] leading-relaxed text-gray-800 whitespace-pre-wrap ${
          compact ? 'line-clamp-5' : ''
        }`}
      >
        {c.quote}
      </blockquote>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
          <FileText className="w-3 h-3" />
          {c.kind === 'full_text' ? 'Exact text from the source page' : 'From our summary of this source'}
        </span>
        {c.url && (
          <a
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-900 underline hover:text-[#FF385C] shrink-0"
          >
            Open {hostOf(c.url) || 'source'}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
};

/** Bottom sheet inside the chat window showing the passage behind a citation. */
export const EvidenceSheet: React.FC<{ citation: Citation | null; onClose: () => void }> = ({ citation, onClose }) => {
  if (!citation) return null;
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end" role="dialog" aria-label="Source evidence">
      <button type="button" aria-label="Close evidence" onClick={onClose} className="absolute inset-0 bg-black/25 cursor-default" />
      <div className="relative bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.18)] max-h-[78%] overflow-y-auto p-5 pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Source {citation.n}</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <EvidenceCard c={citation} />
      </div>
    </div>
  );
};

const SEARCH_EXAMPLES = ['Penalty for hosting without a license', 'Insurance requirement', 'Lodging tax rate', '90-night cap exemptions'];

/** Search the document library directly and read the matching passages. */
export const KnowledgeSearch: React.FC = () => {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<Citation[] | null>(null);
  const [lastQuery, setLastQuery] = useState('');

  const run = async (query: string) => {
    const term = query.trim();
    if (term.length < 2 || loading) return;
    setQ(term);
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/kb/search?q=${encodeURIComponent(term)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Search failed');
      setResults(Array.isArray(data.results) ? data.results : []);
      setLastQuery(term);
    } catch (err) {
      setError(String((err as Error)?.message || 'Search is unavailable right now'));
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(q);
        }}
        className="p-3 border-b border-gray-100 flex items-center gap-2 shrink-0"
      >
        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-xl focus-within:border-gray-900">
          <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search DC rules, fees, taxes…"
            aria-label="Search the source documents"
            className="flex-1 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent"
          />
        </div>
        <button
          type="submit"
          disabled={q.trim().length < 2 || loading}
          className="px-3.5 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs sm:text-sm font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          Search
        </button>
      </form>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!results && !loading && !error && (
          <div className="space-y-3">
            <p className="text-xs text-gray-600 leading-relaxed">
              Read the exact passages the assistant answers from: DC's licensing rules, the DC Code, tax and Airbnb policy
              pages. Results are ranked by meaning, not just matching words.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SEARCH_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => run(ex)}
                  className="text-xs bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 hover:border-gray-900 rounded-full px-3 py-1.5 cursor-pointer"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching the documents…
          </div>
        )}
        {error && <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3">{error}</div>}
        {results && !loading && results.length === 0 && (
          <div className="text-xs text-gray-600">
            No passages matched “{lastQuery}”. Try different words, or ask the assistant.
          </div>
        )}
        {results &&
          !loading &&
          results.map((c) => (
            <div key={`${c.sourceId}-${c.n}`} className="rounded-2xl border border-gray-200 p-3.5">
              <EvidenceCard c={c} compact />
            </div>
          ))}
      </div>
    </div>
  );
};
