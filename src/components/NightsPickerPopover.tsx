/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Minus, Plus, X, AlertTriangle, Sparkles } from 'lucide-react';
import { clampNights } from '../../lib/calc';

interface NightsPickerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  nights: number;
  benchmarkNights: number;
  onUpdateNights: (nights: number) => void;
}

export const NightsPickerPopover: React.FC<NightsPickerPopoverProps> = ({
  isOpen,
  onClose,
  nights,
  benchmarkNights,
  onUpdateNights,
}) => {
  const [tempNights, setTempNights] = useState<number>(nights);

  useEffect(() => {
    setTempNights(nights);
  }, [nights, isOpen]);

  if (!isOpen) return null;

  const handleDecrement = () => {
    setTempNights((prev) => clampNights(prev - 1));
  };

  const handleIncrement = () => {
    setTempNights((prev) => clampNights(prev + 1));
  };

  const handleSave = () => {
    onUpdateNights(tempNights);
    onClose();
  };

  const isOptimistic = tempNights > benchmarkNights;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nights-picker-title"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 id="nights-picker-title" className="text-lg font-semibold text-gray-900">
            How many nights will you host per month?
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close nights picker"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Control */}
        <div className="flex items-center justify-center gap-6 py-4">
          <button
            onClick={handleDecrement}
            disabled={tempNights <= 1}
            className="w-12 h-12 rounded-full border border-gray-300 flex items-center justify-center text-gray-700 hover:border-gray-900 hover:text-gray-900 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
            aria-label="Decrease nights"
          >
            <Minus className="w-5 h-5" />
          </button>

          <div className="text-center min-w-[120px]">
            <div className="text-5xl font-bold tracking-tight text-gray-900 font-mono">
              {tempNights}
            </div>
            <div className="text-xs uppercase tracking-wider text-gray-500 font-medium mt-1">
              {tempNights === 1 ? 'Night / month' : 'Nights / month'}
            </div>
          </div>

          <button
            onClick={handleIncrement}
            disabled={tempNights >= 30}
            className="w-12 h-12 rounded-full border border-gray-300 flex items-center justify-center text-gray-700 hover:border-gray-900 hover:text-gray-900 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
            aria-label="Increase nights"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Slider representation in popover */}
        <div className="space-y-1 px-2">
          <input
            type="range"
            min={1}
            max={30}
            value={tempNights}
            onChange={(e) => setTempNights(clampNights(Number(e.target.value)))}
            className="w-full accent-rose-500 cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-400 font-mono">
            <span>1 night</span>
            <span>15 nights</span>
            <span>30 nights</span>
          </div>
        </div>

        {/* Benchmark text */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 space-y-1">
          <div className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Local Market Benchmark</span>
          </div>
          <p className="text-blue-800 leading-relaxed">
            Similar listings open all month book about <strong>{benchmarkNights} nights/month</strong> (based on trailing 12-month adjusted occupancy across comparable listings).
          </p>
        </div>

        {/* Optimistic Warning */}
        {isOptimistic && (
          <div className="p-3.5 bg-amber-50 border border-amber-200/90 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              You've chosen more nights ({tempNights}) than similar listings usually book ({benchmarkNights}) — this estimate may be optimistic.
            </p>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={handleSave}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Update your estimate
          </button>
        </div>
      </div>
    </div>
  );
};
