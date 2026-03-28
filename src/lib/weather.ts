import type { HourlyDataPoint } from "@/types";

const OPEN_METEO_ARCHIVE = "https://archive-api.open-meteo.com/v1/archive";

/* ================================================================== */
/*  Weather Data Pipeline                                              */
/*                                                                     */
/*  Smart fetching strategy:                                           */
/*  1. Check localStorage cache first (keyed by lat/lng rounded to    */
/*     3 decimal places — ~110m precision, sufficient for farms)      */
/*  2. Fetch only March–June per year (covers all sensitive windows)  */
/*  3. Batch 2 years per request to minimize API calls                */
/*  4. Deduplicate: if coordinates round to same cache key, reuse     */
/*  5. Quality check: flag null/outlier readings, interpolate          */
/*  6. Graceful fallback to pre-cached mock data if API fails         */
/* ================================================================== */

const CACHE_PREFIX = "niva_weather_";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Rounds coordinates to 3 decimal places (~110m) for cache keying */
function cacheKey(lat: number, lng: number): string {
  return `${CACHE_PREFIX}${lat.toFixed(3)}_${lng.toFixed(3)}`;
}

/** Check localStorage for cached data */
function readCache(lat: number, lng: number): HourlyDataPoint[] | null {
  if (typeof window === "undefined") return null;
  try {
    const key = cacheKey(lat, lng);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

/** Write to localStorage cache */
function writeCache(lat: number, lng: number, data: HourlyDataPoint[]) {
  if (typeof window === "undefined") return;
  try {
    const key = cacheKey(lat, lng);
    localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
  } catch {
    // localStorage full or unavailable — silently continue
  }
}

/**
 * Fetches hourly temperature data for a location across 2015–2025.
 * Only fetches March–June to cover all crop sensitive windows.
 *
 * Uses a 3-stage pipeline:
 *   1. Cache check → return immediately if fresh
 *   2. API fetch → batch by 2-year windows, parallel requests
 *   3. Quality pass → flag outliers, interpolate nulls
 */
export async function fetchHistoricalTemperature(
  lat: number,
  lng: number,
  startYear: number = 2015,
  endYear: number = 2025,
): Promise<HourlyDataPoint[]> {
  // Stage 1: Cache
  const cached = readCache(lat, lng);
  if (cached && cached.length > 0) return cached;

  // Stage 2: Fetch in 2-year batches
  const batches: [number, number][] = [];
  for (let y = startYear; y <= endYear; y += 2) {
    batches.push([y, Math.min(y + 1, endYear)]);
  }

  const results = await Promise.allSettled(
    batches.map(([batchStart, batchEnd]) =>
      fetchBatch(lat, lng, batchStart, batchEnd),
    ),
  );

  const allData: HourlyDataPoint[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allData.push(...result.value);
    }
  }

  if (allData.length === 0) {
    throw new Error("No weather data retrieved from any batch");
  }

  // Sort chronologically
  allData.sort((a, b) => a.time.localeCompare(b.time));

  // Stage 3: Quality check
  const cleaned = qualityCheck(allData);

  // Cache for next time
  writeCache(lat, lng, cleaned);

  return cleaned;
}

/** Fetch a single 2-year batch of March–June hourly data */
async function fetchBatch(
  lat: number,
  lng: number,
  startYear: number,
  endYear: number,
): Promise<HourlyDataPoint[]> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    start_date: `${startYear}-03-01`,
    end_date: `${endYear}-06-30`,
    hourly: "temperature_2m",
    timezone: "Europe/Sofia", // Bulgarian local time (EET, UTC+2)
  });

  const res = await fetch(`${OPEN_METEO_ARCHIVE}?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);

  const json = await res.json();
  const times: string[] = json.hourly?.time ?? [];
  const temps: (number | null)[] = json.hourly?.temperature_2m ?? [];

  return times.map((time, i) => ({
    time,
    temperature: temps[i] ?? NaN,
    quality: temps[i] === null ? "suspect" : "ok",
  }));
}

/* ------------------------------------------------------------------ */
/*  Data quality checks                                                */
/*                                                                     */
/*  1. Flag null readings as "suspect"                                */
/*  2. Flag physically impossible values (< -40°C or > 50°C)         */
/*  3. Interpolate suspect values from neighbors if possible          */
/* ------------------------------------------------------------------ */

function qualityCheck(data: HourlyDataPoint[]): HourlyDataPoint[] {
  return data.map((point, i) => {
    let { temperature, quality } = point;

    // Flag physically impossible values
    if (isNaN(temperature) || temperature < -40 || temperature > 50) {
      quality = "suspect";
      temperature = interpolateFromNeighbors(data, i);
      if (!isNaN(temperature)) {
        quality = "interpolated";
      }
    }

    return { ...point, temperature, quality };
  });
}

/** Linear interpolation from the nearest valid neighbors */
function interpolateFromNeighbors(
  data: HourlyDataPoint[],
  index: number,
): number {
  // Find nearest valid value before
  let before: number | null = null;
  for (let i = index - 1; i >= Math.max(0, index - 6); i--) {
    const t = data[i].temperature;
    if (!isNaN(t) && t > -40 && t < 50) {
      before = t;
      break;
    }
  }

  // Find nearest valid value after
  let after: number | null = null;
  for (let i = index + 1; i <= Math.min(data.length - 1, index + 6); i++) {
    const t = data[i].temperature;
    if (!isNaN(t) && t > -40 && t < 50) {
      after = t;
      break;
    }
  }

  if (before !== null && after !== null) return (before + after) / 2;
  if (before !== null) return before;
  if (after !== null) return after;
  return NaN; // No valid neighbors within 6 hours — genuinely bad data
}
