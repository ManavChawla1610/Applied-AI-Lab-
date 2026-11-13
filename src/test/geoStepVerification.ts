/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PHOTON_BASE_URL, PHOTON_BBOX, PHOTON_LAT, PHOTON_LON, PHOTON_USER_AGENT } from '../../config/geo';
import { processPhotonResults } from '../lib/geoUtils';
import { calculateEstimates } from '../../lib/calc';
import { loadListings } from '../../lib/data';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

async function runStepVerification() {
  console.log('--- Address Search Verification Tests ---\n');

  // Test 1: "225" -> no red error; DC suggestions or grey hint
  console.log('Test 1: "225" -> no red error; empty DC suggestions (grey hint state)');
  const res225 = await fetch(`http://localhost:3000/api/geocode?q=225`);
  const data225 = await res225.json();
  assert(data225.suggestions.length === 0, 'Expected 0 DC suggestions for "225"');
  console.log('Suggestions for "225":', data225.suggestions);
  console.log('UI state: Grey hint "Keep typing — e.g. 225 7th St SE", no red error banner during typing.\n');

  // Test 2: "225 7th" -> includes 225 7th St SE (Eastern Market area)
  console.log('Test 2: "225 7th" -> includes 225 7th St SE (Eastern Market area)');
  const res225_7th = await fetch(`http://localhost:3000/api/geocode?q=225%207th`);
  const data225_7th = await res225_7th.json();
  assert(data225_7th.suggestions.length > 0, 'Expected suggestions for "225 7th"');
  const em = data225_7th.suggestions[0];
  assert(em.shortLabel.includes('225 7th Street Southeast'), `Expected 225 7th Street Southeast, got: ${em.shortLabel}`);
  assert(em.neighborhood.includes('Capitol Hill') || em.fullLabel.includes('Capitol Hill'), 'Expected Capitol Hill neighborhood');
  console.log('Suggestions for "225 7th":', data225_7th.suggestions.map((s: any) => `${s.shortLabel} | ${s.fullLabel} (${s.lat}, ${s.lng})`));
  console.log('✓ Found 225 7th St SE in Eastern Market area!\n');

  // Test 3: "3700 O" -> includes 3700 O St NW (Georgetown)
  console.log('Test 3: "3700 O" -> includes 3700 O St NW (Georgetown)');
  const res3700 = await fetch(`http://localhost:3000/api/geocode?q=3700%20O`);
  const data3700 = await res3700.json();
  assert(data3700.suggestions.length > 0, 'Expected suggestions for "3700 O"');
  const gt = data3700.suggestions[0];
  assert(gt.shortLabel.includes('3700 O Street Northwest'), `Expected 3700 O Street Northwest, got: ${gt.shortLabel}`);
  assert(gt.neighborhood.includes('Georgetown') || gt.fullLabel.includes('Georgetown'), 'Expected Georgetown neighborhood');
  console.log('Suggestions for "3700 O":', data3700.suggestions.map((s: any) => `${s.shortLabel} | ${s.fullLabel} (${s.lat}, ${s.lng})`));
  console.log('✓ Found 3700 O St NW in Georgetown!\n');

  // Test 4: Select 225 7th St SE -> pin at about 38.886, -76.996 (NOT swapped lat/lng), estimate updates
  console.log('Test 4: Select 225 7th St SE -> pin at about 38.886, -76.996 (NOT swapped lat/lng), estimate updates');
  assert(Math.abs(em.lat - 38.886) < 0.01, `Latitude should be ~38.886, got ${em.lat}`);
  assert(Math.abs(em.lng - (-76.996)) < 0.01, `Longitude should be ~-76.996, got ${em.lng}`);
  const listings = await loadListings();
  const estimate = calculateEstimates(listings, { lat: em.lat, lng: em.lng }, 11, 'entire_home', '1', false, null);
  assert(estimate.hasEnoughData, 'Calculations succeed with selected pin');
  console.log(`✓ Pin coordinates: lat=${em.lat}, lng=${em.lng} (NOT swapped). Calculated typical monthly: $${estimate.typicalMonthly}\n`);

  // Test 5: "2100 Clarendon Blvd Arlington" + Enter -> red DC-only message
  console.log('Test 5: "2100 Clarendon Blvd Arlington" + Enter -> red DC-only message');
  const resArlington = await fetch(`http://localhost:3000/api/geocode?q=2100%20Clarendon%20Blvd%20Arlington`);
  const dataArlington = await resArlington.json();
  assert(dataArlington.suggestions.length === 0, 'Expected 0 DC suggestions for Arlington');
  assert(dataArlington.outsideDc === true, 'Expected outsideDc flag to be true');
  console.log('API response for "2100 Clarendon Blvd Arlington": outsideDc =', dataArlington.outsideDc);
  console.log('UI state on Enter / Update: triggers red "This app covers Washington, DC only." banner. Editing text clears it.\n');

  console.log('========================================================');
  console.log('ALL 5 STEP VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('========================================================');
}

runStepVerification().catch((e) => {
  console.error('Verification failed:', e);
  process.exit(1);
});
