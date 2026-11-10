/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DcRuleItem {
  id: string;
  text: string;
  value?: number;
  sourceUrl: string;
  lastVerified: string;
}

export const DC_RULES_SOURCE_URL = 'https://dlcp.dc.gov/page/operating-short-term-rental-district-columbia';
export const DC_RULES_LAST_VERIFIED = '2026-11-09';

const makeRule = (id: string, text: string, value?: number): DcRuleItem => ({
  id,
  text,
  value,
  sourceUrl: DC_RULES_SOURCE_URL,
  lastVerified: DC_RULES_LAST_VERIFIED,
});

export const DC_RULES = {
  // License Types
  licenseTypes: {
    shortTermRental: makeRule(
      'license_str_present',
      'Short-Term Rental license: host is PRESENT in the home during guest stays (e.g., renting out a bedroom or basement while you are home). There is no limit on the number of stays per calendar year.'
    ),
    vacationRental: makeRule(
      'license_vr_absent',
      'Vacation Rental license: host is ABSENT (e.g., renting your entire home while you are away). Capped at a maximum of 90 nights per calendar year (cumulative), unless an exemption is granted.',
      90
    ),
    dualLicenseNote: makeRule(
      'license_both',
      'A host renting both ways needs both licenses. One license covers all rooms rented separately in the home.'
    ),
  },

  // Stay duration and caps
  maxContinuousNights: makeRule(
    'stay_max_continuous',
    'Maximum continuous stay is 30 nights for each booking across all short-term rental licenses.',
    30
  ),
  vacationRentalAnnualCap: makeRule(
    'cap_vacation_annual',
    'Vacation Rental license allows up to 90 cumulative nights per calendar year without an approved exemption.',
    90
  ),
  maxOccupancy: makeRule(
    'occupancy_max_rule',
    'Maximum occupancy is the greater of 8 guests or 2 guests per bedroom.',
    8
  ),

  // Eligibility Rules
  eligibility: {
    naturalPerson: makeRule(
      'elig_natural_person',
      'Host must be a natural person (individual). LLCs, partnerships, trusts, and corporations cannot obtain a DC host license.'
    ),
    homesteadPrimary: makeRule(
      'elig_homestead_primary',
      'Property must be owned by an individual and be their primary residence (eligible for the DC Homestead Tax Deduction).'
    ),
    accessoryUnits: makeRule(
      'elig_accessory_units',
      'English basements, in-law suites, and accessory units count as part of the primary residence if the owner receives the Homestead deduction for the property.'
    ),
    noInvestments: makeRule(
      'elig_no_investments',
      'Investment properties and corporately owned properties are strictly ineligible for short-term rental licensing in DC.'
    ),
    habitableAttestation: makeRule(
      'elig_habitable',
      'Owner must self-attest that the property is habitable and compliant with DC property maintenance standards.'
    ),
    condoHoa: makeRule(
      'elig_condo_hoa',
      'Condo/co-op/HOA: governing documents must permit short-term rentals, not prohibit them, or the association board must provide written permission (attestation required).'
    ),
    cleanHands: makeRule(
      'elig_clean_hands',
      'Must be eligible for a DC Certificate of Clean Hands: not eligible if owing the District government more than $1,000 in fees, fines, taxes or penalties, or if required DC tax returns were not filed.',
      1000
    ),
  },

  // Exemption to 90-night cap
  exemption90Night: {
    employer: makeRule(
      'exemption_employer',
      'Employer Exemption: host, or host\'s spouse/domestic partner, is required by their employer to work outside DC for more than 90 cumulative days in the calendar year.',
      90
    ),
    health: makeRule(
      'exemption_health',
      'Healthcare Exemption: host must leave DC for more than 90 cumulative days for treatment of a serious health condition, or to care for an immediate family member receiving treatment.',
      90
    ),
    steps: makeRule(
      'exemption_steps',
      'Exemption application steps: (1) Hold an active Vacation Rental license; (2) Sign in to BOSS.dc.gov → Dashboard → find license; (3) Click Actions → "Apply for Exemption"; (4) Submit Vacation Rental Exemption Application and upload the employer or healthcare affidavit.'
    ),
    reviewTime: makeRule(
      'exemption_review_time',
      'Exemption review time is 2–3 business days online via BOSS.dc.gov.'
    ),
  },

  // Fees and term
  fees: {
    licenseFee: makeRule(
      'fee_license_total',
      '$99 total for either license ($99 for Short-Term Rental, $99 for Vacation Rental, or $198 if obtaining both).',
      99
    ),
    termYears: makeRule(
      'term_license_years',
      'License is valid for a term of 2 years before renewal.',
      2
    ),
  },

  // Application Steps
  applicationSteps: [
    makeRule('step_access_dc', '1. Create or sign in to your Access DC account.'),
    makeRule('step_boss_apply', '2. Go to boss.dc.gov → "New Business License" → select Short-Term Rental and/or Vacation Rental.'),
    makeRule('step_insurance', '3. Upload proof of liability insurance of at least $250,000 (provided by booking platforms like Airbnb or through private insurance policy).', 250000),
    makeRule('step_clean_hands', '4. Confirm Clean Hands eligibility (certificate must be in the property owner\'s name).'),
    makeRule('step_hoa_attestation', '5. Submit condo/co-op/HOA attestation confirming short-term rentals are permitted.'),
    makeRule('step_self_certify', '6. Self-certify compliance with the DC Housing Code and Property Maintenance Code (no in-person pre-license inspection).'),
    makeRule('step_pay_fee', '7. Pay the $99 license fee.', 99),
  ],

  // Safety Requirements
  safetyRequirements: [
    makeRule('safety_egress', 'Unobstructed exit (egress) from all sleeping quarters and living areas.'),
    makeRule('safety_smoke_detectors', 'Working smoke detectors installed on every level and in/near sleeping areas.'),
    makeRule('safety_co_detectors', 'Working carbon monoxide detectors installed per DC building code.'),
    makeRule('safety_fire_extinguisher', 'Accessible, fully charged portable fire extinguisher.'),
    makeRule('safety_emergency_phone', 'A 24-hour emergency telephone number reaching the host or designated local representative.'),
  ],

  // Operating Rules
  operatingRules: [
    makeRule('op_post_license', 'Post the physical license visibly inside the rental unit.'),
    makeRule('op_listing_number', 'Include your official DC license number in every public listing description.'),
    makeRule('op_record_keeping', 'Keep comprehensive records of every guest booking for at least 2 years.', 2),
    makeRule('op_transient_tax', 'Transient lodging taxes must be paid (Airbnb collects and remits DC transient lodging taxes automatically on hosts\' behalf).'),
    makeRule('op_ineligible_cancel', 'If a booking is made for an ineligible property, the owner and platform are required to cancel it.'),
  ],

  // Parking
  parking: makeRule(
    'parking_rules',
    'No off-street parking space is required. Guests may park on public streets subject to standard DC residential parking regulations. Note that short-term guests do NOT qualify for the annual DC Visitor Parking Pass.'
  ),

  // Contacts
  contacts: {
    hotline: makeRule('contact_hotline', 'DC DLCP Short-Term Rental Hotline: (202) 221-8550'),
    lookup: makeRule('contact_lookup', 'DC license verification lookup: visit boss.dc.gov → Search → "Global Search".'),
  },

  // Document references (all link directly to DLCP official guide page)
  documents: [
    makeRule('doc_str_guide', 'DLCP Short-Term Rental Guide'),
    makeRule('doc_employer_affidavit', 'Employer Affidavit VRE'),
    makeRule('doc_health_affidavit', 'Healthcare Affidavit VRE'),
    makeRule('doc_vre_form', 'Vacation Rental Exemption Application Form'),
    makeRule('doc_otr_faqs', 'OTR Rental Property FAQs 2023'),
  ],

  // Regulatory banner
  banner: makeRule(
    'disclaimer_banner',
    `DC's short-term rental rules may change — a 2026 amendment bill has been proposed. Rules last verified ${DC_RULES_LAST_VERIFIED}. Always confirm with DLCP.`
  ),
};
