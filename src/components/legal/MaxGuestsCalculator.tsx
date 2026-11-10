/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DC_RULES } from '../../../config/dcRules';
import { BedroomOption } from '../../../lib/calc';
import { Users, Info } from 'lucide-react';

interface MaxGuestsCalculatorProps {
  initialBedrooms: BedroomOption;
}

export function computeMaxGuests(bedrooms: number): number {
  return Math.max(8, 2 * Math.max(0, bedrooms));
}

export const MaxGuestsCalculator: React.FC<MaxGuestsCalculatorProps> = ({
  initialBedrooms,
}) => {
  const getNumericBedrooms = (opt: BedroomOption): number => {
    if (opt === 'studio') return 0;
    if (opt === '1') return 1;
    if (opt === '2') return 2;
    if (opt === '3+') return 3;
    return 1;
  };

  const [bedrooms, setBedrooms] = useState<number>(getNumericBedrooms(initialBedrooms));

  useEffect(() => {
    setBedrooms(getNumericBedrooms(initialBedrooms));
  }, [initialBedrooms]);

  const maxGuests = computeMaxGuests(bedrooms);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-5 shadow-xs">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold uppercase tracking-wider mb-2">
          <Users className="w-3.5 h-3.5" />
          <span>Step 4: Guest Occupancy Limits</span>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
          How many guests can you host?
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {DC_RULES.maxOccupancy.text}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-5 bg-gray-50/70 rounded-2xl border border-gray-200">
        <div className="space-y-1">
          <label htmlFor="bedroom-count-input" className="text-sm font-semibold text-gray-900 block">
            Number of bedrooms in your home:
          </label>
          <div className="flex items-center gap-2">
            <input
              id="bedroom-count-input"
              type="number"
              min={0}
              max={15}
              value={bedrooms}
              onChange={(e) => setBedrooms(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-20 px-3 py-2 rounded-lg border border-gray-300 bg-white text-center font-mono text-base font-bold text-gray-900 focus:outline-none focus:border-gray-900"
            />
            <span className="text-xs text-gray-500 font-medium">
              {bedrooms === 0 ? 'Bedrooms (Studio)' : bedrooms === 1 ? 'Bedroom' : 'Bedrooms'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200/90 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-2xl font-mono shrink-0">
            {maxGuests}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-gray-400">
              DC Legal Maximum
            </div>
            <div className="text-base font-bold text-gray-900">
              {maxGuests} Guests Max
            </div>
            <div className="text-[11px] text-gray-500">
              max(8, 2 × {bedrooms}) = {maxGuests}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
        <Info className="w-4 h-4 text-gray-400 shrink-0" />
        <span>
          Even large single-family homes cannot exceed the calculated legal cap under DC building codes.
        </span>
      </div>
    </div>
  );
};
