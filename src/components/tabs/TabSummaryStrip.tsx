/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BedroomOption, formatCurrency, SpaceType } from '../../../lib/calc';
import { MapPin, Edit3 } from 'lucide-react';

interface TabSummaryStripProps {
  locationLabel: string;
  spaceType: SpaceType;
  bedrooms: BedroomOption;
  nights: number;
  listingPrice: number; // P
  onEdit: () => void;
  onOpenAddressSearch: () => void;
}

export const TabSummaryStrip: React.FC<TabSummaryStripProps> = ({
  locationLabel,
  spaceType,
  bedrooms,
  nights,
  listingPrice,
  onEdit,
  onOpenAddressSearch,
}) => {
  const formatSpaceType = (st: SpaceType, bd: BedroomOption) => {
    const bdLabel = bd === 'studio' ? 'Studio' : `${bd} bed`;
    if (st === 'entire_home') return `Entire place · ${bdLabel}`;
    return `Private room · ${bdLabel}`;
  };

  return (
    <aside
      aria-label="Current estimate summary"
      className="bg-white border border-gray-200/90 rounded-xl px-4 py-2.5 shadow-2xs flex items-center justify-between gap-3 text-xs sm:text-sm"
    >
      <div className="flex items-center gap-2 text-gray-700 min-w-0">
        <button
          type="button"
          onClick={onOpenAddressSearch}
          className="flex items-center gap-1.5 font-semibold text-gray-900 hover:text-rose-600 hover:underline cursor-pointer truncate transition-colors text-left"
          title="Change location (opens address search)"
        >
          <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span className="truncate">{locationLabel}</span>
        </button>
        <span className="text-gray-300">·</span>
        <span className="text-gray-600 whitespace-nowrap">
          {formatSpaceType(spaceType, bedrooms)}
        </span>
        <span className="text-gray-300">·</span>
        <span className="text-gray-600 font-mono whitespace-nowrap">
          {nights} nights
        </span>
        <span className="text-gray-300">·</span>
        <span className="font-bold text-gray-900 font-mono whitespace-nowrap">
          {formatCurrency(listingPrice)}/night
        </span>
      </div>

      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
      >
        <Edit3 className="w-3 h-3" />
        <span>Edit in Earnings</span>
      </button>
    </aside>
  );
};
