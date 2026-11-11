/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, ArrowUp, X } from 'lucide-react';
import { EarningsResult, GeoPoint, SpaceType, BedroomOption } from '../../lib/calc';
import { MonthlyFinancialSummary } from '../../lib/costs';
import { CostAssumptions } from '../../config/costs';
import { AIRBNB_HOST_FEE } from '../../config/rules';
import { ASSISTANT_GREETING, HISTORY_MESSAGES } from '../../config/ai';

interface HostChatProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  nights: number;
  spaceType: SpaceType;
  bedrooms: BedroomOption;
  estimateResult: EarningsResult;
  costSummary: MonthlyFinancialSummary;
  pin?: GeoPoint;
  costAssumptions?: CostAssumptions;
}

export interface CitedLink {
  uri: string;
  title: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  time: string;
  links?: CitedLink[];
  isError?: boolean;
}

const SUGGESTED_QUESTIONS = [
  'Why is my payout lower than my price?',
  'Do I need a license for my basement?',
  "When is DC's busy season?",
  'Which costs can I cut?',
  'What if I go over 90 nights?',
];

// Kept for backward compatibility with older tests: strips a leading "[Tag]" if a model ever adds one.
export function parseSourceTag(raw: string): { sourceTag?: string; body: string } {
  const match = raw.match(/^\s*\[(Your results|DC rules – DLCP|Market data – AirROI|Web search)\]\s*:?\s*/i);
  return match ? { sourceTag: match[1], body: raw.slice(match[0].length).trim() } : { body: raw.trim() };
}

/** DC quadrant from coordinates, measured from the U.S. Capitol. Only this coarse area is sent to the AI. */
export function dcQuadrant(pin?: GeoPoint): string {
  if (!pin) return 'Washington, DC';
  const capitol = { lat: 38.8899, lng: -77.0091 };
  const ns = pin.lat >= capitol.lat ? 'North' : 'South';
  const ew = pin.lng >= capitol.lng ? 'east' : 'west';
  return `${ns}${ew} DC`;
}

const MANAGEMENT_LABEL: Record<string, string> = {
  self: 'Self-managed',
  cohost: 'Co-host (10%)',
  full: 'Full-service manager (20%)',
};

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Airbnb-style assistant: a floating "Questions?" button on every tab that opens a chat panel
 * on the right. The panel stays mounted while closed, so the conversation is kept.
 */
