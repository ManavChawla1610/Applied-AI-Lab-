/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AIRBNB_HOST_FEE,
  MAX_RADIUS_MI,
  MIN_COMPARABLES,
  RADIUS_STEP_MI,
  START_RADIUS_MI,
} from '../config/rules.ts';
import type { Listing } from './data.ts';

export type SpaceType = 'private_room' | 'entire_home';
export type BedroomOption = 'studio' | '1' | '2' | '3+';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface ComparableListing extends Listing {
  distance_mi: number;
  effective_price: number;
  nightly_earnings: number;
  monthly_earnings: number;
}

export interface EarningsResult {
  hasEnoughData: boolean;
  isLowConfidence: boolean;
  comparablesCount: number;
  finalRadiusMi: number;
  typicalMonthly: number; // X: median monthly earnings
  rangeLowMonthly: number; // LOW: 25th percentile
  rangeHighMonthly: number; // HIGH: 75th percentile
  typicalNightlyEarnings: number; // E: median nightly earnings (payout)
  medianListingPrice: number; // P: median listing price across comparables
  typicalAnnual: number; // Y: X * 12
  medianNightlyPrice: number; // Backward-compatible alias for P
  benchmarkNights: number; // B: round(median(ttm_adjusted_occupancy) * 30)
  isOptimisticNights: boolean; // true when N > B
  comparables: ComparableListing[];
  nonComparables: Listing[];
}

/**
 * Standard USD currency formatter: no spaces around thousands separators.
 */
export const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

/**
 * Calculates great-circle distance between two points in miles using the Haversine formula.
 * Earth radius is 3958.8 miles.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // miles
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dPhi = toRad(lat2 - lat1);
  const dLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Computes quantile p in [0, 1] using linear interpolation matching Excel's PERCENTILE.INC.
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    throw new Error('Cannot compute percentile of an empty array');
  }
  if (p < 0 || p > 1) {
    throw new Error(`Quantile p must be between 0 and 1 (received ${p})`);
  }

  const sorted = [...values].sort((a, b) => a - b);
  const k = sorted.length;
  if (k === 1) return sorted[0];

  const idx = p * (k - 1);
  const i = Math.floor(idx);
  const fraction = idx - i;

  if (i >= k - 1) {
    return sorted[k - 1];
  }

  return sorted[i] + fraction * (sorted[i + 1] - sorted[i]);
}

/**
 * Calculates the median of an array of numbers using linear interpolation.
 */
export function median(values: number[]): number {
  return percentile(values, 0.5);
}

/**
 * Evaluates whether a listing matches the requested space type and bedroom criteria.
 */
export function matchesListingType(
  listing: Listing,
  spaceType: SpaceType,
  bedrooms: BedroomOption
): boolean {
  if (listing.room_type !== spaceType) {
    return false;
  }

  if (spaceType === 'entire_home') {
    const b = listing.bedrooms_clean;
    if (bedrooms === 'studio') {
      return b === 0;
    }
    if (bedrooms === '1') {
      return b === 1;
    }
    if (bedrooms === '2') {
      return b === 2;
    }
    if (bedrooms === '3+') {
      return b !== null && b >= 3;
    }
  }

  // Private rooms ignore bedroom count
  return true;
}

/**
 * Clamps host nights to [1, 30].
 */
export function clampNights(nights: number): number {
  if (isNaN(nights)) return 1;
  return Math.max(1, Math.min(30, Math.round(nights)));
}

/**
 * Validates a nightly price override. Returns valid number or null.
 */
export function validatePriceOverride(price: number | null | undefined): {
  isValid: boolean;
  value: number | null;
  errorMessage?: string;
} {
  if (price === null || price === undefined || price === ('' as unknown)) {
    return { isValid: true, value: null };
  }
  const numeric = Number(price);
  if (isNaN(numeric) || numeric <= 0) {
    return {
      isValid: false,
      value: null,
      errorMessage: 'Nightly price override must be greater than $0',
    };
  }
  return { isValid: true, value: numeric };
}

/**
 * Finds comparables with iterative radius expansion from START_RADIUS_MI to MAX_RADIUS_MI.
 */
