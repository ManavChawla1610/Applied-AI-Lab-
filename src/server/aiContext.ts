/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Builds the compact JSON context sent to Gemini. Every number Gemini may use is
 * precomputed here in code — the model never calculates.
 */

import fs from 'fs';
import path from 'path';
import { DC_RULES, DC_RULES_LAST_VERIFIED } from '../../config/dcRules.ts';
import { DC_MARKET, DC_MARKET_SOURCE } from '../../config/market.ts';
import { DEFAULT_COST_ITEMS } from '../../config/costs.ts';
import { DLCP_URL } from '../../config/ai.ts';
import { median, percentile } from '../../lib/calc.ts';
import type { Listing } from '../../lib/data.ts';

const LISTINGS_FILE = 'public/assets/aistudio/dc_listings_clean_3b72fa17.json';

/** Only these userScenario fields are ever forwarded to Gemini (no address, no coordinates). */
export const ALLOWED_SCENARIO_KEYS = [
  'area',
  'spaceType',
  'bedrooms',
  'nightsPerMonth',
  'listingPricePerNight',
  'payoutPerNightAfterAirbnbFee',
  'estimatedMonthlyPayout',
  'typicalRangeLowMonthly',
  'typicalRangeHighMonthly',
  'estimatedYearlyPayout',
  'similarListingsUsed',
  'searchRadiusMiles',
  'similarHomesBookNightsPerMonth',
  'airbnbHostFeePercent',
  'managementChoice',
  'cleaningChoice',
  'cleaningFeeChargedPerStay',
  'grossBookingsMonthly',
  'airbnbFeeMonthly',
  'cleaningCostMonthly',
  'utilitiesMonthly',
  'suppliesMonthly',
  'repairsMonthly',
  'managementMonthly',
  'insuranceMonthly',
  'licenseMonthly',
  'totalCostsMonthly',
  'netBeforeHousingMonthly',
  'netBeforeHousingYearly',
] as const;

export function sanitizeScenario(raw: unknown): Record<string, unknown> {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const clean: Record<string, unknown> = {};
  for (const key of ALLOWED_SCENARIO_KEYS) {
    const v = src[key];
    if (typeof v === 'number' && Number.isFinite(v)) clean[key] = Math.round(v * 100) / 100;
    else if (typeof v === 'string' && v.length <= 60) clean[key] = v;
  }
  return clean;
}

function summarizeGroup(rows: Listing[]) {
  const prices = rows.map((r) => r.ttm_avg_rate).filter((v) => v > 0);
  const occ = rows.map((r) => r.ttm_adjusted_occupancy).filter((v) => typeof v === 'number');
  const rev = rows.map((r) => r.ttm_revenue ?? 0).filter((v) => v > 0);
  const round = (v: number) => Math.round(v);
  return {
    listings: rows.length,
    nightlyPriceLow25: prices.length ? round(percentile(prices, 0.25)) : null,
    nightlyPriceMedian: prices.length ? round(median(prices)) : null,
    nightlyPriceHigh75: prices.length ? round(percentile(prices, 0.75)) : null,
    bookingRateMedianPercent: occ.length ? round(median(occ) * 100) : null,
    annualRevenueMedian: rev.length ? round(median(rev)) : null,
  };
}

let cachedListingSummary: Record<string, unknown> | null = null;

/** Summary of the cleaned DC listings file (never raw rows, IDs, names or coordinates). */
export function buildListingSummary(): Record<string, unknown> {
  if (cachedListingSummary) return cachedListingSummary;
  let rows: Listing[] = [];
  try {
    rows = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), LISTINGS_FILE), 'utf8'));
  } catch (err) {
    console.error('[AI context] Could not read listings file:', err);
    return { note: 'Listing data unavailable' };
  }
  const active = rows.filter((r) => r.is_active);
  const entire = active.filter((r) => r.room_type === 'entire_home');
  const bedroomGroups: Record<string, Listing[]> = { studio: [], '1 bedroom': [], '2 bedrooms': [], '3+ bedrooms': [] };
  for (const r of entire) {
    const b = r.bedrooms_clean ?? 0;
    const key = b === 0 ? 'studio' : b === 1 ? '1 bedroom' : b === 2 ? '2 bedrooms' : '3+ bedrooms';
    bedroomGroups[key].push(r);
  }
  const modes = active.reduce<Record<string, number>>((acc, r) => {
    const m = r.hosting_mode || 'unknown';
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});

  cachedListingSummary = {
    source: 'Cleaned sample of DC Airbnb listings used by this app (last 12 months)',
    totalListingsInSample: rows.length,
    activeListings: active.length,
    privateRooms: summarizeGroup(active.filter((r) => r.room_type === 'private_room')),
    entireHomesAll: summarizeGroup(entire),
    entireHomesByBedrooms: Object.fromEntries(
      Object.entries(bedroomGroups).map(([k, v]) => [k, summarizeGroup(v)])
    ),
    licenseTypeCounts: {
      hostPresent: modes.present || 0,
      hostAway: modes.away || 0,
      both: modes.both || 0,
      other: (modes.exempt || 0) + (modes.unknown || 0),
    },
  };
  return cachedListingSummary;
}

export function buildAiContext(rawScenario: unknown) {
  return {
    userScenario: { source: "The user's current results in this app", ...sanitizeScenario(rawScenario) },
    dcRules: { source: `DC DLCP website (${DLCP_URL}), verified ${DC_RULES_LAST_VERIFIED}`, ...DC_RULES },
    listingData: buildListingSummary(),
    marketData: {
      source: `${DC_MARKET_SOURCE.name} "${DC_MARKET_SOURCE.reportTitle}", ${DC_MARKET_SOURCE.period}`,
      ...DC_MARKET,
    },
    costs: { source: 'Hosting cost assumptions (AirROI DC report; DC license fee from DLCP)', items: DEFAULT_COST_ITEMS },
  };
}
