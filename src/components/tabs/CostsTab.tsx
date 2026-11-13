/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
import { ChevronDown, ChevronUp, UserCheck, DollarSign } from 'lucide-react';

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

  // Collapsible section toggles
  const [isSetupControlsOpen, setIsSetupControlsOpen] = useState(false);
  const [isCostTableOpen, setIsCostTableOpen] = useState(false);
  const [isScenariosOpen, setIsScenariosOpen] = useState(false);
  const [isHousingOpen, setIsHousingOpen] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4 sm:py-6">
      {/* 1. One Headline: "You'd keep about $[net]/month" */}
      <div className="text-center sm:text-left space-y-2 pb-2">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
          You'd keep about{' '}
          <span className="text-emerald-700 underline decoration-emerald-300 underline-offset-8 tabular-nums">
            {formatCurrency(summary.netBeforeHousing)}/month
          </span>
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          Based on {nights} nights at {formatCurrency(listingPrice)}/night ({formatCurrency(summary.grossBookings)} in gross bookings minus {formatCurrency(summary.totalCosts)} in platform, turnover & operating expenses).
        </p>
      </div>

      {/* 2. The Waterfall Chart directly below it */}
      <CostWaterfallChart summary={summary} />

      {/* Operating Setup Controls (Collapsible) */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
        <button
          type="button"
          onClick={() => setIsSetupControlsOpen((prev) => !prev)}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-gray-500" />
            <span>Customize management & cleaning assumptions</span>
          </div>
          {isSetupControlsOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-500 shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500 shrink-0" />
          )}
        </button>

        {isSetupControlsOpen && (
          <div className="p-5 border-t border-gray-100 bg-gray-50/50 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Management */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Who manages it:
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

              {/* Cleaning Fee Charged */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Cleaning fee you charge:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-gray-500 font-medium">$</span>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    step={5}
                    value={assumptions.cleaningFeeAmount}
                    onChange={(e) =>
                      onChangeAssumptions({
                        ...assumptions,
                        cleaningFeeAmount: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full pl-6 pr-12 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-900 focus:outline-none focus:border-gray-900 tabular-nums"
                  />
                  <span className="absolute right-2.5 top-2 text-[11px] text-gray-400">/stay</span>
                </div>
              </div>

              {/* Cleaner option */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Who cleans:
                </label>
                <div className="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() =>
                      onChangeAssumptions({
                        ...assumptions,
                        cleanOption: 'cleaner',
                      })
                    }
                    className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
                      assumptions.cleanOption === 'cleaner'
                        ? 'bg-white text-gray-900 shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Hire cleaner
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeAssumptions({
                        ...assumptions,
                        cleanOption: 'self',
                      })
                    }
                    className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
                      assumptions.cleanOption === 'self'
                        ? 'bg-white text-gray-900 shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Clean myself
                  </button>
                </div>
              </div>
            </div>

            <AdvancedCostAccordion
              assumptions={assumptions}
              onChangeAssumptions={onChangeAssumptions}
            />
          </div>
        )}
      </div>

      {/* 3. Cost Table (Collapsed behind 'See details') */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
        <button
          type="button"
          onClick={() => setIsCostTableOpen((prev) => !prev)}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <span>See detailed cost breakdown</span>
          {isCostTableOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </button>
        {isCostTableOpen && (
          <div className="p-4 sm:p-6 border-t border-gray-100">
            <CostTable summary={summary} />
          </div>
        )}
      </div>

      {/* 4. Scenario Comparison Cards (Collapsed behind 'See details') */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
        <button
          type="button"
          onClick={() => setIsScenariosOpen((prev) => !prev)}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <span>Compare management scenarios</span>
          {isScenariosOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </button>
        {isScenariosOpen && (
          <div className="p-4 sm:p-6 border-t border-gray-100">
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
          </div>
        )}
      </div>

      {/* 5. Housing Costs (Collapsed behind 'See details') */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
        <button
          type="button"
          onClick={() => setIsHousingOpen((prev) => !prev)}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <span>Factor in your housing costs (mortgage / rent)</span>
          {isHousingOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </button>
        {isHousingOpen && (
          <div className="p-4 sm:p-6 border-t border-gray-100">
            <HousingCostsCard
              housingInputs={housingInputs}
              netBeforeHousing={summary.netBeforeHousing}
              onChangeHousingInputs={onChangeHousingInputs}
            />
          </div>
        )}
      </div>

      {/* 6. Setup Costs (Collapsed behind 'See details') */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
        <button
          type="button"
          onClick={() => setIsSetupOpen((prev) => !prev)}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <span>One-time setup & furnishings payback</span>
          {isSetupOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </button>
        {isSetupOpen && (
          <div className="p-4 sm:p-6 border-t border-gray-100">
            <OneTimeSetupCard
              setupInputs={setupInputs}
              netBeforeHousing={summary.netBeforeHousing}
              onChangeSetupInputs={onChangeSetupInputs}
            />
          </div>
        )}
      </div>

      {/* Context callouts */}
      <CostContextCallouts grossBookings={summary.grossBookings} />

      {/* Next Tab Button */}
      <NextTabButton
        targetTab="legal"
        targetLabel="Legal & setup"
        onNavigate={onNavigateTab}
      />
    </div>
  );
};
