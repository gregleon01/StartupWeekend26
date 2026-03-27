# Niva — Parametric Weather Insurance

Automatic weather-triggered micro-insurance for small farms in Eastern Europe. No paperwork. No adjusters. Payout in 48 hours.

**Live demo**: [vercel-url-here]

---

## What it does

Farmers pin their field on a satellite map, select their crop, and instantly see:
- **10 years of historical frost events** on their exact field (real Open-Meteo data)
- A **clear parametric guarantee**: "If temperature drops below -2°C for 4+ hours during bloom, you receive €340/ha"
- A **live frost simulation** — watch the temperature drop, the trigger fire, and a payout arrive automatically

There's also an **insurer dashboard** (`/dashboard`) showing 200+ fields across a region with real-time payout monitoring.

## The problem

- Only **1–7%** of Eastern European farmers have crop insurance
- **€28 billion** in annual EU agricultural losses from weather
- **75%** of those losses are completely uninsured
- Traditional insurance is structurally broken for small farms

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS 4 |
| Map | react-map-gl + Mapbox GL JS (satellite-streets-v12) |
| Animations | Framer Motion |
| Weather data | Open-Meteo Archive API (free, no key) |
| Fonts | DM Sans + Space Mono |
| Icons | lucide-react |
| Deployment | Vercel |

## Architecture

```
src/
├── app/
│   ├── page.tsx                 # farmer-facing app (state machine)
│   └── dashboard/page.tsx       # insurer dashboard (200 fields)
├── components/
│   ├── MapView.tsx              # Mapbox satellite map + pin drop
│   ├── CropSelector.tsx         # crop selection bottom sheet
│   ├── HistoricalTimeline.tsx   # 10-year frost event timeline
│   ├── CoverageCard.tsx         # parametric coverage offer
│   ├── FrostSimulation.tsx      # 5-phase frost simulation (the demo)
│   ├── TemperatureGauge.tsx     # vertical temperature gauge
│   ├── PayoutNotification.tsx   # payout confirmation card
│   ├── WhatsAppMock.tsx         # WhatsApp notification mock
│   └── InsuredFieldsMap.tsx     # dashboard: 200 field markers
├── lib/
│   ├── contracts.ts             # parametric contract definitions
│   ├── weather.ts               # Open-Meteo API integration
│   ├── frostAnalysis.ts         # frost detection engine (core IP)
│   └── mockFields.ts            # deterministic mock data for dashboard
├── hooks/
│   └── useWeatherData.ts        # fetch + cache + analyze weather data
└── types/
    └── index.ts                 # TypeScript type definitions
```

## Core engine: `lib/frostAnalysis.ts`

The frost detection engine is the most original code. It:
1. Filters hourly temperature data to the crop's sensitive window
2. Walks hours sequentially, tracking consecutive sub-threshold streaks
3. Handles edge cases: midnight crossings, multiple events per season, boundary conditions
4. Keeps the worst event per year (longest duration / lowest temperature)
5. Estimates financial loss using a severity model (depth × duration)

Pure function, deterministic, auditable. Same algorithm could run in production.

## Setup

```bash
# 1. Clone
git clone <repo-url>
cd StartupWeekend26

# 2. Install
pnpm install

# 3. Set Mapbox token
cp .env.local.example .env.local
# Edit .env.local and add your Mapbox token
# Get one free at https://account.mapbox.com/

# 4. Run
pnpm dev
# → http://localhost:3000       (farmer app)
# → http://localhost:3000/dashboard  (insurer dashboard)

# 5. Build
pnpm build
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Yes | Mapbox GL access token (free tier: 50k loads/month) |

## Data sources

- **Open-Meteo Archive API**: Historical hourly temperature data, 2015–2025. Free, no API key required. Rate limited but cached client-side.
- **Mapbox**: Satellite imagery + street labels. Free tier sufficient for demo.

## Business model

We're an MGA (Managing General Agent) — the tech and distribution layer between farmers and reinsurers:
- **20–30% commission** per premium
- **Cooperative distribution** — one deal = 200 farmers
- **Data layer** — aggregated field-level weather exposure for reinsurers

## Team

Built at Startup Weekend 2026 · Powered by Robotnik
