/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DC_RULES, DC_RULES_SOURCE_URL } from '../../../config/dcRules';
import { CheckCircle2, AlertTriangle, XCircle, ExternalLink, ShieldCheck, HelpCircle } from 'lucide-react';

type TriState = 'yes' | 'no' | 'not_sure' | null;

export const EligibilityCheck: React.FC = () => {
  const [q1, setQ1] = useState<TriState>(null);
  const [q2, setQ2] = useState<TriState>(null);
  const [q3, setQ3] = useState<TriState>(null);
  const [q4IsHoa, setQ4IsHoa] = useState<TriState>(null);
  const [q4HoaPermitted, setQ4HoaPermitted] = useState<TriState>(null);
  const [q5OweTaxes, setQ5OweTaxes] = useState<TriState>(null);
  const [q6Habitable, setQ6Habitable] = useState<TriState>(null);

  // Hard disqualifiers
  const isQ1Disqualified = q1 === 'no';
  const isQ2Disqualified = q2 === 'no';
  const isQ3Disqualified = q3 === 'no';
  const isHoaDisqualified = q4IsHoa === 'yes' && q4HoaPermitted === 'no';

  const isHardDisqualified =
    isQ1Disqualified || isQ2Disqualified || isQ3Disqualified || isHoaDisqualified;

  // Soft fixable items
  const fixableItems: string[] = [];
  if (q1 === 'not_sure') {
    fixableItems.push(DC_RULES.eligibility.naturalPerson.text);
  }
  if (q2 === 'not_sure') {
    fixableItems.push(DC_RULES.eligibility.homesteadPrimary.text);
  }
  if (q3 === 'not_sure') {
    fixableItems.push('Confirm your property is enrolled in the DC Homestead Deduction program with OTR.');
  }
  if (q4IsHoa === 'yes' && q4HoaPermitted === 'not_sure') {
    fixableItems.push(DC_RULES.eligibility.condoHoa.text);
  }
  if (q5OweTaxes === 'yes') {
    fixableItems.push(DC_RULES.eligibility.cleanHands.text);
  } else if (q5OweTaxes === 'not_sure') {
    fixableItems.push('Obtain a Clean Hands certificate online via MyTax.DC.gov to verify zero outstanding liabilities > $1,000.');
  }
  if (q6Habitable === 'no') {
    fixableItems.push('Equip home with working smoke & CO detectors, accessible fire extinguisher, and clear exit egress.');
  } else if (q6Habitable === 'not_sure') {
    fixableItems.push('Verify all smoke and carbon monoxide detectors are tested and operational.');
  }

  // All clear: Q1=yes, Q2=yes, Q3=yes, (Q4=no OR (Q4=yes AND Q4_permitted=yes)), Q5=no, Q6=yes
  const isAllClear =
    q1 === 'yes' &&
    q2 === 'yes' &&
    q3 === 'yes' &&
    (q4IsHoa === 'no' || (q4IsHoa === 'yes' && q4HoaPermitted === 'yes')) &&
    q5OweTaxes === 'no' &&
    q6Habitable === 'yes';

  const hasAnsweredAny =
    q1 !== null || q2 !== null || q3 !== null || q4IsHoa !== null || q5OweTaxes !== null || q6Habitable !== null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-8 shadow-xs">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold uppercase tracking-wider mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Step 1: Eligibility Check</span>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
          Can you host legally in Washington, DC?
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          DC has strict residential hosting laws. Answer these 6 questions to check your legal eligibility under DLCP regulations.
        </p>
      </div>

      <div className="space-y-6 divide-y divide-gray-100">
        {/* Q1 */}
        <div className="pt-4 first:pt-0 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-sm font-semibold text-gray-900">
              1. Are you an individual (not an LLC or company)?
            </span>
            <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50/80 shrink-0">
              {(['yes', 'no', 'not_sure'] as TriState[]).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setQ1(val)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    q1 === val ? 'bg-white shadow-xs text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {val === 'yes' ? 'Yes' : val === 'no' ? 'No' : 'Not sure'}
                </button>
              ))}
            </div>
          </div>
          {q1 === 'yes' && (
            <p className="text-xs text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{DC_RULES.eligibility.naturalPerson.text}</span>
            </p>
          )}
          {q1 === 'no' && (
            <p className="text-xs text-rose-800 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>{DC_RULES.eligibility.naturalPerson.text}</span>
            </p>
          )}
        </div>

        {/* Q2 */}
        <div className="pt-4 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-sm font-semibold text-gray-900">
              2. Do you own the home?
            </span>
            <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50/80 shrink-0">
              {(['yes', 'no', 'not_sure'] as TriState[]).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setQ2(val)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    q2 === val ? 'bg-white shadow-xs text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {val === 'yes' ? 'Yes' : val === 'no' ? 'No' : 'Not sure'}
                </button>
              ))}
            </div>
          </div>
          {q2 === 'yes' && (
            <p className="text-xs text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{DC_RULES.eligibility.homesteadPrimary.text}</span>
            </p>
          )}
          {q2 === 'no' && (
            <p className="text-xs text-rose-800 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Tenants and renters cannot apply for a DC short-term rental host license.</span>
            </p>
          )}
        </div>

        {/* Q3 */}
        <div className="pt-4 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-sm font-semibold text-gray-900">
              3. Is it your primary residence (do you get DC's Homestead Deduction)?
            </span>
            <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50/80 shrink-0">
              {(['yes', 'no', 'not_sure'] as TriState[]).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setQ3(val)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    q3 === val ? 'bg-white shadow-xs text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {val === 'yes' ? 'Yes' : val === 'no' ? 'No' : 'Not sure'}
                </button>
              ))}
            </div>
          </div>
          {q3 === 'yes' && (
            <p className="text-xs text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{DC_RULES.eligibility.accessoryUnits.text}</span>
            </p>
          )}
          {q3 === 'no' && (
            <p className="text-xs text-rose-800 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>{DC_RULES.eligibility.noInvestments.text}</span>
            </p>
          )}
        </div>

        {/* Q4 */}
        <div className="pt-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-sm font-semibold text-gray-900">
              4. Is it in a condo, co-op or HOA?
            </span>
            <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50/80 shrink-0">
              {(['yes', 'no', 'not_sure'] as TriState[]).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setQ4IsHoa(val);
                    if (val !== 'yes') setQ4HoaPermitted(null);
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    q4IsHoa === val ? 'bg-white shadow-xs text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {val === 'yes' ? 'Yes' : val === 'no' ? 'No' : 'Not sure'}
                </button>
              ))}
            </div>
          </div>

          {/* HOA Follow-up */}
          {q4IsHoa === 'yes' && (
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80 space-y-2 mt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-semibold text-gray-800">
                  Do its governing documents permit short-term rentals, or do you have written permission?
                </span>
                <div className="inline-flex rounded-lg border border-gray-300 p-1 bg-white shrink-0">
                  {(['yes', 'no', 'not_sure'] as TriState[]).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setQ4HoaPermitted(val)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                        q4HoaPermitted === val ? 'bg-gray-900 text-white font-semibold' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {val === 'yes' ? 'Yes' : val === 'no' ? 'No' : 'Not sure'}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-gray-500">
                {DC_RULES.eligibility.condoHoa.text}
              </p>
            </div>
          )}
        </div>

        {/* Q5 */}
        <div className="pt-4 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-sm font-semibold text-gray-900">
              5. Do you owe the DC government more than $1,000, or have unfiled DC tax returns?
            </span>
            <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50/80 shrink-0">
              {(['yes', 'no', 'not_sure'] as TriState[]).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setQ5OweTaxes(val)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    q5OweTaxes === val ? 'bg-white shadow-xs text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {val === 'yes' ? 'Yes' : val === 'no' ? 'No' : 'Not sure'}
                </button>
              ))}
            </div>
          </div>
          {q5OweTaxes === 'yes' && (
            <p className="text-xs text-amber-800 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{DC_RULES.eligibility.cleanHands.text}</span>
            </p>
          )}
          {q5OweTaxes === 'no' && (
            <p className="text-xs text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Clean Hands eligibility confirmed (no unfiled returns or liabilities &gt; $1,000).</span>
            </p>
          )}
        </div>

        {/* Q6 */}
        <div className="pt-4 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-sm font-semibold text-gray-900">
              6. Does the home have working smoke and CO detectors, a fire extinguisher, and a clear exit?
            </span>
            <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50/80 shrink-0">
              {(['yes', 'no', 'not_sure'] as TriState[]).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setQ6Habitable(val)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    q6Habitable === val ? 'bg-white shadow-xs text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {val === 'yes' ? 'Yes' : val === 'no' ? 'No' : 'Not sure'}
                </button>
              ))}
            </div>
          </div>
          {q6Habitable === 'yes' && (
            <p className="text-xs text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{DC_RULES.eligibility.habitableAttestation.text}</span>
            </p>
          )}
          {q6Habitable === 'no' && (
            <p className="text-xs text-amber-800 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Required safety equipment must be installed before self-certifying on your license application.</span>
            </p>
          )}
        </div>
      </div>

      {/* Result Banners */}
      {hasAnsweredAny && (
        <div className="pt-2">
          {/* Hard Disqualification */}
          {isHardDisqualified && (
            <div className="p-4 sm:p-5 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-base">
                <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>You likely can't host legally in DC</span>
              </div>
              <ul className="text-xs text-rose-800 list-disc pl-5 space-y-1">
                {isQ1Disqualified && <li>Host must be an individual natural person, not an LLC or entity.</li>}
                {isQ2Disqualified && <li>Only the property owner can apply for a DC host license.</li>}
                {isQ3Disqualified && <li>Only primary residences (with the DC Homestead Deduction) are eligible.</li>}
                {isHoaDisqualified && <li>Your condo, co-op, or HOA rules or board must permit short-term rentals.</li>}
              </ul>
              <div className="p-3 bg-white/80 rounded-lg border border-rose-200 text-xs text-rose-900 leading-relaxed font-medium">
                <strong>Alternative:</strong> Stays of 31+ nights are not short-term rentals and fall under different rules — check with DLCP.
              </div>
            </div>
          )}

          {/* Soft Fixable Items */}
          {!isHardDisqualified && fixableItems.length > 0 && (
            <div className="p-4 sm:p-5 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-base">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Fix these before you apply</span>
              </div>
              <ul className="text-xs text-amber-900 list-disc pl-5 space-y-1.5">
                {fixableItems.map((item, idx) => (
                  <li key={idx} className="leading-relaxed">{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* All Clear */}
          {isAllClear && (
            <div className="p-4 sm:p-5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>You appear eligible — here's your path.</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Your home meets DC's primary ownership, natural person, and habitability criteria. Review the license types and setup checklist below to prepare your application.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Official Citation Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
        <span>Source: DC Department of Licensing and Consumer Protection (DLCP)</span>
        <a
          href={DC_RULES_SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
        >
          <span>Official DLCP Rules</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
