/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DC_VIEWBOX,
  MIN_QUERY_LENGTH,
  NOMINATIM_BASE_URL,
  NOMINATIM_USER_AGENT,
} from './config/geo';
import { processGeocodeResults, ValidatedSuggestion } from './src/lib/geoUtils';
import { DC_RULES } from './config/dcRules';
import { DC_MARKET } from './config/market';
import { DEFAULT_COST_ITEMS } from './config/costs';
import { verifyReplyNumbers } from './src/lib/aiVerify';

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

async function fetchFromNominatimWithThrottle(query: string): Promise<any[]> {
  const now = Date.now();
  const timeSinceLast = now - lastUpstreamCallTime;
  if (timeSinceLast < 1000) {
    await sleep(1000 - timeSinceLast);
  }
  lastUpstreamCallTime = Date.now();

  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    countrycodes: 'us',
    limit: '10',
    addressdetails: '1',
    viewbox: DC_VIEWBOX,
    bounded: '0',
  });

  const url = `${NOMINATIM_BASE_URL}?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': NOMINATIM_USER_AGENT,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim error: HTTP ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Server-side Geocoding Endpoint
app.get('/api/geocode', async (req: Request, res: Response): Promise<void> => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  if (!query || query.length < MIN_QUERY_LENGTH) {
    res.json([]);
    return;
  }

  const normalizedQuery = query.toLowerCase();

  // 1. Check in-memory cache
  if (geocodeCache.has(normalizedQuery)) {
    res.json(geocodeCache.get(normalizedQuery));
    return;
  }

  try {
    // 2. Query upstream Nominatim with rate-limit throttling
    const rawResults = await fetchFromNominatimWithThrottle(query);

    // 3. Process, validate, deduplicate (address-based validation & 50m / addressKey merging)
    const validatedSuggestions = processGeocodeResults(rawResults || []);

    if (validatedSuggestions.outsideDc && validatedSuggestions.length === 0) {
      res.json({
        outsideDc: true,
        error: 'outside_dc',
        message: 'This app covers Washington, DC only.',
        suggestions: [],
      });
      return;
    }

    // 4. Save to cache
    geocodeCache.set(normalizedQuery, validatedSuggestions);

    res.json(validatedSuggestions);
  } catch (err: unknown) {
    console.error('Geocoding failure:', err);
    // Guard: invalid coordinates from geocoder treated as lookup error, not "outside DC"
    res.status(502).json({
      error: 'Lookup error: could not resolve coordinates for address',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

// Grounded AI Endpoint: Ask about hosting in DC (3 source tiers & Google Search fallback)
app.post(['/api/ask-ai', '/api/ask', '/api/ask-rules'], async (req: Request, res: Response): Promise<void> => {
  const userQuestion = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
  if (!userQuestion) {
    res.status(400).json({ error: 'Question is required' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      available: false,
      error: 'AI is not configured',
    });
    return;
  }

  // Sanitize userScenario: never send the typed street address to Gemini, replace with neighborhood only
  const rawScenario = req.body?.userScenario || {};
  const sanitizedScenario = {
    ...rawScenario,
    location: rawScenario.neighborhood || rawScenario.location || 'Washington, DC',
  };
  delete (sanitizedScenario as any).address;
  delete (sanitizedScenario as any).streetAddress;
  delete (sanitizedScenario as any).customLabel;

  // Tier 1 Context JSON
  const contextObj = {
    userScenario: sanitizedScenario,
    dcRules: DC_RULES,
    market: DC_MARKET,
    costs: DEFAULT_COST_ITEMS,
  };
  const contextJson = JSON.stringify(contextObj, null, 2);

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You help a Washington, DC homeowner deciding whether to list on Airbnb. Answer in under 150 words, in plain language.
Use sources in this order: (1) the provided JSON of the user's results and the app's verified rules and market data; (2) the official DLCP page; (3) Google Search, only if (1) and (2) don't answer it.
Start every answer with a source tag: [Your results], [DC rules – DLCP], [Market data – AirROI], or [Web search].
When you use a number, name where it came from. Do not recalculate the user's results — restate them from the JSON.
If a web source disagrees with the DLCP page or the app's data, say so and treat the DLCP page as authoritative for rules.
Never give legal, tax or financial advice; for those, suggest DLCP (202) 221-8550 or a tax professional.
Never ask for or repeat the user's street address.`;

    const prompt = `Tier 1 App Context JSON:
${contextJson}

Tier 2 Official Reference Document:
Official DC DLCP Short-Term Rental Regulations: https://dlcp.dc.gov/page/operating-short-term-rental-district-columbia

Homeowner Question:
${userQuestion}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.1,
        // Tier 3: Search grounding fallback tool
        tools: [{ googleSearch: {} }],
      },
    });

    const answerText = response.text || '';

    // Extract grounding citations from metadata
    const groundingChunks = (response.candidates?.[0]?.groundingMetadata as any)?.groundingChunks || [];
    const citedLinks: { uri: string; title: string }[] = [];
    for (const chunk of groundingChunks) {
      if (chunk.web?.uri) {
        citedLinks.push({
          uri: chunk.web.uri,
          title: chunk.web.title || chunk.web.uri,
        });
      }
    }

    // Run post-check against context numbers
    const { hasUnverifiedNumber, unverifiedNumbers } = verifyReplyNumbers(answerText, contextObj);

    res.json({
      available: true,
      answer: answerText,
      citedLinks,
      hasUnverifiedNumber,
      unverifiedNumbers,
    });
  } catch (err: unknown) {
    console.error('Server-side Gemini error:', err);
    const errMsg = String((err as any)?.message || '');
    let userFacingError = 'AI answers are unavailable right now — every number in the other tabs still works.';

    if (
      errMsg.includes('429') ||
      errMsg.toLowerCase().includes('quota') ||
      errMsg.includes('RESOURCE_EXHAUSTED')
    ) {
      userFacingError = 'AI quota reached — try again later';
    } else if (
      errMsg.includes('API_KEY_INVALID') ||
      errMsg.includes('403') ||
      errMsg.includes('unauthorized')
    ) {
      userFacingError = 'AI is not configured';
    } else if (errMsg.includes('404') || errMsg.toLowerCase().includes('model')) {
      userFacingError = 'AI model error — service unavailable';
    }

    res.json({
      available: false,
      error: userFacingError,
    });
  }
});
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
