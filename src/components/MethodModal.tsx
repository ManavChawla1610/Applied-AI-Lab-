/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { AIRBNB_HOST_FEE } from '../../config/rules';
import { formatCurrency } from '../../lib/calc';

interface MethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  comparablesCount: number;
  searchRadiusMi: number;
  typicalNightlyPrice: number;
  typicalNightlyEarnings: number;
  nights: number;
  typicalMonthly: number;
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
}) => {
  if (!isOpen) return null;

  const hostFeePercent = (AIRBNB_HOST_FEE * 100).toFixed(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="method-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-gray-700" />
            <h2 id="method-modal-title" className="text-xl font-semibold text-gray-900">
              How we estimate your earnings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-6 text-sm text-gray-700 leading-relaxed">
          {/* Section 1: Real Comparables & Radius */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              1. Real Local Comparables
            </h3>
            <p>
              We look at <strong>{comparablesCount}</strong> similar listing{comparablesCount === 1 ? '' : 's'}{' '}
              within <strong>{searchRadiusMi} miles</strong> of your pin, using the last 12 months of booking
              data from verified Washington, DC listings records (Inside Airbnb / public registry dataset).
            </p>
            <p className="bg-gray-50 p-3 rounded-lg border border-gray-200/80 text-gray-600">
              <strong>All listings, not just top earners:</strong> Unlike Airbnb’s marketing estimator
              which highlights top-decile performers, our model aggregates <em>all</em> matching active
              comparables in your neighborhood to give you an honest 25th to 75th percentile range.
            </p>
          </div>

          {/* Section 2: Mathematical Formulas */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              2. The Exact Math
            </h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200/80">
              <strong>Listing price vs. Payout:</strong> Listing price is what guests see per night (before cleaning fees and taxes). Your payout is the listing price minus Airbnb's host fee.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Nightly earnings:</strong> Guests pay a nightly rate. Hosts pay a standard service fee of{' '}
                <span className="font-mono font-medium text-gray-900">{hostFeePercent}%</span>.
                <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-1 text-gray-800">
                  Nightly earnings = Nightly price × (1 − {AIRBNB_HOST_FEE})
                  {typicalNightlyPrice > 0 && (
                    <span>
                      {' '}
                      ≈ {formatCurrency(typicalNightlyPrice)} × {(1 - AIRBNB_HOST_FEE).toFixed(3)} = {formatCurrency(typicalNightlyEarnings)}/night
                    </span>
                  )}
                </div>
              </li>
              <li>
                <strong>Monthly earnings:</strong>
                <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-1 text-gray-800">
                  Monthly earnings = Nightly earnings × Nights hosted
                  {typicalNightlyEarnings > 0 && (
                    <span>
                      {' '}
                      = {formatCurrency(typicalNightlyEarnings)}/night × {nights} nights/month = {formatCurrency(typicalMonthly)}/month
                    </span>
                  )}
                </div>
              </li>
              <li>
                <strong>Annual projection:</strong>
                <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-1 text-gray-800">
                  Annual earnings = Monthly earnings × 12 = {formatCurrency(typicalMonthly * 12)}/year
                </div>
              </li>
            </ul>
          </div>

          {/* Section 3: Data Cleaning & Exclusions */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              3. What was removed from the data and why
            </h3>
            <p>
              To ensure apples-to-apples comparisons with legitimate DC residential homeowners, the dataset was
              rigorously filtered before calculation:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Out-of-district listings located outside the District of Columbia boundaries.</li>
              <li>Strict 30+ day minimum stay leases (mid-term / corporate leases).</li>
              <li>Commercial corporate serviced apartment buildings.</li>
              <li>Incomplete or corrupt records missing geolocation or revenue records.</li>
              <li>
                Low-activity listings (booked fewer than 30 nights over 12 months) are excluded by default to avoid
                skewing market averages with abandoned accounts, but you can toggle them back on anytime in the filter panel.
              </li>
            </ul>
          </div>

          {/* Section 4: What is NOT included */}
          <div className="space-y-2 border-t border-gray-100 pt-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              4. What is not included in this first-fold estimate
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>
                <strong>Cleaning fees:</strong> Kept separate because they are generally passed through to cleaners.
              </li>
              <li>
                <strong>DC Hotel & Transient Occupancy Taxes:</strong> Remitted by Airbnb directly on your behalf to the DC government.
              </li>
              <li>
                <strong>Host expenses:</strong> Utilities, consumables, turnover costs, insurance, and DC short-term rental license fees ($104.50 biennial DC Short-Term Rental endorsement).
              </li>
              <li>
                <strong>Seasonality:</strong> DC peak seasons (spring Cherry Blossoms, congressional sessions) vs. summer lulls.
              </li>
            </ul>
            <p className="text-xs text-gray-500 italic mt-2">
              This estimate is an informational screening tool based on trailing 12-month comparable listings data and is not a certified real estate appraisal or guarantee of future revenue.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
