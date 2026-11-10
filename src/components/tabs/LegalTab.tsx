/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BedroomOption, SpaceType } from '../../../lib/calc';
import { LegalSection } from '../legal/LegalSection';
import { NextTabButton } from './NextTabButton';
import { TabId } from './TabBar';

interface LegalTabProps {
  nightsPerMonth: number;
  spaceType: SpaceType;
  bedrooms: BedroomOption;
  typicalNightlyEarnings: number; // E
  onNavigateTab: (tab: TabId) => void;
}

export const LegalTab: React.FC<LegalTabProps> = ({
  nightsPerMonth,
  spaceType,
  bedrooms,
  typicalNightlyEarnings,
  onNavigateTab,
}) => {
  return (
    <div className="space-y-8">
      {/* Existing comprehensive DC legal rules & compliance section */}
      <LegalSection
        nightsPerMonth={nightsPerMonth}
        spaceType={spaceType}
        bedrooms={bedrooms}
        typicalNightlyEarnings={typicalNightlyEarnings}
      />

      {/* Next Tab Button */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <NextTabButton
          targetTab="ask"
          targetLabel="4 · Ask AI"
          onNavigate={onNavigateTab}
        />
      </div>
    </div>
  );
};
