/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DC_RULES, DC_RULES_LAST_VERIFIED, DC_RULES_SOURCE_URL } from '../config/dcRules.ts';
import { DC_MARKET, DC_MARKET_SOURCE } from '../config/market.ts';
import type { CostAssumptions } from '../config/costs.ts';
import {
  DEFAULT_COST_ITEMS,
  INITIAL_COST_ASSUMPTIONS,
} from '../config/costs.ts';
import {
  AIRBNB_HOST_FEE,
  DEFAULT_NIGHTS,
  DEFAULT_PIN,
  MAX_RADIUS_MI,
  MIN_COMPARABLES,
  RADIUS_STEP_MI,
  START_RADIUS_MI,
} from '../config/rules.ts';

export type SpaceType = 'private_room' | 'entire_home';
export type BedroomOption = 'studio' | '1' | '2' | '3+';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface ListingRecord {
  listing_id: number;
  listing_name: string;
  listing_type: string;
  room_type: 'entire_home' | 'private_room';
  bedrooms_clean: number | null;
  latitude: number;
  longitude: number;
  exact_location: boolean | null;
  rating_overall: number | null;
  num_reviews: number | null;
  ttm_revenue: number | null;
  ttm_avg_rate: number;
  ttm_adjusted_occupancy: number;
  ttm_reserved_days: number | null;
  hosting_mode: string | null;
  is_active: boolean;
}

let cachedCleanListings: ListingRecord[] | null = null;

export async function getCleanListings(): Promise<ListingRecord[]> {
  if (cachedCleanListings) return cachedCleanListings;

  if (typeof window === 'undefined') {
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.resolve(process.cwd(), 'public/assets/aistudio/dc_listings_clean_3b72fa17.json');
    const raw = await fs.readFile(filePath, 'utf-8');
    cachedCleanListings = JSON.parse(raw) as ListingRecord[];
    return cachedCleanListings;
  }

  const res = await fetch('/assets/aistudio/dc_listings_clean_3b72fa17.json');
  cachedCleanListings = (await res.json()) as ListingRecord[];
  return cachedCleanListings;
}

function calcPercentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const k = sorted.length;
  if (k === 1) return sorted[0];
  const idx = p * (k - 1);
  const i = Math.floor(idx);
  const frac = idx - i;
  if (i >= k - 1) return sorted[k - 1];
  return sorted[i] + frac * (sorted[i + 1] - sorted[i]);
}

function calcMedian(values: number[]): number {
  return calcPercentile(values, 0.5);
}

function calcHaversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function matchesRoomAndBeds(l: ListingRecord, spaceType: SpaceType, bedrooms: BedroomOption): boolean {
  if (l.room_type !== spaceType) return false;
  if (spaceType === 'entire_home') {
    const b = l.bedrooms_clean;
    if (bedrooms === 'studio') return b === 0;
    if (bedrooms === '1') return b === 1;
    if (bedrooms === '2') return b === 2;
    if (bedrooms === '3+') return b !== null && b >= 3;
  }
  return true;
}

export interface GroupSummary {
  count: number;
  nightlyPrice: {
    median: number;
    p25: number;
    p75: number;
  };
  medianBookingRatePct: number;
  medianBookingNightsPerMonth: number;
  medianAnnualRevenue: number;
}

function summarizeListingsGroup(items: ListingRecord[]): GroupSummary {
  if (items.length === 0) {
    return {
      count: 0,
      nightlyPrice: { median: 0, p25: 0, p75: 0 },
      medianBookingRatePct: 0,
      medianBookingNightsPerMonth: 0,
      medianAnnualRevenue: 0,
    };
  }

  const rates = items.map((i) => i.ttm_avg_rate).filter((v): v is number => typeof v === 'number' && !isNaN(v));
  const occs = items
    .map((i) => i.ttm_adjusted_occupancy)
    .filter((v): v is number => typeof v === 'number' && !isNaN(v));
  const revs = items
    .map((i) => i.ttm_revenue)
    .filter((v): v is number => typeof v === 'number' && !isNaN(v));

  const medRate = rates.length > 0 ? Math.round(calcMedian(rates)) : 0;
  const p25Rate = rates.length > 0 ? Math.round(calcPercentile(rates, 0.25)) : 0;
  const p75Rate = rates.length > 0 ? Math.round(calcPercentile(rates, 0.75)) : 0;

  const medOcc = occs.length > 0 ? calcMedian(occs) : 0;
  const medOccPct = Math.round(medOcc * 1000) / 10;
  const medNights = Math.round(medOcc * 30);

  const medRev = revs.length > 0 ? Math.round(calcMedian(revs)) : 0;

  return {
    count: items.length,
    nightlyPrice: {
      median: medRate,
      p25: p25Rate,
      p75: p75Rate,
    },
    medianBookingRatePct: medOccPct,
    medianBookingNightsPerMonth: medNights,
    medianAnnualRevenue: medRev,
  };
}

