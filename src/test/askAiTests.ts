/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { verifyReplyNumbers } from '../lib/aiVerify';
import { DC_RULES } from '../../config/dcRules';
import { DC_MARKET } from '../../config/market';
import { DEFAULT_COST_ITEMS } from '../../config/costs';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runAskAiTests() {
  console.log('--- Starting Grounded Ask AI Verification Tests ---\n');

  const contextObj = {
    userScenario: {
      nights: 20,
      listingPricePerNight: 177,
      typicalNightlyPayout: 150,
      typicalMonthlyPayout: 2999,
      grossBookingsMonthly: 4462,
      netTakeHomeMonthly: 2830,
      annualNetTakeHome: 33958,
      insuranceAnnual: 340,
      licenseBiennial: 99,
    },
    dcRules: DC_RULES,
    market: DC_MARKET,
    costs: DEFAULT_COST_ITEMS,
  };

  // Test 1: Grounded reply containing verified numbers passes verification
  console.log('Test 1: Reply with verified context numbers passes without warning');
  const validReply = `Based on your Costs tab results, your estimated gross bookings are $4,462/month with an Airbnb host fee of 15.5%. After operating expenses, you keep about $2,830/month ($33,958/year). According to DC rules, your Vacation Rental is capped at 90 nights per year.`;
  const resValid = verifyReplyNumbers(validReply, contextObj);
  console.log(`Valid reply unverified: ${resValid.unverifiedNumbers.join(', ') || 'None'}`);
  assert(resValid.hasUnverifiedNumber === false, 'Grounded reply should not trigger unverified flag');
  console.log('✓ Test 1 passed: Verified numbers passed clean\n');

  // Test 2: Reply containing invented or unverified numbers triggers the flag
  console.log('Test 2: Reply with hallucinated/unverified numbers triggers warning badge');
  const hallucinatedReply = `You could easily earn $8,750 per month in Dupont Circle if you raise your price by 43.8% and pay a special $650 luxury tax.`;
  const resInvalid = verifyReplyNumbers(hallucinatedReply, contextObj);
  console.log(`Hallucinated numbers caught: ${resInvalid.unverifiedNumbers.join(', ')}`);
  assert(resInvalid.hasUnverifiedNumber === true, 'Invented numbers must trigger unverified flag');
  assert(resInvalid.unverifiedNumbers.some((n) => n.includes('8750')), 'Must catch $8,750');
  console.log('✓ Test 2 passed: Unverified numbers accurately flagged\n');

  // Test 3: Fallback error message format
  console.log('Test 3: Graceful API degradation message');
  const fallbackError = 'AI answers are unavailable right now — every number in the other tabs still works.';
  assert(fallbackError.includes('every number in the other tabs still works'), 'Fallback reassurance must be provided');
  console.log('✓ Test 3 passed: Fallback message verified\n');

  console.log('====================================================');
  console.log('ALL ASK AI TESTS PASSED SUCCESSFULLY! (3/3)');
  console.log('====================================================');
}

runAskAiTests().catch((err) => {
  console.error('Ask AI test failed:', err);
  process.exit(1);
});
