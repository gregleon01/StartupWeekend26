# Niva — Parametric Crop Insurance

Automatic weather-triggered micro-insurance for small farms in Eastern Europe. No paperwork. No adjusters. Payout in 48 hours.

**Live demo**: [vercel-url-placeholder]

Built at **HackAUBG 8.0 · The Hub Sofia**

---

## The problem

- Only **1–7%** of Eastern European farmers carry crop insurance
- **€28 billion** in annual EU agricultural losses from weather events
- **75%** of those losses are completely uninsured
- Traditional insurance is structurally broken for small farms: adjusters cost more than the claim, paperwork takes months, and trust is low

## What Niva does

A farmer opens the app, pins their field on a satellite map, selects their crop, and receives an instant parametric guarantee:

> *"If temperature drops below −2°C for 4+ consecutive hours during bloom (Apr 1–May 15), you receive €340/ha — automatically, no claim filed."*

The platform pulls 10 years of real hourly temperature data for that exact field, shows which years would have triggered a payout, and demonstrates a live frost simulation with automatic payout notification. The insurer dashboard shows 200+ fields across a region with portfolio-level risk analytics.

---

## Business model

Niva is a **parametric crop insurance MGA (Managing General Agent)**. We design the trigger thresholds, price the premiums, build the platform that monitors weather data and fires payouts, and acquire farmers through cooperative partnerships. A licensed insurer fronts the policy. A reinsurer (TBD) holds the capital reserve against actual losses. We carry no balance sheet risk.

**Revenue:**
- 20–30% commission on gross written premium
- Cooperative distribution: one partnership deal = 200+ farmers onboarded
- Data layer: aggregated field-level weather exposure sold to reinsurers

**Capital stack:** Fronting insurer (TBD) · Reinsurer (TBD)

---

## Architecture

```
src/
├── app/
│   ├── page.tsx                 # Farmer app — 5-state UI machine
│   └── dashboard/page.tsx       # Insurer dashboard — portfolio analytics
├── components/
│   ├── MapView.tsx              # Mapbox satellite map + field pinning
│   ├── FieldInfoBar.tsx         # Location enrichment display (elevation, basis risk)
│   ├── CropSelector.tsx         # Crop selection bottom sheet
│   ├── HistoricalTimeline.tsx   # 10-year frost event timeline + trend
│   ├── CoverageCard.tsx         # Parametric contract offer
│   ├── FrostSimulation.tsx      # 5-phase animated frost event demo
│   ├── TemperatureGauge.tsx     # Real-time temperature gauge
│   ├── PayoutNotification.tsx   # Payout confirmation card
│   ├── WhatsAppMock.tsx         # WhatsApp delivery notification mock
│   └── InsuredFieldsMap.tsx     # Dashboard: 200+ field markers
├── lib/
│   ├── contracts.ts             # Generic parametric contract schema
│   ├── weather.ts               # Open-Meteo pipeline: fetch, batch, cache, validate
│   ├── frostAnalysis.ts         # Frost detection FSM (core engine)
│   ├── basisRisk.ts             # Basis risk confidence model
│   ├── geoEnrich.ts             # Location enrichment: geocode + elevation + station
│   ├── statistics.ts            # Linear regression, trend analysis, portfolio VaR
│   └── mockFields.ts            # Deterministic mock portfolio (seed 42)
├── hooks/
│   └── useWeatherData.ts        # Fetch + cache + analyze weather data
└── types/
    └── index.ts                 # Full TypeScript type definitions
```

---

## Core engine: the frost detection FSM

**File:** `src/lib/frostAnalysis.ts`

The trigger engine is a **4-state finite state machine** that walks hourly temperature data chronologically and evaluates parametric contract conditions. It is a pure function — deterministic, auditable, side-effect free. The same code could run directly on a production backend.

