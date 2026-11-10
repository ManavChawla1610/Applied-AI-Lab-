/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BedroomOption, SpaceType } from '../../../lib/calc';
import { EligibilityCheck } from './EligibilityCheck';
import { LicenseTypeComparison, HostingModeSelection } from './LicenseTypeComparison';
import { NightBudgetTracker } from './NightBudgetTracker';
import { MaxGuestsCalculator } from './MaxGuestsCalculator';
import { StayRulesCard } from './StayRulesCard';
import { SetupChecklist } from './SetupChecklist';
import { GoodToKnowCard } from './GoodToKnowCard';
import { LegalFooter } from './LegalFooter';
import { Scale, ChevronDown, ChevronUp } from 'lucide-react';

interface LegalSectionProps {
  nightsPerMonth: number;
  spaceType: SpaceType;
  bedrooms: BedroomOption;
  typicalNightlyEarnings: number; // E: median nightly payout
}

export const LegalSection: React.FC<LegalSectionProps> = ({
  nightsPerMonth,
  spaceType,
  bedrooms,
  typicalNightlyEarnings,
}) => {
  // Default hosting mode based on space type from fold 1
  const [hostingMode, setHostingMode] = useState<HostingModeSelection>(
    spaceType === 'entire_home' ? 'away' : 'home'
  );
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  return (
    <section id="legal" className="bg-white py-6 sm:py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Section Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
            <Scale className="w-3.5 h-3.5" />
            <span>Official DC Regulations</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Can you legally host — and what does it take?
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 max-w-xl mx-auto">
            Mandated by the DC Department of Licensing and Consumer Protection (DLCP).
          </p>
        </div>

        {/* 1. Eligibility Check (Banner) */}
        <EligibilityCheck />

        {/* 2. License Type at Top */}
        <LicenseTypeComparison
          hostingMode={hostingMode}
          onSelectHostingMode={setHostingMode}
        />

        {/* 3. Checklists & Additional Details Collapsed */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setIsDetailsOpen((prev) => !prev)}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-left text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span>View full compliance details, checklists & 90-night tracker</span>
            </div>
            {isDetailsOpen ? (
              <ChevronUp className="w-5 h-5 text-gray-500 shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500 shrink-0" />
            )}
          </button>

          {isDetailsOpen && (
            <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50/50 space-y-8">
              {/* 90-night budget tracker */}
              {(hostingMode === 'away' || hostingMode === 'sometimes') && (
                <NightBudgetTracker
                  nightsPerMonth={nightsPerMonth}
                  typicalNightlyEarnings={typicalNightlyEarnings}
                />
              )}

              {/* Max Guests Calculator */}
              <MaxGuestsCalculator initialBedrooms={bedrooms} />

              {/* 30-Nights Stay Rules */}
              <StayRulesCard nightsPerMonth={nightsPerMonth} />

              {/* Interactive Setup Checklist */}
              <SetupChecklist />

              {/* Good to Know */}
              <GoodToKnowCard />

              {/* Legal Footer & Attribution */}
              <LegalFooter />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
