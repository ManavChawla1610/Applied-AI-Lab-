# Minimal Airbnb-Style Earnings Tab Redesign

A complete visual and architectural layout redesign of the Earnings tab to match Airbnb's minimal, whitespace-forward design language. One dominant headline number on screen with zero visual clutter; all secondary controls, benchmarks, and data details accessible via lightweight modal dialogs.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> This is a **layout and presentation change only**. No calculation logic in `/lib/calc.ts` or `/lib/costs.ts` will be altered. All existing data and verified figures remain accessible in dedicated modals.

- **Confirmed Decision 1: Pure Typography & No Monospace**: All fonts use standard sans-serif (`font-sans`). Numeric figures strictly use `font-variant-numeric: tabular-nums` and `letter-spacing: normal`, eliminating the `"$1 , 535"` spacing anomaly.
- **Confirmed Decision 2: Single Helper Line Priority**: Beneath the search pill, at most **one** small muted line will render. If comparables < 5, it shows `"Few similar homes nearby — treat this as a rough estimate."`. Otherwise, if $N > B$, it displays `"Similar homes usually book about [B] nights a month."`. No boxed banners or stacked warnings.
- **Confirmed Decision 3: Map Auto-Fitting**: On initial load and whenever location updates, Leaflet will fit its viewport to the search-radius circle around the home pin (`fitBounds` with padding), keeping the home pin centered and nearby rate bubbles visible, without zooming out to the entire regional bounding box.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms the dense multi-panel estimator into a clean, spacious two-column experience on desktop (45% left / 55% right) and stacked flow on mobile (headline and search on top, interactive map directly below).
- **Key Value**: Delivers immediate clarity on potential earnings with a single focal number, while empowering users to fine-tune nights, address, space type, bedrooms, custom pricing, and methodology in focused modals.

---

