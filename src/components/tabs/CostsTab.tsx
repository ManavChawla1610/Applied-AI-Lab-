/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { formatCurrency } from '../../../lib/calc';
import {
  calculateMonthlyCosts,
  calculateScenarios,
  HousingCostInputs,
  SetupCostInputs,
} from '../../../lib/costs';
import { CostAssumptions } from '../../../config/costs';
import { TabId } from './TabBar';
import { CostWaterfallChart } from './costs/CostWaterfallChart';
import { CostTable } from './costs/CostTable';
import { ScenarioCards } from './costs/ScenarioCards';
import { HousingCostsCard } from './costs/HousingCostsCard';
import { OneTimeSetupCard } from './costs/OneTimeSetupCard';
import { AdvancedCostAccordion } from './costs/AdvancedCostAccordion';
import { CostContextCallouts } from './costs/CostContextCallouts';
import { NextTabButton } from './NextTabButton';
import { Sparkles, DollarSign, UserCheck, CheckCircle2 } from 'lucide-react';

interface CostsTabProps {
  nights: number;
  listingPrice: number; // P
  assumptions: CostAssumptions;
  housingInputs: HousingCostInputs;
  setupInputs: SetupCostInputs;
  onChangeAssumptions: (assumptions: CostAssumptions) => void;
  onChangeHousingInputs: (inputs: HousingCostInputs) => void;
  onChangeSetupInputs: (inputs: SetupCostInputs) => void;
  onNavigateTab: (tab: TabId) => void;
}

export const CostsTab: React.FC<CostsTabProps> = ({
  nights,
  listingPrice,
  assumptions,
  housingInputs,
  setupInputs,
  onChangeAssumptions,
  onChangeHousingInputs,
  onChangeSetupInputs,
  onNavigateTab,
}) => {
  // Compute deterministic monthly financial breakdown
  const summary = calculateMonthlyCosts(nights, listingPrice, assumptions);
  const scenarios = calculateScenarios(nights, listingPrice, assumptions);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Controls Bar (Compact) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 block mb-1">
            Operating Setup
          </span>
          <h3 className="text-xl font-bold text-gray-900 tracking-tight">
            How will you run your DC listing?
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Adjusting who manages and cleans the home updates all take-home numbers in real time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Input 1: Who manages it */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-gray-500" />
              <span>Who manages it:</span>
            </label>
            <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-xl">
              {[
                { type: 'self' as const, label: 'Self' },
                { type: 'cohost' as const, label: 'Co-host (10%)' },
                { type: 'full' as const, label: 'Full (20%)' },
              ].map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() =>
                    onChangeAssumptions({
                      ...assumptions,
                      managementType: opt.type,
                      customManagementPct: undefined,
                    })
                  }
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
                    assumptions.managementType === opt.type
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input 2: Cleaning labor */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-gray-500" />
              <span>Cleaning labor:</span>
            </label>
            <div className="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-xl">
              {[
                { opt: 'cleaner' as const, label: 'Hire a cleaner' },
                { opt: 'self' as const, label: 'Clean yourself' },
              ].map((c) => (
                <button
                  key={c.opt}
                  type="button"
                  onClick={() =>
                    onChangeAssumptions({
                      ...assumptions,
                      cleanOption: c.opt,
                    })
                  }
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
                    assumptions.cleanOption === c.opt
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input 3: Cleaning fee charged to guests */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-gray-500" />
                <span>Guest cleaning fee:</span>
              </span>
              {assumptions.chargeCleaningFee && (
                <span className="font-mono text-gray-900 font-bold text-[11px]">
                  ${assumptions.cleaningFeeAmount}/stay
                </span>
              )}
            </label>
            <div className="flex items-center gap-2">
              <div className="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-xl flex-1">
                <button
                  type="button"
                  onClick={() =>
                    onChangeAssumptions({
                      ...assumptions,
                      chargeCleaningFee: true,
                    })
                  }
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
                    assumptions.chargeCleaningFee
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Yes (${assumptions.cleaningFeeAmount})
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChangeAssumptions({
                      ...assumptions,
                      chargeCleaningFee: false,
                    })
                  }
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
                    !assumptions.chargeCleaningFee
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  No ($0)
                </button>
              </div>

              {assumptions.chargeCleaningFee && (
                <div className="flex items-center gap-1 bg-gray-50 border border-gray-300 rounded-xl px-2 py-1">
                  <span className="text-xs text-gray-500">$</span>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    step="5"
                    value={assumptions.cleaningFeeAmount}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                      onChangeAssumptions({
                        ...assumptions,
                        cleaningFeeAmount: val,
                        cleaningCostAmount: val, // stays matched by default
                      });
                    }}
                    className="w-12 text-xs font-mono font-bold text-gray-900 focus:outline-none bg-transparent text-right"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Advanced Accordion */}
        <AdvancedCostAccordion
          assumptions={assumptions}
          onChangeAssumptions={onChangeAssumptions}
        />
      </div>

      {/* A) Headline Card */}
      <div className="p-6 sm:p-8 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-2 text-center sm:text-left">
        <span className="text-xs uppercase tracking-wider font-bold text-gray-500">
          Estimated Net Take-Home
        </span>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
          You'd keep about{' '}
          <span className="text-emerald-700 underline decoration-emerald-300 underline-offset-4 font-mono">
            {formatCurrency(summary.netBeforeHousing)}/month
          </span>{' '}
          <span className="text-gray-500 font-normal text-xl sm:text-2xl">
            (≈ <span className="font-mono font-semibold text-gray-800">{formatCurrency(summary.annualNetBeforeHousing)}/year</span>)
          </span>{' '}
          before housing costs and income tax.
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 pt-1 leading-relaxed">
          Based on {nights} nights/month at {formatCurrency(listingPrice)}/night listing price ({formatCurrency(summary.grossBookings)}/month in gross bookings, minus {formatCurrency(summary.totalCosts)} in platform, turnover & operating costs).
        </p>
      </div>

      {/* B) Waterfall Chart */}
      <CostWaterfallChart summary={summary} />

      {/* C) Cost Table */}
      <CostTable summary={summary} />

      {/* D) Scenario Comparison Cards */}
      <ScenarioCards
        scenarios={scenarios}
        currentAssumptions={assumptions}
        onApplyScenario={(cleanOption, managementType) => {
          onChangeAssumptions({
            ...assumptions,
            cleanOption,
            managementType,
            customManagementPct: undefined,
          });
        }}
      />

      {/* E) Optional Housing Costs */}
      <HousingCostsCard
        housingInputs={housingInputs}
        netBeforeHousing={summary.netBeforeHousing}
        onChangeHousingInputs={onChangeHousingInputs}
      />

      {/* F) Optional One-time Setup */}
      <OneTimeSetupCard
        setupInputs={setupInputs}
        netBeforeHousing={summary.netBeforeHousing}
        onChangeSetupInputs={onChangeSetupInputs}
      />

      {/* G, H, I, J) Context Callouts & Disclaimers */}
      <CostContextCallouts grossBookings={summary.grossBookings} />

      {/* Next Tab Button */}
      <NextTabButton
        targetTab="legal"
        targetLabel="3 · Legal & Setup"
        onNavigate={onNavigateTab}
      />
    </div>
  );
};
