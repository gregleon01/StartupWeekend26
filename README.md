# Aklima — Parametric Crop Insurance

Automatic weather-triggered micro-insurance for small farms in Eastern Europe. No paperwork. No adjusters. Payout in 48 hours.

Built at **HackAUBG 8.0 · The Hub Blagoevgrad**

---

## The problem

- Only **1–7%** of Eastern European farmers carry crop insurance
- **€28 billion** in annual EU agricultural losses from weather events
- **75%** of those losses are completely uninsured
- Traditional insurance is structurally broken for small farms: adjusters cost more than the claim, paperwork takes months, and trust is low

## What Aklima does

A farmer opens the app, pins their field on a satellite map, selects their crop, and receives an instant parametric guarantee:

> *"If temperature drops below −2°C for 4+ consecutive hours during bloom (Apr 1–May 15), you receive €750/ha — automatically, no claim filed."*

The platform pulls 10 years of real hourly temperature data for that exact field, shows which years would have triggered a payout, and demonstrates a live frost simulation with automatic payout notification. The insurer dashboard shows 127 fields across Bulgaria with portfolio-level risk analytics and a real-time frost event simulation.

---

## Business model

Aklima is a **parametric crop insurance MGA (Managing General Agent)**. We design the trigger thresholds, price the premiums, build the platform that monitors weather data and fires payouts, and acquire farmers through cooperative partnerships. A licensed insurer fronts the policy. A reinsurer (TBD) holds the capital reserve against actual losses. We carry no balance sheet risk.

**Revenue:**
- 20–30% commission on gross written premium
- Cooperative distribution: one partnership deal = 200+ farmers onboarded
- Data layer: aggregated field-level weather exposure sold to reinsurers

**Capital stack:** Fronting insurer (TBD) · Reinsurer (TBD)

---

## Running the project

```bash
# 1. Clone
git clone https://github.com/gregleon01/StartupWeekend26.git
cd StartupWeekend26

# 2. Install dependencies
pnpm install

# 3. Set environment variables
echo "NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here" > .env.local
# Free token at https://account.mapbox.com — 50k map loads/month

# 4. Start development server
pnpm dev
```

Once running, open:

| Route                               | Description                                                         |
|-------------------------------------|---------------------------------------------------------------------|
| `http://localhost:3000`             | Farmer onboarding flow                                              |
| `http://localhost:3000/farmer`      | Farmer app — field pinning, contract, simulation                    |
| `http://localhost:3000/admin`       | Insurer dashboard — portfolio map, risk analytics, frost simulation |
| `http://localhost:3000/dashboard`   | Legacy dashboard view                                               |

```bash
# Build for production
pnpm build && pnpm start

# Run tests
pnpm test        # 13 tests, <200ms
```

---

## Main features

### Farmer app (`/farmer`)
1. **Field pinning** — tap a satellite map to place your field; the app resolves municipality, elevation, and nearest weather station in ~500ms
2. **Crop selection** — choose from cherries, grapes, wheat, or sunflower; contract terms (threshold, window, payout) are shown immediately
3. **Historical timeline** — 10-year chart of frost events at that exact location, showing which years triggered and which didn't, with a climate trend line
4. **Coverage card** — instant parametric quote with premium, payout per hectare, and trigger confidence score
5. **Frost simulation** — replays the real April 7–8 2025 Kyustendil frost event hour by hour; the arc gauge drops, the trigger fires at 04:00, a WhatsApp-style payout notification appears
6. **WhatsApp delivery** — simulates the payout notification a farmer receives on their phone (no app download required in production)

### Insurer dashboard (`/admin`)
1. **Full-screen portfolio map** — 127 fields across Bulgaria colored by weather station zone (20 zones), with hover tooltips showing crop, hectares, and payout amount
2. **Real-time stats** — fields, hectares covered, premiums collected, triggered count, total paid out, loss ratio
3. **Claims tab** — list of triggered claims with Approve / Reject controls
4. **Risk tab** — crop exposure bars, monthly trigger chart, VaR 95%, correlation zones, diversification benefit
5. **Forecast tab** — 6-year payout trend chart anchored to `expectedAnnualPayout`, next season estimate vs 5-year average vs worst case
6. **Simulate Frost Event** — animates a frost front sweeping west→east across Bulgaria over 5 seconds: fields light up red as they're hit, claims appear live in the Claims tab one by one, Triggered count and Paid Out increment in real time; click Reset to restore baseline

