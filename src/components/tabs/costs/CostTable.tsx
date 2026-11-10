/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { formatCurrency } from '../../../../lib/calc';
import { MonthlyFinancialSummary } from '../../../../lib/costs';

interface CostTableProps {
  summary: MonthlyFinancialSummary;
}

export const CostTable: React.FC<CostTableProps> = ({ summary }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h4 className="text-base font-bold text-gray-900">
            Itemized Cost Breakdown
          </h4>
          <p className="text-xs text-gray-500">
            Every cost formula, source citation, and monthly/annual impact
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-200 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Cost Line Item</th>
              <th className="py-3 px-4 text-right">Monthly</th>
              <th className="py-3 px-4 text-right">Annual</th>
              <th className="py-3 px-4">How it's Calculated</th>
              <th className="py-3 px-4">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {/* Income row: Gross Bookings */}
            <tr className="bg-emerald-50/50 font-medium">
              <td className="py-3 px-4 text-emerald-950 font-semibold">
                Gross Bookings (Nightly + Cleaning)
              </td>
              <td className="py-3 px-4 text-right font-mono font-bold text-emerald-900">
                {formatCurrency(summary.grossBookings)}
              </td>
              <td className="py-3 px-4 text-right font-mono font-bold text-emerald-900">
                {formatCurrency(summary.grossBookings * 12)}
              </td>
              <td className="py-3 px-4 text-emerald-800">
                ${summary.pricePerNight}/night × {summary.nights} nights
                {summary.cleaningFeeIncome > 0 ? ` + ${formatCurrency(summary.cleaningFeeIncome)} cleaning income` : ''}
              </td>
              <td className="py-3 px-4 text-emerald-800">
                AirROI market data
              </td>
            </tr>

            {/* Individual Cost rows */}
            {summary.costItems.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="py-3 px-4 font-medium text-gray-900">
                  {item.label}
                </td>
                <td className="py-3 px-4 text-right font-mono font-semibold text-rose-600">
                  {item.monthly > 0 ? `-${formatCurrency(item.monthly)}` : '$0'}
                </td>
                <td className="py-3 px-4 text-right font-mono text-gray-500">
                  {item.annual > 0 ? `-${formatCurrency(item.annual)}` : '$0'}
                </td>
                <td className="py-3 px-4 text-gray-600">
                  {item.howCalculated}
                </td>
                <td className="py-3 px-4 text-gray-500">
                  {item.source}
                </td>
              </tr>
            ))}

            {/* Total Costs Row */}
            <tr className="bg-rose-50/60 font-semibold">
              <td className="py-3.5 px-4 text-rose-950">
                Total Operating & Platform Costs
              </td>
              <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-700">
                -{formatCurrency(summary.totalCosts)}
              </td>
              <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-700">
                -{formatCurrency(summary.totalCosts * 12)}
              </td>
              <td className="py-3.5 px-4 text-rose-800">
                {(summary.costShareOfGross * 100).toFixed(1)}% of gross revenue
              </td>
              <td className="py-3.5 px-4 text-rose-800">
                Sum of all operating costs
              </td>
            </tr>

            {/* Net Take-Home Row */}
            <tr className="bg-gray-900 text-white font-bold">
              <td className="py-4 px-4 text-white">
                Net Take-Home Before Housing Costs
              </td>
              <td className="py-4 px-4 text-right font-mono text-emerald-400 text-sm">
                {formatCurrency(summary.netBeforeHousing)}
              </td>
              <td className="py-4 px-4 text-right font-mono text-emerald-400 text-sm">
                {formatCurrency(summary.annualNetBeforeHousing)}
              </td>
              <td className="py-4 px-4 text-gray-300 font-normal">
                Gross Bookings − Total Costs
              </td>
              <td className="py-4 px-4 text-gray-300 font-normal">
                Your estimated profit
              </td>
            </tr>

            {/* Informational Lodging Tax (Separate Grey Row) */}
            <tr className="bg-gray-100/90 text-gray-500 italic text-[11px]">
              <td className="py-3 px-4 font-medium text-gray-600">
                DC Transient Lodging Tax (15.95%)
              </td>
              <td className="py-3 px-4 text-right font-mono text-gray-500">
                {formatCurrency(summary.lodgingTaxAmount)}
              </td>
              <td className="py-3 px-4 text-right font-mono text-gray-500">
                {formatCurrency(summary.lodgingTaxAmount * 12)}
              </td>
              <td colSpan={2} className="py-3 px-4 text-gray-600 font-normal not-italic">
                Guests pay 15.95% lodging tax on top — collected and remitted automatically by Airbnb, $0 cost to you.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
