/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../../../lib/calc';
import { calculateSetupPaybackMonths, SetupCostInputs } from '../../../../lib/costs';

interface OneTimeSetupCardProps {
  setupInputs: SetupCostInputs;
  netBeforeHousing: number;
  onChangeSetupInputs: (inputs: SetupCostInputs) => void;
}

export const OneTimeSetupCard: React.FC<OneTimeSetupCardProps> = ({
  setupInputs,
  netBeforeHousing,
  onChangeSetupInputs,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const totalSetup =
    setupInputs.furniture +
    setupInputs.photos +
    setupInputs.safetyEquipment +
    setupInputs.smartLock +
    setupInputs.other;

  const hasAnyInput = totalSetup > 0;
  const paybackMonths = calculateSetupPaybackMonths(totalSetup, netBeforeHousing);

  const updateField = (field: keyof SetupCostInputs, val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    onChangeSetupInputs({
      ...setupInputs,
      [field]: num,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">
              Optional: Calculate one-time setup investment & payback
            </h4>
            <p className="text-xs text-gray-500">
              Furnishings, professional photos, DC-required safety gear, smart lock
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasAnyInput && (
            <span className="text-xs font-mono font-bold text-purple-900 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg">
              Total setup: {formatCurrency(totalSetup)}
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 pt-0 border-t border-gray-100 space-y-4">
          <p className="text-xs text-gray-500 pt-3">
            Enter your estimated launch setup costs. We will compute how many months of net hosting income it takes to pay it all back.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Furniture & Bedding ($)
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={setupInputs.furniture || ''}
                onChange={(e) => updateField('furniture', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Professional Photos ($)
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={setupInputs.photos || ''}
                onChange={(e) => updateField('photos', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Safety Gear (DC Law) ($)
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={setupInputs.safetyEquipment || ''}
                onChange={(e) => updateField('safetyEquipment', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Smart Keypad Lock ($)
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={setupInputs.smartLock || ''}
                onChange={(e) => updateField('smartLock', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Other Setup ($)
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={setupInputs.other || ''}
                onChange={(e) => updateField('other', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
              />
            </div>
          </div>

          {/* Payback Result */}
          {hasAnyInput && (
            <div className="p-3.5 bg-purple-50/80 rounded-xl border border-purple-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-purple-950">
                Total setup cost: {formatCurrency(totalSetup)}
              </span>
              {paybackMonths !== null && paybackMonths > 0 ? (
                <span className="font-mono font-bold text-purple-900 text-sm">
                  Pays back in about {paybackMonths.toFixed(1)} months of hosting
                </span>
              ) : (
                <span className="text-gray-500 italic">
                  Payback cannot be calculated when net profit is $0 or negative.
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