---

## Architecture

```
src/
├── app/
│   ├── page.tsx                 # Landing / entry point
│   ├── farmer/page.tsx          # Farmer app — field pinning, contract, simulation
│   ├── admin/page.tsx           # Insurer dashboard — full-screen map + glass panel
│   └── dashboard/page.tsx       # Legacy dashboard
├── components/
│   ├── MapView.tsx              # Mapbox satellite map + field pinning
│   ├── DrawableMap.tsx          # Map with drawable parcel boundaries
│   ├── FieldInfoBar.tsx         # Location enrichment display (elevation, basis risk)
│   ├── CropSelector.tsx         # Crop selection bottom sheet
│   ├── HistoricalTimeline.tsx   # 10-year frost event timeline + glow effects
│   ├── CoverageCard.tsx         # Parametric contract offer
│   ├── FrostSimulation.tsx      # Arc gauge, phase badge, live frost simulation
│   ├── TemperatureGauge.tsx     # Real-time temperature gauge
│   ├── PayoutNotification.tsx   # Payout confirmation card
│   ├── WhatsAppMock.tsx         # WhatsApp delivery notification mock
│   ├── InsuredFieldsMap.tsx     # Portfolio map: 127 fields, zone colors, sim overlay
│   ├── FarmerOnboarding.tsx     # Onboarding flow wrapper
│   ├── WeatherOverlay.tsx       # Rain radar overlay
│   ├── LanguageToggle.tsx       # EN/BG locale switch
│   └── charts/                  # Shared chart components
├── lib/
│   ├── contracts.ts             # Parametric contract schema + 4 crop products
│   ├── weather.ts               # Open-Meteo pipeline: fetch, batch, cache, validate
│   ├── frostAnalysis.ts         # Frost detection FSM (core trigger engine)
│   ├── basisRisk.ts             # Basis risk confidence model + 20-station network
│   ├── geoEnrich.ts             # Location enrichment: geocode + elevation + station
│   ├── statistics.ts            # OLS regression, trend analysis, portfolio VaR
│   ├── mockFields.ts            # Deterministic 127-field portfolio (seed 42)
│   ├── farmlandCoords.json      # 127 synthetic Bulgarian agricultural coordinates
│   ├── geo.ts                   # Geospatial utilities
│   └── i18n.ts                  # Internationalisation strings
├── hooks/
│   ├── useWeatherData.ts        # Fetch + cache + analyse weather for a field
│   └── usePortfolioWeather.ts   # Historical trigger rates for portfolio dashboard
└── types/
    └── index.ts                 # Full TypeScript type definitions
```

---

## Core engine: the frost detection FSM

**File:** `src/lib/frostAnalysis.ts`

The trigger engine is a **4-state finite state machine** that walks hourly temperature data chronologically and evaluates parametric contract conditions. It is a pure function — deterministic, auditable, side-effect free.

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
- Suspect/null data points (skipped, not counted mid-event)
- Year boundary crossings (open streaks closed at Dec 31)
- Timezone offset (all timestamps converted to Europe/Sofia EET before evaluation)

Every state transition is logged with timestamp, temperature value, and transition reason — producing a full audit trail for any payout decision.

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

| Crop       | Window          | Threshold | Duration | Payout/ha | Premium/ha |
|------------|-----------------|-----------|----------|-----------|------------|
| Cherries   | Apr 1–May 15    | −2°C      | 4h       | €750      | €68        |
| Grapes     | Apr 10–May 20   | −1.5°C    | 3h       | €500      | €45        |
| Wheat      | Mar 15–Apr 30   | −5°C      | 6h       | €470      | €42        |
| Sunflower  | Apr 15–May 31   | −2°C      | 4h       | €280      | €25        |

---

## Weather data pipeline

