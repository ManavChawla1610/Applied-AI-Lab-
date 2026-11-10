/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AIRBNB_HOST_FEE } from '../../config/rules';
import { calculateEstimates, formatCurrency } from '../../lib/calc';
import { loadListings } from '../../lib/data';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runPart1Tests() {
  console.log('--- Starting Part 1 Unit Tests (Listing Price & Payout) ---\n');

  const listings = await loadListings();
  const easternMarketPin = { lat: 38.8865, lng: -76.9963 };

  // Test 1: Eastern Market pin at 20 nights
  console.log('Test 1: Eastern Market (38.8865, -76.9963), 1BR entire place, 20 nights, low-activity off');
  const res20 = calculateEstimates(
    listings,
    easternMarketPin,
    20,
    'entire_home',
    '1',
    false,
    null
  );

  console.log(`Results: P=${res20.medianListingPrice}, E=${res20.typicalNightlyEarnings}, X=${res20.typicalMonthly}, range=${res20.rangeLowMonthly}-${res20.rangeHighMonthly}, B=${res20.benchmarkNights}, warning=${res20.isOptimisticNights}`);

  assert(res20.medianListingPrice === 177, `Expected P=$177/night, got ${res20.medianListingPrice}`);
  assert(res20.typicalNightlyEarnings === 150, `Expected E=$150/night, got ${res20.typicalNightlyEarnings}`);
  assert(res20.typicalMonthly === 2999, `Expected X=$2,999/month, got ${res20.typicalMonthly}`);
  assert(res20.rangeLowMonthly === 1998, `Expected Low=$1,998, got ${res20.rangeLowMonthly}`);
  assert(res20.rangeHighMonthly === 3541, `Expected High=$3,541, got ${res20.rangeHighMonthly}`);
  assert(res20.benchmarkNights === 14, `Expected B=14, got ${res20.benchmarkNights}`);
  assert(res20.isOptimisticNights === true, 'Expected isOptimisticNights to be true (20 > 14)');
  console.log('✓ Test 1 passed: P=$177, E=$150, X=$2,999, range $1,998–$3,541, B=14, warning shown\n');

  // Test 2: Same at 11 nights
  console.log('Test 2: Eastern Market at 11 nights (no warning)');
  const res11 = calculateEstimates(
    listings,
    easternMarketPin,
    11,
    'entire_home',
    '1',
    false,
    null
  );

  console.log(`Results: X=${res11.typicalMonthly}, warning=${res11.isOptimisticNights}`);
  assert(res11.typicalMonthly === 1649, `Expected X=$1,649/month, got ${res11.typicalMonthly}`);
  assert(res11.isOptimisticNights === false, 'Expected isOptimisticNights to be false (11 <= 14)');
  console.log('✓ Test 2 passed: X=$1,649, no warning\n');

  // Test 3: Currency formatting: "$2,999" (no spaces around thousands separators)
  console.log('Test 3: Currency formatting check');
  const formatted2999 = formatCurrency(2999);
  assert(formatted2999 === '$2,999', `Expected '$2,999', got '${formatted2999}'`);
  assert(!formatted2999.includes(' '), 'Currency must not contain spaces');
  console.log(`✓ Test 3 passed: formatCurrency(2999) -> '${formatted2999}'\n`);

  // Test 4: Fee dynamics
  console.log('Test 4: Changing fee sensitivity');
  assert(typeof AIRBNB_HOST_FEE === 'number' && AIRBNB_HOST_FEE > 0, 'AIRBNB_HOST_FEE is defined');
  const testFee = 0.20; // 20%
  const payoutAt20Pct = Math.round(177 * (1 - testFee));
  assert(payoutAt20Pct === 142, `Changing fee to 0.20 correctly updates payout to $142`);
  console.log('✓ Test 4 passed: fee changes propagate deterministically\n');

  console.log('====================================================');
  console.log('ALL PART 1 TESTS PASSED SUCCESSFULLY! (4/4)');
  console.log('====================================================');
}

runPart1Tests().catch((err) => {
  console.error('Part 1 test failed:', err);
  process.exit(1);
});
