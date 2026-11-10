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
import { Scale } from 'lucide-react';

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

  return (
    <section id="legal" className="border-t border-gray-200 bg-gray-50/60 py-12 lg:py-16 scroll-mt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Section Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider">
            <Scale className="w-4 h-4" />
            <span>Washington, DC Legal Regulations</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Can you legally host — and what does it take?
          </h2>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
            All legal requirements, licenses, caps, and steps mandated by the DC Department of Licensing and Consumer Protection (DLCP).
          </p>
        </div>

        {/* A: Eligibility Check */}
        <EligibilityCheck />

        {/* B: Which license do you need? */}
        <LicenseTypeComparison
          hostingMode={hostingMode}
          onSelectHostingMode={setHostingMode}
        />

        {/* C: 90-night budget (only for Away or Sometimes) */}
        {(hostingMode === 'away' || hostingMode === 'sometimes') && (
          <NightBudgetTracker
            nightsPerMonth={nightsPerMonth}
            typicalNightlyEarnings={typicalNightlyEarnings}
          />
        )}

        {/* D: Max Guests Calculator */}
        <MaxGuestsCalculator initialBedrooms={bedrooms} />

        {/* E: Every Stay 30 Nights Rule */}
        <StayRulesCard nightsPerMonth={nightsPerMonth} />

        {/* F: Interactive Setup Checklist */}
        <SetupChecklist />

        {/* G: Good to Know */}
        <GoodToKnowCard />

        {/* H: Legal Footer & Attribution */}
        <LegalFooter />
      </div>
    </section>
  );
};