**File:** `src/lib/weather.ts`

Three-stage pipeline with no single point of failure:

**Stage 1 — Client cache**
Coordinates rounded to 3 decimal places (~110m grid) as cache key. Results stored in `localStorage` with 24-hour TTL.

**Stage 2 — Batched API fetch**
10 years of data fetched in 2-year batches via `Promise.allSettled()`. One failed batch does not abort the pipeline. Only March–June data is requested per year (covers all sensitive windows), reducing payload by ~65%.

**Stage 3 — Data quality**
Each hourly reading validated: nulls flagged as `suspect`, physically impossible values (< −40°C or > 50°C) rejected. Valid neighbors within a 6-hour window used for linear interpolation where possible. Interpolated readings excluded from trigger evaluation.

**Fallback:** If all API batches fail, the pipeline falls back to a deterministic mock data generator seeded by latitude. The demo works offline.

---

## Basis risk model

**File:** `src/lib/basisRisk.ts`

Basis risk is the gap between what the nearest weather station reads and what actually happened on the farm. Aklima quantifies this for every field:

```
confidence = 1 − (distancePenalty + elevationPenalty)

distancePenalty  = min(distance_km / 25, 0.50)
elevationPenalty = min(|field_elev − station_elev| / 500, 0.30)
```

The nearest station is found via Haversine distance across a network of 20 Bulgarian meteorological stations. The confidence score is displayed to the farmer and used for portfolio correlation zoning in the dashboard.

---

## Simulation: real Kyustendil 2025 frost event

**File:** `src/lib/frostAnalysis.ts` → `generateSimulationData()`

The frost simulation in the farmer app replays **actual weather data** from the April 7–8, 2025 frost that destroyed 95% of cherry crops in the Kyustendil region.

```
Apr 8  00:00  −2.1°C   ← crosses cherry lethal threshold (−2°C)
Apr 8  01:00  −2.2°C
Apr 8  02:00  −2.5°C
Apr 8  03:00  −2.4°C
Apr 8  04:00  −2.6°C   ← TRIGGER FIRES (4th consecutive hour below −2°C)
Apr 8  06:00  −3.1°C   ← minimum temperature
Apr 8  07:00  −1.4°C   ← sunrise recovery
```

**Real-world impact:** ~95% of Kyustendil's cherry harvest destroyed, estimated losses €3–5M.

The admin dashboard's **Simulate Frost Event** is a separate portfolio-level simulation — it sweeps all triggered fields west→east across Bulgaria, lighting them up on the map and generating live claims in the panel.

---

## Testing

**File:** `src/lib/__tests__/frostAnalysis.test.ts`

```bash
pnpm test       # 13 tests, <200ms
```

Test coverage: clear trigger, near-miss, midnight-spanning events, multiple events per year, no-frost baseline, threshold boundary (strict `<`), suspect data skipping, audit trail, sensitive window enforcement, loss estimation, real Kyustendil data.

---

## Security

- **Content Security Policy** headers set in `next.config.ts`
- **Coordinate validation** — all field pins validated against country bounding boxes before any API call
- **Environment variables** — all API keys via `NEXT_PUBLIC_` env vars, never hardcoded
- **No SQL injection surface** — client-side only, no database
- **XSS** — React auto-escaping, no `dangerouslySetInnerHTML`

---

## Environment variables