export function findComparablesAndRadius(
  listings: Listing[],
  pin: GeoPoint,
  spaceType: SpaceType,
  bedrooms: BedroomOption,
  includeLowActivity: boolean
): {
  comparables: (Listing & { distance_mi: number })[];
  finalRadiusMi: number;
} {
  // First filter candidates matching criteria (ignoring radius)
  const candidateListings = listings.filter((l) => {
    if (!includeLowActivity && !l.is_active) {
      return false;
    }
    return matchesListingType(l, spaceType, bedrooms);
  });

  // Calculate distance for all candidates
  const withDistance = candidateListings.map((l) => ({
    ...l,
    distance_mi: haversineDistance(pin.lat, pin.lng, l.latitude, l.longitude),
  }));

  // Sort by distance ascending
  withDistance.sort((a, b) => a.distance_mi - b.distance_mi);

  let currentRadius = START_RADIUS_MI;
  let matchingWithinRadius = withDistance.filter((l) => l.distance_mi <= currentRadius);

  while (
    matchingWithinRadius.length < MIN_COMPARABLES &&
    currentRadius < MAX_RADIUS_MI
  ) {
    currentRadius = Math.min(
      Math.round((currentRadius + RADIUS_STEP_MI) * 100) / 100,
      MAX_RADIUS_MI
    );
    matchingWithinRadius = withDistance.filter((l) => l.distance_mi <= currentRadius);
  }

  return {
    comparables: matchingWithinRadius,
    finalRadiusMi: currentRadius,
  };
}

/**
 * Complete deterministic earnings calculation for the given user configuration.
 */
export function calculateEstimates(
  allListings: Listing[],
  pin: GeoPoint,
  nights: number,
  spaceType: SpaceType,
  bedrooms: BedroomOption,
  includeLowActivity: boolean,
  priceOverride: number | null
): EarningsResult {
  const clampedN = clampNights(nights);

  const { comparables: rawComparables, finalRadiusMi } = findComparablesAndRadius(
    allListings,
    pin,
    spaceType,
    bedrooms,
    includeLowActivity
  );

  const compIdSet = new Set(rawComparables.map((c) => c.listing_id));
  const nonComparables = allListings.filter((l) => !compIdSet.has(l.listing_id));

  if (rawComparables.length === 0) {
    return {
      hasEnoughData: false,
      isLowConfidence: false,
      comparablesCount: 0,
      finalRadiusMi,
      typicalMonthly: 0,
      rangeLowMonthly: 0,
      rangeHighMonthly: 0,
      typicalNightlyEarnings: 0,
      medianListingPrice: 0,
      typicalAnnual: 0,
      medianNightlyPrice: 0,
      benchmarkNights: 0,
      isOptimisticNights: false,
      comparables: [],
      nonComparables,
    };
  }

  // Calculate for each comparable i
  const comparables: ComparableListing[] = rawComparables.map((item) => {
    const effective_price =
      priceOverride !== null && priceOverride > 0 ? priceOverride : item.ttm_avg_rate;
    const nightly_earnings = effective_price * (1 - AIRBNB_HOST_FEE);
    const monthly_earnings = nightly_earnings * clampedN;

    return {
      ...item,
      effective_price,
      nightly_earnings,
      monthly_earnings,
    };
  });

  const monthlyList = comparables.map((c) => c.monthly_earnings);
  const nightlyEarningsList = comparables.map((c) => c.nightly_earnings);
  const effectivePricesList = comparables.map((c) => c.effective_price);
  const adjustedOccupancies = comparables.map((c) => c.ttm_adjusted_occupancy);

  const X = Math.round(median(monthlyList));
  const LOW = Math.round(percentile(monthlyList, 0.25));
  const HIGH = Math.round(percentile(monthlyList, 0.75));
  const E = Math.round(median(nightlyEarningsList));
  const P = Math.round(median(effectivePricesList));
  const Y = X * 12;

  // Benchmark B = round(median of ttm_adjusted_occupancy across comparables * 30)
  const medianOccupancy = median(adjustedOccupancies);
  const benchmarkNights = Math.round(medianOccupancy * 30);

  const isOptimisticNights = clampedN > benchmarkNights;
  const isLowConfidence = comparables.length < MIN_COMPARABLES;

  return {
    hasEnoughData: true,
    isLowConfidence,
    comparablesCount: comparables.length,
    finalRadiusMi,
    typicalMonthly: X,
    rangeLowMonthly: LOW,
    rangeHighMonthly: HIGH,
    typicalNightlyEarnings: E,
    medianListingPrice: P,
    typicalAnnual: Y,
    medianNightlyPrice: P,
    benchmarkNights,
    isOptimisticNights,
    comparables,
    nonComparables,
  };
}
