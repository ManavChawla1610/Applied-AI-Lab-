/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Shield, FileSpreadsheet, TrendingUp, Info } from 'lucide-react';
import { formatCurrency } from '../../../../lib/calc';
import { DC_MARKET } from '../../../../config/market';

interface CostContextCalloutsProps {
  grossBookings: number;
}

export const CostContextCallouts: React.FC<CostContextCalloutsProps> = ({ grossBookings }) => {
  const typicalBenchmark = DC_MARKET.monthlyRevenueTiers.median; // 3140

  return (
    <div className="space-y-4 pt-2">
      {/* Market Context Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
              DC Market Context (AirROI Data)
            </div>
            <div className="text-sm sm:text-base font-bold text-white">
              Typical DC listing: {formatCurrency(typicalBenchmark)}/month in bookings. Yours: {formatCurrency(grossBookings)}.
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-400 sm:text-right font-mono">
          4,785 active DC listings analyzed
        </div>
      </div>

      {/* Two-Column Callouts: Insurance & Taxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Insurance Box */}
        <div className="p-5 bg-blue-50/60 rounded-2xl border border-blue-200/80 space-y-2">
          <div className="flex items-center gap-2 text-blue-950 font-bold text-sm">
            <Shield className="w-4 h-4 text-blue-700 shrink-0" />
            <span>Insurance Requirements</span>
          </div>
          <p className="text-xs text-blue-900 leading-relaxed">
            DC requires proof of liability insurance of at least $250,000 — from your booking platform or an insurer. Airbnb's AirCover is free; many hosts add a short-term rental policy (about $340/year in DC). Check that your homeowner's policy covers paying guests.
          </p>
        </div>

        {/* Tax Box */}
        <div className="p-5 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-2">
          <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
            <FileSpreadsheet className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Taxes & Lodging Tax</span>
          </div>
          <p className="text-xs text-amber-900 leading-relaxed">
            Lodging tax (15.95%) is added to the guest's bill and handled by Airbnb. Your Airbnb income is taxable — running costs can reduce it. This app does not calculate income tax; check with a tax professional.
          </p>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <div className="flex items-center gap-2 text-[11px] text-gray-500 pt-1">
        <Info className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span>
          Cost shares are typical low-end estimates for a self-managed DC listing (AirROI, Oct 2026). Not tax or financial advice.
        </span>
      </div>
    </div>
  );
};
