/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SlidersHorizontal, MapPin, ChevronDown } from 'lucide-react';
import { BedroomOption, formatCurrency, GeoPoint, SpaceType } from '../../lib/calc';

interface SearchSummaryBarProps {
  pin: GeoPoint;
  customLabel?: string | null;
  spaceType: SpaceType;
  bedrooms: BedroomOption;
  priceOverride: number | null;
  onOpenAddressSearch: () => void;
  onOpenFilters: () => void;
}

export function getNeighborhoodName(lat: number, lng: number): string {
  // Approximate DC neighborhood centroids
  const neighborhoods = [
    { name: 'Capitol Hill', lat: 38.8857, lng: -76.9955, maxDist: 0.8 },
    { name: 'Dupont Circle', lat: 38.9100, lng: -77.0434, maxDist: 0.6 },
    { name: 'Logan Circle', lat: 38.9095, lng: -77.0295, maxDist: 0.5 },
    { name: 'Shaw', lat: 38.9145, lng: -77.0220, maxDist: 0.5 },
    { name: 'Adams Morgan', lat: 38.9225, lng: -77.0425, maxDist: 0.6 },
    { name: 'Columbia Heights', lat: 38.9280, lng: -77.0325, maxDist: 0.6 },
    { name: 'Georgetown', lat: 38.9050, lng: -77.0650, maxDist: 0.8 },
    { name: 'NoMa / Union Station', lat: 38.9030, lng: -77.0020, maxDist: 0.6 },
    { name: 'Downtown DC', lat: 38.8990, lng: -77.0300, maxDist: 0.7 },
  ];

  for (const n of neighborhoods) {
    const dLat = (lat - n.lat) * 69;
    const dLng = (lng - n.lng) * 53;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    if (dist <= n.maxDist) {
      return n.name;
    }
  }

  return 'Your DC Pin';
}

export const SearchSummaryBar: React.FC<SearchSummaryBarProps> = ({
  pin,
  customLabel,
  spaceType,
  bedrooms,
  priceOverride,
  onOpenAddressSearch,
  onOpenFilters,
}) => {
  const displayLocation = customLabel || getNeighborhoodName(pin.lat, pin.lng);

  const spaceTypeLabel =
    spaceType === 'entire_home' ? 'Entire place' : 'Private room';

  const bedroomLabel =
    spaceType === 'entire_home'
      ? bedrooms === 'studio'
        ? 'Studio'
        : `${bedrooms} bedroom${bedrooms === '1' ? '' : 's'}`
      : null;

  return (
    <div
      className="inline-flex items-center rounded-full border border-gray-300 bg-white hover:border-gray-900 shadow-xs hover:shadow-md transition-all divide-x divide-gray-200"
      role="group"
      aria-label="Search criteria summary"
    >
      {/* Location Button (Opens Address Search Panel) */}
      <button
        type="button"
        onClick={onOpenAddressSearch}
        className="group flex items-center gap-2 pl-3 pr-3.5 py-2 hover:bg-gray-50 rounded-l-full transition-colors text-left cursor-pointer"
        aria-label={`Change address or area, currently ${displayLocation}`}
      >
        <div className="w-6 h-6 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 group-hover:scale-105 transition-transform shrink-0">
          <MapPin className="w-3.5 h-3.5" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs sm:text-sm font-semibold text-gray-900 max-w-[140px] sm:max-w-[200px] truncate">
            {displayLocation}
          </span>
        </div>
        <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-gray-700 transition-colors" />
      </button>

      {/* Property Details Button (Opens Filter Drawer) */}
      <button
        type="button"
        onClick={onOpenFilters}
        className="group flex items-center gap-2 pl-3.5 pr-4 py-2 hover:bg-gray-50 rounded-r-full transition-colors text-left cursor-pointer"
        aria-label="Edit space type, bedrooms, and nightly price"
      >
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700">
          <span className="font-medium text-gray-900">{spaceTypeLabel}</span>
          {bedroomLabel && (
            <>
              <span className="text-gray-300">·</span>
              <span>{bedroomLabel}</span>
            </>
          )}
          {priceOverride && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-rose-600 font-mono font-semibold">
                {formatCurrency(priceOverride)}/night
              </span>
            </>
          )}
        </div>
        <div className="pl-1 text-gray-400 group-hover:text-gray-900 transition-colors">
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </div>
      </button>
    </div>
  );
};