/**
 * Strips any street numbers or street address patterns from a location label,
 * returning only a safe neighborhood / city description.
 */
export function sanitizeLocationToNeighborhood(rawLabel?: string | null): string {
  if (!rawLabel || typeof rawLabel !== 'string') {
    return 'Capitol Hill, Washington, DC';
  }
  const trimmed = rawLabel.trim();
  if (!trimmed) return 'Capitol Hill, Washington, DC';

  if (/^\d+\s+/.test(trimmed)) {
    const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
    const remaining = parts.slice(1).filter((p) => !/^\d+/.test(p));
    if (remaining.length > 0) {
      return remaining.join(', ');
    }
    return 'Washington, DC';
  }

  if (/\b\d+\s+[A-Za-z0-9]+\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Pl|Place|Way|Dr|Drive|Ct|Court|Ln|Lane)\b/i.test(trimmed)) {
    return 'Washington, DC';
  }

  return trimmed;
}

function computeCostsSnapshot(nights: number, pricePerNight: number, assumptions: CostAssumptions) {
  const N = Math.max(0, nights);
  const P = Math.max(0, pricePerNight);
  const staysCount = DC_MARKET.avgLengthOfStayNights > 0 ? N / DC_MARKET.avgLengthOfStayNights : 0;
  const nightlyBookings = P * N;
  const cleaningFeeCharged = assumptions.chargeCleaningFee ? assumptions.cleaningFeeAmount : 0;
  const cleaningFeeIncome = cleaningFeeCharged * staysCount;
  const grossBookings = nightlyBookings + cleaningFeeIncome;

  const airbnbFee = assumptions.hostFeePct * grossBookings;
  const cleaningCost = assumptions.cleanOption === 'cleaner' ? assumptions.cleaningCostAmount * staysCount : 0;
  const utilitiesCost = assumptions.utilitiesPct * grossBookings;
  const suppliesCost = assumptions.suppliesPct * grossBookings;
  const repairsCost = assumptions.repairsPct * grossBookings;

  let mgmtPct = 0;
  if (assumptions.customManagementPct !== undefined) {
    mgmtPct = assumptions.customManagementPct;
  } else if (assumptions.managementType === 'cohost') {
    mgmtPct = 0.10;
  } else if (assumptions.managementType === 'full') {
    mgmtPct = 0.20;
  }
  const managementCost = mgmtPct * nightlyBookings;

  const insuranceCost = assumptions.insuranceAnnual / 12;
  const licenseCost = assumptions.licenseBiennial / 24;
  const pricingToolsCost = assumptions.pricingToolsAnnual / 12;

  const totalCosts =
    airbnbFee +
    cleaningCost +
    utilitiesCost +
    suppliesCost +
    repairsCost +
    managementCost +
    insuranceCost +
    licenseCost +
    pricingToolsCost;

  const netBeforeHousing = grossBookings - totalCosts;
  return {
    staysCount,
    nightlyBookings,
    cleaningFeeIncome,
    grossBookings,
    airbnbFee,
    cleaningCost,
    utilitiesCost,
    suppliesCost,
    repairsCost,
    managementCost,
    insuranceCost,
    licenseCost,
    pricingToolsCost,
    totalCosts,
    netBeforeHousing,
    annualNetBeforeHousing: netBeforeHousing * 12,
  };
}

