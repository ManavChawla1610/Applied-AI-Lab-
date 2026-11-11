/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AIRBNB_HOST_FEE } from './rules.ts';
import { DC_RULES } from './dcRules.ts';

export type CostItemType = 'pctGross' | 'pctNightly' | 'perStay' | 'annual' | 'biennial';

export interface CostItemConfig {
  id: string;
  label: string;
  type: CostItemType;
  default: number;
  note: string;
  source: string;
  isIncome?: boolean;
  isInformational?: boolean;
}

export const DC_LODGING_TAX_RATE = 0.1595;

export const DEFAULT_COST_ITEMS: Record<string, CostItemConfig> = {
  airbnbHostFee: {
    id: 'airbnbHostFee',
    label: 'Airbnb Host Fee',
    type: 'pctGross',
    default: AIRBNB_HOST_FEE, // Reused from rules.ts (0.155)
    note: 'Simplified Pricing (host-only fee); used by ~90% of DC listings',
    source: 'AirROI / Airbnb Help Center',
  },
  cleaningFeeCharged: {
    id: 'cleaningFeeCharged',
    label: 'Cleaning Fee Charged to Guests',
    type: 'perStay',
    default: 120,
    note: 'Median DC cleaning fee guests pay (income that offsets cleaning costs)',
    source: 'AirROI (Oct 2026)',
    isIncome: true,
  },
  cleaningCost: {
    id: 'cleaningCost',
    label: 'Cleaning Cost Paid',
    type: 'perStay',
    default: 120,
    note: 'Paid by the cleaning fee; $0 if you clean yourself',
    source: 'AirROI (Oct 2026)',
  },
  utilitiesInternet: {
    id: 'utilitiesInternet',
    label: 'Utilities & Internet',
    type: 'pctGross',
    default: 0.05,
    note: 'Electric, gas, water, high-speed Wi-Fi share (~5% of gross)',
    source: 'AirROI',
  },
  guestSupplies: {
    id: 'guestSupplies',
    label: 'Guest Supplies',
    type: 'pctGross',
    default: 0.02,
    note: 'Toiletries, coffee, paper goods, welcome amenities (~2% of gross)',
    source: 'AirROI',
  },
  repairsUpkeep: {
    id: 'repairsUpkeep',
    label: 'Repairs & Upkeep',
    type: 'pctGross',
    default: 0.03,
    note: 'Includes linens, small replacements, maintenance (~3% of gross)',
    source: 'AirROI',
  },
  strInsurance: {
    id: 'strInsurance',
    label: 'Short-Term Rental Insurance',
    type: 'annual',
    default: 340,
    note: "Short-term rental policy on top of Airbnb's free AirCover; DC requires at least $250,000 liability coverage",
    source: 'AirROI + DLCP',
  },
  dcLicense: {
    id: 'dcLicense',
    label: 'DC Host License',
    type: 'biennial',
    default: DC_RULES.fees.licenseFee.value || 99, // Read from dcRules.ts
    note: "Some market reports list $170/year; DC's official fee is $99 for 2 years ($4.13/month).",
    source: 'DC Department of Licensing and Consumer Protection (DLCP)',
  },
  management: {
    id: 'management',
    label: 'Property Management',
    type: 'pctNightly',
    default: 0, // Options: Self-managed 0, Co-host 0.10, Full-service 0.20
    note: 'Self-managed (0%), Co-host (10%), or Full-service (20%) of nightly bookings',
    source: 'AirROI',
  },
  pricingTools: {
    id: 'pricingTools',
    label: 'Dynamic Pricing Tools',
    type: 'annual',
    default: 0,
    note: "Optional; Airbnb's own smart pricing tools are free",
    source: 'AirROI',
  },
  lodgingTax: {
    id: 'lodgingTax',
    label: 'DC Transient Lodging Tax',
    type: 'pctGross',
    default: DC_LODGING_TAX_RATE,
    note: "Added to the guest's bill and remitted by Airbnb. Informational only, $0 cost to host.",
    source: 'DLCP / AirROI',
    isInformational: true,
  },
};

export type ManagementOption = 'self' | 'cohost' | 'full';

export interface CostAssumptions {
  managementType: ManagementOption;
  customManagementPct?: number; // if override
  cleanOption: 'cleaner' | 'self';
  chargeCleaningFee: boolean;
  cleaningFeeAmount: number;
  cleaningCostAmount: number;
  hostFeePct: number;
  utilitiesPct: number;
  suppliesPct: number;
  repairsPct: number;
  insuranceAnnual: number;
  licenseBiennial: number;
  pricingToolsAnnual: number;
}

export const INITIAL_COST_ASSUMPTIONS: CostAssumptions = {
  managementType: 'self',
  cleanOption: 'cleaner',
  chargeCleaningFee: true,
  cleaningFeeAmount: DEFAULT_COST_ITEMS.cleaningFeeCharged.default,
  cleaningCostAmount: DEFAULT_COST_ITEMS.cleaningCost.default,
  hostFeePct: DEFAULT_COST_ITEMS.airbnbHostFee.default,
  utilitiesPct: DEFAULT_COST_ITEMS.utilitiesInternet.default,
  suppliesPct: DEFAULT_COST_ITEMS.guestSupplies.default,
  repairsPct: DEFAULT_COST_ITEMS.repairsUpkeep.default,
  insuranceAnnual: DEFAULT_COST_ITEMS.strInsurance.default,
  licenseBiennial: DEFAULT_COST_ITEMS.dcLicense.default,
  pricingToolsAnnual: DEFAULT_COST_ITEMS.pricingTools.default,
};
