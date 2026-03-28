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

export const contracts: Record<CropKey, ParametricContract> = {
  cherries: {
    id: "bg-cherries-frost",
    crop: "Cherries",
    cropBg: "\u0427\u0435\u0440\u0435\u0448\u0438",
    icon: "\ud83c\udf52",
    triggerVariable: "temperature_2m",
    triggerDirection: "below",
    threshold: -2,
    thresholdUnit: "\u00b0C",
    durationThreshold: 4,
    sensitiveStart: "04-01",
    sensitiveEnd: "05-15",
    payoutPerHectare: 340,
    premiumPerHectare: 15,
    avgYieldPerHectare: 4200,
    countryCode: "BG",
  },
  grapes: {
    id: "bg-grapes-frost",
    crop: "Grapes",
    cropBg: "\u0413\u0440\u043e\u0437\u0434\u0435",
    icon: "\ud83c\udf47",
    triggerVariable: "temperature_2m",
    triggerDirection: "below",
    threshold: -1.5,
    thresholdUnit: "\u00b0C",
    durationThreshold: 3,
    sensitiveStart: "04-10",
    sensitiveEnd: "05-20",
    payoutPerHectare: 280,
    premiumPerHectare: 12,
    avgYieldPerHectare: 3800,
    countryCode: "BG",
  },
  wheat: {
    id: "bg-wheat-frost",
    crop: "Wheat",
    cropBg: "\u041f\u0448\u0435\u043d\u0438\u0446\u0430",
    icon: "\ud83c\udf3e",
    triggerVariable: "temperature_2m",
    triggerDirection: "below",
    threshold: -5,
    thresholdUnit: "\u00b0C",
    durationThreshold: 6,
    sensitiveStart: "03-15",
    sensitiveEnd: "04-30",
    payoutPerHectare: 180,
    premiumPerHectare: 8,
    avgYieldPerHectare: 1200,
    countryCode: "BG",
  },
  sunflower: {
    id: "bg-sunflower-frost",
    crop: "Sunflower",
    cropBg: "\u0421\u043b\u044a\u043d\u0447\u043e\u0433\u043b\u0435\u0434",
    icon: "\ud83c\udf3b",
    triggerVariable: "temperature_2m",
    triggerDirection: "below",
    threshold: -2,
    thresholdUnit: "\u00b0C",
    durationThreshold: 4,
    sensitiveStart: "04-15",
    sensitiveEnd: "05-31",
    payoutPerHectare: 220,
    premiumPerHectare: 10,
    avgYieldPerHectare: 1600,
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