```
┌─────────────┐   temp < threshold      ┌──────────────┐
│  MONITORING │ ─────────────────────▶  │   COUNTING   │
└─────────────┘                         └──────────────┘
       ▲                                  │          │
       │              temp ≥ threshold    │          │ temp ≥ threshold
       │         ┌────────────────────────┘          │
       │         ▼                                   ▼
       │   ┌───────────┐                    ┌─────────────┐
       │   │ EVALUATING│                    │  TRIGGERED  │
       │   └───────────┘                    └─────────────┘
       │         │
       │         │ duration < threshold
       └─────────┘ (RESET)
```

**State transitions:**
- `MONITORING` → `COUNTING`: temperature crosses below threshold
- `COUNTING` → `COUNTING`: still below threshold (accumulate duration)
- `COUNTING` → `EVALUATING`: temperature recovers above threshold
- `EVALUATING` → `TRIGGERED`: accumulated duration ≥ contract requirement → emit payout event
- `EVALUATING` → `MONITORING` (RESET): duration below requirement → discard event

**Edge cases handled:**
- Events spanning midnight (continuous hour tracking, not day-bounded)
- Multiple events in a single season (worst event kept per year)
- Threshold equality (strict breach: `value < threshold`, not `≤`)
- Suspect/null data points (skipped, not interpolated mid-event)
- Year boundary crossings (open streaks closed at Dec 31)
- Timezone offset (all timestamps converted to Europe/Sofia EET before evaluation)

**Every state transition is logged** with timestamp, temperature value, and transition reason — producing a full audit trail for any payout decision.

---

## Contract schema

**File:** `src/lib/contracts.ts`

All products share a single generic `ParametricContract` interface. The trigger engine is completely decoupled from crop type — adding a new crop, a new country, or a new peril (drought, excess rainfall, hail) is a config change, not a code change.

```typescript
interface ParametricContract {
  triggerVariable: 'temperature_2m' | 'precipitation' | 'wind_speed_10m'
  triggerDirection: 'below' | 'above'
  threshold: number
  durationThreshold: number        // consecutive hours required
  sensitiveStart: string           // 'MM-DD'
  sensitiveEnd: string             // 'MM-DD'
  payoutPerHectare: number
  premiumPerHectare: number
}
```

**Current products:**

| Crop | Window | Threshold | Duration | Payout |
|------|--------|-----------|----------|--------|
| Cherries | Apr 1–May 15 | −2°C | 4h | €340/ha |
| Grapes | Apr 10–May 20 | −1.5°C | 3h | €280/ha |
| Wheat | Mar 15–Apr 30 | −5°C | 6h | €180/ha |
| Sunflower | Apr 15–May 31 | −2°C | 4h | €220/ha |

**Adding Romania:** update country bounds in `contracts.ts`. No other changes.
**Adding drought:** add one contract object with `triggerVariable: 'precipitation'`, `triggerDirection: 'above'`. The FSM evaluates it identically.

---

## Weather data pipeline

**File:** `src/lib/weather.ts`

Three-stage pipeline with no single point of failure:

**Stage 1 — Client cache**
Coordinates rounded to 3 decimal places (~110m grid) as cache key. Results stored in `localStorage` with 24-hour TTL. Prevents redundant API calls across sessions and across crops sharing the same field.

**Stage 2 — Batched API fetch**
10 years of data fetched in 2-year batches via `Promise.allSettled()`. One failed batch does not abort the pipeline. Only March–June data is requested per year (covers all sensitive windows), reducing payload by ~65%.

**Stage 3 — Data quality**
Each hourly reading validated: nulls flagged as `suspect`, physically impossible values (< −40°C or > 50°C) rejected. Valid neighbors within a 6-hour window used for linear interpolation where possible. Interpolated readings tagged `quality: "interpolated"` and excluded from trigger evaluation.

