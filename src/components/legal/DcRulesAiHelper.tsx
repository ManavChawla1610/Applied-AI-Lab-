/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, Send, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';

export const DcRulesAiHelper: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasNumberWarning, setHasNumberWarning] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setAnswer(null);
    setHasNumberWarning(false);

    try {
      const res = await fetch('/api/ask-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: trimmed }),
      });

      if (!res.ok) {
        throw new Error('Rules assistant unavailable');
      }

      const data = await res.json();
      if (data.available === false || !data.answer) {
        setIsUnavailable(true);
        return;
      }

      setAnswer(data.answer);
      setHasNumberWarning(Boolean(data.hasUnknownNumber));
    } catch (err) {
      console.error('Rules AI helper error:', err);
      // If API fails, hide the box as specified
      setIsUnavailable(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isUnavailable) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-4 shadow-xs">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-indigo-600" />
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">
          Ask about DC hosting rules
        </h3>
      </div>
      <p className="text-xs sm:text-sm text-gray-600">
        Have a specific question about District regulations? Ask our verified rules helper, which answers strictly using official DLCP guidelines.
      </p>

      <form onSubmit={handleAsk} className="space-y-3">
        <div className="relative flex items-center">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Can I host if I rent my English basement while living upstairs?"
            className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-300 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 shadow-2xs"
          />
          <button
            type="submit"
            disabled={!question.trim() || isLoading}
            className="absolute right-2 p-2 bg-gray-900 hover:bg-black text-white rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
            aria-label="Submit question"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </form>

      {answer && (
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 space-y-2 mt-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Official DLCP Rules Response:</span>
          </div>
          <div className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {answer}
          </div>

          {hasNumberWarning && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2 mt-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Caution: This response contains an unverified numeric value not listed in official rules. Always verify with DLCP at (202) 221-8550.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
