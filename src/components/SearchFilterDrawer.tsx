/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Home, BedDouble, DollarSign, Activity, Check } from 'lucide-react';
import { BedroomOption, SpaceType, validatePriceOverride, formatCurrency } from '../../lib/calc';
import { AIRBNB_HOST_FEE } from '../../config/rules';

interface SearchFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  spaceType: SpaceType;
  bedrooms: BedroomOption;
  includeLowActivity: boolean;
  priceOverride: number | null;
  suggestedMedianPrice: number;
  onSave: (params: {
    spaceType: SpaceType;
    bedrooms: BedroomOption;
    includeLowActivity: boolean;
    priceOverride: number | null;
  }) => void;
}

export const SearchFilterDrawer: React.FC<SearchFilterDrawerProps> = ({
  isOpen,
  onClose,
  spaceType,
  bedrooms,
  includeLowActivity,
  priceOverride,
  suggestedMedianPrice,
  onSave,
}) => {
  const [selectedSpaceType, setSelectedSpaceType] = useState<SpaceType>(spaceType);
  const [selectedBedrooms, setSelectedBedrooms] = useState<BedroomOption>(bedrooms);
  const [selectedLowActivity, setSelectedLowActivity] = useState<boolean>(includeLowActivity);
  const [priceInput, setPriceInput] = useState<string>(
    priceOverride !== null ? String(priceOverride) : ''
  );
  const [priceError, setPriceError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSpaceType(spaceType);
    setSelectedBedrooms(bedrooms);
    setSelectedLowActivity(includeLowActivity);
    setPriceInput(priceOverride !== null ? String(priceOverride) : '');
    setPriceError(null);
  }, [spaceType, bedrooms, includeLowActivity, priceOverride, isOpen]);

  if (!isOpen) return null;

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPriceInput(val);
    if (val === '') {
      setPriceError(null);
      return;
    }
    const validation = validatePriceOverride(Number(val));
    if (!validation.isValid) {
      setPriceError(validation.errorMessage || 'Invalid price');
    } else {
      setPriceError(null);
    }
  };

  const handleResetPrice = () => {
    setPriceInput('');
    setPriceError(null);
  };

  const handleFillSuggested = () => {
    if (suggestedMedianPrice > 0) {
      setPriceInput(String(suggestedMedianPrice));
      setPriceError(null);
    }
  };

  const handleApply = () => {
    let finalOverride: number | null = null;
    if (priceInput.trim() !== '') {
      const parsed = Number(priceInput);
      const validation = validatePriceOverride(parsed);
      if (!validation.isValid) {
        setPriceError(validation.errorMessage || 'Invalid nightly price');
        return;
      }
      finalOverride = validation.value;
    }

    onSave({
      spaceType: selectedSpaceType,
      bedrooms: selectedBedrooms,
      includeLowActivity: selectedLowActivity,
      priceOverride: finalOverride,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="filter-drawer-title"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 id="filter-drawer-title" className="text-lg font-semibold text-gray-900">
            Edit your home details
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close filters"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Space Type */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Home className="w-4 h-4 text-gray-600" />
              Space type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedSpaceType('entire_home')}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  selectedSpaceType === 'entire_home'
                    ? 'border-gray-900 bg-gray-50/80 ring-2 ring-gray-900/10'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-900">Entire place</span>
                  {selectedSpaceType === 'entire_home' && (
                    <Check className="w-4 h-4 text-gray-900" />
                  )}
                </div>
                <span className="text-xs text-gray-500 mt-1">
                  My entire place or separate private unit
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSpaceType('private_room')}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  selectedSpaceType === 'private_room'
                    ? 'border-gray-900 bg-gray-50/80 ring-2 ring-gray-900/10'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-900">Private room</span>
                  {selectedSpaceType === 'private_room' && (
                    <Check className="w-4 h-4 text-gray-900" />
                  )}
                </div>
                <span className="text-xs text-gray-500 mt-1">
                  A private room inside my home
                </span>
              </button>
            </div>
          </div>

          {/* Bedrooms (Entire Place only) */}
          {selectedSpaceType === 'entire_home' && (
            <div className="space-y-3 border-t border-gray-100 pt-5">
              <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-gray-600" />
                Bedrooms
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['studio', '1', '2', '3+'] as BedroomOption[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSelectedBedrooms(option)}
                    className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all text-center cursor-pointer ${
                      selectedBedrooms === option
                        ? 'border-gray-900 bg-gray-900 text-white shadow-xs'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300 bg-white'
                    }`}
                  >
                    {option === 'studio' ? 'Studio' : `${option} Bed`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Optional Nightly Price Override */}
          <div className="space-y-3 border-t border-gray-100 pt-5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-600" />
                Your listing price ($/night)
              </label>
              {priceInput !== '' && (
                <button
                  type="button"
                  onClick={handleResetPrice}
                  className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset to suggested
                </button>
              )}
            </div>

            <p className="text-xs text-gray-500">
              By default, we use each comparable's actual trailing 12-month average nightly rate. You can override it with your target listing price.
            </p>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                $
              </span>
              <input
                type="number"
                min="1"
                step="1"
                placeholder={suggestedMedianPrice > 0 ? `Suggested: ${formatCurrency(suggestedMedianPrice)}/night` : 'e.g. 175'}
                value={priceInput}
                onChange={handlePriceChange}
                className={`w-full pl-8 pr-16 py-2.5 rounded-lg border text-sm font-mono focus:outline-none transition-colors ${
                  priceError
                    ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                    : 'border-gray-200 focus:border-gray-900 bg-white'
                }`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-sans">
                / night
              </span>
            </div>

            {/* Live payout preview */}
            {priceInput !== '' && !priceError && Number(priceInput) > 0 && (
              <p className="text-xs text-emerald-700 font-medium bg-emerald-50/80 px-2.5 py-1.5 rounded-lg border border-emerald-100">
                You'd receive ≈ {formatCurrency(Math.round(Number(priceInput) * (1 - AIRBNB_HOST_FEE)))}/night
              </p>
            )}

            {priceError && <p className="text-xs text-rose-600">{priceError}</p>}

            {priceInput === '' && suggestedMedianPrice > 0 && (
              <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-200/60">
                <span>
                  Suggested: <strong>{formatCurrency(suggestedMedianPrice)}/night</strong> (payout ≈{' '}
                  {formatCurrency(Math.round(suggestedMedianPrice * (1 - AIRBNB_HOST_FEE)))}/night)
                </span>
                <button
                  type="button"
                  onClick={handleFillSuggested}
                  className="text-blue-600 hover:underline font-medium cursor-pointer"
                >
                  Apply suggested
                </button>
              </div>
            )}
          </div>

          {/* Toggle: Include Low-Activity Listings */}
          <div className="border-t border-gray-100 pt-5">
            <label className="flex items-start justify-between gap-3 cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-gray-600" />
                  Include low-activity listings
                </span>
                <p className="text-xs text-gray-500 leading-normal">
                  Listings booked fewer than 30 nights in the last 12 months are excluded by default to avoid skewed numbers. Turn on to inspect all registered listings.
                </p>
              </div>
              <input
                type="checkbox"
                checked={selectedLowActivity}
                onChange={(e) => setSelectedLowActivity(e.target.checked)}
                className="mt-1 w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500 accent-rose-600 cursor-pointer"
              />
            </label>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 border border-gray-200/60">
            <strong>Location:</strong> To change your location pin, drag or click directly on the interactive map on the main screen.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 bg-gray-900 hover:bg-black text-white text-sm font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Apply changes
          </button>
        </div>
      </div>
    </div>
  );
};