export const HostChat: React.FC<HostChatProps> = ({
  isOpen,
  onOpen,
  onClose,
  nights,
  spaceType,
  bedrooms,
  estimateResult,
  costSummary,
  pin,
  costAssumptions,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', sender: 'assistant', text: ASSISTANT_GREETING, time: nowLabel() },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasAsked, setHasAsked] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  // Only coarse, non-identifying values are sent. Never the street address or coordinates.
  const buildUserScenario = () => ({
    area: dcQuadrant(pin),
    spaceType: spaceType === 'entire_home' ? 'Entire place' : 'Private room',
    bedrooms: spaceType === 'entire_home' ? (bedrooms === 'studio' ? 'Studio' : `${bedrooms} bedroom(s)`) : 'n/a',
    nightsPerMonth: nights,
    listingPricePerNight: Math.round(estimateResult.medianListingPrice),
    payoutPerNightAfterAirbnbFee: Math.round(estimateResult.typicalNightlyEarnings),
    estimatedMonthlyPayout: Math.round(estimateResult.typicalMonthly),
    typicalRangeLowMonthly: Math.round(estimateResult.rangeLowMonthly),
    typicalRangeHighMonthly: Math.round(estimateResult.rangeHighMonthly),
    estimatedYearlyPayout: Math.round(estimateResult.typicalAnnual),
    similarListingsUsed: estimateResult.comparablesCount,
    searchRadiusMiles: estimateResult.finalRadiusMi,
    similarHomesBookNightsPerMonth: estimateResult.benchmarkNights,
    airbnbHostFeePercent: Math.round(AIRBNB_HOST_FEE * 1000) / 10,
    managementChoice: MANAGEMENT_LABEL[costAssumptions?.managementType || 'self'],
    cleaningChoice: costAssumptions?.cleanOption === 'self' ? 'Cleans it themselves' : 'Hires a cleaner',
    cleaningFeeChargedPerStay: costAssumptions?.chargeCleaningFee === false ? 0 : costAssumptions?.cleaningFeeAmount,
    grossBookingsMonthly: Math.round(costSummary.grossBookings),
    airbnbFeeMonthly: Math.round(costSummary.airbnbFee),
    cleaningCostMonthly: Math.round(costSummary.cleaningCost),
    utilitiesMonthly: Math.round(costSummary.utilitiesCost),
    suppliesMonthly: Math.round(costSummary.suppliesCost),
    repairsMonthly: Math.round(costSummary.repairsCost),
    managementMonthly: Math.round(costSummary.managementCost),
    insuranceMonthly: Math.round(costSummary.insuranceCost),
    licenseMonthly: Math.round(costSummary.licenseCost),
    totalCostsMonthly: Math.round(costSummary.totalCosts),
    netBeforeHousingMonthly: Math.round(costSummary.netBeforeHousing),
    netBeforeHousingYearly: Math.round(costSummary.annualNetBeforeHousing),
  });

  const handleSend = async (questionText: string) => {
    const q = questionText.trim();
    if (!q || isLoading) return;

    const history = messages
      .filter((m) => m.id !== 'welcome' && !m.isError)
      .slice(-HISTORY_MESSAGES)
      .map((m) => ({ role: m.sender, text: m.text }));

    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, sender: 'user', text: q, time: nowLabel() }]);
    setInputText('');
    setHasAsked(true);
    setIsLoading(true);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, history, userScenario: buildUserScenario() }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        data.ok
          ? {
              id: `a-${Date.now()}`,
              sender: 'assistant',
              text: parseSourceTag(String(data.answer || '')).body,
              time: nowLabel(),
              links: data.usedWeb ? data.links || [] : [],
            }
          : {
              id: `a-${Date.now()}`,
              sender: 'assistant',
              text: data.message || 'Something went wrong — try again.',
              time: nowLabel(),
              isError: true,
            },
      ]);
    } catch (err) {
      console.error('Ask AI request failed:', err);
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, sender: 'assistant', text: 'Something went wrong — try again.', time: nowLabel(), isError: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating launcher, bottom-right on every tab (like Airbnb's "Questions?") */}
      {!isOpen && (
        <button
          type="button"
          onClick={onOpen}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-white text-gray-900 font-semibold text-sm sm:text-base pl-4 pr-5 py-3 rounded-full shadow-[0_6px_24px_rgba(0,0,0,0.18)] border border-gray-200 hover:shadow-[0_8px_28px_rgba(0,0,0,0.24)] transition-shadow cursor-pointer"
          aria-label="Open the hosting assistant"
        >
          <Sparkles className="w-4 h-4 text-rose-500" />
          <span>Questions?</span>
        </button>
      )}

      {/* Chat panel: right side on desktop, full screen on mobile */}
      <div
        role="dialog"
        aria-label="Ask about hosting in DC"
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={`fixed z-50 bg-white flex flex-col overflow-hidden transition-all duration-200
          inset-0 sm:inset-auto sm:right-5 sm:bottom-5 sm:top-20 sm:w-[400px] sm:rounded-3xl sm:border sm:border-gray-200 sm:shadow-[0_12px_40px_rgba(0,0,0,0.22)]
          ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="relative flex items-center justify-center gap-2 py-4 border-b border-gray-100">
          <Sparkles className="w-4 h-4 text-rose-500" />
          <h2 className="text-base font-semibold text-gray-900">Ask about hosting</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 p-2 rounded-full text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
          {messages.map((msg) =>
            msg.sender === 'user' ? (
              <div key={msg.id} className="flex flex-col items-end gap-1">
                <span className="text-[11px] text-gray-400">{msg.time}</span>
                <div className="max-w-[80%] bg-gray-900 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.text}
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex gap-2.5 items-end">
                <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col gap-1 max-w-[85%]">
                  <span className="text-[11px] text-gray-400">Assistant · {msg.time}</span>
                  <div
                    className={`rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.isError ? 'bg-amber-50 text-amber-900' : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.links && msg.links.length > 0 && (
                    <div className="text-[11px] text-gray-400 pl-1">
                      Source:{' '}
                      {msg.links.map((l, i) => (
                        <React.Fragment key={l.uri}>
                          {i > 0 && ' · '}
                          <a href={l.uri} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
                            {l.title}
                          </a>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          {isLoading && (
            <div className="flex gap-2.5 items-end">
              <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1" aria-label="Assistant is typing">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          )}

          {!hasAsked && (
            <div className="flex flex-wrap gap-2 pl-10">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSend(q)}
                  className="text-xs text-gray-800 bg-white border border-gray-300 hover:border-gray-900 rounded-full px-3 py-1.5 transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputText);
          }}
          className="p-3 border-t border-gray-100"
        >
          <div className="flex items-center gap-2 border border-gray-300 rounded-full pl-4 pr-1.5 py-1.5 focus-within:border-gray-900">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Write a message…"
              aria-label="Write a message"
              className="flex-1 text-sm bg-transparent focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              aria-label="Send"
              className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center disabled:bg-gray-200 disabled:text-gray-400 cursor-pointer disabled:cursor-not-allowed"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </>
  );
};
