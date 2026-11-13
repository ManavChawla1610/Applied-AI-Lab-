/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DC_MARKET } from '../config/market.ts';
import { INITIAL_COST_ASSUMPTIONS } from '../config/costs.ts';
import type { CostAssumptions, ManagementOption } from '../config/costs.ts';

export interface CostBreakdownItem {
  id: string;
  label: string;
  monthly: number;
  annual: number;
  pctOfGross: number;
  howCalculated: string;
  source: string;
  isIncome?: boolean;
  isInformational?: boolean;
}

export interface MonthlyFinancialSummary {
  // Inputs & Key counts
  nights: number;
  pricePerNight: number;
  staysCount: number;

  // Bookings (Gross)
  nightlyBookings: number;
  cleaningFeeIncome: number;
  grossBookings: number;

  // Operating & Platform Costs
  airbnbFee: number;
  cleaningCost: number;
  utilitiesCost: number;
  suppliesCost: number;
  repairsCost: number;
  managementCost: number;

  // Fixed Monthly Costs (prorated)
  insuranceCost: number;
  licenseCost: number;
  pricingToolsCost: number;

  // Totals & Profit
  totalCosts: number;
  netBeforeHousing: number;
  annualNetBeforeHousing: number;
  costShareOfGross: number;

  // Detailed line items for the waterfall & table
  costItems: CostBreakdownItem[];

  // Informational lodging tax (guests pay on top)
  lodgingTaxAmount: number;
}

export interface HousingCostInputs {
  mortgageRentShare: number;
  propertyTax: number;
  homeInsurance: number;
  hoaCondoFees: number;
}

export interface SetupCostInputs {
  furniture: number;
  photos: number;
  safetyEquipment: number;
  smartLock: number;
  other: number;
}

/**
 * Calculates complete financial breakdown per month deterministically.
 */