| Variable                      | Required | Description                                                                        |
|-------------------------------|----------|------------------------------------------------------------------------------------|
| `NEXT_PUBLIC_MAPBOX_TOKEN`    | Yes      | Mapbox GL JS access token — free at [account.mapbox.com](https://account.mapbox.com) |

---

## Data sources

| Source                                                                      | Data                          | Cost          |
|-----------------------------------------------------------------------------|-------------------------------|---------------|
| [Open-Meteo Archive](https://open-meteo.com)                                | Hourly temperature 2015–2025  | Free, no key  |
| [Open-Meteo Elevation](https://open-meteo.com/en/docs/elevation-api)        | Field elevation (metres)      | Free, no key  |
| [Mapbox Geocoding v5](https://docs.mapbox.com/api/search/geocoding/)        | Municipality name             | Free tier     |
| [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/)                       | Satellite basemap             | Free tier     |
| [RainViewer](https://www.rainviewer.com/api.html)                           | Precipitation radar overlay   | Free          |

---

## What's next

- **Multi-station interpolation** — weight trigger probability across the 2–3 nearest stations, reducing basis risk
- **Empirical VaR calibration** — run the FSM across all historical years for all portfolio fields to derive real trigger rate distributions
- **Smart contract integration** — trustless automatic payout via blockchain escrow
- **Multi-peril expansion** — drought, excess rainfall, hail; the FSM evaluates any parametric variable without code changes

---

## Team

| Name                  | Role               |
|-----------------------|--------------------|
| Gregory Leon Faurie   | Product & Strategy |
| Martin Georgiev       | Engineering        |
| Viktoria Eneva        | Design & Research  |
| Slavi Sotirov         | Engineering        |

Built at **HackAUBG 8.0 · The Hub Blagoevgrad**

---

## Sources & citations

### Market statistics

| Claim                                              | Source                                                                                                                                              |
|----------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| 1–7% crop insurance penetration in Eastern Europe  | [JRC Technical Report — Agricultural Insurance Schemes in the EU (2017)](https://publications.jrc.ec.europa.eu/repository/handle/JRC107845)         |
| €28 billion annual EU agricultural weather losses  | [EEA — Economic losses from climate-related extremes in Europe](https://www.eea.europa.eu/publications/economic-losses-and-fatalities-from)         |
| 75% of agricultural losses uninsured               | [Swiss Re Institute — Natural catastrophe protection gap](https://www.swissre.com/institute/research/sigma-research/sigma-2023-01.html)             |
| 20–30% MGA commission on gross written premium     | [EIOPA — Insurance Distribution in Europe](https://www.eiopa.europa.eu/publications/insurance-distribution-directive_en)                           |

### Agronomic frost thresholds

| Claim                                              | Source                                                                                                                                              |
|----------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| Cherry lethal threshold −2°C at bloom              | [FAO — Cherry Production Guide](https://www.fao.org/3/y4890e/y4890e0e.htm)                                                                        |
| Grapevine frost damage below −1.5°C at budbreak   | [UC Davis Viticulture & Enology — Frost and Freeze Protection](https://ucanr.edu/sites/uccnr/files/24847.pdf)                                      |
| Winter wheat critical temperature −5°C             | [FAO — Wheat Crop Guide, Cold Hardiness](https://www.fao.org/3/y4011e/y4011e.pdf)                                                                 |
| Sunflower seedling damage below −2°C               | [USDA NRCS — Sunflower Agronomy](https://www.nrcs.usda.gov/plantmaterials/etpmcpg13.pdf)                                                          |

### The April 2025 Kyustendil frost event

| Claim                                              | Source                                                                                                                                              |
|----------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| 95% of cherry harvest destroyed                    | [BTA — Bulgarian Telegraph Agency (April 2025)](https://www.bta.bg)                                                                                |
| Estimated losses €3–5M, worst frost in 25 years   | [Agri.bg — Agricultural news coverage (April 2025)](https://www.agri.bg)                                                                           |
| Cherry retail price surge to 20 BGN/kg             | [Mediapool.bg — Market price reporting (May 2025)](https://www.mediapool.bg)                                                                       |
| Raw hourly temperature data (42.283°N, 22.694°E)  | [Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api)                                                         |

### Weather & elevation data

| Claim                                              | Source                                                                                                                                              |
|----------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| Hourly temperature archive 2015–2025               | [Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api)                                                         |
| Field elevation lookup                             | [Open-Meteo Elevation API](https://open-meteo.com/en/docs/elevation-api)                                                                           |
| Temperature lapse rate ~0.6°C per 100m             | [WMO — Guide to Meteorological Instruments and Methods of Observation](https://library.wmo.int/index.php?lvl=notice_display&id=12407)               |
| Municipality geocoding                             | [Mapbox Geocoding API v5](https://docs.mapbox.com/api/search/geocoding/)                                                                           |
