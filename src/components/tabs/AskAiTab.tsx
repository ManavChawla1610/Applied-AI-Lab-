/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, Send, AlertTriangle, ExternalLink, Bot, User, Globe, FileText, Database } from 'lucide-react';
import { EarningsResult, SpaceType, BedroomOption } from '../../../lib/calc';
import { MonthlyFinancialSummary } from '../../../lib/costs';
import { verifyReplyNumbers } from '../../lib/aiVerify';
import { DC_RULES } from '../../../config/dcRules';
import { DC_MARKET } from '../../../config/market';
import { DEFAULT_COST_ITEMS } from '../../../config/costs';

interface AskAiTabProps {
  nights: number;
  spaceType: SpaceType;
  bedrooms: BedroomOption;
  estimateResult: EarningsResult;
  costSummary: MonthlyFinancialSummary;
}

export type SourceTag = 'Your results' | 'DC rules – DLCP' | 'Market data – AirROI' | 'Web search';

export interface CitedLink {
  uri: string;
  title: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  sourceTag?: SourceTag;
  citedLinks?: CitedLink[];
  hasUnverifiedNumber?: boolean;
  unverifiedNumbers?: string[];
  isError?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "Why is my estimate lower than Airbnb's?",
  "Which costs can I cut?",
  "When is DC's busy season?",
  "Do I need a license for my basement?",
  "What happens if I go over 90 nights?",
];

export function parseSourceTag(raw: string): { sourceTag?: SourceTag; body: string } {
  const match = raw.match(/^\s*\[(Your results|DC rules – DLCP|Market data – AirROI|Web search)\]\s*:?\s*/i);
  if (match) {
    const rawTag = match[1].toLowerCase();
    let normalizedTag: SourceTag = 'Your results';
    if (rawTag.includes('results')) normalizedTag = 'Your results';
    else if (rawTag.includes('dlcp') || rawTag.includes('rules')) normalizedTag = 'DC rules – DLCP';
    else if (rawTag.includes('market') || rawTag.includes('airroi')) normalizedTag = 'Market data – AirROI';
    else if (rawTag.includes('web') || rawTag.includes('search')) normalizedTag = 'Web search';

    return {
      sourceTag: normalizedTag,
      body: raw.slice(match[0].length).trim(),
    };
  }
  return { body: raw.trim() };
}