export function calculateMonthlyCosts(
  nights: number,
  listingPrice: number,
  assumptions: CostAssumptions = INITIAL_COST_ASSUMPTIONS,
  avgStayNights: number = DC_MARKET.avgLengthOfStayNights
): MonthlyFinancialSummary {
  const N = Math.max(0, nights);
  const P = Math.max(0, listingPrice);

  // 1. Turnover & Bookings
  const staysCount = avgStayNights > 0 ? N / avgStayNights : 0;
  const nightlyBookings = P * N;

  const cleaningFeeCharged = assumptions.chargeCleaningFee ? assumptions.cleaningFeeAmount : 0;
  const cleaningFeeIncome = cleaningFeeCharged * staysCount;
  const grossBookings = nightlyBookings + cleaningFeeIncome;

  // 2. Variable Operating Costs
  const airbnbFee = assumptions.hostFeePct * grossBookings;
  const cleaningCost = assumptions.cleanOption === 'cleaner' ? assumptions.cleaningCostAmount * staysCount : 0;
  const utilitiesCost = assumptions.utilitiesPct * grossBookings;
  const suppliesCost = assumptions.suppliesPct * grossBookings;
  const repairsCost = assumptions.repairsPct * grossBookings;

  // Management % of nightly bookings
  let mgmtPct = 0;
  if (assumptions.customManagementPct !== undefined) {
    mgmtPct = assumptions.customManagementPct;
  } else if (assumptions.managementType === 'cohost') {
    mgmtPct = 0.10;
  } else if (assumptions.managementType === 'full') {
    mgmtPct = 0.20;
  }
  const managementCost = mgmtPct * nightlyBookings;

  // 3. Fixed Prorated Costs
  const insuranceCost = assumptions.insuranceAnnual / 12;
  const licenseCost = assumptions.licenseBiennial / 24;
  const pricingToolsCost = assumptions.pricingToolsAnnual / 12;

  // 4. Sum of all costs & Net Profit
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
  const annualNetBeforeHousing = netBeforeHousing * 12;
  const costShareOfGross = grossBookings > 0 ? totalCosts / grossBookings : 0;

  // 5. Informational DC Lodging Tax (guests pay on top, Airbnb remits)
  const lodgingTaxAmount = 0.1595 * grossBookings;

  // Construct itemized breakdown for tables and charts
  const costItems: CostBreakdownItem[] = [
    {
      id: 'airbnbFee',
      label: "Airbnb Host Service Fee",
      monthly: airbnbFee,
      annual: airbnbFee * 12,
      pctOfGross: grossBookings > 0 ? airbnbFee / grossBookings : 0,
      howCalculated: `${(assumptions.hostFeePct * 100).toFixed(1)}% of gross bookings (simplified host-only fee)`,
      source: 'AirROI / Airbnb',
    },
    {
      id: 'cleaningCost',
      label: assumptions.cleanOption === 'cleaner' ? 'Turnover Cleaning Service' : 'Self-Cleaning (Your Labor)',
      monthly: cleaningCost,
      annual: cleaningCost * 12,
      pctOfGross: grossBookings > 0 ? cleaningCost / grossBookings : 0,
      howCalculated: assumptions.cleanOption === 'cleaner'
        ? `$${assumptions.cleaningCostAmount} / stay × ${staysCount.toFixed(2)} stays (offset by guest cleaning fee)`
        : '$0 paid to cleaner (you perform cleanings)',
      source: 'AirROI (Oct 2026)',
    },
    {
      id: 'utilitiesCost',
      label: 'Utilities & High-Speed Internet',
      monthly: utilitiesCost,
      annual: utilitiesCost * 12,
      pctOfGross: grossBookings > 0 ? utilitiesCost / grossBookings : 0,
      howCalculated: `${(assumptions.utilitiesPct * 100).toFixed(0)}% of gross bookings (guest electric, water, Wi-Fi share)`,
      source: 'AirROI',
    },
    {
      id: 'suppliesCost',
      label: 'Guest Consumables & Supplies',
      monthly: suppliesCost,
      annual: suppliesCost * 12,
      pctOfGross: grossBookings > 0 ? suppliesCost / grossBookings : 0,
      howCalculated: `${(assumptions.suppliesPct * 100).toFixed(0)}% of gross bookings (coffee, soaps, toiletries, paper goods)`,
      source: 'AirROI',
    },
    {
      id: 'repairsCost',
      label: 'Maintenance, Repairs & Linens',
      monthly: repairsCost,
      annual: repairsCost * 12,
      pctOfGross: grossBookings > 0 ? repairsCost / grossBookings : 0,
      howCalculated: `${(assumptions.repairsPct * 100).toFixed(0)}% of gross bookings (linen wear, touch-up paint, hardware)`,
      source: 'AirROI',
    },
    {
      id: 'managementCost',
      label: assumptions.managementType === 'self'
        ? 'Management (Self-Managed)'
        : assumptions.managementType === 'cohost'
        ? 'Co-Host Management'
        : 'Full-Service Property Management',
      monthly: managementCost,
      annual: managementCost * 12,
      pctOfGross: grossBookings > 0 ? managementCost / grossBookings : 0,
      howCalculated: `${(mgmtPct * 100).toFixed(0)}% of nightly bookings ($${Math.round(nightlyBookings)})`,
      source: 'AirROI',
    },
    {
      id: 'insuranceCost',
      label: 'Short-Term Rental Liability Insurance',
      monthly: insuranceCost,
      annual: assumptions.insuranceAnnual,
      pctOfGross: grossBookings > 0 ? insuranceCost / grossBookings : 0,
      howCalculated: `$${assumptions.insuranceAnnual} / 12 months ($250k DC mandated liability coverage)`,
      source: 'AirROI + DLCP',
    },
    {
      id: 'licenseCost',
      label: 'DC Short-Term / Vacation Rental License',
      monthly: licenseCost,
      annual: assumptions.licenseBiennial / 2,
      pctOfGross: grossBookings > 0 ? licenseCost / grossBookings : 0,
      howCalculated: `$${assumptions.licenseBiennial} / 24 months (DC DLCP official 2-year license fee)`,
      source: 'DC DLCP',
    },
  ];

  if (pricingToolsCost > 0) {
    costItems.push({
      id: 'pricingToolsCost',
      label: 'Dynamic Pricing Subscription',
      monthly: pricingToolsCost,
      annual: assumptions.pricingToolsAnnual,
      pctOfGross: grossBookings > 0 ? pricingToolsCost / grossBookings : 0,
      howCalculated: `$${assumptions.pricingToolsAnnual} / 12 months`,
      source: 'AirROI',
    });
  }

  return {
    nights: N,
    pricePerNight: P,
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
    annualNetBeforeHousing,
    costShareOfGross,
    costItems,
    lodgingTaxAmount,
  };
}

