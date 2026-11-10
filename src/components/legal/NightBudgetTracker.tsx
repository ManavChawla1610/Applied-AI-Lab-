/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DC_RULES, DC_RULES_SOURCE_URL } from '../../../config/dcRules';
import { formatCurrency } from '../../../lib/calc';
import { Calendar, AlertTriangle, CheckCircle2, FileText, ExternalLink, Clock } from 'lucide-react';

interface NightBudgetTrackerProps {
  nightsPerMonth: number;
  typicalNightlyEarnings: number; // E: median nightly payout from fold 1
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const NightBudgetTracker: React.FC<NightBudgetTrackerProps> = ({
  nightsPerMonth,
  typicalNightlyEarnings,
}) => {
  const [employerExempt, setEmployerExempt] = useState<boolean>(false);
  const [healthExempt, setHealthExempt] = useState<boolean>(false);

  const annualCap = DC_RULES.vacationRentalAnnualCap.value || 90;
  const isExempt = employerExempt || healthExempt;

  // Calculate cumulative nights for each month (1-indexed month 1..12)
  const monthlyData = MONTH_NAMES.map((name, idx) => {
    const monthNum = idx + 1;
    const cumulative = nightsPerMonth * monthNum;
    return {
      month: name,
      short: MONTH_SHORT[idx],
      cumulative,
      isExceeded: cumulative > annualCap,
    };
  });

  // Find first month where cumulative > annualCap
  const capExceededIndex = monthlyData.findIndex((m) => m.cumulative > annualCap);
  const capMonthName = capExceededIndex >= 0 ? MONTH_NAMES[capExceededIndex] : null;

  // Earnings calculations
  const legalMaxAnnual = typicalNightlyEarnings * annualCap;
  const chosenAnnual = typicalNightlyEarnings * nightsPerMonth * 12;

  const maxBarValue = Math.max(annualCap * 1.5, nightsPerMonth * 12);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-6 shadow-xs">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold uppercase tracking-wider mb-2">
          <Calendar className="w-3.5 h-3.5" />
          <span>Step 3: Vacation Rental Cap Tracker</span>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
          Your {annualCap}-night annual budget
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          When hosting while away under a Vacation Rental license, DC law caps you at {annualCap} cumulative nights per calendar year.
        </p>
      </div>

      {/* Cap Status Callout */}
      <div className="p-4 sm:p-5 rounded-xl border border-gray-200 bg-gray-50/70 space-y-2">
        <div className="flex items-center gap-2 text-base font-bold text-gray-900">
          <Calendar className="w-5 h-5 text-rose-600 shrink-0" />
          {capMonthName ? (
            <span>
              At {nightsPerMonth} nights/month, you'd reach {annualCap} nights in{' '}
              <span className="text-rose-600 underline decoration-rose-300 underline-offset-4">
                {capMonthName}
              </span>
            </span>
          ) : (
            <span className="text-emerald-800">
              At {nightsPerMonth} nights/month, you stay within the {annualCap}-night cap all year ({nightsPerMonth * 12} nights).
            </span>
          )}
        </div>

        {/* Earnings Impact */}
        <div className="text-xs sm:text-sm text-gray-700 leading-relaxed pt-1">
          {isExempt ? (
            <p className="text-emerald-800 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>With an approved exemption, the {annualCap}-night cap does not apply.</span>
            </p>
          ) : (
            <p>
              Without an exemption, your legal maximum is about{' '}
              <strong className="text-gray-900 tabular-nums">{formatCurrency(legalMaxAnnual)}/year</strong> in payout{' '}
              <span className="text-gray-500">(vs about <span className="tabular-nums">{formatCurrency(chosenAnnual)}</span> at your chosen {nightsPerMonth} nights/month)</span>.
            </p>
          )}
        </div>
      </div>

      {/* 12-Bar Cumulative Chart */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
          <span>Cumulative hosted nights (Jan – Dec)</span>
          <span className="tabular-nums text-rose-600 font-semibold">
            Red line = {annualCap}-night legal cap
          </span>
        </div>

        <div className="relative pt-6 pb-2">
          {/* Horizontal Cap Line at 90 */}
          <div
            className="absolute left-0 right-0 z-10 border-t-2 border-dashed border-rose-500 flex items-center justify-end"
            style={{
              bottom: `${(annualCap / maxBarValue) * 160 + 24}px`,
            }}
          >
            <span className="text-[10px] tabular-nums font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 -mt-3 mr-1">
              Cap: {annualCap} nights
            </span>
          </div>

          {/* Bar Chart Container */}
          <div className="h-44 flex items-end justify-between gap-1 sm:gap-2 px-1 border-b border-gray-200">
            {monthlyData.map((item, idx) => {
              const heightPct = Math.min(100, Math.max(8, (item.cumulative / maxBarValue) * 100));
              const isPastCap = item.cumulative > annualCap;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <span className="text-[10px] tabular-nums font-semibold text-gray-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.cumulative}
                  </span>
                  <div
                    className={`w-full max-w-[28px] rounded-t-md transition-all ${
                      isPastCap
                        ? 'bg-rose-400 group-hover:bg-rose-500 ring-1 ring-rose-500/30'
                        : 'bg-gray-800 group-hover:bg-black'
                    }`}
                    style={{ height: `${heightPct}%` }}
                    title={`${item.month}: ${item.cumulative} cumulative nights`}
                  />
                  <span className="text-[10px] font-medium text-gray-500 mt-2 truncate">
                    {item.short}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Exemption Check */}
      <div className="p-5 bg-blue-50/60 rounded-2xl border border-blue-200/90 space-y-4">
        <div>
          <h4 className="text-sm font-bold text-blue-950 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-700" />
            <span>Exemption Check: Can you qualify to exceed {annualCap} nights?</span>
          </h4>
          <p className="text-xs text-blue-900 mt-1">
            DC permits Vacation Rental hosts to exceed {annualCap} nights if travel is mandated by an employer or serious healthcare needs.
          </p>
        </div>

        <div className="space-y-3 pt-1">
          {/* Question 1: Employer */}
          <label className="flex items-start justify-between gap-3 p-3 bg-white rounded-xl border border-blue-100 cursor-pointer hover:border-blue-300 transition-colors">
            <span className="text-xs text-gray-800 font-medium">
              Does your employer require you (or your spouse/domestic partner) to work outside DC for 90+ cumulative days this calendar year?
            </span>
            <input
              type="checkbox"
              checked={employerExempt}
              onChange={(e) => setEmployerExempt(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500 accent-rose-600 cursor-pointer"
            />
          </label>

          {/* Question 2: Health */}
          <label className="flex items-start justify-between gap-3 p-3 bg-white rounded-xl border border-blue-100 cursor-pointer hover:border-blue-300 transition-colors">
            <span className="text-xs text-gray-800 font-medium">
              Will you be away from DC for 90+ cumulative days for treatment of a serious health condition, or to care for an immediate family member receiving it?
            </span>
            <input
              type="checkbox"
              checked={healthExempt}
              onChange={(e) => setHealthExempt(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500 accent-rose-600 cursor-pointer"
            />
          </label>
        </div>

        {/* Exemption Steps & Review Time (if qualified) */}
        {isExempt ? (
          <div className="p-4 bg-white rounded-xl border border-emerald-200 space-y-2.5 mt-2">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wide">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>You may qualify for a Vacation Rental Exemption</span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              {DC_RULES.exemption90Night.steps.text}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span>{DC_RULES.exemption90Night.reviewTime.text}</span>
            </div>

            {/* Document Links */}
            <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-3 text-xs">
              <a
                href={DC_RULES_SOURCE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
              >
                <span>Employer Affidavit VRE</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={DC_RULES_SOURCE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
              >
                <span>Healthcare Affidavit VRE</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={DC_RULES_SOURCE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
              >
                <span>Vacation Rental Exemption Application Form</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-white/70 rounded-xl border border-blue-100 text-xs text-blue-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>The {annualCap}-night cap applies to your property unless an official employer or healthcare affidavit is granted.</span>
          </div>
        )}
      </div>
    </div>
  );
};
