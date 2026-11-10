/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sliders, RotateCcw } from 'lucide-react';
import { CostAssumptions, INITIAL_COST_ASSUMPTIONS } from '../../../../config/costs';

interface AdvancedCostAccordionProps {
  assumptions: CostAssumptions;
  onChangeAssumptions: (assumptions: CostAssumptions) => void;
}

export const AdvancedCostAccordion: React.FC<AdvancedCostAccordionProps> = ({
  assumptions,
  onChangeAssumptions,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const resetToDefaults = () => {
    onChangeAssumptions({
      ...assumptions,
      hostFeePct: INITIAL_COST_ASSUMPTIONS.hostFeePct,
      utilitiesPct: INITIAL_COST_ASSUMPTIONS.utilitiesPct,
      suppliesPct: INITIAL_COST_ASSUMPTIONS.suppliesPct,
      repairsPct: INITIAL_COST_ASSUMPTIONS.repairsPct,
      insuranceAnnual: INITIAL_COST_ASSUMPTIONS.insuranceAnnual,
      licenseBiennial: INITIAL_COST_ASSUMPTIONS.licenseBiennial,
      pricingToolsAnnual: INITIAL_COST_ASSUMPTIONS.pricingToolsAnnual,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <Sliders className="w-4 h-4 text-gray-500" />
          <span className="text-xs sm:text-sm font-bold text-gray-900">
            Advanced: edit cost assumptions & percentages
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400">
            {isOpen ? 'Collapse' : 'Customize rates'}
          </span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 pt-0 border-t border-gray-100 space-y-4 text-xs">
          <div className="flex items-center justify-between pt-3">
            <p className="text-gray-500">
              Fine-tune the baseline percentage and fixed-cost assumptions based on your actual property bills.
            </p>
            <button
              type="button"
              onClick={resetToDefaults}
              className="inline-flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-900 font-medium underline cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset defaults</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Airbnb Host Fee */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 space-y-1">
              <label className="font-semibold text-gray-900 block">
                Airbnb Host Service Fee (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="50"
                value={(assumptions.hostFeePct * 100).toFixed(1)}
                onChange={(e) =>
                  onChangeAssumptions({
                    ...assumptions,
                    hostFeePct: (parseFloat(e.target.value) || 0) / 100,
                  })
                }
                className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-mono text-gray-900"
              />
              <p className="text-[10px] text-gray-500">
                Source: Airbnb Simplified Pricing (default 15.5%)
              </p>
            </div>

            {/* Utilities */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 space-y-1">
              <label className="font-semibold text-gray-900 block">
                Utilities & Internet (% of gross)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                max="30"
                value={Math.round(assumptions.utilitiesPct * 100)}
                onChange={(e) =>
                  onChangeAssumptions({
                    ...assumptions,
                    utilitiesPct: (parseInt(e.target.value, 10) || 0) / 100,
                  })
                }
                className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-mono text-gray-900"
              />
              <p className="text-[10px] text-gray-500">
                Source: AirROI (default 5%)
              </p>
            </div>

            {/* Supplies */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 space-y-1">
              <label className="font-semibold text-gray-900 block">
                Guest Supplies (% of gross)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                max="30"
                value={Math.round(assumptions.suppliesPct * 100)}
                onChange={(e) =>
                  onChangeAssumptions({
                    ...assumptions,
                    suppliesPct: (parseInt(e.target.value, 10) || 0) / 100,
                  })
                }
                className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-mono text-gray-900"
              />
              <p className="text-[10px] text-gray-500">
                Source: AirROI (default 2%)
              </p>
            </div>

            {/* Repairs */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 space-y-1">
              <label className="font-semibold text-gray-900 block">
                Repairs & Upkeep (% of gross)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                max="30"
                value={Math.round(assumptions.repairsPct * 100)}
                onChange={(e) =>
                  onChangeAssumptions({
                    ...assumptions,
                    repairsPct: (parseInt(e.target.value, 10) || 0) / 100,
                  })
                }
                className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-mono text-gray-900"
              />
              <p className="text-[10px] text-gray-500">
                Source: AirROI (default 3%)
              </p>
            </div>

            {/* Insurance Annual */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 space-y-1">
              <label className="font-semibold text-gray-900 block">
                STR Insurance ($/year)
              </label>
              <input
                type="number"
                step="10"
                min="0"
                value={assumptions.insuranceAnnual}
                onChange={(e) =>
                  onChangeAssumptions({
                    ...assumptions,
                    insuranceAnnual: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-mono text-gray-900"
              />
              <p className="text-[10px] text-gray-500">
                Source: AirROI + DLCP (default $340/yr)
              </p>
            </div>

            {/* DC License */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 space-y-1">
              <label className="font-semibold text-gray-900 block">
                DC Host License ($ / 2 years)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={assumptions.licenseBiennial}
                onChange={(e) =>
                  onChangeAssumptions({
                    ...assumptions,
                    licenseBiennial: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-mono text-gray-900"
              />
              <p className="text-[10px] text-gray-500">
                Source: DLCP official fee is $99 / 2 yrs ($4.13/mo)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
