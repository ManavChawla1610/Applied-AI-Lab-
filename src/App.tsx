/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { DEFAULT_NIGHTS, DEFAULT_PIN } from '../config/rules';
import {
  BedroomOption,
  calculateEstimates,
  clampNights,
  GeoPoint,
  SpaceType,
} from '../lib/calc';
import { Listing, loadListings } from '../lib/data';
import {
  calculateMonthlyCosts,
  HousingCostInputs,
  SetupCostInputs,
} from '../lib/costs';
import { CostAssumptions, INITIAL_COST_ASSUMPTIONS } from '../config/costs';
import { AddressSearchPanel } from './components/AddressSearchPanel';
import { TabBar, TabId, TABS_CONFIG } from './components/tabs/TabBar';
import { TabSummaryStrip } from './components/tabs/TabSummaryStrip';
import { EarningsTab } from './components/tabs/EarningsTab';
import { CostsTab } from './components/tabs/CostsTab';
import { LegalTab } from './components/tabs/LegalTab';
import { AskAiTab } from './components/tabs/AskAiTab';
import { AlertOctagon, RefreshCw } from 'lucide-react';

const HASH_TO_TAB: Record<string, TabId> = {
  '#earnings': 'earnings',
  '#costs': 'costs',
  '#legal': 'legal',
  '#ask': 'ask',
};

const TAB_TO_HASH: Record<TabId, string> = {
  earnings: '#earnings',
  costs: '#costs',
  legal: '#legal',
  ask: '#ask',
};

