/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Test-only network mock. Preload it to run the server offline:
 *   GEMINI_API_KEY=test npx tsx --import ./src/test/mockNetwork.ts server.ts
 * It fakes Photon (address search) and the Gemini API so the full app can be tested
 * without internet access or an API key. Never imported by the app itself.
 */

const realFetch = globalThis.fetch;
export const geminiCalls: { model: string; usedSearch: boolean; json: boolean }[] = [];
let forced429 = 0;

function photonFeature(lon: number, lat: number, props: Record<string, unknown>) {
  return { type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: props };
}

const DC = { city: 'Washington', state: 'District of Columbia', countrycode: 'US' };

function photonResponse(q: string, bboxApplied: boolean) {
  const text = q.toLowerCase();
  const features: unknown[] = [];
  if (text.includes('225')) {
    features.push(
      photonFeature(-76.9963, 38.8865, { ...DC, osm_id: 1, osm_key: 'building', housenumber: '225', street: '7th Street Southeast', district: 'Capitol Hill' }),
      // duplicate of the same address (different OSM object) — must be merged
      photonFeature(-76.99632, 38.88651, { ...DC, osm_id: 2, osm_key: 'place', housenumber: '225', street: '7th Street Southeast', district: 'Capitol Hill' }),
      photonFeature(-77.0216, 38.8952, { ...DC, osm_id: 3, osm_key: 'building', housenumber: '225', street: '7th Street Northwest', district: 'Penn Quarter' })
    );
    if (!bboxApplied) {
      features.push(photonFeature(-77.12, 38.88, { osm_id: 4, housenumber: '225', street: 'N Glebe Rd', city: 'Arlington', state: 'Virginia', countrycode: 'US' }));
    }
  } else if (text.includes('3700 o')) {
    features.push(photonFeature(-77.0723, 38.9076, { ...DC, osm_id: 5, osm_key: 'building', housenumber: '3700', street: 'O Street Northwest', district: 'Georgetown' }));
  } else if (text.includes('clarendon')) {
    if (!bboxApplied) {
      features.push(photonFeature(-77.0866, 38.8895, { osm_id: 6, housenumber: '2100', street: 'Clarendon Boulevard', city: 'Arlington', state: 'Virginia', countrycode: 'US' }));
    }
  }
  return { type: 'FeatureCollection', features };
}

function geminiResponse(body: any, model: string) {
  const usedSearch = Array.isArray(body?.tools) && body.tools.some((t: any) => t.googleSearch || t.google_search);
  const json = body?.generationConfig?.responseMimeType === 'application/json';
  const contents = body?.contents || [];
  const lastUser = contents[contents.length - 1]?.parts?.[0]?.text || '';
  geminiCalls.push({ model, usedSearch, json });
  console.log(`[mock gemini] model=${model} search=${usedSearch} json=${json} q="${lastUser.slice(0, 60)}"`);

  if (lastUser.includes('FORCE429') && forced429 < 2) {
    forced429++;
    return new Response(JSON.stringify({ error: { code: 429, message: 'Resource exhausted', status: 'RESOURCE_EXHAUSTED' } }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let text: string;
  let grounding: unknown = undefined;
  if (usedSearch) {
    text = 'Airbnb income is generally taxable. Keep records of your income and costs, and check with a tax professional about how to report it.';
    grounding = { groundingChunks: [{ web: { uri: 'https://www.irs.gov/', title: 'irs.gov' } }] };
  } else if (/tax/i.test(lastUser)) {
    text = JSON.stringify({ answerable_from_sources: false, answer: '', sources_used: [] });
  } else {
    text = JSON.stringify({
      answerable_from_sources: true,
      answer:
        "Airbnb keeps a 15.5% host fee from each booking, so at your listing price you'd receive less per night. That's why your payout is lower than the price guests see.",
      sources_used: ['userScenario', 'costs'],
    });
  }
  return new Response(
    JSON.stringify({
      candidates: [{ content: { role: 'model', parts: [{ text }] }, finishReason: 'STOP', groundingMetadata: grounding }],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

globalThis.fetch = (async (input: any, init?: any) => {
  const url = typeof input === 'string' ? input : input?.url || String(input);
  if (url.startsWith('https://photon.komoot.io')) {
    const u = new URL(url);
    return new Response(JSON.stringify(photonResponse(u.searchParams.get('q') || '', u.searchParams.has('bbox'))), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (url.includes('generativelanguage.googleapis.com')) {
    const model = (url.match(/models\/([^:]+):/) || [])[1] || 'unknown';
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    return geminiResponse(body, model);
  }
  return realFetch(input, init);
}) as typeof fetch;

console.log('[mockNetwork] Photon and Gemini are mocked for testing');
