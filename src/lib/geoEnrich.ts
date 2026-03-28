import type { FieldPin, FieldEnrichment } from "@/types";
import { findNearestStation, calculateBasisRiskConfidence } from "./basisRisk";

/* ================================================================== */
/*  Geospatial Enrichment                                              */
/*                                                                     */
/*  When a farmer pins their field, we converge three API calls to    */
/*  build a complete location profile:                                 */
/*    1. Mapbox Geocoding — municipality name                         */
/*    2. Open-Meteo Elevation — field altitude in meters              */
/*    3. Basis Risk — nearest station distance + confidence score     */
/*                                                                     */
/*  This data serves two purposes:                                     */
/*    - Display: "42.283°N · 587m · Kyustendil · 2.1km from station" */
/*    - Risk: confidence score quantifies parametric basis risk       */
/* ================================================================== */

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

/**
 * Reverse geocode a lat/lng to get the nearest municipality name.
 * Uses Mapbox Geocoding API v5 (free tier: 100k requests/month).
 */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place&limit=1&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocode ${res.status}`);
    const data = await res.json();
    return data.features?.[0]?.text ?? "Unknown";
  } catch {
    return "Unknown";
  }
}

/**
 * Fetch elevation for a coordinate using Open-Meteo Elevation API.
 * Free, no key required. Returns elevation in meters above sea level.
 */
async function fetchElevation(lat: number, lng: number): Promise<number> {
  try {
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Elevation ${res.status}`);
    const data = await res.json();
    return data.elevation?.[0] ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Full enrichment pipeline: geocode + elevation + basis risk.
 * All three calls run in parallel for speed.
 */
export async function enrichField(pin: FieldPin): Promise<FieldEnrichment> {
  const [municipality, elevation] = await Promise.all([
    reverseGeocode(pin.lat, pin.lng),
    fetchElevation(pin.lat, pin.lng),
  ]);

  const { station, distanceKm } = findNearestStation(pin);
  const confidence = calculateBasisRiskConfidence(
    distanceKm,
    elevation,
    station.elevation,
  );

  return {
    municipality,
    elevation: Math.round(elevation),
    nearestStation: station,
    stationDistance: distanceKm,
    basisRiskConfidence: confidence,
  };
}
