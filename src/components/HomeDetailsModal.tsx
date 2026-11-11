/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  MapPin,
  Minus,
  Plus,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import {
  BedroomOption,
  formatCurrency,
  GeoPoint,
  SpaceType,
  validatePriceOverride,
} from '../../lib/calc';
import { AIRBNB_HOST_FEE } from '../../config/rules';
import { isWithinDcBounds } from './AddressSearchPanel';
import { AddressSuggestion, OUTSIDE_DC_MESSAGE, useAddressSearch } from '../lib/useAddressSearch';

export interface HomeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pin: GeoPoint;
  customLabel: string | null;
  spaceType: SpaceType;
  bedrooms: BedroomOption;
  includeLowActivity: boolean;
  priceOverride: number | null;
  suggestedMedianPrice: number;
  onUpdateDetails: (details: {
    pin: GeoPoint;
    customLabel: string;
    spaceType: SpaceType;
    bedrooms: BedroomOption;
    includeLowActivity: boolean;
    priceOverride: number | null;
  }) => void;
}

type GeocodeSuggestion = AddressSuggestion;

export const HomeDetailsModal: React.FC<HomeDetailsModalProps> = ({
  isOpen,
  onClose,
  pin,
  customLabel,
  spaceType,
  bedrooms,
  includeLowActivity,
  priceOverride,
  suggestedMedianPrice,
  onUpdateDetails,
}) => {
  // Local state for draft updates
  const [selectedPin, setSelectedPin] = useState<GeoPoint>(pin);
  const [selectedLabel, setSelectedLabel] = useState<string>(customLabel || 'Capitol Hill, DC');
  const [tempSpaceType, setTempSpaceType] = useState<SpaceType>(spaceType);
  const [tempBedrooms, setTempBedrooms] = useState<BedroomOption>(bedrooms);
  const [tempIncludeLowActivity, setTempIncludeLowActivity] = useState<boolean>(includeLowActivity);
  const [tempPriceOverride, setTempPriceOverride] = useState<number | null>(priceOverride);
  const [priceInput, setPriceInput] = useState<string>(priceOverride ? String(priceOverride) : '');
  const [priceError, setPriceError] = useState<string | null>(null);

  // Accordion collapses
  const [isPriceOpen, setIsPriceOpen] = useState<boolean>(Boolean(priceOverride));
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState<boolean>(includeLowActivity);

  // Address search state (shared search-as-you-type hook)
  const search = useAddressSearch();
  const [selectError, setSelectError] = useState<string | null>(null);
  const [isAddressInputFocused, setIsAddressInputFocused] = useState<boolean>(false);
  const searchQuery = search.query;
  const suggestions = search.suggestions;
  const isSearching = search.status === 'searching';
  const boundsWarning = search.outsideDcError || selectError;

  useEffect(() => {
    if (isOpen) {
      setSelectedPin(pin);
      setSelectedLabel(customLabel || 'Capitol Hill, DC');
      setTempSpaceType(spaceType);
      setTempBedrooms(bedrooms);
      setTempIncludeLowActivity(includeLowActivity);
      setTempPriceOverride(priceOverride);
      setPriceInput(priceOverride ? String(priceOverride) : '');
      setPriceError(null);
      search.reset();
      setSelectError(null);
      setIsPriceOpen(Boolean(priceOverride));
      setIsMoreOptionsOpen(includeLowActivity);
    }
  }, [isOpen, pin, customLabel, spaceType, bedrooms, includeLowActivity, priceOverride]);

  if (!isOpen) return null;

  const bedroomValues: BedroomOption[] = ['studio', '1', '2', '3+'];

  const getBedroomIndex = (val: BedroomOption) => {
    return bedroomValues.indexOf(val);
  };

  const handleBedroomsDecrement = () => {
    const idx = getBedroomIndex(tempBedrooms);
    if (idx > 0) {
      setTempBedrooms(bedroomValues[idx - 1]);
    }
  };

  const handleBedroomsIncrement = () => {
    const idx = getBedroomIndex(tempBedrooms);
    if (idx < bedroomValues.length - 1) {
      setTempBedrooms(bedroomValues[idx + 1]);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectError(null);
    search.setQuery(e.target.value);
  };

  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      search.moveHighlight(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      search.moveHighlight(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const picked = await search.resolveOnEnter();
      if (picked) handleSelectSuggestion(picked);
    }
  };

  const handleSelectSuggestion = (item: GeocodeSuggestion) => {
    if (!isWithinDcBounds(item.lat, item.lng)) {
      setSelectError(OUTSIDE_DC_MESSAGE);
      return;
    }
    setSelectedPin({ lat: item.lat, lng: item.lng });
    setSelectedLabel(item.shortLabel);
    search.reset();
    setSelectError(null);
    setIsAddressInputFocused(false);
  };

  const handlePriceChange = (val: string) => {
    setPriceInput(val);
    if (!val.trim()) {
      setTempPriceOverride(null);
      setPriceError(null);
      return;
    }
    const num = Number(val);
    const validation = validatePriceOverride(num);
    if (!validation.isValid) {
      setPriceError(validation.errorMessage || 'Invalid price');
    } else {
      setPriceError(null);
      setTempPriceOverride(num);
    }
  };

  const handleResetPrice = () => {
    setTempPriceOverride(null);
    setPriceInput('');
    setPriceError(null);
  };

  const handleSaveAll = async () => {
    // Typed an address but didn't pick a suggestion: resolve it first
    if (searchQuery.trim()) {
      const picked = await search.resolveOnEnter();
      if (!picked) return; // red DC-only error or hint is shown; keep the modal open
      if (!isWithinDcBounds(picked.lat, picked.lng)) {
        setSelectError(OUTSIDE_DC_MESSAGE);
        return;
      }
      onUpdateDetails({
        pin: { lat: picked.lat, lng: picked.lng },
        customLabel: picked.shortLabel,
        spaceType: tempSpaceType,
        bedrooms: tempBedrooms,
        includeLowActivity: tempIncludeLowActivity,
        priceOverride: tempPriceOverride,
      });
      onClose();
      return;
    }
    onUpdateDetails({
      pin: selectedPin,
      customLabel: selectedLabel,
      spaceType: tempSpaceType,
      bedrooms: tempBedrooms,
      includeLowActivity: tempIncludeLowActivity,
      priceOverride: tempPriceOverride,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tell-us-title"
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto my-auto">
        {/* Header: Close 'X' top-left, centered title */}
        <div className="relative flex items-center justify-center border-b border-gray-100 pb-4">
          <button
            type="button"
            onClick={onClose}
            className="absolute left-0 p-1.5 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 id="tell-us-title" className="text-base font-semibold text-gray-900 text-center">
            Tell us about your home
          </h2>
        </div>

        {/* Section 1: Address or Area */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
            Address or area
          </label>
          <div className="relative">
            <div className="relative flex items-center">
              <MapPin className="absolute left-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={isAddressInputFocused ? searchQuery : (searchQuery || selectedLabel)}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => setIsAddressInputFocused(true)}
                autoComplete="off"
                placeholder="Where's your place in DC?"
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-all shadow-2xs"
              />
              {isSearching ? (
                <Loader2 className="absolute right-3.5 w-4 h-4 text-rose-500 animate-spin" />
              ) : (
                <Search className="absolute right-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
              )}
            </div>

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                {suggestions.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectSuggestion(item)}
                    onMouseEnter={() => search.setHighlightedIndex(index)}
                    className={`w-full text-left p-3 flex items-start gap-2.5 transition-colors cursor-pointer ${
                      index === search.highlightedIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
                    }`}
                  >
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {item.shortLabel}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {item.neighborhood ? `${item.neighborhood}, Washington, DC` : item.displayName}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {boundsWarning && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{boundsWarning}</span>
            </div>
          )}

          {!boundsWarning && search.hint && suggestions.length === 0 && (
            <p className="text-xs text-gray-500 pl-1">{search.hint}</p>
          )}

          <p className="text-[11px] text-gray-400 pl-1">
            We only use your address to find similar listings nearby. It isn't saved.
          </p>
        </div>

        {/* Section 2: Type of space (Segmented Control) */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
            Type of space
          </label>
          <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setTempSpaceType('entire_home')}
              className={`py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                tempSpaceType === 'entire_home'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Entire place
            </button>
            <button
              type="button"
              onClick={() => setTempSpaceType('private_room')}
              className={`py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                tempSpaceType === 'private_room'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Private room
            </button>
          </div>
        </div>

        {/* Section 3: Bedrooms (Stepper, hidden for Private room) */}
        {tempSpaceType === 'entire_home' && (
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Bedrooms
            </label>
            <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-sm font-medium text-gray-700">Number of bedrooms</span>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleBedroomsDecrement}
                  disabled={tempBedrooms === 'studio'}
                  className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-700 hover:border-gray-900 disabled:opacity-25 transition-all cursor-pointer"
                  aria-label="Decrease bedrooms"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-bold text-gray-900 min-w-[50px] text-center tabular-nums">
                  {tempBedrooms === 'studio' ? 'Studio' : `${tempBedrooms} bed`}
                </span>
                <button
                  type="button"
                  onClick={handleBedroomsIncrement}
                  disabled={tempBedrooms === '3+'}
                  className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-700 hover:border-gray-900 disabled:opacity-25 transition-all cursor-pointer"
                  aria-label="Increase bedrooms"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Collapsed 'Set your own price' */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setIsPriceOpen((prev) => !prev)}
            className="w-full p-4 flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <span>Set your own price</span>
            {isPriceOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>

          {isPriceOpen && (
            <div className="p-4 pt-1 border-t border-gray-100 bg-gray-50/50 space-y-3">
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-gray-500 font-medium">$</span>
                <input
                  type="number"
                  min={10}
                  max={5000}
                  value={priceInput}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  placeholder={suggestedMedianPrice > 0 ? `Suggested: ${formatCurrency(suggestedMedianPrice)}/night` : 'e.g. 175'}
                  className="w-full pl-8 pr-16 py-2 bg-white rounded-lg border border-gray-300 focus:border-gray-900 focus:outline-none text-sm tabular-nums"
                />
                <span className="absolute right-3.5 top-2 text-xs text-gray-400">/night</span>
              </div>

              {priceError && <p className="text-xs text-rose-600">{priceError}</p>}

              {tempPriceOverride !== null && (
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>
                    You'd receive ≈{' '}
                    <strong className="text-gray-900 tabular-nums">
                      {formatCurrency(Math.round(tempPriceOverride * (1 - AIRBNB_HOST_FEE)))}/night
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleResetPrice}
                    className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset to suggested</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 5: Collapsed 'More options' (low-activity listings toggle) */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setIsMoreOptionsOpen((prev) => !prev)}
            className="w-full p-4 flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <span>More options</span>
            {isMoreOptionsOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>

          {isMoreOptionsOpen && (
            <div className="p-4 pt-1 border-t border-gray-100 bg-gray-50/50">
              <label className="flex items-center justify-between gap-3 cursor-pointer py-1">
                <div>
                  <div className="text-xs sm:text-sm font-medium text-gray-900">
                    Include low-activity listings
                  </div>
                  <div className="text-xs text-gray-500">
                    Include listings with fewer than 30 booked nights in the past year.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={tempIncludeLowActivity}
                  onChange={(e) => setTempIncludeLowActivity(e.target.checked)}
                  className="w-4 h-4 accent-gray-900 rounded cursor-pointer shrink-0"
                />
              </label>
            </div>
          )}
        </div>

        {/* Full-width Black CTA */}
        <button
          type="button"
          onClick={handleSaveAll}
          className="w-full py-3.5 px-4 bg-gray-900 hover:bg-black text-white text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-xs active:scale-[0.99]"
        >
          Update your estimate
        </button>
      </div>
    </div>
  );
};