export const AskAiTab: React.FC<AskAiTabProps> = ({
  nights,
  spaceType,
  bedrooms,
  estimateResult,
  costSummary,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I can explain your DC earnings estimate, costs & profit waterfall, official DLCP short-term rental rules, or AirROI market data. Every answer cites its source tier: [Your results], [DC rules – DLCP], [Market data – AirROI], or [Web search]. What would you like to know?",
      sourceTag: 'Your results',
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Construct structured user scenario for Gemini context (NEVER include street address)
  const buildUserScenario = () => ({
    nights,
    spaceType,
    bedrooms,
    // Replace street address with neighborhood only
    neighborhood: 'Capitol Hill / Washington, DC',
    listingPricePerNight: estimateResult.medianListingPrice,
    typicalNightlyPayout: estimateResult.typicalNightlyEarnings,
    typicalMonthlyPayout: estimateResult.typicalMonthly,
    rangeLowMonthly: estimateResult.rangeLowMonthly,
    rangeHighMonthly: estimateResult.rangeHighMonthly,
    benchmarkNights: estimateResult.benchmarkNights,
    comparablesCount: estimateResult.comparablesCount,
    searchRadiusMi: estimateResult.finalRadiusMi,
    grossBookingsMonthly: Math.round(costSummary.grossBookings),
    totalCostsMonthly: Math.round(costSummary.totalCosts),
    netTakeHomeMonthly: Math.round(costSummary.netBeforeHousing),
    annualNetTakeHome: Math.round(costSummary.annualNetBeforeHousing),
    airbnbFeeMonthly: Math.round(costSummary.airbnbFee),
    cleaningCostMonthly: Math.round(costSummary.cleaningCost),
    utilitiesMonthly: Math.round(costSummary.utilitiesCost),
    suppliesMonthly: Math.round(costSummary.suppliesCost),
    repairsMonthly: Math.round(costSummary.repairsCost),
    insuranceAnnual: 340,
    licenseBiennial: 99,
  });

  const handleSend = async (questionText: string) => {
    const q = questionText.trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: q,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    const userScenario = buildUserScenario();
    const fullContextObj = {
      userScenario,
      dcRules: DC_RULES,
      market: DC_MARKET,
      costs: DEFAULT_COST_ITEMS,
    };

    try {
      const res = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          userScenario,
        }),
      });

      const data = await res.json();

      if (!data.available) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            sender: 'assistant',
            text: data.error || 'AI answers are unavailable right now — every number in the other tabs still works.',
            isError: true,
          },
        ]);
        return;
      }

      const rawReply = data.answer || '';
      const { sourceTag, body } = parseSourceTag(rawReply);
      const citedLinks: CitedLink[] = data.citedLinks || [];

      // Client-side verification redundancy check
      const verification = verifyReplyNumbers(body, fullContextObj);

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          text: body,
          sourceTag,
          citedLinks,
          hasUnverifiedNumber: data.hasUnverifiedNumber || verification.hasUnverifiedNumber,
          unverifiedNumbers: data.unverifiedNumbers || verification.unverifiedNumbers,
        },
      ]);
    } catch (err: unknown) {
      console.error('Ask AI error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          text: 'AI answers are unavailable right now — every number in the other tabs still works.',
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getSourceBadge = (tag?: SourceTag) => {
    if (!tag) return null;
    switch (tag) {
      case 'Your results':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Database className="w-3 h-3" />
            <span>[Your results]</span>
          </span>
        );
      case 'DC rules – DLCP':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <FileText className="w-3 h-3" />
            <span>[DC rules – DLCP]</span>
          </span>
        );
      case 'Market data – AirROI':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <Sparkles className="w-3 h-3" />
            <span>[Market data – AirROI]</span>
          </span>
        );
      case 'Web search':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Globe className="w-3 h-3" />
            <span>[Web search]</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Grounded DC Host Assistant</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Ask about hosting in DC
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 max-w-xl mx-auto">
          Tiered sources: (1) Your personalized scenario, (2) Official DLCP rules, and (3) Google Search grounding fallback.
        </p>
      </div>

      {/* Suggested Question Chips */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
          Suggested Questions:
        </span>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isLoading}
              onClick={() => handleSend(q)}
              className="text-xs font-medium bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-900 text-gray-800 py-1.5 px-3 rounded-full transition-all cursor-pointer shadow-2xs disabled:opacity-50 text-left"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs flex flex-col h-[520px] overflow-hidden">
        {/* Messages Stream */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed space-y-2.5 ${
                  msg.sender === 'user'
                    ? 'bg-gray-900 text-white rounded-br-xs font-medium'
                    : msg.isError
                    ? 'bg-amber-50 text-amber-900 border border-amber-200 rounded-bl-xs'
                    : 'bg-gray-50 border border-gray-200/90 text-gray-800 rounded-bl-xs'
                }`}
              >
                {/* Source Tag Badge */}
                {msg.sender === 'assistant' && !msg.isError && msg.sourceTag && (
                  <div>{getSourceBadge(msg.sourceTag)}</div>
                )}

                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Cited Links for Web Search & DLCP */}
                {msg.sender === 'assistant' &&
                  !msg.isError &&
                  (msg.sourceTag === 'Web search' || msg.sourceTag === 'DC rules – DLCP') && (
                    <div className="pt-2 border-t border-gray-200/60 text-xs space-y-1">
                      <div className="font-semibold text-gray-600 text-[11px] uppercase tracking-wider">
                        Sources Cited:
                      </div>
                      {msg.citedLinks && msg.citedLinks.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {msg.citedLinks.map((link, lIdx) => (
                            <a
                              key={lIdx}
                              href={link.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1 truncate max-w-full font-medium"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">{link.title || link.uri}</span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-500 italic text-[11px]">
                          Unverified — no source returned
                        </div>
                      )}
                    </div>
                  )}

                {/* Web Search Notice */}
                {msg.sender === 'assistant' && msg.sourceTag === 'Web search' && (
                  <div className="text-[11px] text-gray-500 italic">
                    From the web — check the linked source before relying on it.
                  </div>
                )}

                {/* Unverified Number Flag Warning */}
                {msg.sender === 'assistant' &&
                  (msg.sourceTag === 'Your results' || msg.sourceTag === 'Market data – AirROI') &&
                  msg.hasUnverifiedNumber && (
                    <div className="mt-2.5 pt-2 border-t border-amber-200/80 flex items-center gap-1.5 text-xs text-amber-800 font-semibold">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>⚠️ Unverified number: Some numbers in this reply were not found in your context data.</span>
                    </div>
                  )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 items-center text-xs text-gray-500">
              <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-bounce [animation-delay:0.4s]" />
                <span className="text-xs text-gray-500 font-medium ml-1">Analyzing verified DC data & search...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputText);
          }}
          className="p-3 sm:p-4 border-t border-gray-100 bg-gray-50/50 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            placeholder="Ask a question about DC licenses, seasons, expenses, or your numbers..."
            className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-gray-900 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-2.5 sm:px-4 sm:py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs sm:text-sm font-semibold"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Ask</span>
          </button>
        </form>
      </div>

      {/* Safety Policy & Grounding Note */}
      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-500 space-y-1">
        <p className="font-semibold text-gray-700">
          Strict Data Integrity Rules:
        </p>
        <p className="leading-relaxed">
          Answers cite sources in order: (1) your personalized estimate results, (2) official DLCP regulations, and (3) Google Search grounding fallback. Your street address is never sent to the model. If an official answer is not documented, it will direct you to the DC DLCP Short-Term Rental Hotline at (202) 221-8550 or a licensed CPA.
        </p>
      </div>
    </div>
  );
};
