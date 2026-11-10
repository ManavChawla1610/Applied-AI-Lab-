/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle, AlertTriangle, HelpCircle, Calendar } from 'lucide-react';
import { EarningsResult, clampNights, formatCurrency } from '../../lib/calc';
import { AIRBNB_HOST_FEE } from '../../config/rules';

interface EstimatorHeadlineProps {
  result: EarningsResult;
  nights: number;
  onNightsChange: (nights: number) => void;
  onOpenNightsModal: () => void;
  onOpenMethodModal: () => void;
}

export const EstimatorHeadline: React.FC<EstimatorHeadlineProps> = ({
  result,
  nights,
  onNightsChange,
  onOpenNightsModal,
  onOpenMethodModal,
}) => {
  if (!result.hasEnoughData) {
    return (
      <div className="space-y-4 py-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Insufficient local data</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 leading-tight">
          Not enough data
        </h1>
        <p className="text-gray-600 text-sm max-w-md leading-relaxed">
          We couldn't find matching comparable listings within {result.finalRadiusMi} miles of your selected location.
          Try increasing your search radius on the map, toggling low-activity listings, or switching space type.
        </p>
      </div>
    );
  }

  const {
    typicalMonthly,
    rangeLowMonthly,
    rangeHighMonthly,
    typicalAnnual,
    typicalNightlyEarnings,
    medianListingPrice,
    benchmarkNights,
    isOptimisticNights,
    isLowConfidence,
  } = result;

  const hostFeePercent = (AIRBNB_HOST_FEE * 100).toFixed(1).replace(/\.0$/, '');

  return (
    <div className="space-y-5">
      {/* Low confidence badge if < MIN_COMPARABLES */}
      {isLowConfidence && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/90 text-amber-800 text-xs font-semibold">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>Low confidence — few similar listings nearby</span>
        </div>
      )}

      {/* Benchmark Warning near the headline whenever N > B */}
      {isOptimisticNights && (
        <div className="p-3.5 bg-amber-50 border border-amber-200/90 rounded-xl text-xs sm:text-sm text-amber-900 flex items-start gap-2.5 leading-relaxed shadow-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            You've chosen more nights ({nights} nights/month) than similar listings usually book ({benchmarkNights} nights/month) — this estimate may be optimistic.
          </p>
        </div>
      )}

      {/* Main Headline (A) */}
      <div className="space-y-1.5">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
          Your DC home could earn about{' '}
          <span className="text-rose-600 font-mono">
            {formatCurrency(typicalMonthly)}
          </span>
          <span className="text-xl sm:text-2xl text-gray-600 font-normal ml-1">
            /month
          </span>{' '}
          on Airbnb
        </h1>

        {/* Payout Sub-label */}
        <p className="text-xs sm:text-sm text-gray-500 font-normal">
          Your estimated payout after Airbnb's fee, before cleaning, taxes and other costs.
        </p>

        {/* Range and Annual Projection */}
        <div className="text-sm sm:text-base text-gray-600 font-medium pt-1">
          Typical range:{' '}
          <span className="text-gray-900 font-semibold font-mono">
            {formatCurrency(rangeLowMonthly)}
          </span>{' '}
          –{' '}
          <span className="text-gray-900 font-semibold font-mono">
            {formatCurrency(rangeHighMonthly)}
          </span>
          <span className="text-gray-500">/month</span>{' '}
          <span className="text-gray-300 mx-1.5">·</span> about{' '}
          <span className="text-gray-900 font-semibold font-mono">
            {formatCurrency(typicalAnnual)}
          </span>
          <span className="text-gray-500">/year</span>
        </div>
      </div>

      {/* Summary line & Links (B) */}
      <div className="space-y-2 pt-2 border-t border-gray-100">
        <div className="flex items-center flex-wrap gap-2 text-sm sm:text-base text-gray-800 leading-normal">
          <button
            type="button"
            onClick={onOpenNightsModal}
            className="inline-flex items-center gap-1.5 font-bold text-gray-900 underline decoration-rose-400 decoration-2 underline-offset-4 hover:text-rose-600 transition-colors cursor-pointer"
            aria-label={`Open nights picker, currently ${nights} nights`}
          >
            <Calendar className="w-4 h-4 text-rose-500" />
            <span>{nights} {nights === 1 ? 'night' : 'nights'}</span>
          </button>
          <span className="text-gray-400">·</span>

          {/* Dominant Listing Price */}
          <span className="font-bold text-gray-900 font-mono text-base sm:text-lg">
            {formatCurrency(medianListingPrice)}
          </span>
          <span className="font-semibold text-gray-900">/night listing price</span>

          {/* Muted bracketed payout */}
          <span className="text-xs sm:text-sm text-gray-500 font-normal">
            (you receive ≈ <span className="font-mono font-medium text-gray-700">{formatCurrency(typicalNightlyEarnings)}/night</span> after Airbnb's {hostFeePercent}% host fee)
          </span>
        </div>

        <div>
          <button
            type="button"
            onClick={onOpenMethodModal}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 hover:text-gray-900 font-medium underline decoration-gray-300 underline-offset-2 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
            <span>Learn how we estimate earnings</span>
          </button>
        </div>
      </div>

      {/* Nights slider (C) */}
      <div className="space-y-2 pt-2 bg-gray-50/80 p-4 rounded-xl border border-gray-200/70">
        <div className="flex items-center justify-between text-xs font-medium text-gray-700">
          <label htmlFor="nights-slider" className="flex items-center gap-1">
            <span>Hosting frequency:</span>
            <strong className="text-gray-900 font-mono text-sm">{nights} nights/month</strong>
          </label>
          <button
            type="button"
            onClick={onOpenNightsModal}
            className="text-rose-600 hover:text-rose-700 hover:underline text-xs font-semibold cursor-pointer"
          >
            Stepper view
          </button>
        </div>

        <input
          id="nights-slider"
          type="range"
          min={1}
          max={30}
          value={nights}
          onChange={(e) => onNightsChange(clampNights(Number(e.target.value)))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
          aria-label="Host nights per month slider"
        />

        <div className="flex justify-between text-[11px] text-gray-600 font-mono">
          <span>1 night/mo</span>
          <span className="text-blue-700 font-sans font-medium">Market benchmark: ~{benchmarkNights} nights/mo</span>
          <span>30 nights/mo</span>
        </div>
      </div>
    </div>
  );
};
