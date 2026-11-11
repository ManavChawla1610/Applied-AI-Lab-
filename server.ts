/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DC_CENTER,
  DC_PHOTON_BBOX,
  DC_VIEWBOX,
  GEOCODER_USER_AGENT,
  MIN_QUERY_LENGTH,
  NOMINATIM_BASE_URL,
  PHOTON_BASE_URL,
} from './config/geo.ts';
import { photonFeaturesToRaw, processGeocodeResults, validateDcAddress } from './src/lib/geoUtils.ts';
import type { NominatimRawItem, ValidatedSuggestion } from './src/lib/geoUtils.ts';
import { registerAskRoute } from './src/server/askRoute.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// In-memory cache by query string
const geocodeCache = new Map<string, ValidatedSuggestion[]>();

// Rate-limiting throttle: at most 1 upstream request per 1000ms
let lastUpstreamCallTime = 0;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttleNominatim() {
  const timeSinceLast = Date.now() - lastUpstreamCallTime;
  if (timeSinceLast < 1000) {
    await sleep(1000 - timeSinceLast);
  }
  lastUpstreamCallTime = Date.now();
}

/** Photon search. `restrictToDc` limits results to the DC bounding box. Returns Nominatim-shaped items. */
async function fetchFromPhoton(query: string, restrictToDc: boolean): Promise<NominatimRawItem[]> {
  const params = new URLSearchParams({
    q: query,
    limit: '10',
    lang: 'en',
    lat: String(DC_CENTER.lat),
    lon: String(DC_CENTER.lng),
  });
  if (restrictToDc) params.set('bbox', DC_PHOTON_BBOX);

  const response = await fetch(`${PHOTON_BASE_URL}?${params.toString()}`, {
    headers: { 'User-Agent': GEOCODER_USER_AGENT, Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Photon error: HTTP ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return photonFeaturesToRaw(data?.features || []);
}

/** Nominatim fallback, bounded to DC, with ", Washington, DC" appended to the query. */
async function fetchFromNominatim(query: string): Promise<NominatimRawItem[]> {
  await throttleNominatim();
  const params = new URLSearchParams({
    q: `${query}, Washington, DC`,
    format: 'jsonv2',
    countrycodes: 'us',
    limit: '10',
    addressdetails: '1',
    viewbox: DC_VIEWBOX,
    bounded: '1',
  });
  const response = await fetch(`${NOMINATIM_BASE_URL}?${params.toString()}`, {
    headers: { 'User-Agent': GEOCODER_USER_AGENT, Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Nominatim error: HTTP ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Server-side Geocoding Endpoint.
 * - Normal (typing): returns { suggestions } containing ONLY DC addresses. Never an "outside DC" error.
 * - check=1 (user pressed Enter with no suggestions): searches without the DC box and
 *   reports outsideDc=true only if the text clearly resolves to a place outside DC.
 */
app.get('/api/geocode', async (req: Request, res: Response): Promise<void> => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const isCheck = req.query.check === '1';

  if (!query || query.length < MIN_QUERY_LENGTH) {
    res.json({ suggestions: [] });
    return;
  }

  if (isCheck) {
    try {
      const raw = await fetchFromPhoton(query, false);
      const dcSuggestions = processGeocodeResults(raw.slice(0, 5));
      const top = raw[0];
      const topIsDc = top ? validateDcAddress(top.address).isValid : false;
      console.log(`[Geocode check] q="${query}" results=${raw.length} topState='${top?.address?.state || ''}' dcMatches=${dcSuggestions.length}`);
      res.json({
        suggestions: dcSuggestions,
        outsideDc: Boolean(top) && !topIsDc && dcSuggestions.length === 0,
      });
    } catch (err) {
      console.error('Geocode check failure:', err);
      res.status(502).json({ error: 'unavailable' });
    }
    return;
  }

  const cacheKey = query.toLowerCase();
  const cached = geocodeCache.get(cacheKey);
  if (cached) {
    res.json({ suggestions: cached, source: 'cache' });
    return;
  }

  let source = 'photon';
  let raw: NominatimRawItem[] = [];
  try {
    raw = await fetchFromPhoton(query, true);
  } catch (photonErr) {
    console.error('Photon failed, falling back to Nominatim:', photonErr);
    source = 'nominatim';
    try {
      raw = await fetchFromNominatim(query);
    } catch (nominatimErr) {
      console.error('Nominatim fallback failed:', nominatimErr);
      res.status(502).json({ error: 'unavailable' });
      return;
    }
  }

  try {
    const suggestions: ValidatedSuggestion[] = Array.from(processGeocodeResults(raw));
    console.log(`[Geocode] q="${query}" source=${source} raw=${raw.length} dc=${suggestions.length}`);
    geocodeCache.set(cacheKey, suggestions);
    res.json({ suggestions, source });
  } catch (err) {
    // Invalid coordinates from the geocoder are a lookup error, never "outside DC"
    console.error('Geocode processing failure:', err);
    res.status(502).json({ error: 'unavailable' });
  }
});

// Ask AI endpoint (guardrailed two-step Gemini flow) lives in src/server/askRoute.ts
registerAskRoute(app);

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT} (dev mode: ${isDev})`);
  });
}

startServer();
