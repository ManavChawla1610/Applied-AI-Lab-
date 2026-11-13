/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { BedroomOption, SpaceType } from '../../../lib/calc';
import { LegalSection } from '../legal/LegalSection';
import { TabId } from './TabBar';

interface LegalTabProps {
  nightsPerMonth: number;
  spaceType: SpaceType;
  bedrooms: BedroomOption;
  typicalNightlyEarnings: number; // E
  onNavigateTab: (tab: TabId) => void;
  onOpenChat?: () => void;
}

export const LegalTab: React.FC<LegalTabProps> = ({
  nightsPerMonth,
  spaceType,
  bedrooms,
  typicalNightlyEarnings,
  onOpenChat,
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

      {/* Bottom Action to open the Ask AI bottom assistant */}
      {onOpenChat && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 flex justify-end">
          <button
            type="button"
            onClick={onOpenChat}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-900 hover:bg-black text-white text-sm font-semibold transition-all cursor-pointer shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-rose-400" />
            <span>Have questions? Ask about hosting in DC</span>
          </button>
        </div>
      )}
    </div>
  );
};

