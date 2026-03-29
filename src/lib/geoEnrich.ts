import type { FieldPin, FieldEnrichment } from "@/types";
import { findNearestStation, computeCorrelationConfidence } from "./basisRisk";
import { fetchSpringTemperatures } from "./weather";

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
/** Offline municipality lookup — covers the major agricultural regions */
const MUNICIPALITY_FALLBACK: { lat: number; lng: number; name: string; radius: number }[] = [
  { lat: 42.283, lng: 22.694, name: "Kyustendil", radius: 0.3 },
  { lat: 42.698, lng: 23.322, name: "Sofia", radius: 0.4 },
  { lat: 42.150, lng: 24.750, name: "Plovdiv", radius: 0.4 },
  { lat: 41.567, lng: 23.283, name: "Sandanski", radius: 0.3 },
  { lat: 42.017, lng: 23.100, name: "Blagoevgrad", radius: 0.3 },
  { lat: 42.267, lng: 23.117, name: "Dupnitsa", radius: 0.2 },
  { lat: 43.417, lng: 23.217, name: "Montana", radius: 0.3 },
  { lat: 43.417, lng: 24.617, name: "Pleven", radius: 0.3 },
  { lat: 43.083, lng: 25.633, name: "Veliko Tarnovo", radius: 0.3 },
  { lat: 43.850, lng: 25.950, name: "Ruse", radius: 0.3 },
  { lat: 43.217, lng: 27.917, name: "Varna", radius: 0.4 },
  { lat: 42.500, lng: 27.467, name: "Burgas", radius: 0.4 },
  { lat: 42.433, lng: 25.617, name: "Stara Zagora", radius: 0.3 },
  { lat: 42.200, lng: 24.333, name: "Pazardzhik", radius: 0.3 },
];

function offlineGeocode(lat: number, lng: number): string {
  let nearest = "Unknown";
  let minDist = Infinity;
  for (const m of MUNICIPALITY_FALLBACK) {
    const dist = Math.sqrt((lat - m.lat) ** 2 + (lng - m.lng) ** 2);
    if (dist < m.radius && dist < minDist) {
      minDist = dist;
      nearest = m.name;
    }
  }
  return nearest;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    if (!MAPBOX_TOKEN) return offlineGeocode(lat, lng);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place&limit=1&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocode ${res.status}`);
    const data = await res.json();
    return data.features?.[0]?.text ?? offlineGeocode(lat, lng);
  } catch {
    return offlineGeocode(lat, lng);
  }
}

/**
 * Fetch elevation for a coordinate using Open-Meteo Elevation API.
 * Free, no key required. Returns elevation in meters above sea level.
 */
/**
 * Estimate elevation offline using nearest weather station as proxy.
 * Stations have known elevations — use the nearest one as a rough estimate.
 */
function offlineElevation(lat: number, lng: number): number {
  const { station } = findNearestStation({ lat, lng });
  return station.elevation;
}

async function fetchElevation(lat: number, lng: number): Promise<number> {
  try {
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Elevation ${res.status}`);
    const data = await res.json();
    return data.elevation?.[0] ?? offlineElevation(lat, lng);
  } catch {
    return offlineElevation(lat, lng);
  }
}

/**
 * Full enrichment pipeline: geocode + elevation + ERA5 correlation confidence.
 * Geocode and elevation run in parallel. ERA5 correlation fetches two
 * temperature series (field + nearest station) and computes Pearson r —
 * the real statistical measure of how well the station represents the field.
 */
export async function enrichField(pin: FieldPin): Promise<FieldEnrichment> {
  const { station, distanceKm } = findNearestStation(pin);

  const [municipality, elevation, fieldTemps, stationTemps] = await Promise.all([
    reverseGeocode(pin.lat, pin.lng),
    fetchElevation(pin.lat, pin.lng),
    fetchSpringTemperatures(pin.lat, pin.lng).catch(() => new Map<string, number>()),
    fetchSpringTemperatures(station.lat, station.lng).catch(() => new Map<string, number>()),
  ]);

  const confidence = fieldTemps.size > 0 && stationTemps.size > 0
    ? computeCorrelationConfidence(fieldTemps, stationTemps, distanceKm)
    : fallbackConfidence(distanceKm, Math.round(elevation), station.elevation);

  return {
    municipality,
    elevation: Math.round(elevation),
    nearestStation: station,
    stationDistance: distanceKm,
    basisRiskConfidence: confidence,
  };
}

/** Distance/elevation fallback if ERA5 is unavailable */
function fallbackConfidence(
  distanceKm: number,
  fieldElevation: number,
  stationElevation: number,
): number {
  const distancePenalty = Math.min(distanceKm / 25, 0.5);
  const elevDiff = Math.abs(fieldElevation - stationElevation);
  const elevationPenalty = Math.min(elevDiff / 500, 0.3);
  return +Math.max(0, 1 - distancePenalty - elevationPenalty).toFixed(2);
}
