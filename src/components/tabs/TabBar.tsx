/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DollarSign, PieChart, ShieldCheck, Sparkles } from 'lucide-react';

export type TabId = 'earnings' | 'costs' | 'legal' | 'ask';

interface TabBarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
}

export const TABS_CONFIG: { id: TabId; hash: string; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'earnings', hash: '#earnings', label: '1 · Earnings', icon: DollarSign },
  { id: 'costs', hash: '#costs', label: '2 · Costs & Profit', icon: PieChart },
  { id: 'legal', hash: '#legal', label: '3 · Legal & Setup', icon: ShieldCheck },
  { id: 'ask', hash: '#ask', label: '4 · Ask AI', icon: Sparkles },
];

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onSelectTab }) => {
  return (
    <nav
      aria-label="Application Tabs"
      className="flex items-center gap-1 sm:gap-2 p-1 bg-gray-100/90 rounded-xl border border-gray-200 overflow-x-auto no-scrollbar"
    >
      {TABS_CONFIG.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              isActive
                ? 'bg-white text-gray-900 shadow-xs border border-gray-200/80'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-rose-600' : 'text-gray-500'}`} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
