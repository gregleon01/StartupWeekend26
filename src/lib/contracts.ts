import type { ParametricContract, CropKey } from "@/types";

/* ------------------------------------------------------------------ */
/*  Parametric Contract Registry                                       */
/*                                                                     */
/*  Each contract is a pure data definition — no logic. The trigger   */
/*  engine reads the contract schema and evaluates any weather stream  */
/*  against it. Adding a new crop, peril, or country means adding a   */
/*  new object here. No code changes in the engine.                   */
/*                                                                     */
/*  Schema fields:                                                     */
/*    triggerVariable   — which Open-Meteo hourly variable to watch   */
/*    triggerDirection  — "below" = trigger when value < threshold    */
/*                        "above" = trigger when value > threshold    */
/*    threshold         — the critical value in native units          */
/*    durationThreshold — consecutive hours the condition must hold   */
/*    sensitiveStart/End — the crop's vulnerable date window (MM-DD)  */
/*    payoutPerHectare  — fixed payout on trigger (EUR)               */
/*    premiumPerHectare — seasonal premium cost (EUR)                 */
/* ------------------------------------------------------------------ */

// ─── Data sources ────────────────────────────────────────────────────────────
// Yields:  FAOSTAT QCL, Bulgaria (area=35), 2022–2023 harvest reports
// Prices:  Tridge Bulgaria farmgate prices 2022–2023; Reportlinker EU cherry
//          producer prices 2024 (€774/t)
// Thresholds: Penn State / MSU / K-State / UNL extension bulletins
//   Cherries: −2.2°C at first-bloom (10% kill), Penn State Extension
//   Grapes:   −2.2°C post-budbreak 2nd–4th leaf, MSU Extension
//   Wheat:    −4°C for ≥2 h at jointing (Feekes 6), K-State Extension
//   Sunflower: −2.2°C at V4 stage, UNL CropWatch
// Payout:  yield (t/ha) × farmgate price (€/t) × 25% parametric coverage ratio
//   (Parametric products cover emergency costs / partial loss, not full revenue)
//   Cherries:  4.0 t/ha × €774/t × 0.25 = €774  → €750/ha
//   Grapes:    5.7 t/ha × €358/t × 0.25 = €510  → €500/ha
//   Wheat:     5.25 t/ha × €360/t × 0.25 = €472 → €470/ha
//   Sunflower: 1.9 t/ha × €600/t × 0.25 = €285  → €280/ha
// Premiums: dynamically risk-adjusted in CoverageCard via ERA5 trigger rates;
//           base values here represent ~30% historical trigger frequency loading
// ─────────────────────────────────────────────────────────────────────────────

export const contracts: Record<CropKey, ParametricContract> = {
  cherries: {
    id: "bg-cherries-frost",
    crop: "Cherries",
    cropBg: "\u0427\u0435\u0440\u0435\u0448\u0438",
    icon: "\ud83c\udf52",
    triggerVariable: "temperature_2m",
    triggerDirection: "below",
    threshold: -2.2,       // Penn State Ext.: 10% kill at first bloom / full bloom
    thresholdUnit: "\u00b0C",
    durationThreshold: 2,  // 30-min standard; 2h used for parametric certainty
    sensitiveStart: "04-01",
    sensitiveEnd: "05-15",
    payoutPerHectare: 750,  // 4.0 t/ha × €774/t × 25%
    premiumPerHectare: 68,  // 750 × 30% trigger rate × 30% premium ratio
    avgYieldPerHectare: 4000,
    countryCode: "BG",
  },
  grapes: {
    id: "bg-grapes-frost",
    crop: "Grapes",
    cropBg: "\u0413\u0440\u043e\u0437\u0434\u0435",
    icon: "\ud83c\udf47",
    triggerVariable: "temperature_2m",
    triggerDirection: "below",
    threshold: -2.2,       // MSU Ext.: −2.2°C kills 2nd–4th leaf stage shoots
    thresholdUnit: "\u00b0C",
    durationThreshold: 2,  // 30-min standard; 2h parametric threshold
    sensitiveStart: "04-10",
    sensitiveEnd: "05-20",
    payoutPerHectare: 500,  // 5.7 t/ha × €358/t × 25%
    premiumPerHectare: 45,  // 500 × 30% × 30%
    avgYieldPerHectare: 5700,
    countryCode: "BG",
  },
  wheat: {
    id: "bg-wheat-frost",
    crop: "Wheat",
    cropBg: "\u041f\u0448\u0435\u043d\u0438\u0446\u0430",
    icon: "\ud83c\udf3e",
    triggerVariable: "temperature_2m",
    triggerDirection: "below",
    threshold: -4,         // K-State Ext.: −4°C kills growing points at jointing
    thresholdUnit: "\u00b0C",
    durationThreshold: 2,  // K-State: ≥2 hours causes injury at jointing stage
    sensitiveStart: "03-15",
    sensitiveEnd: "04-30",
    payoutPerHectare: 470,  // 5.25 t/ha × €360/t × 25%
    premiumPerHectare: 42,  // 470 × 30% × 30%
    avgYieldPerHectare: 5250,
    countryCode: "BG",
  },
  sunflower: {
    id: "bg-sunflower-frost",
    crop: "Sunflower",
    cropBg: "\u0421\u043b\u044a\u043d\u0447\u043e\u0433\u043b\u0454\u0434",
    icon: "\ud83c\udf3b",
    triggerVariable: "temperature_2m",
    triggerDirection: "below",
    threshold: -2.2,       // UNL CropWatch: −2.2°C (28°F) damages V4 terminal bud
    thresholdUnit: "\u00b0C",
    durationThreshold: 2,  // Any exposure at V4; 2h for parametric certainty
    sensitiveStart: "04-15",
    sensitiveEnd: "05-31",
    payoutPerHectare: 280,  // 1.9 t/ha × €600/t × 25%
    premiumPerHectare: 25,  // 280 × 30% × 30%
    avgYieldPerHectare: 1900,
    countryCode: "BG",
  },
};

/* ------------------------------------------------------------------ */
/*  Coordinate bounds for supported countries                          */
/*  Used for input validation — reject pins outside coverage area.    */
/* ------------------------------------------------------------------ */

export const COUNTRY_BOUNDS: Record<
  string,
  { minLat: number; maxLat: number; minLng: number; maxLng: number; name: string }
> = {
  BG: { minLat: 41.2, maxLat: 44.2, minLng: 22.3, maxLng: 28.6, name: "Bulgaria" },
  RO: { minLat: 43.6, maxLat: 48.3, minLng: 20.3, maxLng: 29.7, name: "Romania" },
  PL: { minLat: 49.0, maxLat: 54.8, minLng: 14.1, maxLng: 24.2, name: "Poland" },
};

/** Validate that coordinates fall within a supported country */
export function validateCoordinates(lat: number, lng: number): string | null {
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !isFinite(lat) ||
    !isFinite(lng) ||
    lat < -90 || lat > 90 ||
    lng < -180 || lng > 180
  ) {
    return null;
  }
  for (const [code, b] of Object.entries(COUNTRY_BOUNDS)) {
    if (lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng) {
      return code;
    }
  }
  return null;
}

/** Check if a trigger condition is breached for a given value */
export function isBreached(
  value: number,
  threshold: number,
  direction: "below" | "above",
): boolean {
  return direction === "below" ? value < threshold : value > threshold;
}