export interface UserScenarioInput {
  neighborhood?: string | null;
  pin?: GeoPoint;
  spaceType?: SpaceType;
  bedrooms?: BedroomOption;
  nights?: number;
  priceOverride?: number | null;
  includeLowActivity?: boolean;
  costAssumptions?: CostAssumptions;
  listingPricePerNight?: number;
  typicalNightlyPayout?: number;
  typicalMonthlyPayout?: number;
  rangeLowMonthly?: number;
  rangeHighMonthly?: number;
  comparablesCount?: number;
  searchRadiusMi?: number;
  benchmarkNights?: number;
  grossBookingsMonthly?: number;
  totalCostsMonthly?: number;
  netTakeHomeMonthly?: number;
  annualNetTakeHome?: number;
  airbnbFeeMonthly?: number;
  cleaningCostMonthly?: number;
  utilitiesMonthly?: number;
  suppliesMonthly?: number;
  repairsMonthly?: number;
  managementCostMonthly?: number;
  insuranceMonthly?: number;
  licenseMonthly?: number;
  cleanOption?: 'cleaner' | 'self';
  managementType?: 'self' | 'cohost' | 'full';
}

export interface AssembledAiContext {
  userScenario: Record<string, any>;
  dcRules: Record<string, any>;
  listingData: Record<string, any>;
  marketData: Record<string, any>;
  costs: Record<string, any>;
}

/**
 * Assembles the compact deterministic JSON context (< 4,000 tokens) from all 5 app sources.
 * Every number Gemini might need is precomputed here in TypeScript.
 */