**Fallback:** If all API batches fail (no wifi, API down), the pipeline falls back to a deterministic mock data generator seeded by latitude. The mock produces a realistic climatological pattern: seasonal temperature curve, diurnal cycle, and occasional frost events (~30% of years, matching real Kyustendil frequency). The user never sees an error — the demo works offline.

---

## Basis risk model

**File:** `src/lib/basisRisk.ts`

Basis risk is the fundamental problem in parametric insurance: the weather station may read a different temperature than what actually occurred on the farm. A station on a hilltop reads +1°C while the valley field below is at −2°C — no trigger fires, farmer suffers real loss.

Niva quantifies this for every field:

```
confidence = 1 − (distancePenalty + elevationPenalty)

distancePenalty  = min(distance_km / 25, 0.50)
elevationPenalty = min(|field_elev − station_elev| / 500, 0.30)
```

**Examples:**
- Field 2km from station, same elevation → **92% confidence**
- Field 15km away, 300m elevation difference → **52% confidence**
- Field 25km away, 500m elevation difference → **20% confidence**

The nearest station is found via Haversine distance across a network of 20 Bulgarian meteorological stations. Field elevation is fetched in real time from the Open-Meteo Elevation API. The confidence score is displayed to the farmer and used for portfolio correlation zoning in the dashboard.

---

## Geospatial enrichment

**File:** `src/lib/geoEnrich.ts`

When a farmer pins a field, three data sources are queried in parallel:

1. **Mapbox Geocoding API** — resolves lat/lng to municipality name
2. **Open-Meteo Elevation API** — fetches field elevation in metres
3. **Basis risk lookup** — synchronous, finds nearest station and computes confidence

Result displayed in `FieldInfoBar`:
> *"Kyustendil municipality · 587m elevation · Nearest station: 2.1km · Trigger confidence: 92%"*

Latency: ~500ms (two parallel HTTP calls).

---

## Historical statistics

**File:** `src/lib/statistics.ts`

After fetching 10 years of real temperature data, the engine computes:

- **Event count per year** — how many seasons had a triggering frost event
- **OLS linear regression** on (year, event_count) — slope, intercept, R²
- **Percent change** over the decade — directional climate signal
- **Human-readable trend** — "Frost events at this location have increased ~40% over the last decade"

Portfolio-level metrics (insurer dashboard):
- **Total exposure** — Σ(hectares × payout_per_ha) across all insured fields
- **Expected annual payout** — base trigger rate × total exposure
- **VaR 95%** — 95th-percentile annual payout accounting for spatial correlation
- **Correlation zones** — fields grouped by nearest weather station (shared trigger risk)
- **Diversification benefit** — reduction from covering multiple crops and zones

---

## Simulation: real Kyustendil 2025 frost event

**File:** `src/lib/frostAnalysis.ts` → `generateSimulationData()`

The frost simulation replays **actual weather data** from the April 7–8, 2025 frost that destroyed 95% of cherry crops in the Kyustendil region — the worst agricultural frost event in Bulgaria in 25 years.

**Data source:** Open-Meteo Historical Weather API, station Kyustendil (42.283°N, 22.694°E, 520m), timezone Europe/Sofia.

```
Apr 7  18:00   4.2°C   ← sunset, cooling begins
Apr 7  22:00  −0.9°C   ← crosses 0°C
Apr 8  00:00  −2.1°C   ← crosses cherry lethal threshold (−2°C)
Apr 8  01:00  −2.2°C
Apr 8  02:00  −2.5°C
Apr 8  03:00  −2.4°C
Apr 8  04:00  −2.6°C   ← TRIGGER FIRES (4th consecutive hour below −2°C)
Apr 8  05:00  −2.9°C
Apr 8  06:00  −3.1°C   ← minimum temperature
Apr 8  07:00  −1.4°C   ← sunrise recovery
Apr 8  12:00   6.2°C   ← full recovery
```

**7 consecutive hours below −2°C.** Contract requires 4h → payout triggered at 04:00. The simulation steps through all 19 real hourly readings with timestamps displayed on screen.

