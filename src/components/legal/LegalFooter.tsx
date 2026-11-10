/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DC_RULES, DC_RULES_LAST_VERIFIED, DC_RULES_SOURCE_URL } from '../../../config/dcRules';
import { AlertCircle, ExternalLink } from 'lucide-react';

export const LegalFooter: React.FC = () => {
  return (
    <div className="space-y-4 pt-4 border-t border-gray-200">
      {/* Disclaimer Banner */}
      <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200/90 text-xs text-amber-900 flex items-start gap-2.5 leading-relaxed">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p>
          {DC_RULES.banner.text}
        </p>
      </div>

      {/* Verification Attribution and Source Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-500">
        <div>
          Rules last verified on <strong className="text-gray-700">{DC_RULES_LAST_VERIFIED}</strong> from the official DC Government DLCP portal.
        </div>
        <a
          href={DC_RULES_SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium hover:underline"
        >
          <span>Official DC DLCP Short-Term Rental Portal</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
