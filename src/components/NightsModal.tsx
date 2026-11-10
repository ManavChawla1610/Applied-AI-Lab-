/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { clampNights } from '../../lib/calc';

interface NightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  nights: number;
  benchmarkNights: number;
  onUpdateNights: (nights: number) => void;
}

export const NightsModal: React.FC<NightsModalProps> = ({
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nights-modal-title"
    >
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-7 space-y-6">
        {/* Header: Close 'X' top-left, centered title */}
        <div className="relative flex items-center justify-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute left-0 p-1.5 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 id="nights-modal-title" className="text-base font-semibold text-gray-900 text-center">
            How many nights?
          </h2>
        </div>

        {/* Stepper Control */}
        <div className="flex items-center justify-center gap-8 py-3">
          <button
            type="button"
            onClick={handleDecrement}
            disabled={tempNights <= 1}
            className="w-11 h-11 rounded-full border border-gray-300 flex items-center justify-center text-gray-700 hover:border-gray-900 hover:text-gray-900 active:scale-95 disabled:opacity-25 disabled:pointer-events-none transition-all cursor-pointer"
            aria-label="Decrease nights"
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="text-center min-w-[80px]">
            <div className="text-5xl font-extrabold tracking-tight text-gray-900 tabular-nums">
              {tempNights}
            </div>
          </div>

          <button
            type="button"
            onClick={handleIncrement}
            disabled={tempNights >= 30}
            className="w-11 h-11 rounded-full border border-gray-300 flex items-center justify-center text-gray-700 hover:border-gray-900 hover:text-gray-900 active:scale-95 disabled:opacity-25 disabled:pointer-events-none transition-all cursor-pointer"
            aria-label="Increase nights"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Subtitle / Benchmark line */}
        <p className="text-center text-xs text-gray-500 leading-relaxed px-2">
          Similar homes available all month book about {benchmarkNights} nights.
        </p>

        {/* Black full-width button */}
        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3.5 px-4 bg-gray-900 hover:bg-black text-white text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-xs active:scale-[0.99]"
        >
          Update your estimate
        </button>
      </div>
    </div>
  );
};
