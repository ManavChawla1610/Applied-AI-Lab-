/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { formatCurrency } from '../../../../lib/calc';
import { ScenarioResult } from '../../../../lib/costs';
import { CostAssumptions } from '../../../../config/costs';
import { Check } from 'lucide-react';

interface ScenarioCardsProps {
  scenarios: ScenarioResult[];
  currentAssumptions: CostAssumptions;
  onApplyScenario: (cleanOption: 'cleaner' | 'self', managementType: 'self' | 'cohost' | 'full') => void;
}

export const ScenarioCards: React.FC<ScenarioCardsProps> = ({
  scenarios,
  currentAssumptions,
  onApplyScenario,
}) => {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-base font-bold text-gray-900">
          Compare Operating Scenarios
        </h4>
        <p className="text-xs text-gray-500">
          See how your take-home pay changes depending on who cleans and manages the home (same nights & nightly price)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {scenarios.map((sc) => {
          const isSelected =
            currentAssumptions.cleanOption === sc.cleanOption &&
            currentAssumptions.managementType === sc.managementType;

          return (
            <div
              key={sc.id}
              onClick={() => onApplyScenario(sc.cleanOption, sc.managementType)}
              className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-all cursor-pointer text-left relative ${
                isSelected
                  ? 'border-gray-900 bg-gray-900 text-white shadow-md ring-2 ring-gray-900/10'
                  : 'border-gray-200 bg-white hover:border-gray-400 text-gray-900 shadow-2xs'
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-3" />
                </div>
              )}

              <div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mb-2 ${
                    isSelected ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {sc.badge}
                </span>
                <h5 className="font-bold text-sm tracking-tight mb-1">
                  {sc.title}
                </h5>
                <div className="text-xs opacity-75 mb-4">
                  Costs: {formatCurrency(sc.monthlyCosts)}/mo
                </div>
              </div>

              <div className="pt-3 border-t border-current/10">
                <div className="text-[11px] uppercase tracking-wider font-semibold opacity-70">
                  You keep
                </div>
                <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${isSelected ? 'text-emerald-400' : 'text-gray-900'}`}>
                  {formatCurrency(sc.monthlyNet)}
                  <span className="text-xs font-normal opacity-70">/mo</span>
                </div>
                <div className="text-[11px] opacity-75 font-mono">
                  ≈ {formatCurrency(sc.annualNet)}/year
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