**Real-world impact:** ~95% of Kyustendil's cherry harvest destroyed, estimated losses €3–5M, retail cherry prices surged to 20 BGN/kg.

---

## Testing

**File:** `src/lib/__tests__/frostAnalysis.test.ts`

The trigger engine has a comprehensive test suite (Vitest) covering:

- **Clear trigger** — 6h below threshold → payout fires
- **Near-miss** — 3h below threshold → no trigger (requires 4h)
- **Midnight-spanning events** — streak continues across date boundary
- **Multiple events per year** — worst event kept (triggered > untriggered, longer > shorter)
- **No frost** — returns zero-duration placeholder events for all years
- **Threshold boundary** — exactly at threshold is NOT a breach (strict `<`)
- **Suspect data** — quality-flagged points skipped, not counted as breach hours
- **Audit trail** — every triggered event carries FSM state transition log
- **Sensitive window** — data outside Apr 1–May 15 ignored for cherries
- **Loss estimation** — scales with severity, caps at 2× base payout
- **Real data** — simulation returns actual Kyustendil 2025 readings (19 points, min −3.1°C)

```bash
pnpm test       # 13 tests, <200ms
```

---

## Security

- **Content Security Policy** headers set in `next.config.ts`: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy`, and a full `Content-Security-Policy` directive whitelisting only required external domains
- **Coordinate validation** — all field pins validated against country bounding boxes before any API call is made; coordinates outside Bulgaria/Romania/Poland are rejected
- **Environment variables** — all API keys via `NEXT_PUBLIC_` env vars, never hardcoded
- **No SQL injection surface** — client-side only, no database queries
- **XSS** — React auto-escaping, no `dangerouslySetInnerHTML`
- **HTTPS** — enforced at deployment (Vercel)

---

## Setup

```bash
# 1. Clone
git clone https://github.com/gregleon01/StartupWeekend26.git
cd StartupWeekend26

# 2. Install
pnpm install

# 3. Environment
echo "NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here" > .env.local
# Free token at https://account.mapbox.com — 50k map loads/month

# 4. Run
pnpm dev
# Farmer app  → http://localhost:3000
# Insurer dashboard → http://localhost:3000/dashboard

# 5. Build
pnpm build && pnpm start
```

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Yes | Mapbox GL JS access token |

---

## Data sources

| Source | Data | Cost |
|--------|------|------|
| [Open-Meteo Archive](https://open-meteo.com) | Hourly temperature 2015–2025 | Free, no key |
| [Open-Meteo Elevation](https://open-meteo.com/en/docs/elevation-api) | Field elevation (metres) | Free, no key |
| [Mapbox Geocoding v5](https://docs.mapbox.com/api/search/geocoding/) | Municipality name | Free tier |
| [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) | Satellite basemap | Free tier |
| [RainViewer](https://www.rainviewer.com/api.html) | Precipitation radar overlay | Free |

---

## What's next

- **Multi-station interpolation** — weight trigger probability across the 2–3 nearest stations rather than using the single closest, reducing basis risk
- **Empirical VaR calibration** — run the FSM across all historical years for all portfolio fields to derive trigger rate distributions from real data rather than assumptions
- **Smart contract integration** — trustless automatic payout via blockchain escrow; trigger proof generated by the FSM, verified on-chain
- **ML trigger calibration** — train crop-specific damage curves on historical yield data to replace the simplified linear severity model
- **Multi-peril expansion** — drought (precipitation below threshold), excess rainfall, hail; the FSM evaluates any parametric variable without code changes

---

## Team

| Name | Role |
|------|------|
| Gregory Leon Faurie | Product & Strategy |
| Martin Georgiev | Engineering |
| Viktoria Eneva | Design & Research |
| Slavi Sotirov | Engineering |

Built at **HackAUBG 8.0 · The Hub Sofia**