## 2. User Experience & Visual Design

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  DC Host Calculator                [1 · Earnings]  [2 · Costs]  [3 · Legal]  [4 · Ask] │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│ LEFT COLUMN (45% Desktop)                 │ RIGHT COLUMN (55% Desktop)                 │
│                                           │                                            │
│  Your home could make                     │  ┌──────────────────────────────────────┐  │
│  $1,535 on Airbnb                         │  │ [Explore rates near you]             │  │
│                                           │  │                                      │  │
│  11 nights · $177/night                   │  │         ($165)        ($185)         │  │
│  ($150 after Airbnb's fee)                │  │                                      │  │
│                                           │  │                 [⌂] Home             │  │
│  Learn how we estimate earnings           │  │                                      │  │
│                                           │  │          ($150)        ($210)        │  │
│  [─────●───────────────────────] (slider) │  │                                      │  │
│                                           │  │                               [+]    │  │
│  🔍 Capitol Hill · Entire place · 1 bed   │  │                               [-]    │  │
│  Similar homes usually book ~14 nights    │  └──────────────────────────────────────┘  │
│                                           │                                            │
│  See what you'd keep after costs →        │                                            │
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

### Left Column Flow (Desktop 45%, Mobile Stacked)
1. **Headline Number**:
   - `Your home could make $[X] on Airbnb` (where $X$ = median monthly payout `typicalMonthly`).
   - Clean, large typography (`text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900`).
   - Stripped of `/month`, `about`, `DC`, and the range.
2. **Pricing & Nights Line**:
   - `[N] nights · $[P]/night` with small muted note: `($[E] after Airbnb's fee)`.
   - `[N] nights` is underlined and triggers the **"How many nights?"** modal.
3. **Methodology Link**:
   - `Learn how we estimate earnings` (underlined link, opening the comprehensive **"How we estimate your earnings"** modal).
4. **Nights Slider**:
   - Clean minimal slider (1–30), no tick labels, no secondary text. Smooth live updates to headline.
5. **Search Pill**:
   - Full-width rounded card: `🔍 [place label] · [Entire place | Private room] · [Studio | N bed(s)]`.
   - Clicking opens the **"Tell us about your home"** configuration modal.
6. **Single Priority Helper Line**:
   - Priority 1: If `< 5` comparables: `"Few similar homes nearby — treat this as a rough estimate."`
   - Priority 2: If $N > B$: `"Similar homes usually book about [B] nights a month."`
   - Otherwise empty (clean whitespace).
7. **Costs Tab Link**:
   - Subtle text link: `"See what you'd keep after costs →"` jumping to the Costs tab.

### Right Column Flow (Desktop 55%, Mobile Below Pill)
- Full-height rounded container with subtle border (`rounded-3xl overflow-hidden border border-gray-200`).
- Floating pill at top center: `"Explore rates near you"`.
- Clean white price bubbles for comparables (`"$165"`), subtle hover/selection state.
- Red round marker with white house icon (`MapPin` / home glyph) for user's home location.
- Automatic viewport fitting (`fitBounds`) to the search radius around home pin, preventing excessive zoom-out.
- Bubble click opens minimal card with listing name, space type, bedrooms, $/night, and star rating.

---

## 3. Modal Specifications

All modals share centered layout, rounded corners (`rounded-3xl`), dimmed backdrop (`bg-black/40 backdrop-blur-xs`), close `"X"` button top-left, and centered title.

### Modal A: "How many nights?"
- Title: `How many nights?`
- Stepper: `[ − ]  [ N ]  [ + ]` (range 1–30).
- Subtitle: `"Similar homes available all month book about [B] nights."`
- CTA: Black full-width button `"Update your estimate"`.

### Modal B: "Tell us about your home"
- Title: `Tell us about your home`
- **Address or area**: Interactive address input with geocoding suggestions, full DC validation, and deduplication intact.
- **Type of space**: Clean segmented control (`Entire place | Private room`).
- **Bedrooms**: Stepper `[ − ]  [ N ]  [ + ]` (0 displays as `"Studio"`, hidden for Private room).
- **Set your own price** (collapsible disclosure): Custom $/night input with `"Reset to suggested"`.
- **More options** (collapsible disclosure): Toggle for `"Include low-activity listings"`.
- CTA: Black full-width button `"Update your estimate"`.

### Modal C: "How we estimate your earnings"
- Title: `How we estimate your earnings`
- Plain paragraphs populating verified figures:
  1. `"We looked at [count] similar listings within [radius] miles of your home, using the past 12 months of booking data."`
  2. `"Unlike Airbnb, we include all similar listings — not just the top half — so this estimate is more conservative."`
  3. `"Your estimate is the typical nightly price ($[P]) minus Airbnb's [fee]% host fee ($[E]), times the nights you choose ([N])."`
  4. `"Most similar homes would earn between $[LOW] and $[HIGH] a month at [N] nights — about $[X×12] a year."`
  5. `"Listing price is what guests see per night, before cleaning fees and taxes. We don't subtract cleaning, taxes or other costs here — see the Costs tab."`
  6. Collapsible `"About the data"` (AirROI source, active listing criteria, filters applied).
  7. Disclaimer: `"These estimates are not an appraisal or estimate of property value."`

---

## 4. Other Tabs (Light Touch Collapsible Restructure)

- **Costs & Profit Tab**:
  - Lead headline: `"You'd keep about $[net]/month"`.
  - Monthly waterfall breakdown chart visible immediately.
  - Cost breakdown table, scenario comparisons, housing costs, and one-time setup cards tucked behind clean `"See details"` collapsible toggles.
- **Legal & Setup Tab**:
  - Keep eligibility result banner and license type visible at top.
  - Inspection checklist, HOA/co-op rules, and 90-night budget tracker collapsible for streamlined viewing.

---

## 5. Verification & Test Plan

1. **Calculations**: Run `npx tsx src/test/part1Tests.ts && npx tsx src/test/part2Tests.ts && npx tsx src/test/costsTests.ts` to ensure 100% calculation invariance.
2. **Specific Scenario**:
   - Location: Eastern Market, entire place, 1BR, 11 nights.
   - Headline: `"$1,649"`.
   - Subline: `"11 nights · $177/night ($150 after Airbnb's fee)"`.
3. **Currency Spacing**: Validate that formatters render `"$1,535"`, never `"$1 , 535"`.
4. **Geocoding & Map Pinning**: Search `"1524 Wisconsin Ave NW"` -> verify pin is centered in Georgetown and viewport stays inside DC bounds.
5. **Mobile Viewport**: Verify at 375px width that headline wraps cleanly without horizontal overflow and map stacks below the search pill.
