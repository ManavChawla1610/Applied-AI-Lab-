/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChevronRight, PieChart, Scale } from 'lucide-react';

interface FooterAnchorProps {
  onOpenCostsTab?: () => void;
  onOpenLegalTab?: () => void;
}

export const FooterAnchor: React.FC<FooterAnchorProps> = ({
  onOpenCostsTab,
  onOpenLegalTab,
}) => {
  return (
    <div className="pt-8 pb-4 flex flex-wrap items-center justify-center gap-3 text-center">
      <button
        type="button"
        onClick={onOpenCostsTab}
        className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-gray-900 hover:bg-black transition-all py-2.5 px-5 rounded-full shadow-xs cursor-pointer"
      >
        <PieChart className="w-4 h-4 text-rose-400" />
        <span>See what you'd actually keep (Costs & Profit)</span>
        <ChevronRight className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={onOpenLegalTab}
        className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors py-2 px-3.5 rounded-full border border-gray-200 hover:bg-gray-50 cursor-pointer"
      >
        <Scale className="w-3.5 h-3.5 text-gray-500" />
        <span>Check DC Legal Rules</span>
      </button>
    </div>
  );
};
