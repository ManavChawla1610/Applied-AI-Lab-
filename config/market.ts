/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DC Market Benchmarks
 * Source: AirROI, "Washington, DC Airbnb Market Data", 12 months to October 2026, 4,785 active listings.
 * Updated: Nov 5, 2026.
 */

export const DC_MARKET_SOURCE = {
  name: 'AirROI',
  reportTitle: 'Washington, DC Airbnb Market Data',
  period: '12 months to October 2026',
  activeListings: 4785,
  lastUpdated: '2026-11-05',
};

export const DC_MARKET = {
  // Aggregate Market Metrics
  avgAnnualRevenue: 34393,
  adr: 258,
  occupancy: 0.454,
  revPar: 120,
  activeListings: 4785,
  avgLeadTimeDays: 42,

  // ADR Percentiles ($/night)
  medianAdr: 195,
  adrP25: 130,
  adrP75: 305,
  adrP90: 465,

  // Occupancy Percentiles (rate 0-1)
  medianOccupancy: 0.50,
  occP25: 0.25,
  occP75: 0.71,
  occP90: 0.85,

  // Monthly Revenue Tiers ($/month)
  monthlyRevenueTiers: {
    p25: 1590,
    median: 3140,
    p75: 5210,
    p90: 8340,
  },

  // Stay Dynamics & Cleaning
  avgLengthOfStayNights: 5.2,
  medianCleaningFee: 120,
  shareChargingCleaningFee: 0.892,
  cleaningFeeShareOfGross: 0.098,

  // Quality & Host Metrics
  avgRating: 4.77,
  guestFavoriteShare: 0.40,
  superhostShare: 0.538,
  simplifiedPricingShare: 0.901,

  // Seasonal Dynamics
  seasons: {
    high: {
      name: 'High Season',
      months: 'Mar–Jul, Oct',
      revenue: 4710,
      occupancy: 0.56,
      adr: 257,
    },
    shoulder: {
      name: 'Shoulder Season',
      months: 'Sep',
      revenue: 3840,
      occupancy: 0.52,
      adr: 245,
    },
    low: {
      name: 'Low Season',
      months: 'Aug, Nov–Feb',
      revenue: 3130,
      occupancy: 0.44,
      adr: 232,
    },
  },

  // Monthly Historical Data (Oct 2025–Sep 2026)
  monthly: [
    { month: 'Oct 2025', revenue: 4560, occupancy: 0.542, adr: 259 },
    { month: 'Nov 2025', revenue: 3491, occupancy: 0.453, adr: 245 },
    { month: 'Dec 2025', revenue: 3265, occupancy: 0.412, adr: 240 },
    { month: 'Jan 2026', revenue: 2676, occupancy: 0.362, adr: 235 },
    { month: 'Feb 2026', revenue: 2607, occupancy: 0.393, adr: 231 },
    { month: 'Mar 2026', revenue: 4654, occupancy: 0.523, adr: 260 },
    { month: 'Apr 2026', revenue: 4730, occupancy: 0.536, adr: 268 },
    { month: 'May 2026', revenue: 5347, occupancy: 0.556, adr: 277 },
    { month: 'Jun 2026', revenue: 5133, occupancy: 0.571, adr: 274 },
    { month: 'Jul 2026', revenue: 4543, occupancy: 0.470, adr: 259 },
    { month: 'Aug 2026', revenue: 3716, occupancy: 0.486, adr: 241 },
    { month: 'Sep 2026', revenue: 4107, occupancy: 0.555, adr: 242 },
  ],

  // By Bedroom Performance (median annual revenue, ADR, occupancy)
  byBedrooms: {
    studio: { label: 'Studio', annualRevenue: 23500, adr: 169, occupancy: 0.50 },
    oneBr: { label: '1 Bedroom', annualRevenue: 24200, adr: 189, occupancy: 0.48 },
    twoBr: { label: '2 Bedrooms', annualRevenue: 31300, adr: 275, occupancy: 0.47 },
    threeBr: { label: '3 Bedrooms', annualRevenue: 44300, adr: 397, occupancy: 0.45 },
    fourBr: { label: '4 Bedrooms', annualRevenue: 51000, adr: 515, occupancy: 0.43 },
    fivePlus: { label: '5+ Bedrooms', annualRevenue: 73000, adr: 819, occupancy: 0.45 },
  },
};