export async function buildAiContext(input: UserScenarioInput = {}): Promise<AssembledAiContext> {
  const allListings = await getCleanListings();

  const pin: GeoPoint = input.pin || DEFAULT_PIN;
  const spaceType: SpaceType = input.spaceType || 'entire_home';
  const bedrooms: BedroomOption = input.bedrooms || '1';
  const nights: number = Math.max(1, Math.min(30, Math.round(typeof input.nights === 'number' ? input.nights : DEFAULT_NIGHTS)));
  const includeLowActivity = Boolean(input.includeLowActivity);
  const priceOverride = input.priceOverride ?? null;

  // Find comparables within expanding radius
  const candidates = allListings
    .filter((l) => (includeLowActivity || l.is_active) && matchesRoomAndBeds(l, spaceType, bedrooms))
    .map((l) => ({
      ...l,
      distance_mi: calcHaversineMiles(pin.lat, pin.lng, l.latitude, l.longitude),
    }))
    .sort((a, b) => a.distance_mi - b.distance_mi);

  let currentRadius = START_RADIUS_MI;
  let matchingComparables = candidates.filter((l) => l.distance_mi <= currentRadius);
  while (matchingComparables.length < MIN_COMPARABLES && currentRadius < MAX_RADIUS_MI) {
    currentRadius = Math.min(Math.round((currentRadius + RADIUS_STEP_MI) * 100) / 100, MAX_RADIUS_MI);
    matchingComparables = candidates.filter((l) => l.distance_mi <= currentRadius);
  }

  const effectivePrices = matchingComparables.map((c) =>
    priceOverride !== null && priceOverride > 0 ? priceOverride : c.ttm_avg_rate
  );
  const nightlyPayouts = effectivePrices.map((p) => p * (1 - AIRBNB_HOST_FEE));
  const monthlyPayouts = nightlyPayouts.map((e) => e * nights);
  const occs = matchingComparables.map((c) => c.ttm_adjusted_occupancy);

  const P = input.listingPricePerNight ?? (effectivePrices.length > 0 ? Math.round(calcMedian(effectivePrices)) : 0);
  const E = input.typicalNightlyPayout ?? (nightlyPayouts.length > 0 ? Math.round(calcMedian(nightlyPayouts)) : 0);
  const X = input.typicalMonthlyPayout ?? (monthlyPayouts.length > 0 ? Math.round(calcMedian(monthlyPayouts)) : 0);
  const LOW = input.rangeLowMonthly ?? (monthlyPayouts.length > 0 ? Math.round(calcPercentile(monthlyPayouts, 0.25)) : 0);
  const HIGH = input.rangeHighMonthly ?? (monthlyPayouts.length > 0 ? Math.round(calcPercentile(monthlyPayouts, 0.75)) : 0);
  const compCount = input.comparablesCount ?? matchingComparables.length;
  const radiusMi = input.searchRadiusMi ?? currentRadius;
  const B = input.benchmarkNights ?? (occs.length > 0 ? Math.round(calcMedian(occs) * 30) : 0);

  const assumptions: CostAssumptions = input.costAssumptions || {
    ...INITIAL_COST_ASSUMPTIONS,
    cleanOption: input.cleanOption || INITIAL_COST_ASSUMPTIONS.cleanOption,
    managementType: input.managementType || INITIAL_COST_ASSUMPTIONS.managementType,
  };

  const costSummary = computeCostsSnapshot(nights, P, assumptions);
  const selfCleanSummary = computeCostsSnapshot(nights, P, {
    ...assumptions,
    cleanOption: 'self',
  });
  const hireCleanerSummary = computeCostsSnapshot(nights, P, {
    ...assumptions,
    cleanOption: 'cleaner',
  });
  const cohostSummary = computeCostsSnapshot(nights, P, {
    ...assumptions,
    managementType: 'cohost',
  });
  const fullServiceSummary = computeCostsSnapshot(nights, P, {
    ...assumptions,
    managementType: 'full',
  });

  const safeNeighborhood = sanitizeLocationToNeighborhood(input.neighborhood);

  // Section A: userScenario
  const userScenario = {
    source: {
      name: "User's Personalized DC Estimate & Cost Choices (App Shared State)",
      date: '2026-11-11',
    },
    neighborhood: safeNeighborhood,
    spaceType: spaceType === 'entire_home' ? 'Entire place' : 'Private room',
    bedrooms: spaceType === 'private_room' ? 'Private room (1 bedroom)' : bedrooms === 'studio' ? 'Studio' : `${bedrooms} bedroom(s)`,
    nightsPerMonth: nights,
    listingPricePerNight: P,
    airbnbHostFeePct: Math.round(AIRBNB_HOST_FEE * 1000) / 10, // 15.5
    airbnbHostFeePerNight: P - E,
    nightlyPayoutAfterFee: E,
    monthlyEarningsEstimate: X,
    annualEarningsEstimate: X * 12,
    monthlyEarningsRangeLow: LOW,
    monthlyEarningsRangeHigh: HIGH,
    comparablesCount: compCount,
    searchRadiusMiles: radiusMi,
    benchmarkNightsPerMonth: B,
    costsAndProfit: {
      grossBookingsMonthly: input.grossBookingsMonthly ?? Math.round(costSummary.grossBookings),
      nightlyBookingsMonthly: Math.round(costSummary.nightlyBookings),
      cleaningFeeIncomeMonthly: Math.round(costSummary.cleaningFeeIncome),
      estimatedStaysPerMonth: Math.round(costSummary.staysCount * 100) / 100,
      airbnbFeeMonthly: input.airbnbFeeMonthly ?? Math.round(costSummary.airbnbFee),
      cleaningCostMonthly: input.cleaningCostMonthly ?? Math.round(costSummary.cleaningCost),
      utilitiesMonthly: input.utilitiesMonthly ?? Math.round(costSummary.utilitiesCost),
      suppliesMonthly: input.suppliesMonthly ?? Math.round(costSummary.suppliesCost),
      repairsMonthly: input.repairsMonthly ?? Math.round(costSummary.repairsCost),
      managementCostMonthly: input.managementCostMonthly ?? Math.round(costSummary.managementCost),
      insuranceMonthly: input.insuranceMonthly ?? Math.round(costSummary.insuranceCost),
      insuranceAnnual: assumptions.insuranceAnnual,
      licenseMonthly: input.licenseMonthly ?? Math.round(costSummary.licenseCost),
      licenseBiennial: assumptions.licenseBiennial,
      totalCostsMonthly: input.totalCostsMonthly ?? Math.round(costSummary.totalCosts),
      netProfitMonthly: input.netTakeHomeMonthly ?? Math.round(costSummary.netBeforeHousing),
      netProfitAnnual: input.annualNetTakeHome ?? Math.round(costSummary.annualNetBeforeHousing),
      cleaningChoice: assumptions.cleanOption === 'cleaner' ? 'Hire cleaner ($120/stay)' : 'Clean yourself ($0/stay)',
      managementChoice:
        assumptions.managementType === 'self'
          ? 'Self-managed (0%)'
          : assumptions.managementType === 'cohost'
          ? 'Co-host (10%)'
          : 'Full-service (20%)',
      comparisonIfCleanYourself: {
        cleaningCostMonthly: 0,
        monthlySavingsVsCleaner: Math.round(hireCleanerSummary.cleaningCost),
        annualSavingsVsCleaner: Math.round(hireCleanerSummary.cleaningCost * 12),
        netProfitMonthlyIfSelfClean: Math.round(selfCleanSummary.netBeforeHousing),
        netProfitAnnualIfSelfClean: Math.round(selfCleanSummary.annualNetBeforeHousing),
        netProfitMonthlyIfHireCleaner: Math.round(hireCleanerSummary.netBeforeHousing),
      },
      comparisonByManagement: {
        netMonthlySelfManaged: Math.round(hireCleanerSummary.netBeforeHousing),
        netMonthlyCohost10Pct: Math.round(cohostSummary.netBeforeHousing),
        netMonthlyFullService20Pct: Math.round(fullServiceSummary.netBeforeHousing),
      },
    },
  };

  // Section B: dcRules
  const dcRules = {
    source: {
      name: 'DC Department of Licensing and Consumer Protection (DLCP) Official Short-Term Rental Rules',
      url: DC_RULES_SOURCE_URL,
      date: DC_RULES_LAST_VERIFIED,
    },
    finesAndPenaltiesNote:
      'Official DLCP source does not specify exact fine or penalty dollar amounts. Never state a fine amount; refer homeowners to DLCP at (202) 221-8550.',
    licenseTypes: {
      shortTermRental: DC_RULES.licenseTypes.shortTermRental.text,
      vacationRental: DC_RULES.licenseTypes.vacationRental.text,
      dualLicenseNote: DC_RULES.licenseTypes.dualLicenseNote.text,
    },
    capsAndLimits: {
      vacationRentalAnnualCapNights: DC_RULES.vacationRentalAnnualCap.value,
      vacationRentalAnnualCapRule: DC_RULES.vacationRentalAnnualCap.text,
      maxContinuousNightsPerBooking: DC_RULES.maxContinuousNights.value,
      maxOccupancyGuests: DC_RULES.maxOccupancy.value,
      maxOccupancyRule: DC_RULES.maxOccupancy.text,
    },
    eligibility: {
      naturalPerson: DC_RULES.eligibility.naturalPerson.text,
      homesteadPrimaryResidence: DC_RULES.eligibility.homesteadPrimary.text,
      englishBasementAndAccessoryUnits: DC_RULES.eligibility.accessoryUnits.text,
      noInvestmentProperties: DC_RULES.eligibility.noInvestments.text,
      habitableAttestation: DC_RULES.eligibility.habitableAttestation.text,
      condoCoopHoa: DC_RULES.eligibility.condoHoa.text,
      cleanHandsMaxDebtAllowed: DC_RULES.eligibility.cleanHands.value,
      cleanHandsRule: DC_RULES.eligibility.cleanHands.text,
    },
    exemption90NightCap: {
      employerExemption: DC_RULES.exemption90Night.employer.text,
      healthExemption: DC_RULES.exemption90Night.health.text,
      applicationSteps: DC_RULES.exemption90Night.steps.text,
      reviewTime: DC_RULES.exemption90Night.reviewTime.text,
    },
    feesAndTerm: {
      licenseFeeDollars: DC_RULES.fees.licenseFee.value,
      licenseFeeDetails: DC_RULES.fees.licenseFee.text,
      termYears: DC_RULES.fees.termYears.value,
    },
    applicationSteps: DC_RULES.applicationSteps.map((s) => s.text),
    safetyRequirements: DC_RULES.safetyRequirements.map((s) => s.text),
    operatingRules: DC_RULES.operatingRules.map((s) => s.text),
    parking: DC_RULES.parking.text,
    contacts: {
      dlcpHotline: DC_RULES.contacts.hotline.text,
      licenseLookup: DC_RULES.contacts.lookup.text,
    },
  };

  // Section C: listingData
  const entireHomeListings = allListings.filter((l) => l.room_type === 'entire_home');
  const privateRoomListings = allListings.filter((l) => l.room_type === 'private_room');
  const activeOnlyListings = allListings.filter((l) => l.is_active);

  const presentCount = allListings.filter((l) => l.hosting_mode === 'present').length;
  const awayCount = allListings.filter((l) => l.hosting_mode === 'away').length;
  const bothCount = allListings.filter((l) => l.hosting_mode === 'both').length;
  const exemptCount = allListings.filter((l) => l.hosting_mode === 'exempt').length;
  const unknownModeCount = allListings.filter((l) => !l.hosting_mode || l.hosting_mode === 'unknown').length;
  const totalCount = allListings.length;

  const listingData = {
    source: {
      name: 'DC Clean Airbnb Listings Dataset Summary (dc_listings_clean.json)',
      date: '2026-10-31',
    },
    privacyNote: 'Summary only. Individual listing IDs, host names, and exact coordinates are excluded.',
    totalListings: totalCount,
    activeListings: activeOnlyListings.length,
    allListingsSummary: summarizeListingsGroup(allListings),
    byRoomType: {
      entire_home: summarizeListingsGroup(entireHomeListings),
      private_room: summarizeListingsGroup(privateRoomListings),
    },
    byBedroomCount: {
      studio_0br: summarizeListingsGroup(entireHomeListings.filter((l) => l.bedrooms_clean === 0)),
      one_bedroom_1br: summarizeListingsGroup(entireHomeListings.filter((l) => l.bedrooms_clean === 1)),
      two_bedrooms_2br: summarizeListingsGroup(entireHomeListings.filter((l) => l.bedrooms_clean === 2)),
      three_bedrooms_3br: summarizeListingsGroup(entireHomeListings.filter((l) => l.bedrooms_clean === 3)),
      four_bedrooms_4br: summarizeListingsGroup(entireHomeListings.filter((l) => l.bedrooms_clean === 4)),
      three_plus_bedrooms_3br_up: summarizeListingsGroup(
        entireHomeListings.filter((l) => l.bedrooms_clean !== null && l.bedrooms_clean >= 3)
      ),
    },
    userComparablesSummary: {
      radiusMiles: radiusMi,
      ...summarizeListingsGroup(matchingComparables),
    },
    licenseModeShare: {
      hostedPresent: {
        count: presentCount,
        sharePct: Math.round((presentCount / totalCount) * 1000) / 10,
      },
      bothPresentAndAway: {
        count: bothCount,
        sharePct: Math.round((bothCount / totalCount) * 1000) / 10,
      },
      unhostedAway: {
        count: awayCount,
        sharePct: Math.round((awayCount / totalCount) * 1000) / 10,
      },
      exemptOver90Nights: {
        count: exemptCount,
        sharePct: Math.round((exemptCount / totalCount) * 1000) / 10,
      },
      unknown: {
        count: unknownModeCount,
        sharePct: Math.round((unknownModeCount / totalCount) * 1000) / 10,
      },
    },
  };

  // Section D: marketData
  const marketData = {
    source: {
      name: `${DC_MARKET_SOURCE.name} "${DC_MARKET_SOURCE.reportTitle}" (${DC_MARKET_SOURCE.period})`,
      date: DC_MARKET_SOURCE.lastUpdated,
    },
    ...DC_MARKET,
  };

  // Section E: costs
  const costs = {
    source: {
      name: 'DC Short-Term Rental Hosting Cost Assumptions (/config/costs.ts)',
      date: '2026-11-05',
    },
    dcLodgingTaxRatePct: 15.95,
    items: DEFAULT_COST_ITEMS,
  };

  return {
    userScenario,
    dcRules,
    listingData,
    marketData,
    costs,
  };
}
