/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, X, ChevronDown, ExternalLink, MapPin } from 'lucide-react';
import type { EarningsResult, SpaceType, BedroomOption, GeoPoint } from '../../lib/calc';
import type { MonthlyFinancialSummary } from '../../lib/costs';
import type { CostAssumptions } from '../../config/costs';

export interface CitedLink {
  uri: string;
  title: string;
}

export interface MapAction {
  lat: number;
  lng: number;
  label: string;
  spaceType: SpaceType;
  bedrooms: BedroomOption;
  nights: number;
  estimatedMonthly: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  stepUsed?: 1 | 2;
  citedLinks?: CitedLink[];
  mapActions?: MapAction[];
  isError?: boolean;
}

export interface AskAiChatWidgetProps {
  isOpen: boolean;
  onToggleOpen: (open: boolean) => void;
  pin: GeoPoint;
  neighborhoodLabel: string;
  nights: number;
  spaceType: SpaceType;
  bedrooms: BedroomOption;
  includeLowActivity: boolean;
  priceOverride: number | null;
  estimateResult: EarningsResult;
  costSummary: MonthlyFinancialSummary;
  costAssumptions: CostAssumptions;
  onApplyMapAction?: (action: MapAction) => void;
}

const OPENING_MESSAGE =
  "Hi! I can answer questions about hosting on Airbnb in Washington, DC — your estimate, costs, licenses and DC's rules. I might not always get things right, so double-check important details with DLCP. What's on your mind?";

export const SUGGESTED_CHIPS = [
  'Why is my payout lower than my price?',
  'Do I need a license for my basement?',
  "When is DC's busy season?",
  'Which costs can I cut?',
  'What if I go over 90 nights?',
];

/**
 * Browser-safe helper that strips street numbers/addresses so only the neighborhood is sent.
 */
function sanitizeNeighborhoodClient(rawLabel?: string | null): string {
  if (!rawLabel || typeof rawLabel !== 'string') {
    return 'Capitol Hill, Washington, DC';
  }
  const trimmed = rawLabel.trim();
  if (!trimmed) return 'Capitol Hill, Washington, DC';

  if (/^\d+\s+/.test(trimmed)) {
    const parts = trimmed
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    const remaining = parts.slice(1).filter((p) => !/^\d+/.test(p));
    if (remaining.length > 0) {
      return remaining.join(', ');
    }
    return 'Washington, DC';
  }

  if (
    /\b\d+\s+[A-Za-z0-9]+\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Pl|Place|Way|Dr|Drive|Ct|Court|Ln|Lane)\b/i.test(
      trimmed
    )
  ) {
    return 'Washington, DC';
  }

  return trimmed;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Airbnb-style 4-point sparkle icon in signature rose/coral (#FF385C)
 */
const AirbnbSparkleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2C12.7 7.2 16.8 11.3 22 12C16.8 12.7 12.7 16.8 12 22C11.3 16.8 7.2 12.7 2 12C7.2 11.3 11.3 7.2 12 2Z" />
  </svg>
);

