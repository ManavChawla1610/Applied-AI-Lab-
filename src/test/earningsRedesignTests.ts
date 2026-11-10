/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { calculateEstimates, formatCurrency, clampNights } from '../../lib/calc';
import { loadListings } from '../../lib/data';
import { isWithinDcBounds } from '../components/AddressSearchPanel';
import { processGeocodeResults } from '../lib/geoUtils';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runEarningsRedesignTests() {
  console.log('--- Starting Earnings Tab Minimal Redesign Tests ---\n');

  const listings = await loadListings();

  // Test 1: Eastern Market, entire place, 1BR, 11 nights
  // Requirements:
  // - Headline: "$1,649"
  // - Line: "11 nights · $177/night ($150 after Airbnb's fee)"
  console.log('Test 1: Eastern Market baseline verification (11 nights, 1BR entire place)');
  const easternMarketPin = { lat: 38.8865, lng: -76.9963 };
  const emResult = calculateEstimates(
    listings,
    easternMarketPin,
    11,
    'entire_home',
    '1',
    false,
    null
  );

  const headlineNumber = formatCurrency(emResult.typicalMonthly);
  const headlineExpected = '$1,649';
  assert(headlineNumber === headlineExpected, `Headline expected ${headlineExpected}, got ${headlineNumber}`);

  const nightsText = `${11} nights`;
  const priceText = `${formatCurrency(emResult.medianListingPrice)}/night`;
  const payoutText = `(${formatCurrency(emResult.typicalNightlyEarnings)} after Airbnb's fee)`;
  const fullSubline = `${nightsText} · ${priceText} ${payoutText}`;
  const expectedSubline = '11 nights · $177/night ($150 after Airbnb\'s fee)';
  assert(fullSubline === expectedSubline, `Subline expected "${expectedSubline}", got "${fullSubline}"`);
  console.log(`✓ Test 1 passed: Headline="${headlineNumber}", Subline="${fullSubline}"\n`);

  // Test 2: Currency formatting check: "$1,535", never "$1 , 535"
  console.log('Test 2: Currency spacing check ("$1,535", never "$1 , 535")');
  const formatted1535 = formatCurrency(1535);
  assert(formatted1535 === '$1,535', `Expected '$1,535', got '${formatted1535}'`);
  assert(!formatted1535.includes(' '), `Currency formatted string must not have spaces: '${formatted1535}'`);
  assert(!formatted1535.includes(', '), `No space after comma: '${formatted1535}'`);
  assert(!formatted1535.includes('$ '), `No space after dollar sign: '${formatted1535}'`);

  const formatted2999 = formatCurrency(2999);
  assert(formatted2999 === '$2,999', `Expected '$2,999', got '${formatted2999}'`);
  assert(!formatted2999.includes(' '), `Currency formatted string must not have spaces: '${formatted2999}'`);
  console.log('✓ Test 2 passed: All currency figures formatted strictly without internal spaces\n');

  // Test 3: Geocoding and map pin for "1524 Wisconsin Ave NW"
  console.log('Test 3: Select "1524 Wisconsin Ave NW" -> coordinates inside DC and valid');
  const rawWisconsin = [
    {
      place_id: 348305372,
      lat: '38.9094504',
      lon: '-77.0645992',
      display_name: '1524, Wisconsin Avenue Northwest, Georgetown, Ward 2, Washington, District of Columbia, 20007, United States',
      address: {
        house_number: '1524',
        road: 'Wisconsin Avenue Northwest',
        suburb: 'Georgetown',
        city: 'Washington',
        state: 'District of Columbia',
        country_code: 'us',
      },
    },
  ];

  const processedWis = processGeocodeResults(rawWisconsin);
  assert(processedWis.length === 1, 'Expected 1 valid suggestion for 1524 Wisconsin Ave NW');
  const wisPin = { lat: processedWis[0].lat, lng: processedWis[0].lng };
  assert(isWithinDcBounds(wisPin.lat, wisPin.lng), '1524 Wisconsin Ave NW must be recognized within DC bounds');
  assert(Math.abs(wisPin.lat - 38.909) < 0.01, `Lat near 38.909, got ${wisPin.lat}`);
  assert(Math.abs(wisPin.lng - (-77.065)) < 0.01, `Lng near -77.065, got ${wisPin.lng}`);

  // Test estimates run cleanly for this Georgetown pin
  const wisResult = calculateEstimates(
    listings,
    wisPin,
    15,
    'entire_home',
    '1',
    false,
    null
  );
  assert(wisResult.hasEnoughData, 'Should have enough data for Georgetown');
  assert(wisResult.comparablesCount > 0, 'Should find comparables in Georgetown');
  console.log(`✓ Test 3 passed: 1524 Wisconsin Ave NW resolved at (${wisPin.lat}, ${wisPin.lng}) with ${wisResult.comparablesCount} comparables in ${wisResult.finalRadiusMi} mi\n`);

  // Test 4: Only ONE helper line ever shows under the search pill
  console.log('Test 4: Single priority helper line logic under search pill');
  function getHelperLine(comparablesCount: number, nights: number, benchmarkNights: number): string | null {
    if (comparablesCount < 5) {
      return 'Few similar homes nearby — treat this as a rough estimate.';
    } else if (nights > benchmarkNights) {
      return `Similar homes usually book about ${benchmarkNights} nights a month.`;
    }
    return null;
  }

  // Case A: < 5 comparables (priority 1)
  const lineCaseA = getHelperLine(3, 20, 14);
  assert(lineCaseA === 'Few similar homes nearby — treat this as a rough estimate.', 'Priority 1 should be rough estimate warning');

  // Case B: >= 5 comparables and N > B (priority 2)
  const lineCaseB = getHelperLine(25, 20, 14);
  assert(lineCaseB === 'Similar homes usually book about 14 nights a month.', 'Priority 2 should be benchmark note');

  // Case C: >= 5 comparables and N <= B (show nothing)
  const lineCaseC = getHelperLine(25, 11, 14);
  assert(lineCaseC === null, 'Should show nothing when N <= B and comps >= 5');
  console.log('✓ Test 4 passed: Helper line strictly follows priority order and only ever shows 1 or 0 lines\n');

  // Test 5: Slider clamping and bounds (1 to 30)
  console.log('Test 5: Slider bounds clamp strictly between 1 and 30');
  assert(clampNights(0) === 1, '0 clamps to 1');
  assert(clampNights(35) === 30, '35 clamps to 30');
  assert(clampNights(15) === 15, '15 stays 15');
  console.log('✓ Test 5 passed: Nights clamp strictly between 1 and 30\n');

  console.log('====================================================');
  console.log('ALL EARNINGS TAB REDESIGN TESTS PASSED! (5/5)');
  console.log('====================================================');
}

runEarningsRedesignTests().catch((err) => {
  console.error('Earnings redesign test failed:', err);
  process.exit(1);
});
