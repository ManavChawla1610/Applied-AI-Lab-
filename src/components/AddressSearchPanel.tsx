/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  MapPin,
  Search,
  Loader2,
  AlertCircle,
  Map,
} from 'lucide-react';
import { DC_BOUNDS, GEOCODE_DEBOUNCE_MS, MIN_QUERY_LENGTH } from '../../config/geo';

export interface GeocodeResultItem {
  id: string;
  displayName: string;
  shortLabel: string;
  neighborhood: string;
  lat: number;
  lng: number;
}

interface AddressSearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAddress: (result: {
    lat: number;
    lng: number;
    shortLabel: string;
  }) => void;
  onUseMapInstead: () => void;
}

export function isWithinDcBounds(lat: number, lng: number, state?: string): boolean {
  // Guard: if either coordinate is NaN, cannot be validated as within DC
  if (isNaN(lat) || isNaN(lng)) {
    return false;
  }

  // 1. Overall bounding box check
  if (
    lat < DC_BOUNDS.minLat ||
    lat > DC_BOUNDS.maxLat ||
    lng < DC_BOUNDS.minLng ||
    lng > DC_BOUNDS.maxLng
  ) {
    return false;
  }

  // 2. Explicit state check if available from geocoder
  if (state) {
    const s = state.toLowerCase();
    if (s.includes('va') || s.includes('virginia') || s.includes('md') || s.includes('maryland')) {
      return false;
    }
    if (s.includes('district of columbia') || s.includes('dc')) {
      return true;
    }
  }

  // 3. Potomac River southwest cutoff (Arlington / Northern Virginia across river)
  // Arlington at 38.88, -77.10 is across the river; Georgetown is at lat >= 38.907
  if (lat < 38.892 && lng < -77.06) {
    return false;
  }

  return true;
}

export const AddressSearchPanel: React.FC<AddressSearchPanelProps> = ({
  isOpen,
  onClose,
  onSelectAddress,
  onUseMapInstead,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [boundsWarning, setBoundsWarning] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastResolvedOutsideDc = useRef<boolean>(false);

  // Reset and autofocus on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSuggestions([]);
      setIsLoading(false);
      setHasSearched(false);
      setErrorMessage(null);
      setBoundsWarning(null);
      setHighlightedIndex(-1);
      lastResolvedOutsideDc.current = false;
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
  }, [isOpen]);

  const executeSearch = async (searchTerm: string, isManualSubmit = false) => {
    const trimmed = searchTerm.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsLoading(false);
      setHasSearched(false);
      setErrorMessage(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error('Geocoding request failed');
      }

      const data = await res.json();
      const fetchedSuggestions: GeocodeResultItem[] = Array.isArray(data)
        ? data
        : (data?.suggestions || []);
      const isOutside = Boolean(data && data.outsideDc);

      lastResolvedOutsideDc.current = isOutside;
      setSuggestions(fetchedSuggestions);
      setHasSearched(true);
      setHighlightedIndex(fetchedSuggestions.length > 0 ? 0 : -1);

      // STEP 4: Red error appears ONLY on Enter with non-DC text
      if (isManualSubmit) {
        if (fetchedSuggestions.length > 0) {
          handleSelect(fetchedSuggestions[0]);
        } else if (isOutside) {
          setBoundsWarning('This app covers Washington, DC only.');
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      console.error('Address search error:', err);
      // STEP 3: Geocoder failure -> muted text
      setErrorMessage('Address search is unavailable — click the map to place your home.');
      setSuggestions([]);
      setHasSearched(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    // Editing text immediately clears any error
    setBoundsWarning(null);
    setErrorMessage(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsLoading(false);
      setHasSearched(false);
      lastResolvedOutsideDc.current = false;
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(() => {
      executeSearch(val, false);
    }, GEOCODE_DEBOUNCE_MS);
  };

  const handleSelect = (item: GeocodeResultItem) => {
    if (!isWithinDcBounds(item.lat, item.lng)) {
      setBoundsWarning('This app covers Washington, DC only.');
      return;
    }

    onSelectAddress({
      lat: item.lat,
      lng: item.lng,
      shortLabel: item.shortLabel,
    });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) {
        // Pressing Enter with DC suggestions showing selects the first one
        const chosen = highlightedIndex >= 0 && suggestions[highlightedIndex] ? suggestions[highlightedIndex] : suggestions[0];
        handleSelect(chosen);
      } else if (lastResolvedOutsideDc.current) {
        // Text resolves to non-DC
        setBoundsWarning('This app covers Washington, DC only.');
      } else if (query.trim().length >= MIN_QUERY_LENGTH) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        executeSearch(query, true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length === 0) return;
      setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length === 0) return;
      setHighlightedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      return;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="address-search-title"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col mt-4 sm:mt-0 transition-all">
        {/* Panel Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -ml-1 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 id="address-search-title" className="text-base font-semibold text-gray-900">
            Your address or area
          </h2>
        </div>

        {/* Input Field */}
        <div className="p-5 pb-3 space-y-2">
          <div className="relative flex items-center">
            <MapPin className="absolute left-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Where's your place?"
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-all shadow-xs"
            />
            {isLoading ? (
              <Loader2 className="absolute right-3.5 w-4 h-4 text-rose-500 animate-spin" />
            ) : (
              <Search className="absolute right-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
            )}
          </div>

          {/* Privacy Note */}
          <p className="text-[11px] text-gray-500 pl-1">
            We only use your address to find similar listings nearby. It isn't saved.
          </p>

          {/* Out-of-bounds warning */}
          {boundsWarning && (
            <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{boundsWarning}</span>
            </div>
          )}

          {/* Geocoder failure -> muted text */}
          {errorMessage && (
            <p className="text-xs text-gray-500 pl-1 pt-1">
              {errorMessage}
            </p>
          )}
        </div>

        {/* Suggestions List */}
        <div className="px-3 pb-3 max-h-[260px] overflow-y-auto">
          {isLoading && query.length >= MIN_QUERY_LENGTH && suggestions.length === 0 && (
            <div className="py-6 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              <span>Searching…</span>
            </div>
          )}

          {!isLoading && hasSearched && suggestions.length === 0 && !errorMessage && (
            <div className="py-6 px-4 text-center text-xs text-gray-400 leading-relaxed">
              Keep typing — e.g. 225 7th St SE
            </div>
          )}

          {suggestions.length > 0 && (
            <ul className="space-y-1" role="listbox">
              {suggestions.map((item, index) => {
                const isSelected = index === highlightedIndex;
                return (
                  <li
                    key={item.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                      isSelected ? 'bg-gray-100 text-gray-900' : 'hover:bg-gray-50 text-gray-800'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-gray-100 border border-gray-200/80 flex items-center justify-center text-gray-600 shrink-0 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate text-gray-900">
                        {item.shortLabel}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {item.neighborhood ? `${item.neighborhood}, Washington, DC` : item.displayName}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Bottom Helper Bar */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between text-xs">
          <span className="text-gray-400">Restricted to Washington, DC</span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onUseMapInstead();
            }}
            className="inline-flex items-center gap-1.5 text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
          >
            <Map className="w-3.5 h-3.5" />
            <span>Use map instead</span>
          </button>
        </div>
      </div>
    </div>
  );
};
