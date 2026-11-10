/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BedroomOption,
  clampNights,
  EarningsResult,
  GeoPoint,
  SpaceType,
} from '../../../lib/calc';
import { EstimatorHeadline } from '../EstimatorHeadline';
import { FooterAnchor } from '../FooterAnchor';
import { InteractiveMap } from '../InteractiveMap';
import { MethodModal } from '../MethodModal';
import { NightsPickerPopover } from '../NightsPickerPopover';
import { SearchFilterDrawer } from '../SearchFilterDrawer';
import { SearchSummaryBar } from '../SearchSummaryBar';
import { NextTabButton } from './NextTabButton';
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
  onOpenAddressSearch,
  onDismissMapHint,
}) => {
  const [isNightsModalOpen, setIsNightsModalOpen] = useState<boolean>(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);
  const [isMethodModalOpen, setIsMethodModalOpen] = useState<boolean>(false);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Estimator Controls & Headline */}
        <div className="lg:col-span-6 space-y-6">
          {/* Address Search Summary Pill: Always visible at top above headline */}
          <div className="mb-2">
            <SearchSummaryBar
              pin={pin}
              customLabel={customLabel}
              spaceType={spaceType}
              bedrooms={bedrooms}
              priceOverride={priceOverride}
              onOpenAddressSearch={onOpenAddressSearch}
              onOpenFilters={() => setIsFilterDrawerOpen(true)}
            />
          </div>

          <EstimatorHeadline
            result={estimateResult}
            nights={nights}
            onNightsChange={(n) => onNightsChange(clampNights(n))}
            onOpenNightsModal={() => setIsNightsModalOpen(true)}
            onOpenMethodModal={() => setIsMethodModalOpen(true)}
          />
        </div>

        {/* Right Column: Interactive Map */}
        <div className="lg:col-span-6 h-[420px] sm:h-[480px] lg:h-[580px] sticky lg:top-24">
          <InteractiveMap
            pin={pin}
            searchRadiusMi={estimateResult.finalRadiusMi}
            comparables={estimateResult.comparables}
            nonComparables={estimateResult.nonComparables}
            onPinChange={onPinChange}
            showMapPlacementHint={showMapPlacementHint}
            onDismissMapHint={onDismissMapHint}
          />
        </div>
      </div>

      {/* Footer link to Costs tab */}
      <FooterAnchor
        onOpenCostsTab={() => onNavigateTab('costs')}
        onOpenLegalTab={() => onNavigateTab('legal')}
      />

      {/* Next Tab Button */}
      <NextTabButton
        targetTab="costs"
        targetLabel="2 · Costs & Profit"
        onNavigate={onNavigateTab}
      />

      {/* Nights Stepper Modal */}
      <NightsPickerPopover
        isOpen={isNightsModalOpen}
        onClose={() => setIsNightsModalOpen(false)}
        nights={nights}
        benchmarkNights={estimateResult.benchmarkNights}
        onUpdateNights={(newNights) => onNightsChange(clampNights(newNights))}
      />

      {/* Home Details Filter Drawer */}
      <SearchFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        spaceType={spaceType}
        bedrooms={bedrooms}
        includeLowActivity={includeLowActivity}
        priceOverride={priceOverride}
        suggestedMedianPrice={estimateResult.medianNightlyPrice}
        onSave={onUpdateFilters}
      />

      {/* Method Modal */}
      <MethodModal
        isOpen={isMethodModalOpen}
        onClose={() => setIsMethodModalOpen(false)}
        comparablesCount={estimateResult.comparablesCount}
        searchRadiusMi={estimateResult.finalRadiusMi}
        typicalNightlyPrice={estimateResult.medianNightlyPrice}
        typicalNightlyEarnings={estimateResult.typicalNightlyEarnings}
        nights={nights}
        typicalMonthly={estimateResult.typicalMonthly}
      />
    </div>
  );
};
