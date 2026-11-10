/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DC_RULES } from '../../../config/dcRules';
import { Car, Receipt, History, PhoneCall, Search } from 'lucide-react';

export const GoodToKnowCard: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-6 shadow-xs">
      <div>
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">
          Good to know: Parking, Taxes & Operations
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Essential operational details for day-to-day hosting compliance in the District.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Parking */}
        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <Car className="w-4 h-4 text-blue-600" />
            <span>Parking Regulations</span>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed">
            {DC_RULES.parking.text}
          </p>
        </div>

        {/* Transient Lodging Taxes */}
        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>Taxes Handled by Platform</span>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed">
            {DC_RULES.operatingRules.find((r) => r.id === 'op_transient_tax')?.text}
          </p>
        </div>

        {/* 2-Year Records */}
        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <History className="w-4 h-4 text-purple-600" />
            <span>Record Retention</span>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed">
            {DC_RULES.operatingRules.find((r) => r.id === 'op_record_keeping')?.text}
          </p>
        </div>

        {/* DLCP Hotline & License Lookup */}
        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <PhoneCall className="w-4 h-4 text-rose-600" />
            <span>Official DLCP Contacts</span>
          </div>
          <div className="text-xs text-gray-700 space-y-1">
            <p><strong>Hotline:</strong> {DC_RULES.contacts.hotline.text}</p>
            <p className="flex items-center gap-1">
              <Search className="w-3 h-3 text-gray-500 shrink-0" />
              <span>{DC_RULES.contacts.lookup.text}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
