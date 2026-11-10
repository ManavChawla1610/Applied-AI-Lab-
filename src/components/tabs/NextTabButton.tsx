/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { TabId } from './TabBar';

interface NextTabButtonProps {
  targetTab: TabId;
  targetLabel: string;
  onNavigate: (tab: TabId) => void;
}

export const NextTabButton: React.FC<NextTabButtonProps> = ({
  targetTab,
  targetLabel,
  onNavigate,
}) => {
  return (
    <div className="pt-8 border-t border-gray-200/80 flex items-center justify-end">
      <button
        type="button"
        onClick={() => {
          onNavigate(targetTab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-black text-white font-semibold text-sm rounded-xl shadow-xs transition-all cursor-pointer hover:gap-3"
      >
        <span>Next: {targetLabel}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
