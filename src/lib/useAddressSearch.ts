/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { GEOCODE_DEBOUNCE_MS, MIN_QUERY_LENGTH } from '../../config/geo';

export interface AddressSuggestion {
  id: string;
  displayName: string;
  shortLabel: string;
  neighborhood: string;
  lat: number;
  lng: number;
}

export type AddressSearchStatus = 'idle' | 'searching' | 'results' | 'no_dc_results' | 'unavailable';

export const OUTSIDE_DC_MESSAGE = 'This app covers Washington, DC only.';
export const KEEP_TYPING_HINT = 'Keep typing — e.g. 225 7th St SE';
export const UNAVAILABLE_HINT = 'Address search is unavailable — click the map to place your home.';

function readSuggestions(data: unknown): AddressSuggestion[] {
  if (Array.isArray(data)) return data as AddressSuggestion[];
  const s = (data as { suggestions?: unknown })?.suggestions;
  return Array.isArray(s) ? (s as AddressSuggestion[]) : [];
}

/**
 * Shared search-as-you-type logic for every address box in the app.
 * - While typing: shows only DC suggestions, a grey hint, or "Searching…". Never a red error.
 * - The red "DC only" error appears only from resolveOnEnter(), when the text resolves outside DC.
 */
export function useAddressSearch() {
  const [query, setQueryState] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [status, setStatus] = useState<AddressSearchStatus>('idle');
  const [outsideDcError, setOutsideDcError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancelPending = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();
  };

  useEffect(() => cancelPending, []);

  const runSearch = useCallback(async (text: string) => {
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(text)}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const list = readSuggestions(await res.json());
      setSuggestions(list);
      setHighlightedIndex(list.length > 0 ? 0 : -1);
      setStatus(list.length > 0 ? 'results' : 'no_dc_results');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Address search failed:', err);
      setSuggestions([]);
      setStatus('unavailable');
    }
  }, []);

  const setQuery = useCallback(
    (text: string) => {
      setQueryState(text);
      setOutsideDcError(null); // editing always clears the red error
      cancelPending();
      if (text.trim().length < MIN_QUERY_LENGTH) {
        setSuggestions([]);
        setHighlightedIndex(-1);
        setStatus('idle');
        return;
      }
      setStatus('searching');
      timerRef.current = setTimeout(() => runSearch(text.trim()), GEOCODE_DEBOUNCE_MS);
    },
    [runSearch]
  );

  /**
   * Called when the user presses Enter or "Update" with text but no suggestion chosen.
   * Returns the DC suggestion to use, or null (and sets the red error if the text is outside DC).
   */
  const resolveOnEnter = useCallback(async (): Promise<AddressSuggestion | null> => {
    if (highlightedIndex >= 0 && suggestions[highlightedIndex]) return suggestions[highlightedIndex];
    if (suggestions.length > 0) return suggestions[0];
    const text = query.trim();
    if (text.length < MIN_QUERY_LENGTH) return null;

    cancelPending();
    setStatus('searching');
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(text)}&check=1`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = readSuggestions(data);
      if (list.length > 0) {
        setSuggestions(list);
        setStatus('results');
        return list[0];
      }
      setStatus('no_dc_results');
      if (data?.outsideDc) setOutsideDcError(OUTSIDE_DC_MESSAGE);
      return null;
    } catch {
      setStatus('unavailable');
      return null;
    }
  }, [highlightedIndex, suggestions, query]);

  const reset = useCallback(() => {
    cancelPending();
    setQueryState('');
    setSuggestions([]);
    setStatus('idle');
    setOutsideDcError(null);
    setHighlightedIndex(-1);
  }, []);

  const moveHighlight = useCallback(
    (delta: number) => {
      if (suggestions.length === 0) return;
      setHighlightedIndex((prev) => (prev + delta + suggestions.length) % suggestions.length);
    },
    [suggestions.length]
  );

  /** Grey helper text to show under the input, or null. */
  const hint =
    status === 'searching'
      ? 'Searching…'
      : status === 'no_dc_results' && !outsideDcError
        ? KEEP_TYPING_HINT
        : status === 'unavailable'
          ? UNAVAILABLE_HINT
          : null;

  return {
    query,
    setQuery,
    suggestions,
    status,
    hint,
    outsideDcError,
    highlightedIndex,
    setHighlightedIndex,
    moveHighlight,
    resolveOnEnter,
    reset,
  };
}