export default function App() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Tab State with URL hash sync
  const getInitialTab = (): TabId => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (HASH_TO_TAB[hash]) return HASH_TO_TAB[hash];
    }
    return 'earnings';
  };

  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab);

  // Synchronize hash on browser back/forward and direct navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (HASH_TO_TAB[hash]) {
        setActiveTab(HASH_TO_TAB[hash]);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSelectTab = useCallback((tab: TabId) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const newHash = TAB_TO_HASH[tab];
      if (window.location.hash !== newHash) {
        window.history.pushState(null, '', newHash);
      }
    }
  }, []);

  // Shared Core User State across all tabs
  const [pin, setPin] = useState<GeoPoint>(DEFAULT_PIN);
  const [customLabel, setCustomLabel] = useState<string | null>(null);
  const [nights, setNights] = useState<number>(DEFAULT_NIGHTS);
  const [spaceType, setSpaceType] = useState<SpaceType>('entire_home');
  const [bedrooms, setBedrooms] = useState<BedroomOption>('1');
  const [includeLowActivity, setIncludeLowActivity] = useState<boolean>(false);
  const [priceOverride, setPriceOverride] = useState<number | null>(null);
  const [isAddressSearchOpen, setIsAddressSearchOpen] = useState<boolean>(false);
  const [showMapPlacementHint, setShowMapPlacementHint] = useState<boolean>(false);

  // Shared Costs & Financial State across all tabs
  const [costAssumptions, setCostAssumptions] = useState<CostAssumptions>(INITIAL_COST_ASSUMPTIONS);
  const [housingInputs, setHousingInputs] = useState<HousingCostInputs>({
    mortgageRentShare: 0,
    propertyTax: 0,
    homeInsurance: 0,
    hoaCondoFees: 0,
  });
  const [setupInputs, setSetupInputs] = useState<SetupCostInputs>({
    furniture: 0,
    photos: 0,
    safetyEquipment: 0,
    smartLock: 0,
    other: 0,
  });

  // Load listings once at startup
  const fetchDataset = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await loadListings();
      setListings(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataset();
  }, []);

  // Compute market comparables and pricing deterministically
  const estimateResult = useMemo(() => {
    if (listings.length === 0) return null;
    return calculateEstimates(
      listings,
      pin,
      nights,
      spaceType,
      bedrooms,
      includeLowActivity,
      priceOverride
    );
  }, [listings, pin, nights, spaceType, bedrooms, includeLowActivity, priceOverride]);

  // Compute cost summary for shared state consumption
  const costSummary = useMemo(() => {
    if (!estimateResult) return null;
    return calculateMonthlyCosts(
      nights,
      estimateResult.medianListingPrice,
      costAssumptions
    );
  }, [nights, estimateResult, costAssumptions]);

  // Handler for address selection
  const handleSelectAddress = (result: {
    lat: number;
    lng: number;
    shortLabel: string;
  }) => {
    setPin({ lat: result.lat, lng: result.lng });
    setCustomLabel(result.shortLabel);
  };

  // Handler for pin change from map (drag or click)
  const handlePinChange = (newPin: GeoPoint, source: 'drag' | 'click' | 'address') => {
    setPin(newPin);
    if (source === 'drag' || source === 'click') {
      setCustomLabel('Custom pin');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-rose-600 rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-semibold text-gray-900">Loading DC listing dataset...</h2>
        <p className="text-xs text-gray-500 mt-1">
          Loading trailing 12-month verified market comparables
        </p>
      </div>
    );
  }

  // Error state: Never fall back to sample numbers per standing rules
  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 p-6 shadow-lg space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Data Loading Failure</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            The DC Airbnb listings dataset could not be loaded. In accordance with strict data integrity rules, sample or placeholder numbers are never shown.
          </p>
          <div className="p-3 bg-red-50 text-red-800 rounded-lg text-xs font-mono text-left break-all">
            {loadError}
          </div>
          <button
            type="button"
            onClick={fetchDataset}
            className="w-full py-2.5 px-4 bg-gray-900 hover:bg-black text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry loading dataset
          </button>
        </div>
      </div>
    );
  }

  if (!estimateResult || !costSummary) {
    return null;
  }

  const activeLocationLabel = customLabel || 'Capitol Hill, DC';

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans selection:bg-rose-100 selection:text-rose-900">
      {/* Top Application Header */}
      <header className="border-b border-gray-200 sticky top-0 z-30 bg-white/95 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-600 flex items-center justify-center text-white font-bold text-lg shadow-xs shrink-0">
              DC
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-gray-900">
                Host Calculator
              </span>
              <span className="text-[11px] block text-gray-500 -mt-0.5">
                Washington, DC Homeowner Earnings
              </span>
            </div>
          </div>

          {/* Tab Bar under / beside app title */}
          <TabBar activeTab={activeTab} onSelectTab={handleSelectTab} />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Slim Summary Strip: Displayed on every tab EXCEPT Earnings */}
        {activeTab !== 'earnings' && (
          <TabSummaryStrip
            locationLabel={activeLocationLabel}
            spaceType={spaceType}
            bedrooms={bedrooms}
            nights={nights}
            listingPrice={estimateResult.medianListingPrice}
            onEdit={() => handleSelectTab('earnings')}
            onOpenAddressSearch={() => setIsAddressSearchOpen(true)}
          />
        )}

        {/* Tab 1: Earnings */}
        {activeTab === 'earnings' && (
          <EarningsTab
            pin={pin}
            customLabel={customLabel}
            nights={nights}
            spaceType={spaceType}
            bedrooms={bedrooms}
            includeLowActivity={includeLowActivity}
            priceOverride={priceOverride}
            estimateResult={estimateResult}
            showMapPlacementHint={showMapPlacementHint}
            onPinChange={handlePinChange}
            onSelectAddress={handleSelectAddress}
            onNightsChange={(n) => setNights(clampNights(n))}
            onUpdateFilters={({ spaceType: st, bedrooms: bd, includeLowActivity: la, priceOverride: po }) => {
              setSpaceType(st);
              setBedrooms(bd);
              setIncludeLowActivity(la);
              setPriceOverride(po);
            }}
            onNavigateTab={handleSelectTab}
            onOpenAddressSearch={() => setIsAddressSearchOpen(true)}
            onDismissMapHint={() => setShowMapPlacementHint(false)}
          />
        )}

        {/* Tab 2: Costs & Profit */}
        {activeTab === 'costs' && (
          <CostsTab
            nights={nights}
            listingPrice={estimateResult.medianListingPrice}
            assumptions={costAssumptions}
            housingInputs={housingInputs}
            setupInputs={setupInputs}
            onChangeAssumptions={setCostAssumptions}
            onChangeHousingInputs={setHousingInputs}
            onChangeSetupInputs={setSetupInputs}
            onNavigateTab={handleSelectTab}
          />
        )}

        {/* Tab 3: Legal & Setup */}
        {activeTab === 'legal' && (
          <LegalTab
            nightsPerMonth={nights}
            spaceType={spaceType}
            bedrooms={bedrooms}
            typicalNightlyEarnings={estimateResult.typicalNightlyEarnings}
            onNavigateTab={handleSelectTab}
          />
        )}

        {/* Tab 4: Ask AI */}
        {activeTab === 'ask' && (
          <AskAiTab
            nights={nights}
            spaceType={spaceType}
            bedrooms={bedrooms}
            estimateResult={estimateResult}
            costSummary={costSummary}
          />
        )}
      </main>

      {/* Top-Level Address Search Panel: accessible from any tab */}
      <AddressSearchPanel
        isOpen={isAddressSearchOpen}
        onClose={() => setIsAddressSearchOpen(false)}
        onSelectAddress={(res) => {
          handleSelectAddress(res);
          setShowMapPlacementHint(false);
        }}
        onUseMapInstead={() => {
          setShowMapPlacementHint(true);
          setTimeout(() => setShowMapPlacementHint(false), 5000);
        }}
      />
    </div>
  );
}
