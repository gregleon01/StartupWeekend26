import area from "@turf/area";
import { polygon } from "@turf/helpers";

/**
 * Compute the area of a polygon in hectares.
 * Uses Turf.js geodesic area calculation (accounts for Earth's curvature).
 *
 * @param coords Array of [lng, lat] coordinate pairs
 * @returns Area in hectares, rounded to 1 decimal place
 */
export function computeHectares(coords: [number, number][]): number {
  if (coords.length < 3) return 0;

  // Close the polygon ring
  const ring = [...coords, coords[0]];
  const poly = polygon([ring]);
  const sqMeters = area(poly);

  return +(sqMeters / 10_000).toFixed(1);
}

/**
 * Compute the centroid of a polygon.
 * Simple average — good enough for farm-scale polygons.
 */
export function computeCentroid(
  coords: [number, number][],
): { lat: number; lng: number } {
  let latSum = 0;
  let lngSum = 0;
  for (const [lng, lat] of coords) {
    latSum += lat;
    lngSum += lng;
  }
  return {
    lat: latSum / coords.length,
    lng: lngSum / coords.length,
  };
}
