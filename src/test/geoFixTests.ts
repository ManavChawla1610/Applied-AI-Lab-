/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  distanceMeters,
  formatSuggestionLabels,
  processGeocodeResults,
  validateDcAddress,
} from '../lib/geoUtils';
import { isWithinDcBounds } from '../components/AddressSearchPanel';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runGeoFixTests() {
  console.log('--- Starting Address Validation & Deduplication Unit Tests (FIX 2) ---\n');

  // Test 1: "3700 O St NW" (Georgetown University) -> accepted near (38.907, -77.072)
  console.log('Test 1: "3700 O St NW" (Georgetown University) is accepted and coordinates parsed');
  const georgetownRaw = [
    {
      place_id: 348336563,
      lat: '38.9089393',
      lon: '-77.0745796',
      display_name: 'Georgetown University, 3700, O Street Northwest, Georgetown, Ward 2, Washington, District of Columbia, 20057, United States',
      address: {
        amenity: 'Georgetown University',
        house_number: '3700',
        road: 'O Street Northwest',
        suburb: 'Georgetown',
        borough: 'Ward 2',
        city: 'Washington',
        state: 'District of Columbia',
        postcode: '20057',
        country: 'United States',
        country_code: 'us',
      },
    },
    {
      place_id: 348080022,
      lat: '38.9076096',
      lon: '-77.0722636',
      display_name: 'Bishop John Carroll, 3700, O Street Northwest, Georgetown, Ward 2, Washington, District of Columbia, 20057, United States',
      address: {
        tourism: 'Bishop John Carroll',
        house_number: '3700',
        road: 'O Street Northwest',
        suburb: 'Georgetown',
        borough: 'Ward 2',
        city: 'Washington',
        state: 'District of Columbia',
        postcode: '20057',
        country: 'United States',
        country_code: 'us',
      },
    },
  ];

  const processedGeorgetown = processGeocodeResults(georgetownRaw);
  assert(processedGeorgetown.length === 1, `Expected 1 deduplicated suggestion for 3700 O St NW, got ${processedGeorgetown.length}`);
  const gt = processedGeorgetown[0];
  assert(typeof gt.lat === 'number' && !isNaN(gt.lat), 'Latitude must be a valid number');
  assert(typeof gt.lng === 'number' && !isNaN(gt.lng), 'Longitude must be a valid number');
  assert(Math.abs(gt.lat - 38.908) < 0.01, `Latitude should be near 38.908, got ${gt.lat}`);
  assert(Math.abs(gt.lng - (-77.073)) < 0.01, `Longitude should be near -77.073, got ${gt.lng}`);
  assert(gt.shortLabel.includes('3700 O Street Northwest'), `Short label should be 3700 O Street Northwest, got '${gt.shortLabel}'`);
  assert(isWithinDcBounds(gt.lat, gt.lng), 'Georgetown coordinates must be inside DC bounds');
  console.log(`✓ Test 1 passed: 3700 O St NW accepted at lat ${gt.lat}, lng ${gt.lng} with label "${gt.shortLabel}"\n`);

  // Test 2: "225 7th St SE" (Eastern Market) -> accepted
  console.log('Test 2: "225 7th St SE" (Eastern Market) is accepted');
  const easternMarketRaw = [
    {
      place_id: 101,
      lat: '38.8856',
      lon: '-76.9959',
      display_name: 'Eastern Market, 225, 7th Street Southeast, Capitol Hill, Washington, District of Columbia, 20003, United States',
      address: {
        house_number: '225',
        road: '7th Street Southeast',
        neighbourhood: 'Capitol Hill',
        city: 'Washington',
        state: 'District of Columbia',
        country_code: 'us',
      },
    },
  ];
  const processedEM = processGeocodeResults(easternMarketRaw);
  assert(processedEM.length === 1, 'Eastern Market must produce 1 valid suggestion');
  assert(isWithinDcBounds(processedEM[0].lat, processedEM[0].lng), 'Eastern Market must be within DC');
  console.log(`✓ Test 2 passed: Eastern Market accepted at lat ${processedEM[0].lat}, lng ${processedEM[0].lng}\n`);

  // Test 3: "2100 Clarendon Blvd, Arlington, VA" -> rejected with "This app covers Washington, DC only."
  console.log('Test 3: "2100 Clarendon Blvd, Arlington, VA" is rejected as outside DC');
  const arlingtonRaw = [
    {
      place_id: 201,
      lat: '38.8904594',
      lon: '-77.0853969',
      display_name: 'Ellen M. Bozman Government Center, 2100, Clarendon Boulevard, Courthouse, Arlington, Virginia, 22201, United States',
      address: {
        house_number: '2100',
        road: 'Clarendon Boulevard',
        city: 'Arlington',
        state: 'Virginia',
        country_code: 'us',
      },
    },
  ];
  const valArlington = validateDcAddress(arlingtonRaw[0].address);
  assert(valArlington.isValid === false, 'Arlington, VA must fail validateDcAddress');
  assert(valArlington.reason.includes('Virginia'), `Rejection reason must mention Virginia, got: ${valArlington.reason}`);
  const processedArlington = processGeocodeResults(arlingtonRaw);
  assert(processedArlington.length === 0, 'No DC suggestions should be returned for Arlington');
  assert(processedArlington.outsideDc === true, 'outsideDc flag must be true');
  console.log(`✓ Test 3 passed: Arlington correctly flagged as outside DC: reason="${valArlington.reason}", outsideDc=${processedArlington.outsideDc}\n`);

  // Test 4: Query with 3 duplicate objects at same address -> 1 suggestion
  console.log('Test 4: Merging 3 duplicate objects at the same address into 1 suggestion');
  const triplicateRaw = [
    {
      place_id: 1,
      lat: '38.8900',
      lon: '-77.0000',
      display_name: 'Building A, 100, Pennsylvania Avenue Southeast, Capitol Hill, Washington, District of Columbia, 20003, United States',
      address: {
        house_number: '100',
        road: 'Pennsylvania Avenue Southeast',
        neighbourhood: 'Capitol Hill',
        city: 'Washington',
        state: 'District of Columbia',
        country_code: 'us',
      },
    },
    {
      place_id: 2,
      lat: '38.8901', // ~11 meters away
      lon: '-77.0001',
      display_name: 'Cafe at 100, Pennsylvania Avenue Southeast, Capitol Hill, Washington, District of Columbia, 20003, United States',
      address: {
        house_number: '100',
        road: 'Pennsylvania Avenue Southeast',
        neighbourhood: 'Capitol Hill',
        city: 'Washington',
        state: 'District of Columbia',
        country_code: 'us',
      },
    },
    {
      place_id: 3,
      lat: '38.8902', // ~22 meters away
      lon: '-77.0000',
      display_name: 'Atm at 100, Pennsylvania Avenue Southeast, Capitol Hill, Washington, District of Columbia, 20003, United States',
      address: {
        road: 'Pennsylvania Avenue Southeast', // missing house number
        neighbourhood: 'Capitol Hill',
        city: 'Washington',
        state: 'District of Columbia',
        country_code: 'us',
      },
    },
  ];
  const processedTriplicate = processGeocodeResults(triplicateRaw);
  assert(processedTriplicate.length === 1, `Expected 3 duplicate items to merge into 1, got ${processedTriplicate.length}`);
  assert(processedTriplicate[0].hasHouseNumber === true, 'Should prioritize item with house_number');
  assert(processedTriplicate[0].shortLabel === '100 Pennsylvania Avenue Southeast', `Expected '100 Pennsylvania Avenue Southeast', got '${processedTriplicate[0].shortLabel}'`);
  console.log(`✓ Test 4 passed: 3 duplicate POIs successfully merged into 1 suggestion: "${processedTriplicate[0].shortLabel}"\n`);

  // Test 5: Mocked result with lat "abc" -> error message, not "outside DC"
  console.log('Test 5: Mocked result with lat "abc" throws coordinate error (lookup error, not outside DC)');
  const invalidCoordRaw = [
    {
      place_id: 999,
      lat: 'abc',
      lon: '-77.0000',
      display_name: 'Invalid Place, Washington, District of Columbia',
      address: {
        road: 'Constitution Ave NW',
        city: 'Washington',
        state: 'District of Columbia',
        country_code: 'us',
      },
    },
  ];
  let threwExpectedError = false;
  try {
    processGeocodeResults(invalidCoordRaw);
  } catch (err: unknown) {
    threwExpectedError = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes('Invalid coordinates'), `Error should specify invalid coordinates, got: ${msg}`);
    console.log(`✓ Test 5 passed: Caught expected parsing error: "${msg}" (causes HTTP 502 lookup error, never "outside DC")\n`);
  }
  assert(threwExpectedError, 'Expected processGeocodeResults to throw on lat "abc"');

  console.log('========================================================');
  console.log('ALL FIX 2 GEOCODING TESTS PASSED SUCCESSFULLY! (5/5)');
  console.log('========================================================');
}

runGeoFixTests().catch((err) => {
  console.error('GeoFix test execution failed:', err);
  process.exit(1);
});
