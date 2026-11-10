/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DC_RULES } from '../../../config/dcRules';
import { CheckSquare, Square, DollarSign, ShieldAlert, Wrench, CheckCircle } from 'lucide-react';

interface ChecklistItem {
  id: string;
  category: 'application' | 'safety' | 'operating';
  text: string;
  costLabel: string;
  numericCost?: number;
}

export const SetupChecklist: React.FC = () => {
  const items: ChecklistItem[] = [
    // Application Steps
    ...DC_RULES.applicationSteps.map((step) => ({
      id: step.id,
      category: 'application' as const,
      text: step.text,
      costLabel:
        step.id === 'step_pay_fee'
          ? '$99 / 2 years'
          : step.id === 'step_insurance'
          ? '$250K minimum coverage — check your platform\'s host coverage or get a quote'
          : '—',
      numericCost: step.id === 'step_pay_fee' ? 99 : undefined,
    })),
    // Safety Requirements
    ...DC_RULES.safetyRequirements.map((safety) => ({
      id: safety.id,
      category: 'safety' as const,
      text: safety.text,
      costLabel: '—',
    })),
    // Operating Rules
    ...DC_RULES.operatingRules.map((op) => ({
      id: op.id,
      category: 'operating' as const,
      text: op.text,
      costLabel: '—',
    })),
  ];

  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const totalItems = items.length;
  const completedCount = checkedIds.size;
  const progressPct = Math.round((completedCount / totalItems) * 100);

  // Total of known items only
  const totalKnownCost = 99;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold uppercase tracking-wider mb-2">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Step 5: Setup Checklist</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
            Complete DC Host Setup Checklist
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Track your progress through application steps, safety installs, and operating rules. State is stored in memory.
          </p>
        </div>

        {/* Progress & Known Cost Card */}
        <div className="flex items-center gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200 shrink-0">
          <div className="text-right">
            <div className="text-xs uppercase font-semibold text-gray-500">Progress</div>
            <div className="text-base font-bold text-gray-900 font-mono">
              {completedCount} of {totalItems} done
            </div>
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <div className="text-left">
            <div className="text-xs uppercase font-semibold text-gray-500">Known Setup Fee</div>
            <div className="text-base font-bold text-emerald-700 font-mono">
              ${totalKnownCost}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Checklist Sections */}
      <div className="space-y-6 pt-2">
        {/* Application Steps */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Application & Licensing Steps ({DC_RULES.applicationSteps.length})</span>
          </h4>
          <div className="space-y-2">
            {items
              .filter((i) => i.category === 'application')
              .map((item) => {
                const isChecked = checkedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`flex items-start justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-emerald-50/50 border-emerald-200 text-gray-900'
                        : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        aria-label={isChecked ? 'Mark incomplete' : 'Mark complete'}
                        className="mt-0.5 text-gray-400 hover:text-gray-900"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <span className={`text-xs sm:text-sm ${isChecked ? 'line-through text-gray-500' : ''}`}>
                        {item.text}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-medium text-gray-500 shrink-0 text-right max-w-[140px]">
                      {item.costLabel}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Safety Requirements */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Safety & Equipment Requirements ({DC_RULES.safetyRequirements.length})</span>
          </h4>
          <div className="space-y-2">
            {items
              .filter((i) => i.category === 'safety')
              .map((item) => {
                const isChecked = checkedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`flex items-start justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-emerald-50/50 border-emerald-200 text-gray-900'
                        : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        aria-label={isChecked ? 'Mark incomplete' : 'Mark complete'}
                        className="mt-0.5 text-gray-400 hover:text-gray-900"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <span className={`text-xs sm:text-sm ${isChecked ? 'line-through text-gray-500' : ''}`}>
                        {item.text}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-gray-400 shrink-0">
                      {item.costLabel}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Operating Rules */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
            <Wrench className="w-4 h-4 text-blue-600" />
            <span>Ongoing Operating Rules ({DC_RULES.operatingRules.length})</span>
          </h4>
          <div className="space-y-2">
            {items
              .filter((i) => i.category === 'operating')
              .map((item) => {
                const isChecked = checkedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`flex items-start justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-emerald-50/50 border-emerald-200 text-gray-900'
                        : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        aria-label={isChecked ? 'Mark incomplete' : 'Mark complete'}
                        className="mt-0.5 text-gray-400 hover:text-gray-900"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <span className={`text-xs sm:text-sm ${isChecked ? 'line-through text-gray-500' : ''}`}>
                        {item.text}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-gray-400 shrink-0">
                      {item.costLabel}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
