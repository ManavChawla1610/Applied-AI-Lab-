/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export type TabId = 'earnings' | 'costs' | 'legal';

interface TabBarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
}

export const TABS_CONFIG: { id: TabId; hash: string; label: string }[] = [
  { id: 'earnings', hash: '#earnings', label: 'Earnings' },
  { id: 'costs', hash: '#costs', label: 'Costs & profit' },
  { id: 'legal', hash: '#legal', label: 'Legal & setup' },
];

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onSelectTab }) => {
  return (
    <nav aria-label="Sections" className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
      {TABS_CONFIG.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`relative px-3 py-2.5 text-sm sm:text-[15px] whitespace-nowrap rounded-full transition-colors cursor-pointer ${
              isActive ? 'text-gray-900 font-semibold' : 'text-gray-500 font-medium hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {tab.label}
            {/* Short underline under the active tab, Airbnb-style */}
            <span
              aria-hidden="true"
              className={`absolute left-1/2 -translate-x-1/2 bottom-0.5 h-[2px] rounded-full bg-gray-900 transition-all ${
                isActive ? 'w-5 opacity-100' : 'w-0 opacity-0'
              }`}
            />
          </button>
        );
      })}
    </nav>
  );
};
