/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { AIRBNB_HOST_FEE } from '../../config/rules';
import { formatCurrency } from '../../lib/calc';

interface MethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  comparablesCount: number;
  searchRadiusMi: number;
  typicalNightlyPrice: number; // P
  typicalNightlyEarnings: number; // E
  nights: number; // N
  typicalMonthly: number; // X
  rangeLowMonthly: number; // LOW
  rangeHighMonthly: number; // HIGH
  onOpenCostsTab?: () => void;
}

export const MethodModal: React.FC<MethodModalProps> = ({
  isOpen,
  onClose,
  comparablesCount,
  searchRadiusMi,
  typicalNightlyPrice,
  typicalNightlyEarnings,
  nights,
  typicalMonthly,
  rangeLowMonthly,
  rangeHighMonthly,
  onOpenCostsTab,
}) => {
  const [isDataOpen, setIsDataOpen] = useState(false);

  if (!isOpen) return null;

  const hostFeePercent = (AIRBNB_HOST_FEE * 100).toFixed(1);
  const annualEarnings = typicalMonthly * 12;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="method-modal-title"
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto my-auto">
        {/* Header: Close 'X' top-left, centered title */}
        <div className="relative flex items-center justify-center border-b border-gray-100 pb-4">
          <button
            type="button"
            onClick={onClose}
            className="absolute left-0 p-1.5 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 id="method-modal-title" className="text-base font-semibold text-gray-900 text-center">
            How we estimate your earnings
          </h2>
        </div>

        {/* Plain Paragraphs with current state values */}
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>
            We looked at <strong className="text-gray-900 font-semibold">{comparablesCount}</strong> similar listing{comparablesCount === 1 ? '' : 's'} within{' '}
            <strong className="text-gray-900 font-semibold">{searchRadiusMi} miles</strong> of your home, using the past 12 months of booking data.
          </p>

          <p>
            Unlike Airbnb, we include all similar listings — not just the top half — so this estimate is more conservative.
          </p>

          <p>
            Your estimate is the typical nightly price (<strong className="text-gray-900 font-semibold tabular-nums">{formatCurrency(typicalNightlyPrice)}</strong>) minus Airbnb's {hostFeePercent}% host fee (<strong className="text-gray-900 font-semibold tabular-nums">{formatCurrency(typicalNightlyEarnings)}</strong>), times the nights you choose (<strong className="text-gray-900 font-semibold tabular-nums">{nights}</strong>).
          </p>

          <p>
            Most similar homes would earn between{' '}
            <strong className="text-gray-900 font-semibold tabular-nums">{formatCurrency(rangeLowMonthly)}</strong> and{' '}
            <strong className="text-gray-900 font-semibold tabular-nums">{formatCurrency(rangeHighMonthly)}</strong> a month at {nights} nights — about{' '}
            <strong className="text-gray-900 font-semibold tabular-nums">{formatCurrency(annualEarnings)}</strong> a year.
          </p>

          <p>
            Listing price is what guests see per night, before cleaning fees and taxes. We don't subtract cleaning, taxes or other costs here —{' '}
            {onOpenCostsTab ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCostsTab();
                }}
                className="text-rose-600 hover:text-rose-700 font-semibold underline cursor-pointer"
              >
                see the Costs tab
              </button>
            ) : (
              <span className="font-semibold text-gray-900">see the Costs tab</span>
            )}.
          </p>

          {/* About the data (collapsed disclosure) */}
          <div className="pt-2">
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setIsDataOpen((prev) => !prev)}
                className="w-full p-4 flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <span>About the data</span>
                {isDataOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </button>

              {isDataOpen && (
                <div className="p-4 pt-1 border-t border-gray-100 bg-gray-50/50 space-y-2.5 text-xs text-gray-600">
                  <p>
                    <strong>Source:</strong> Trailing 12-month Inside Airbnb / verified DC listings data repository.
                  </p>
                  <p>
                    <strong>Dataset size:</strong> Over 7,000 recorded listings across Washington, DC.
                  </p>
                  <p>
                    <strong>What was removed and why:</strong> Out-of-district listings outside DC, mid-term 30+ day corporate leases, serviced apartments, and listings missing geolocation. Low-activity listings (fewer than 30 booked nights/year) are filtered out by default so abandoned accounts do not distort median rates.
                  </p>
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-400 italic pt-2">
            These estimates are not an appraisal or estimate of property value.
          </p>
        </div>
      </div>
    </div>
  );
};
