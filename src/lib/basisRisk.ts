import type { WeatherStation, FieldPin } from "@/types";

/* ================================================================== */
/*  Basis Risk Calculator                                              */
/*                                                                     */
/*  Basis risk is the core technical problem in parametric insurance:  */
/*  the weather station reading may not match the actual conditions    */
/*  at the farmer's field. A station 10km away in a valley may read   */
/*  -1°C while the hilltop field is at +1°C — or vice versa.         */
/*                                                                     */
/*  We quantify this as a confidence score: the probability that the  */
/*  station's trigger evaluation matches what actually happened at    */
/*  the field. Confidence degrades with:                               */
/*    - Distance to station (primary factor)                          */
/*    - Elevation difference (cold air pools in valleys)              */
/*    - Terrain complexity (mountains vs plains)                      */
/*                                                                     */
/*  Model: confidence = 1 - (distance_penalty + elevation_penalty)    */
/*    distance_penalty = min(distance_km / 25, 0.5)                  */
/*    elevation_penalty = min(|elev_diff| / 500, 0.3)                */
/*                                                                     */
/*  A field 2km from the station at similar elevation: ~92% confidence*/
/*  A field 15km away with 300m elevation difference: ~52% confidence */
/* ================================================================== */

/** Bulgarian weather stations with known coordinates and elevations */
export const WEATHER_STATIONS: WeatherStation[] = [
  { id: "bg-kyustendil", name: "Kyustendil", lat: 42.283, lng: 22.694, elevation: 520 },
  { id: "bg-sofia", name: "Sofia", lat: 42.698, lng: 23.322, elevation: 595 },
  { id: "bg-plovdiv", name: "Plovdiv", lat: 42.150, lng: 24.750, elevation: 160 },
  { id: "bg-sandanski", name: "Sandanski", lat: 41.567, lng: 23.283, elevation: 206 },
  { id: "bg-blagoevgrad", name: "Blagoevgrad", lat: 42.017, lng: 23.100, elevation: 395 },
  { id: "bg-pernik", name: "Pernik", lat: 42.600, lng: 23.033, elevation: 750 },
  { id: "bg-dupnitsa", name: "Dupnitsa", lat: 42.267, lng: 23.117, elevation: 530 },
  { id: "bg-montana", name: "Montana", lat: 43.417, lng: 23.217, elevation: 155 },
  { id: "bg-pleven", name: "Pleven", lat: 43.417, lng: 24.617, elevation: 135 },
  { id: "bg-vt", name: "Veliko Tarnovo", lat: 43.083, lng: 25.633, elevation: 190 },
  { id: "bg-ruse", name: "Ruse", lat: 43.850, lng: 25.950, elevation: 40 },
  { id: "bg-varna", name: "Varna", lat: 43.217, lng: 27.917, elevation: 40 },
  { id: "bg-burgas", name: "Burgas", lat: 42.500, lng: 27.467, elevation: 20 },
  { id: "bg-stara-zagora", name: "Stara Zagora", lat: 42.433, lng: 25.617, elevation: 196 },
  { id: "bg-pazardzhik", name: "Pazardzhik", lat: 42.200, lng: 24.333, elevation: 213 },
  { id: "bg-lovech", name: "Lovech", lat: 43.133, lng: 24.717, elevation: 220 },
  { id: "bg-vratsa", name: "Vratsa", lat: 43.200, lng: 23.550, elevation: 340 },
  { id: "bg-kardzhali", name: "Kardzhali", lat: 41.633, lng: 25.367, elevation: 330 },
  { id: "bg-smolyan", name: "Smolyan", lat: 41.583, lng: 24.717, elevation: 1050 },
  { id: "bg-dobrich", name: "Dobrich", lat: 43.567, lng: 27.833, elevation: 222 },
];

/**
 * Haversine distance between two points in kilometers.
 */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Find the nearest weather station to a field location.
 */
export function findNearestStation(pin: FieldPin): {
  station: WeatherStation;
  distanceKm: number;
} {
  let nearest = WEATHER_STATIONS[0];
  let minDist = Infinity;

  for (const station of WEATHER_STATIONS) {
    const dist = haversineKm(pin.lat, pin.lng, station.lat, station.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = station;
    }
  }

  return { station: nearest, distanceKm: +minDist.toFixed(1) };
}

/**
 * Calculate basis risk confidence score.
 *
 * Returns a value between 0 and 1 representing the probability that
 * the weather station's reading accurately represents conditions at
 * the farmer's field.
 *
 * @param distanceKm - distance from field to nearest station
 * @param fieldElevation - elevation of the field in meters
 * @param stationElevation - elevation of the station in meters
 */
export function calculateBasisRiskConfidence(
  distanceKm: number,
  fieldElevation: number,
  stationElevation: number,
): number {
  // Distance penalty: 0 at 0km, maxes at 0.5 at 25km+
  const distancePenalty = Math.min(distanceKm / 25, 0.5);

  // Elevation penalty: 0 at same elevation, maxes at 0.3 at 500m+ difference
  const elevDiff = Math.abs(fieldElevation - stationElevation);
  const elevationPenalty = Math.min(elevDiff / 500, 0.3);

  const confidence = Math.max(0, 1 - distancePenalty - elevationPenalty);
  return +confidence.toFixed(2);
}

/**
 * Pearson correlation coefficient between two paired numeric arrays.
 * Returns a value in [-1, 1]. Used to measure how closely a field's
 * ERA5 temperature series tracks the nearest station's ERA5 series.
 *
 * r = Σ((a - ā)(b - b̄)) / √(Σ(a - ā)² × Σ(b - b̄)²)
 */
export function pearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 10) return 0;

  const meanA = a.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const meanB = b.slice(0, n).reduce((s, v) => s + v, 0) / n;

  let num = 0, varA = 0, varB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    varA += da * da;
    varB += db * db;
  }

  const denom = Math.sqrt(varA * varB);
  if (denom === 0) return 0;
  return Math.max(0, Math.min(1, num / denom));
}

/**
 * Compute ERA5-based basis risk confidence from two aligned temperature maps.
 *
 * Two-component score:
 *   1. Pearson r between field and station ERA5 spring temperatures
 *      (captures climate divergence across different grid cells)
 *   2. Distance discount of 1% per km
 *      (differentiates farms within the same ~25km ERA5 grid cell,
 *       where Pearson r is always ~0.99 but microclimate risk still grows)
 *
 * Result: pearsonR − (distanceKm / 100), clamped to [0, 1]
 */
export function computeCorrelationConfidence(
  fieldTemps: Map<string, number>,
  stationTemps: Map<string, number>,
  distanceKm: number,
): number {
  const fieldArr: number[] = [];
  const stationArr: number[] = [];

  for (const [ts, fieldTemp] of fieldTemps) {
    const stationTemp = stationTemps.get(ts);
    if (stationTemp !== undefined) {
      fieldArr.push(fieldTemp);
      stationArr.push(stationTemp);
    }
  }

  const r = fieldArr.length >= 10 ? pearsonCorrelation(fieldArr, stationArr) : 0.75;
  const distanceDiscount = distanceKm / 100;
  return +Math.max(0, Math.min(1, r - distanceDiscount)).toFixed(2);
}

/**
 * Assign each field to a weather station zone for correlation analysis.
 * Fields in the same zone share the same trigger — if one triggers,
 * all in the zone likely trigger. This is correlated risk.
 */
export function assignStationZone(lat: number, lng: number): string {
  const { station } = findNearestStation({ lat, lng });
  return station.id;
}
