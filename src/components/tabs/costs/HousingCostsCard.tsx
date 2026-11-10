/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Home } from 'lucide-react';
import { formatCurrency } from '../../../../lib/calc';
import { HousingCostInputs } from '../../../../lib/costs';

interface HousingCostsCardProps {
  housingInputs: HousingCostInputs;
  netBeforeHousing: number;
  onChangeHousingInputs: (inputs: HousingCostInputs) => void;
}

export const HousingCostsCard: React.FC<HousingCostsCardProps> = ({
  housingInputs,
  netBeforeHousing,
  onChangeHousingInputs,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const totalHousing =
    housingInputs.mortgageRentShare +
    housingInputs.propertyTax +
    housingInputs.homeInsurance +
    housingInputs.hoaCondoFees;

  const hasAnyInput = totalHousing > 0;
  const netAfterHousing = netBeforeHousing - totalHousing;

  const updateField = (field: keyof HousingCostInputs, val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    onChangeHousingInputs({
      ...housingInputs,
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
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Home className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">
              Optional: Deduct your monthly housing costs
            </h4>
            <p className="text-xs text-gray-500">
              Mortgage/rent share, property taxes, homeowner insurance, or HOA fees for the rented portion
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasAnyInput && (
            <span className="text-xs font-mono font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
              -{formatCurrency(totalHousing)}/mo
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
            Enter the portion of your housing expenses attributable to the hosted space. Blank fields count as $0.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Mortgage / Rent Share ($/mo)
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={housingInputs.mortgageRentShare || ''}
                onChange={(e) => updateField('mortgageRentShare', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Property Tax Share ($/mo)
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={housingInputs.propertyTax || ''}
                onChange={(e) => updateField('propertyTax', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Homeowner's Insurance ($/mo)
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={housingInputs.homeInsurance || ''}
                onChange={(e) => updateField('homeInsurance', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Condo / HOA Fees ($/mo)
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={housingInputs.hoaCondoFees || ''}
                onChange={(e) => updateField('hoaCondoFees', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900"
              />
            </div>
          </div>

          {/* Result line: Only show if user entered housing costs */}
          {hasAnyInput && (
            <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-blue-950">
                After housing costs ({formatCurrency(totalHousing)}/month deducted):
              </span>
              <span className="font-mono font-bold text-blue-900 text-sm">
                After housing costs: {formatCurrency(netAfterHousing)}/month ({formatCurrency(netAfterHousing * 12)}/year)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
