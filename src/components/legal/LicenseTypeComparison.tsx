/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DC_RULES, DC_RULES_SOURCE_URL } from '../../../config/dcRules';
import { UserCheck, Plane, FileCheck2, ExternalLink } from 'lucide-react';

export type HostingModeSelection = 'home' | 'away' | 'sometimes';

interface LicenseTypeComparisonProps {
  hostingMode: HostingModeSelection;
  onSelectHostingMode: (mode: HostingModeSelection) => void;
}

export const LicenseTypeComparison: React.FC<LicenseTypeComparisonProps> = ({
  hostingMode,
  onSelectHostingMode,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-6 shadow-xs">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-900 text-xs font-semibold uppercase tracking-wider mb-2">
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Step 2: License Selection</span>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
          Which license do you need?
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          DC divides short-term rentals strictly by whether the homeowner is physically present on the property.
        </p>
      </div>

      {/* Mode Selector */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-900 block">
          Will you be home while guests stay?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => onSelectHostingMode('home')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              hostingMode === 'home'
                ? 'border-gray-900 bg-gray-50/90 ring-2 ring-gray-900/10'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Always home</span>
            </div>
            <p className="text-xs text-gray-500 mt-1.5 leading-normal">
              Renting a private room, floor, or English basement while living in the home.
            </p>
            <span className="inline-block mt-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              Short-Term Rental license
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectHostingMode('away')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              hostingMode === 'away'
                ? 'border-gray-900 bg-gray-50/90 ring-2 ring-gray-900/10'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Plane className="w-4 h-4 text-blue-600" />
              <span>Always away</span>
            </div>
            <p className="text-xs text-gray-500 mt-1.5 leading-normal">
              Renting the entire home while you travel for work, vacation, or holidays.
            </p>
            <span className="inline-block mt-2 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              Vacation Rental license
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectHostingMode('sometimes')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              hostingMode === 'sometimes'
                ? 'border-gray-900 bg-gray-50/90 ring-2 ring-gray-900/10'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <FileCheck2 className="w-4 h-4 text-purple-600" />
              <span>Sometimes each</span>
            </div>
            <p className="text-xs text-gray-500 mt-1.5 leading-normal">
              Renting rooms while home, and renting the full house when out of town.
            </p>
            <span className="inline-block mt-2 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
              Both licenses required
            </span>
          </button>
        </div>
      </div>

      {/* Two-Column Comparison Card (Home vs Away) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Short-Term Rental (Home) */}
        <div className={`p-5 rounded-2xl border transition-all ${
          hostingMode === 'home' || hostingMode === 'sometimes'
            ? 'border-emerald-300 bg-emerald-50/20'
            : 'border-gray-200 bg-gray-50/50'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-gray-200/80">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-emerald-800">Present</span>
              <h4 className="text-base font-bold text-gray-900">Short-Term Rental (STR)</h4>
            </div>
            <span className="text-xs font-mono font-bold bg-white px-2 py-1 rounded border border-gray-200 text-gray-900">
              $99 / 2 yrs
            </span>
          </div>

          <div className="space-y-3 pt-3 text-xs text-gray-700">
            <div>
              <strong className="text-gray-900 block">Who is present:</strong>
              <span>Host is physically present in the home during stays.</span>
            </div>
            <div>
              <strong className="text-gray-900 block">Example:</strong>
              <span>Spare bedroom, guest suite, or finished basement while you occupy the main unit.</span>
            </div>
            <div>
              <strong className="text-gray-900 block">Annual stay cap:</strong>
              <span className="text-emerald-700 font-semibold">No limit on nights per calendar year.</span>
            </div>
            <div>
              <strong className="text-gray-900 block">Max stay per booking:</strong>
              <span>30 continuous nights or fewer per stay.</span>
            </div>
            <div>
              <strong className="text-gray-900 block">Max guests:</strong>
              <span>Greater of 8 guests or 2 guests per bedroom.</span>
            </div>
          </div>
        </div>

        {/* Vacation Rental (Away) */}
        <div className={`p-5 rounded-2xl border transition-all ${
          hostingMode === 'away' || hostingMode === 'sometimes'
            ? 'border-blue-300 bg-blue-50/20'
            : 'border-gray-200 bg-gray-50/50'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-gray-200/80">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-blue-800">Absent</span>
              <h4 className="text-base font-bold text-gray-900">Vacation Rental (VRE)</h4>
            </div>
            <span className="text-xs font-mono font-bold bg-white px-2 py-1 rounded border border-gray-200 text-gray-900">
              $99 / 2 yrs
            </span>
          </div>

          <div className="space-y-3 pt-3 text-xs text-gray-700">
            <div>
              <strong className="text-gray-900 block">Who is present:</strong>
              <span>Host is away / travelling while guests occupy the home.</span>
            </div>
            <div>
              <strong className="text-gray-900 block">Example:</strong>
              <span>Renting your entire house or condo while you are away on travel or vacation.</span>
            </div>
            <div>
              <strong className="text-gray-900 block">Annual stay cap:</strong>
              <span className="text-rose-700 font-semibold font-mono">Max 90 nights / calendar year</span>
              <span className="text-gray-500 block text-[11px] mt-0.5">
                (cumulative unless employer/medical exemption granted).
              </span>
            </div>
            <div>
              <strong className="text-gray-900 block">Max stay per booking:</strong>
              <span>30 continuous nights or fewer per stay.</span>
            </div>
            <div>
              <strong className="text-gray-900 block">Max guests:</strong>
              <span>Greater of 8 guests or 2 guests per bedroom.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Note for renting both ways */}
      {hostingMode === 'sometimes' && (
        <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 leading-relaxed">
          <strong>Dual license rule:</strong> {DC_RULES.licenseTypes.dualLicenseNote.text} Total initial licensing fee is $198 ($99 per license) for 2 years.
        </div>
      )}

      {/* Link to DLCP */}
      <div className="flex justify-end text-xs text-gray-500">
        <a
          href={DC_RULES_SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
        >
          <span>DLCP Short-Term Rental License Guide</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
