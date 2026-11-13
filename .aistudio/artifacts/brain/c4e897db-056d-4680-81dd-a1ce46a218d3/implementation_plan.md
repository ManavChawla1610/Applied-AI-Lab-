# On-Demand Neighborhood & Address Earnings Estimation in Chat (`estimate_earnings`)

Upgrade the floating **Questions?** chat assistant so it can compute exact, comparable-based Airbnb earnings estimates for any Washington, DC neighborhood, landmark, or street address on demand using server-side Gemini function calling (`estimate_earnings`) and the homepage's exact calculation engine (`/lib/calc.ts`), without modifying `/lib/calc.ts` or any homepage numbers.

## User Review & Critical Decisions

> [!IMPORTANT]
> - **Zero Calculation Drift**: The server-side `estimate_earnings` tool calls `calculateEstimates` directly from `/lib/calc.ts` with the exact same dataset and radius/comparable rules as the homepage, ensuring that clicking **"Show this on the map"** produces a homepage headline that matches the chat's monthly payout number down to the dollar.
> - **Multi-Place Comparisons**: When a user compares two or more DC neighborhoods (e.g., *"Compare Dupont Circle and Capitol Hill"*), each successful `estimate_earnings` call surfaces its own **"Show this on the map"** button (labeled clearly when multiple places are returned) so the user can jump the homepage map to either place.

---

## 1. Overview & Core Concept

- **What It Does**: Empowers the chat assistant to invoke an `estimate_earnings` function whenever a homeowner asks what a specific DC neighborhood, landmark, or address could earn, or asks to compare multiple DC locations.
- **Target Audience**: Washington, DC homeowners exploring or comparing potential Airbnb earnings across different DC neighborhoods, room types, bedroom counts, or hosting frequencies.
- **Key Value**: Eliminates generic citywide answers for location-specific questions and connects chat answers directly to the interactive homepage map via a one-click **"Show this on the map"** action.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Single-Location Estimate**: User asks *"How much could a 1-bedroom in Dupont Circle make?"* → Server runs `estimate_earnings(place="Dupont Circle", bedrooms="1")`, geocodes `"Dupont Circle"` via Photon (DC bounding box + DC filter), fills missing parameters (`entire_home`, current `nights`) as `assumed`, runs `calculateEstimates`, and replies with the monthly payout, typical range, nightly price and payout after fee, comparable count, and assumed settings.
  2. **"Show this on the map" Synchronization**: Directly beneath the assistant's estimate bubble, a compact **"Show this on the map"** button appears. Clicking it updates the homepage pin (`lat`, `lng`, `place_label`), `spaceType`, `bedrooms`, `nights`, and resets `priceOverride` to `null` so the homepage headline matches the chat's monthly estimate exactly.
  3. **Multi-Neighborhood Comparison**: User asks *"Compare Dupont Circle and Capitol Hill"* → Gemini invokes `estimate_earnings` for both neighborhoods (up to 3 tool calls per turn) and presents a side-by-side conversational comparison.
  4. **Out-of-Bounds Location**: User asks *"What could a 2-bedroom in Arlington make?"* → Tool returns `{ error: "not_in_dc_or_not_found", place: "Arlington" }` and the assistant explains that the app covers Washington, DC only.
  5. **Web Grounding Fallback (`NEEDS_WEB`)**: If neither the precomputed context JSON nor `estimate_earnings` can answer (e.g., federal tax reporting rules or AirCover damage protection details), Gemini replies with `NEEDS_WEB`, triggering a single grounded web search call that renders up to 2 official source links from grounding metadata.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Server-Side Function Execution + Exact `/lib/calc.ts` Reuse**
  - *Chosen Approach*: Execute geocoding and `calculateEstimates` inside the Express `/api/ask-ai` route and send only the sanitized summary object back to Gemini (excluding listing IDs, names, host details, and exact coordinates), while passing the resolved pin coordinates and filter settings to the frontend in a separate response field (`mapActions`) for the **"Show this on the map"** button.
  - *Why*: Guarantees privacy (no coordinates or listing IDs sent to the LLM) while enabling the UI button to move the homepage pin to the exact geocoded point used in the calculation.
- **Decision 2: Single-Call Function Loop + `NEEDS_WEB` Sentinel**
  - *Chosen Approach*: Call 1 provides the 5-section context JSON plus the `estimate_earnings` tool declaration (`functionDeclarations`), allowing up to 3 tool calls before requiring a final text response. Only if the model outputs `NEEDS_WEB` does the server make a second grounded web call.
  - *Why*: Avoids unnecessary web searches on local DC estimation questions and adheres strictly to the required tool-calling architecture.

---

## 4. Technical Architecture & Data Strategy

```
┌──────────────────────────────────────────────────────────────────────────┐
│                 Floating "Questions?" Chat Widget (Client)               │
│  • Sends { question, history (last 6), userScenario } to POST /api/ask-ai│
│  • Renders assistant answer + "Show this on the map" button              │
│  • Clicking "Show this on the map" updates App pin, spaceType, bedrooms, │
│    nights, and clears priceOverride so headline matches chat $X          │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ POST /api/ask-ai
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     Express Server Route (server.ts)                     │
│  1. Call 1: Gemini (gemini-3.5-flash-lite, fallback gemini-3.8-flash)    │
│     • System Instruction (with estimate_earnings & NEEDS_WEB rules)      │
│     • Context JSON (userScenario, dcRules, listingData, marketData,costs)│
│     • Tool: functionDeclarations: [estimate_earnings]                    │
│                                                                          │
│  2. Tool Loop (up to 3 calls per question):                              │
│     ├─ a) Geocode `place` via Photon + processPhotonResults (DC filter)  │
│     │     • If 0 DC results → { error: "not_in_dc_or_not_found", place } │
│     ├─ b) Fill missing space_type, bedrooms, nights_per_month from       │
│     │     user's current homepage settings; record in `assumed: [...]`   │
│     ├─ c) Run calculateEstimates(listings, {lat, lng}, nights, ...)      │
│     │     directly from /lib/calc.ts (priceOverride = null)              │
│     └─ d) Return sanitized tool payload to Gemini (no coords/IDs/names)  │
│           & record { lat, lng, place_label, ... } for UI map button      │
│                                                                          │
│  3. Web Fallback (ONLY if Call 1 text === "NEEDS_WEB"):                  │
│     └─ Grounded web call → extract up to 2 links from groundingChunks    │
└──────────────────────────────────────────────────────────────────────────┘
```