export interface ScenarioResult {
  id: string;
  title: string;
  badge: string;
  cleanOption: 'cleaner' | 'self';
  managementType: ManagementOption;
  monthlyNet: number;
  annualNet: number;
  monthlyCosts: number;
}

/**
 * Computes side-by-side scenario cards keeping N and P identical.
 */
export function calculateScenarios(
  nights: number,
  listingPrice: number,
  baseAssumptions: CostAssumptions
): ScenarioResult[] {
  // Scenario 1: You run it & clean
  const s1 = calculateMonthlyCosts(nights, listingPrice, {
    ...baseAssumptions,
    managementType: 'self',
    cleanOption: 'self',
  });

  // Scenario 2: You run it, hire cleaner
  const s2 = calculateMonthlyCosts(nights, listingPrice, {
    ...baseAssumptions,
    managementType: 'self',
    cleanOption: 'cleaner',
  });

  // Scenario 3: Co-host 10%
  const s3 = calculateMonthlyCosts(nights, listingPrice, {
    ...baseAssumptions,
    managementType: 'cohost',
    cleanOption: 'cleaner',
  });

  // Scenario 4: Full-service 20%
  const s4 = calculateMonthlyCosts(nights, listingPrice, {
    ...baseAssumptions,
    managementType: 'full',
    cleanOption: 'cleaner',
  });

  return [
    {
      id: 'self_clean',
      title: 'You run it & clean',
      badge: 'Maximum Profit',
      cleanOption: 'self',
      managementType: 'self',
      monthlyNet: s1.netBeforeHousing,
      annualNet: s1.annualNetBeforeHousing,
      monthlyCosts: s1.totalCosts,
    },
    {
      id: 'self_hire',
      title: 'You run it, hire cleaner',
      badge: 'Most Popular',
      cleanOption: 'cleaner',
      managementType: 'self',
      monthlyNet: s2.netBeforeHousing,
      annualNet: s2.annualNetBeforeHousing,
      monthlyCosts: s2.totalCosts,
    },
    {
      id: 'cohost_10',
      title: 'Co-host (10%)',
      badge: 'Balanced Hands-Off',
      cleanOption: 'cleaner',
      managementType: 'cohost',
      monthlyNet: s3.netBeforeHousing,
      annualNet: s3.annualNetBeforeHousing,
      monthlyCosts: s3.totalCosts,
    },
    {
      id: 'full_20',
      title: 'Full-service (20%)',
      badge: 'Fully Passive',
      cleanOption: 'cleaner',
      managementType: 'full',
      monthlyNet: s4.netBeforeHousing,
      annualNet: s4.annualNetBeforeHousing,
      monthlyCosts: s4.totalCosts,
    },
  ];
}

/**
 * Calculates payback months for one-time setup investment.
 */
export function calculateSetupPaybackMonths(
  totalSetupCost: number,
  monthlyNetProfit: number
): number | null {
  if (totalSetupCost <= 0 || monthlyNetProfit <= 0) return null;
  return totalSetupCost / monthlyNetProfit;
}
