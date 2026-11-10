/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { formatCurrency } from '../../../../lib/calc';
import { MonthlyFinancialSummary } from '../../../../lib/costs';

interface CostWaterfallChartProps {
  summary: MonthlyFinancialSummary;
}

export const CostWaterfallChart: React.FC<CostWaterfallChartProps> = ({ summary }) => {
  const gross = summary.grossBookings;
  if (gross <= 0) return null;

  // Key stages of waterfall:
  // 1. Gross Bookings (Nightly + Cleaning Fee)
  // 2. Airbnb Fee (-)
  // 3. Cleaning Cost (-)
  // 4. Utilities, Supplies, Repairs (-)
  // 5. Management (-) [if any]
  // 6. Fixed Costs (Insurance, License, Tools) (-)
  // 7. Net Profit Before Housing (=)
  const operatingSum = summary.utilitiesCost + summary.suppliesCost + summary.repairsCost;
  const fixedSum = summary.insuranceCost + summary.licenseCost + summary.pricingToolsCost;

  const steps = [
    {
      label: 'Gross Bookings',
      sublabel: 'Nightly + Cleaning',
      amount: gross,
      pct: 100,
      color: 'bg-emerald-600',
      isNet: false,
    },
    {
      label: 'Airbnb Host Fee',
      sublabel: `${(summary.costItems[0]?.pctOfGross * 100 || 15.5).toFixed(1)}% host fee`,
      amount: -summary.airbnbFee,
      pct: (summary.airbnbFee / gross) * 100,
      color: 'bg-rose-500',
      isNet: false,
    },
    {
      label: summary.cleaningCost > 0 ? 'Cleaning Paid' : 'Self-Cleaning',
      sublabel: summary.cleaningCost > 0 ? 'Cleaner fees' : '$0 cleaner fee',
      amount: -summary.cleaningCost,
      pct: (summary.cleaningCost / gross) * 100,
      color: summary.cleaningCost > 0 ? 'bg-amber-500' : 'bg-gray-400',
      isNet: false,
    },
    {
      label: 'Utilities & Supplies',
      sublabel: 'Operating 10%',
      amount: -operatingSum,
      pct: (operatingSum / gross) * 100,
      color: 'bg-orange-500',
      isNet: false,
    },
  ];

  if (summary.managementCost > 0) {
    steps.push({
      label: 'Management',
      sublabel: 'Co-host / Full-service',
      amount: -summary.managementCost,
      pct: (summary.managementCost / gross) * 100,
      color: 'bg-purple-500',
      isNet: false,
    });
  }

  steps.push({
    label: 'Fixed & License',
    sublabel: 'Insurance & DLCP',
    amount: -fixedSum,
    pct: (fixedSum / gross) * 100,
    color: 'bg-blue-500',
    isNet: false,
  });

  steps.push({
    label: 'Net Before Housing',
    sublabel: 'Your monthly keep',
    amount: summary.netBeforeHousing,
    pct: (summary.netBeforeHousing / gross) * 100,
    color: 'bg-gray-900',
    isNet: true,
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <div>
          <h4 className="text-base font-bold text-gray-900">
            Monthly Cash Flow Waterfall
          </h4>
          <p className="text-xs text-gray-500">
            From gross guest bookings to your actual take-home profit
          </p>
        </div>
        <div className="text-xs text-gray-600 tabular-nums">
          Gross: <strong className="text-gray-900">{formatCurrency(gross)}</strong> · Total Costs: <strong className="text-rose-600">{formatCurrency(summary.totalCosts)}</strong>
        </div>
      </div>

      {/* Waterfall Visual Bars */}
      <div className="space-y-3 pt-1">
        {steps.map((step, idx) => {
          const absAmount = Math.abs(step.amount);
          const barWidthPct = Math.max(4, Math.min(100, (absAmount / gross) * 100));

          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${step.isNet ? 'text-gray-900 font-bold' : 'text-gray-700'}`}>
                    {step.label}
                  </span>
                  <span className="text-[11px] text-gray-400 hidden sm:inline">
                    ({step.sublabel})
                  </span>
                </div>
                <div className="flex items-center gap-2 tabular-nums">
                  <span className={`font-bold ${step.amount < 0 ? 'text-rose-600' : 'text-gray-900'}`}>
                    {step.amount < 0 ? `-${formatCurrency(absAmount)}` : formatCurrency(absAmount)}
                  </span>
                  <span className="text-gray-400 text-[11px] w-12 text-right">
                    {step.pct.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${step.color}`}
                  style={{ width: `${barWidthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