export const AskAiChatWidget: React.FC<AskAiChatWidgetProps> = ({
  isOpen,
  onToggleOpen,
  pin,
  neighborhoodLabel,
  nights,
  spaceType,
  bedrooms,
  includeLowActivity,
  priceOverride,
  estimateResult,
  costSummary,
  costAssumptions,
  onApplyMapAction,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'assistant',
      text: OPENING_MESSAGE,
      timestamp: formatTime(new Date()),
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasAskedQuestion, setHasAskedQuestion] = useState<boolean>(false);

  const threadContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (threadContainerRef.current) {
        threadContainerRef.current.scrollTop = threadContainerRef.current.scrollHeight;
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, messages, isLoading]);

  // Build sanitized userScenario without street address
  const buildUserScenario = () => ({
    neighborhood: sanitizeNeighborhoodClient(neighborhoodLabel),
    pin,
    nights,
    spaceType,
    bedrooms,
    includeLowActivity,
    priceOverride,
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
    managementCostMonthly: Math.round(costSummary.managementCost),
    insuranceMonthly: Math.round(costSummary.insuranceCost),
    licenseMonthly: Math.round(costSummary.licenseCost),
    cleanOption: costAssumptions.cleanOption,
    managementType: costAssumptions.managementType,
  });

  const handleSend = async (questionText: string) => {
    const q = questionText.trim();
    if (!q || isLoading) return;

    const nowStr = formatTime(new Date());
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender: 'user',
      text: q,
      timestamp: nowStr,
    };

    // Capture last 6 conversation messages prior to this turn
    const recentHistory = messages
      .filter((m) => m.id !== 'welcome')
      .slice(-6)
      .map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

    setHasAskedQuestion(true);
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          history: recentHistory,
          userScenario: buildUserScenario(),
        }),
      });

      const data = await res.json();

      if (!data.available) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            sender: 'assistant',
            text:
              data.error ||
              'AI answers are unavailable right now — every number in the other tabs still works.',
            timestamp: formatTime(new Date()),
            isError: true,
          },
        ]);
        return;
      }

      const replyText = (data.answer || '').trim();
      const citedLinks: CitedLink[] = Array.isArray(data.citedLinks) ? data.citedLinks.slice(0, 2) : [];
      const mapActions: MapAction[] = Array.isArray(data.mapActions) ? data.mapActions : [];

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          sender: 'assistant',
          text: replyText,
          timestamp: formatTime(new Date()),
          stepUsed: data.stepUsed === 2 ? 2 : 1,
          citedLinks,
          mapActions,
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
          timestamp: formatTime(new Date()),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Airbnb-style Floating "Questions?" Pill in Bottom-Right Corner */}
      {!isOpen && (
        <div className="fixed bottom-5 right-5 z-[9999]">
          <button
            type="button"
            onClick={() => onToggleOpen(true)}
            className="flex items-center gap-2.5 px-5 py-3 rounded-full bg-white hover:bg-gray-50 text-[#222222] shadow-[0_6px_20px_rgba(0,0,0,0.16)] border border-gray-200/90 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            aria-label="Questions? Ask about hosting in DC"
          >
            <AirbnbSparkleIcon className="w-4 h-4 text-[#FF385C] shrink-0" />
            <span className="text-[15px] font-semibold tracking-tight">Questions?</span>
          </button>
        </div>
      )}

      {/* Expanded Floating Chat Popover in Bottom-Right Corner */}
      {isOpen && (
        <div
          className="fixed bottom-5 right-5 left-4 sm:left-auto z-[9999] sm:w-[410px] h-[560px] max-h-[82vh] bg-white rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.22)] border border-gray-200 flex flex-col overflow-hidden"
          role="dialog"
          aria-label="Ask about hosting in DC"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center text-[#FF385C]">
                <AirbnbSparkleIcon className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-semibold text-gray-900">
                Ask about hosting in DC
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onToggleOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                aria-label="Minimize chat"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => onToggleOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Message Thread */}
          <div
            ref={threadContainerRef}
            className="flex-1 p-4 overflow-y-auto space-y-4 bg-white"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed space-y-2 ${
                    msg.sender === 'user'
                      ? 'bg-gray-900 text-white rounded-br-xs'
                      : msg.isError
                      ? 'bg-amber-50 text-amber-900 border border-amber-200 rounded-bl-xs'
                      : 'bg-gray-100 text-gray-900 rounded-bl-xs'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {/* Only web answers show a small muted "Source:" line with links */}
                  {msg.sender === 'assistant' &&
                    msg.stepUsed === 2 &&
                    msg.citedLinks &&
                    msg.citedLinks.length > 0 && (
                      <div className="pt-1.5 border-t border-gray-200/80 text-[11px] text-gray-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium">Source:</span>
                        {msg.citedLinks.map((link, idx) => (
                          <a
                            key={idx}
                            href={link.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 underline truncate max-w-[180px]"
                          >
                            <span className="truncate">{link.title || link.uri}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}
                </div>

                {/* Show this on the map button for tool estimates */}
                {msg.sender === 'assistant' && msg.mapActions && msg.mapActions.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {msg.mapActions.map((ma, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (onApplyMapAction) {
                            onApplyMapAction(ma);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900 hover:bg-black text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>
                          {msg.mapActions!.length > 1
                            ? `Show ${ma.label} on the map`
                            : 'Show this on the map'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Timestamp */}
                <span className="text-[10px] text-gray-400 mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* Suggested Chips (hidden after first question) */}
            {!hasAskedQuestion && !isLoading && (
              <div className="pt-1 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_CHIPS.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleSend(chip)}
                      className="text-xs bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 hover:border-gray-900 rounded-full px-3 py-1.5 transition-all cursor-pointer text-left shadow-2xs"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Typing Indicator "…" */}
            {isLoading && (
              <div className="flex flex-col items-start">
                <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-bl-xs px-4 py-2.5 text-base font-bold tracking-widest animate-pulse">
                  …
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputText);
            }}
            className="p-3 border-t border-gray-100 bg-gray-50/60 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isLoading}
              placeholder="Ask a question..."
              className="flex-1 px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
            >
              <span>Ask</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
