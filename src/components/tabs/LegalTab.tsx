/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BedroomOption, SpaceType } from '../../../lib/calc';
import { LegalSection } from '../legal/LegalSection';
import { Sparkles } from 'lucide-react';
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
  onNavigateTab,
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

      {/* Last tab: point to the assistant instead of a next tab */}
      {onOpenChat && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="pt-8 border-t border-gray-200/80 flex items-center justify-end">
            <button
              type="button"
              onClick={onOpenChat}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-black text-white font-semibold text-sm rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Still have questions? Ask the assistant</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
