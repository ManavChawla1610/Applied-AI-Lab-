/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DC_RULES } from '../../../config/dcRules';
import { Moon, AlertCircle } from 'lucide-react';

interface StayRulesCardProps {
  nightsPerMonth: number;
}

export const StayRulesCard: React.FC<StayRulesCardProps> = ({ nightsPerMonth }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-4 shadow-xs">
      <div className="flex items-center gap-2">
        <Moon className="w-5 h-5 text-indigo-600" />
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">
          Every stay: 30 nights or fewer
        </h3>
      </div>

      <p className="text-sm text-gray-700 leading-relaxed">
        {DC_RULES.maxContinuousNights.text} Stays of 31 or more consecutive nights are considered residential tenancies under District law and fall under traditional tenant regulations rather than short-term rental rules.
      </p>

      {nightsPerMonth >= 30 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200/90 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Booking structure notice:</strong> Hosting 30 nights a month must be split across multiple distinct bookings of 30 nights or fewer each.
          </p>
        </div>
      )}
    </div>
  );
};
