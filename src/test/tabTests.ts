/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { calculateEstimates } from '../../lib/calc';
import { loadListings } from '../../lib/data';
import { TABS_CONFIG } from '../components/tabs/TabBar';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTabTests() {
  console.log('--- Starting Tab Structure & State Invariance Tests ---\n');

  // Test 1: Verify the 3 core tabs and hash configuration (Ask AI is now a bottom chatbot widget)
  console.log('Test 1: Verify Tab Configuration');
  assert(TABS_CONFIG.length === 3, 'Must have 3 core estimation tabs');
  assert(TABS_CONFIG[0].id === 'earnings' && TABS_CONFIG[0].hash === '#earnings', 'Tab 1 is Earnings (#earnings)');
  assert(TABS_CONFIG[1].id === 'costs' && TABS_CONFIG[1].hash === '#costs', 'Tab 2 is Costs & Profit (#costs)');
  assert(TABS_CONFIG[2].id === 'legal' && TABS_CONFIG[2].hash === '#legal', 'Tab 3 is Legal & Setup (#legal)');
  console.log('✓ Test 1 passed: All 3 tabs and URL hashes configured in correct order\n');

  // Test 2: Invariance of First Fold Earnings Calculations
  console.log('Test 2: First Fold Earnings Numbers Invariance');
  const listings = await loadListings();
  const easternMarketPin = { lat: 38.8865, lng: -76.9963 };

  const res20 = calculateEstimates(
    listings,
    easternMarketPin,
    20,
    'entire_home',
    '1',
    false,
    null
  );

  console.log(`Eastern Market 1BR 20 nights: P=${res20.medianListingPrice}, E=${res20.typicalNightlyEarnings}, X=${res20.typicalMonthly}`);
  assert(res20.medianListingPrice === 177, `Expected P=$177/night, got ${res20.medianListingPrice}`);
  assert(res20.typicalNightlyEarnings === 150, `Expected E=$150/night, got ${res20.typicalNightlyEarnings}`);
  assert(res20.typicalMonthly === 2999, `Expected X=$2,999/month, got ${res20.typicalMonthly}`);
  assert(res20.rangeLowMonthly === 1998, `Expected Low=$1,998, got ${res20.rangeLowMonthly}`);
  assert(res20.rangeHighMonthly === 3541, `Expected High=$3,541, got ${res20.rangeHighMonthly}`);
  assert(res20.benchmarkNights === 14, `Expected B=14, got ${res20.benchmarkNights}`);
  console.log('✓ Test 2 passed: First-fold numbers remain 100% identical and undisturbed after tab restructure\n');

  console.log('====================================================');
  console.log('ALL TAB STRUCTURE TESTS PASSED SUCCESSFULLY! (2/2)');
  console.log('====================================================');
}

runTabTests().catch((err) => {
  console.error('Tab test failed:', err);
  process.exit(1);
});
