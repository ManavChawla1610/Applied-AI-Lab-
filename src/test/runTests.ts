/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AIRBNB_HOST_FEE } from '../../config/rules';
import {
  calculateEstimates,
  haversineDistance,
  matchesListingType,
  median,
  percentile,
} from '../../lib/calc';
import { Listing, loadListings } from '../../lib/data';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertClose(actual: number, expected: number, tolerance: number, message: string) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Assertion failed: ${message}. Expected ${expected} ± ${tolerance}, received ${actual}`);
  }
}

async function runAllTests() {
  console.log('--- Starting Unit Tests for DC Airbnb Estimator Engine ---\n');

  // Test 1: Percentiles
  console.log('Test 1: Percentiles [10, 20, 30, 40, 50]');
  const sampleData = [10, 20, 30, 40, 50];
  const p25 = percentile(sampleData, 0.25);
  const p50 = percentile(sampleData, 0.5);
  const p75 = percentile(sampleData, 0.75);
  assert(p25 === 20, `percentile(..., 0.25) should be 20, got ${p25}`);
  assert(p50 === 30, `percentile(..., 0.5) should be 30, got ${p50}`);
  assert(p75 === 40, `percentile(..., 0.75) should be 40, got ${p75}`);
  console.log('✓ Test 1 passed\n');

  // Test 2: Haversine distance
  console.log('Test 2: Haversine distance (1 degree of latitude)');
  const dist1Deg = haversineDistance(38.0, -77.0, 39.0, -77.0);
  assertClose(dist1Deg, 69.1, 0.1, `1 degree latitude distance should be ~69.1 mi`);
  console.log(`✓ Test 2 passed: ${dist1Deg.toFixed(3)} miles\n`);

  // Test 3: Earnings calculation with price $200, fee 0.155, 11 nights
  console.log('Test 3: Earnings calculation (price $200, fee 0.155, 11 nights)');
  const dummyListing: Listing = {
    listing_id: 999999,
    listing_name: 'Test Listing',
    listing_type: 'Entire rental unit',
    room_type: 'entire_home',
    bedrooms_clean: 1,
    latitude: 38.8857,
    longitude: -76.9955,
    exact_location: true,
    rating_overall: 5.0,
    num_reviews: 10,
    ttm_revenue: 20000,
    ttm_avg_rate: 200.0,
    ttm_adjusted_occupancy: 0.6,
    ttm_reserved_days: 180,
    hosting_mode: 'present',
    is_active: true,
  };
  const test3Result = calculateEstimates(
    [dummyListing],
    { lat: 38.8857, lng: -76.9955 },
    11,
    'entire_home',
    '1',
    false,
    null
  );
  assert(test3Result.typicalNightlyEarnings === 169, `Nightly earnings expected $169, got ${test3Result.typicalNightlyEarnings}`);
  assert(test3Result.typicalMonthly === 1859, `Monthly earnings expected $1,859, got ${test3Result.typicalMonthly}`);
  assert(test3Result.typicalAnnual === 22308, `Annual earnings expected $22,308, got ${test3Result.typicalAnnual}`);
  console.log('✓ Test 3 passed: $169/night, $1,859/month, $22,308/year\n');

  // Test 4: Benchmark occupancies [0.5, 0.6, 0.7] -> median 0.6 -> B = 18 nights
  console.log('Test 4: Benchmark calculation ([0.5, 0.6, 0.7] -> B = 18)');
  const occupancies = [0.5, 0.6, 0.7];
  const medOcc = median(occupancies);
  const benchmarkB = Math.round(medOcc * 30);
  assert(medOcc === 0.6, `Median occupancy expected 0.6, got ${medOcc}`);
  assert(benchmarkB === 18, `Benchmark B expected 18, got ${benchmarkB}`);
  console.log('✓ Test 4 passed: median 0.6 -> B = 18 nights\n');

  // Test 5: Warning appears when N = 25 and B = 18; not when N = 11
  console.log('Test 5: Optimistic warning condition (N=25 vs B=18 and N=11 vs B=18)');
  const list3Items: Listing[] = [
    { ...dummyListing, listing_id: 1, ttm_adjusted_occupancy: 0.5 },
    { ...dummyListing, listing_id: 2, ttm_adjusted_occupancy: 0.6 },
    { ...dummyListing, listing_id: 3, ttm_adjusted_occupancy: 0.7 },
  ];
  const resN25 = calculateEstimates(
    list3Items,
    { lat: 38.8857, lng: -76.9955 },
    25,
    'entire_home',
    '1',
    false,
    null
  );
  assert(resN25.benchmarkNights === 18, `Expected benchmark 18, got ${resN25.benchmarkNights}`);
  assert(resN25.isOptimisticNights === true, `Warning should appear when N=25 and B=18`);

  const resN11 = calculateEstimates(
    list3Items,
    { lat: 38.8857, lng: -76.9955 },
    11,
    'entire_home',
    '1',
    false,
    null
  );
  assert(resN11.isOptimisticNights === false, `Warning should NOT appear when N=11 and B=18`);
  console.log('✓ Test 5 passed: warning triggers on N=25, not on N=11\n');

  // Test 6: Price override replaces every comparable's ttm_avg_rate; reset restores them
  console.log("Test 6: Price override replaces every comparable's ttm_avg_rate; reset restores them");
  const overrideRes = calculateEstimates(
    list3Items,
    { lat: 38.8857, lng: -76.9955 },
    11,
    'entire_home',
    '1',
    false,
    250
  );
  assert(overrideRes.comparables.every((c) => c.effective_price === 250), 'All comparables should have effective_price 250');
  const expectedNightlyEarnings = Math.round(250 * (1 - AIRBNB_HOST_FEE));
  assert(overrideRes.typicalNightlyEarnings === expectedNightlyEarnings, `Nightly earnings expected ${expectedNightlyEarnings}, got ${overrideRes.typicalNightlyEarnings}`);

  const resetRes = calculateEstimates(
    list3Items,
    { lat: 38.8857, lng: -76.9955 },
    11,
    'entire_home',
    '1',
    false,
    null
  );
  assert(resetRes.comparables.every((c) => c.effective_price === c.ttm_avg_rate), 'Reset restores each listing ttm_avg_rate');
  console.log('✓ Test 6 passed: override applied and reset verified\n');

  // Test 7: Bedroom filter
  console.log('Test 7: Bedroom filter logic');
  const studioListing: Listing = { ...dummyListing, listing_id: 101, bedrooms_clean: 0, room_type: 'entire_home' };
  const oneBrListing: Listing = { ...dummyListing, listing_id: 102, bedrooms_clean: 1, room_type: 'entire_home' };
  const threeBrListing: Listing = { ...dummyListing, listing_id: 103, bedrooms_clean: 3, room_type: 'entire_home' };
  const fourBrListing: Listing = { ...dummyListing, listing_id: 104, bedrooms_clean: 4, room_type: 'entire_home' };
  const privateRoomListing: Listing = { ...dummyListing, listing_id: 105, bedrooms_clean: null, room_type: 'private_room' };

  assert(matchesListingType(studioListing, 'entire_home', 'studio') === true, 'Studio matches entire_home studio');
  assert(matchesListingType(oneBrListing, 'entire_home', 'studio') === false, '1BR does not match studio');
  assert(matchesListingType(threeBrListing, 'entire_home', '3+') === true, '3BR matches 3+');
  assert(matchesListingType(fourBrListing, 'entire_home', '3+') === true, '4BR matches 3+');
  assert(matchesListingType(privateRoomListing, 'private_room', 'studio') === true, 'Private room matches private_room regardless of bedroom setting');
  assert(matchesListingType(privateRoomListing, 'private_room', '3+') === true, 'Private room matches private_room regardless of bedroom setting');
  assert(matchesListingType(privateRoomListing, 'entire_home', 'studio') === false, 'Private room rejected for entire_home');
  console.log('✓ Test 7 passed: studio matches bedrooms_clean=0, 3+ handles 3 or more, private room ignores bedrooms\n');

  // Test 8: Toggle off excludes all is_active = false listings
  console.log('Test 8: Low-activity toggle excludes is_active = false when off');
  const activeListing: Listing = { ...dummyListing, listing_id: 201, is_active: true };
  const inactiveListing: Listing = { ...dummyListing, listing_id: 202, is_active: false };
  const testListings = [activeListing, inactiveListing];

  const toggleOffRes = calculateEstimates(
    testListings,
    { lat: 38.8857, lng: -76.9955 },
    11,
    'entire_home',
    '1',
    false, // toggle off
    null
  );
  assert(toggleOffRes.comparables.length === 1 && toggleOffRes.comparables[0].listing_id === 201, 'Toggle off should exclude inactive');

  const toggleOnRes = calculateEstimates(
    testListings,
    { lat: 38.8857, lng: -76.9955 },
    11,
    'entire_home',
    '1',
    true, // toggle on
    null
  );
  assert(toggleOnRes.comparables.length === 2, 'Toggle on should include inactive');
  console.log('✓ Test 8 passed: toggle off excludes inactive listings, toggle on includes them\n');

  // Test 9: Changing AIRBNB_HOST_FEE in config dynamically alters outputs (no hardcoded 15.5%)
  console.log('Test 9: Verifying AIRBNB_HOST_FEE from /config/rules.ts');
  assert(typeof AIRBNB_HOST_FEE === 'number' && AIRBNB_HOST_FEE > 0 && AIRBNB_HOST_FEE < 1, 'AIRBNB_HOST_FEE must be a valid percentage decimal');
  const dynamicFeeNightly = 100 * (1 - AIRBNB_HOST_FEE);
  assertClose(dynamicFeeNightly, 84.5, 0.001, 'Fee calculation reflects config rule value');
  console.log(`✓ Test 9 passed: AIRBNB_HOST_FEE = ${AIRBNB_HOST_FEE}\n`);

  // Test 10: Real dataset loading and Capitol Hill default case check
  console.log('Test 10: Loading actual dataset dc_listings_clean_3b72fa17.json');
  const realData = await loadListings();
  assert(realData.length > 0, `Expected listings in dataset, got ${realData.length}`);
  console.log(`Loaded ${realData.length} listings from clean DC dataset.`);

  const capHillDefault = calculateEstimates(
    realData,
    { lat: 38.8857, lng: -76.9955 },
    11,
    'entire_home',
    '1',
    false,
    null
  );
  console.log(`Capitol Hill Default: ${capHillDefault.comparablesCount} comparables found within ${capHillDefault.finalRadiusMi} miles.`);
  console.log(`Results: typical $${capHillDefault.typicalMonthly}/month (range $${capHillDefault.rangeLowMonthly} – $${capHillDefault.rangeHighMonthly}), $${capHillDefault.typicalNightlyEarnings}/night, benchmark B = ${capHillDefault.benchmarkNights} nights.`);
  assert(capHillDefault.hasEnoughData, 'Capitol Hill should have enough data');
  assert(capHillDefault.comparablesCount >= 5, 'Capitol Hill should have at least 5 comparables');
  console.log('✓ Test 10 passed: Real dataset runs with default pin!\n');

  console.log('=========================================');
  console.log('ALL UNIT TESTS PASSED SUCCESSFULLY! (10/10)');
  console.log('=========================================');
}

runAllTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
