/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import {
  BedroomOption,
  clampNights,
  EarningsResult,
  formatCurrency,
  GeoPoint,
  SpaceType,
} from '../../../lib/calc';
import { InteractiveMap } from '../InteractiveMap';
import { NightsModal } from '../NightsModal';
import { HomeDetailsModal } from '../HomeDetailsModal';
import { MethodModal } from '../MethodModal';
import { TabId } from './TabBar';

interface EarningsTabProps {
  pin: GeoPoint;
  customLabel: string | null;
  nights: number;
  spaceType: SpaceType;
  bedrooms: BedroomOption;
  includeLowActivity: boolean;
  priceOverride: number | null;
  estimateResult: EarningsResult;
  showMapPlacementHint: boolean;
  onPinChange: (newPin: GeoPoint, source: 'drag' | 'click' | 'address') => void;
  onSelectAddress: (result: { lat: number; lng: number; shortLabel: string }) => void;
  onNightsChange: (newNights: number) => void;
  onUpdateFilters: (opts: {
    spaceType: SpaceType;
    bedrooms: BedroomOption;
    includeLowActivity: boolean;
    priceOverride: number | null;
  }) => void;
  onNavigateTab: (tab: TabId) => void;
  onOpenAddressSearch: () => void;
  onDismissMapHint: () => void;
}

export const EarningsTab: React.FC<EarningsTabProps> = ({
  pin,
  customLabel,
  nights,
  spaceType,
  bedrooms,
  includeLowActivity,
  priceOverride,
  estimateResult,
  showMapPlacementHint,
  onPinChange,
  onSelectAddress,
  onNightsChange,
  onUpdateFilters,
  onNavigateTab,
  onDismissMapHint,
}) => {
  // Modal states
  const [isNightsModalOpen, setIsNightsModalOpen] = useState(false);
  const [isHomeDetailsModalOpen, setIsHomeDetailsModalOpen] = useState(false);
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);

  // Derived values for clean minimal presentation
  const monthlyPayoutFormatted = formatCurrency(estimateResult.typicalMonthly);
  const listingPriceFormatted = formatCurrency(estimateResult.medianListingPrice);
  const payoutPerNightFormatted = formatCurrency(estimateResult.typicalNightlyEarnings);

  // Search pill labels
  const placeLabel = customLabel || 'Capitol Hill, DC';
  const spaceTypeLabel = spaceType === 'entire_home' ? 'Entire place' : 'Private room';
  const bedroomsLabel =
    spaceType === 'entire_home'
      ? bedrooms === 'studio'
        ? 'Studio'
        : `${bedrooms} bedroom${bedrooms === '1' ? '' : 's'}`
      : 'Private room';

  // Item 6: Only if needed, ONE small muted line under pill (priority order: <5 comps, then N > B)
  let helperLine: string | null = null;
  if (estimateResult.comparablesCount < 5) {
    helperLine = 'Few similar homes nearby — treat this as a rough estimate.';
  } else if (nights > estimateResult.benchmarkNights) {
    helperLine = `Similar homes usually book about ${estimateResult.benchmarkNights} nights a month.`;
  }

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-14 items-stretch min-h-[calc(100vh-170px)]">
        {/* LEFT COLUMN: 45% Desktop width, vertically centered, top to bottom */}
        <div className="w-full lg:w-[45%] flex flex-col justify-center py-4 sm:py-6 lg:py-8 space-y-7">
          {/* 1. Headline (very large, 3 lines max): "Your home could make $[X] on Airbnb" */}
          <div className="space-y-1">
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold text-gray-900 tracking-tight leading-[1.12]">
              Your home could make{' '}
              <span className="whitespace-nowrap text-gray-900 [font-variant-numeric:normal]">
                {monthlyPayoutFormatted}
              </span>{' '}
              on Airbnb
            </h1>
          </div>

          {/* 2. One line under it: "[N] nights · $[P]/night ($[E] after Airbnb's fee)" */}
          <div className="text-base sm:text-lg text-gray-700 flex flex-wrap items-baseline gap-1.5 leading-normal">
            <button
              type="button"
              onClick={() => setIsNightsModalOpen(true)}
              className="font-semibold text-gray-900 underline underline-offset-4 hover:text-rose-600 transition-colors cursor-pointer tabular-nums"
            >
              {nights} night{nights === 1 ? '' : 's'}
            </button>
            <span className="text-gray-400">·</span>
            <span className="font-semibold text-gray-900 tabular-nums">
              {listingPriceFormatted}/night
            </span>
            <span className="text-xs sm:text-sm text-gray-500 tabular-nums">
              ({payoutPerNightFormatted} after Airbnb's fee)
            </span>
          </div>

          {/* 3. "Learn how we estimate earnings" (underlined link) -> Method modal */}
          <div>
            <button
              type="button"
              onClick={() => setIsMethodModalOpen(true)}
              className="text-xs sm:text-sm text-gray-600 underline underline-offset-4 hover:text-gray-900 transition-colors cursor-pointer"
            >
              Learn how we estimate earnings
            </button>
          </div>

          {/* 4. Simple slider for nights (1–30), no labels, no tick text, dragging updates live */}
          <div className="pt-1">
            <input
              type="range"
              min={1}
              max={30}
              value={nights}
              onChange={(e) => onNightsChange(clampNights(Number(e.target.value)))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900 hover:accent-black transition-all"
              aria-label="Hosting nights per month slider"
            />
          </div>

          {/* 5. Search pill (rounded, full width of column) */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => setIsHomeDetailsModalOpen(true)}
              className="w-full py-4 px-5 rounded-2xl bg-white border border-gray-300 hover:border-gray-900 hover:shadow-md transition-all flex items-center justify-between text-left cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Search className="w-5 h-5 text-gray-700 shrink-0 group-hover:text-rose-600 transition-colors" />
                <div className="text-sm font-semibold text-gray-900 truncate">
                  <span>{placeLabel}</span>
                  <span className="text-gray-300 mx-2">·</span>
                  <span className="text-gray-600 font-normal">{spaceTypeLabel}</span>
                  {spaceType === 'entire_home' && (
                    <>
                      <span className="text-gray-300 mx-2">·</span>
                      <span className="text-gray-600 font-normal">{bedroomsLabel}</span>
                    </>
                  )}
                </div>
              </div>
            </button>

            {/* 6. Only if needed, ONE small muted line under the pill */}
            {helperLine && (
              <p className="text-xs text-gray-500 pl-1 leading-relaxed">
                {helperLine}
              </p>
            )}
          </div>

          {/* 7. Small text link: "See what you'd keep after costs →" */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigateTab('costs')}
              className="text-xs sm:text-sm font-semibold text-rose-600 hover:text-rose-700 hover:underline transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <span>See what you'd keep after costs</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: 55% Desktop width, full column height map */}
        <div className="w-full lg:w-[55%] h-[460px] sm:h-[520px] lg:h-auto min-h-[460px] lg:min-h-[580px]">
          <InteractiveMap
            pin={pin}
            searchRadiusMi={estimateResult.finalRadiusMi}
            comparables={estimateResult.comparables}
            onPinChange={onPinChange}
            showMapPlacementHint={showMapPlacementHint}
            onDismissMapHint={onDismissMapHint}
          />
        </div>
      </div>

      {/* Modal A: "How many nights?" */}
      <NightsModal
        isOpen={isNightsModalOpen}
        onClose={() => setIsNightsModalOpen(false)}
        nights={nights}
        benchmarkNights={estimateResult.benchmarkNights}
        onUpdateNights={onNightsChange}
      />

      {/* Modal B: "Tell us about your home" */}
      <HomeDetailsModal
        isOpen={isHomeDetailsModalOpen}
        onClose={() => setIsHomeDetailsModalOpen(false)}
        pin={pin}
        customLabel={customLabel}
        spaceType={spaceType}
        bedrooms={bedrooms}
        includeLowActivity={includeLowActivity}
        priceOverride={priceOverride}
        suggestedMedianPrice={estimateResult.medianListingPrice}
        onUpdateDetails={({ pin: p, customLabel: cl, spaceType: st, bedrooms: bd, includeLowActivity: la, priceOverride: po }) => {
          onSelectAddress({ lat: p.lat, lng: p.lng, shortLabel: cl });
          onUpdateFilters({
            spaceType: st,
            bedrooms: bd,
            includeLowActivity: la,
            priceOverride: po,
          });
        }}
      />

      {/* Modal C: "How we estimate your earnings" */}
      <MethodModal
        isOpen={isMethodModalOpen}
        onClose={() => setIsMethodModalOpen(false)}
        comparablesCount={estimateResult.comparablesCount}
        searchRadiusMi={estimateResult.finalRadiusMi}
        typicalNightlyPrice={estimateResult.medianListingPrice}
        typicalNightlyEarnings={estimateResult.typicalNightlyEarnings}
        nights={nights}
        typicalMonthly={estimateResult.typicalMonthly}
        rangeLowMonthly={estimateResult.rangeLowMonthly}
        rangeHighMonthly={estimateResult.rangeHighMonthly}
        onOpenCostsTab={() => onNavigateTab('costs')}
      />
    </div>
  );
};
