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

const CACHE_PREFIX = "aklima_weather_";
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
    // All API batches failed — fall back to synthetic data so the demo
    // never breaks, even without wifi. The mock reproduces a realistic
    // pattern: one trigger-worthy frost event every ~3 years.
    console.warn("Open-Meteo unavailable — using fallback mock data");
    return generateFallbackData(lat, startYear, endYear);
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

/* ------------------------------------------------------------------ */
/*  Fallback mock data generator                                       */
/*                                                                     */
/*  Produces realistic hourly temperature data when the API is down.   */
/*  Uses a deterministic seed based on latitude so the same field      */
/*  always gets the same mock data. Pattern: mild spring nights with   */
/*  occasional frost events matching Kyustendil-region climatology.    */
/* ------------------------------------------------------------------ */

function generateFallbackData(
  lat: number,
  startYear: number,
  endYear: number,
): HourlyDataPoint[] {
  const data: HourlyDataPoint[] = [];
  // Seeded PRNG based on lat for deterministic output
  let seed = Math.abs(Math.round(lat * 1000));
  const rand = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return seed / 2147483647;
  };

  for (let year = startYear; year <= endYear; year++) {
    // Generate March 1 – June 30 hourly data
    const start = new Date(`${year}-03-01T00:00:00`);
    const end = new Date(`${year}-06-30T23:00:00`);

    // Decide if this year has a frost event (~30% chance, like real data)
    const hasFrost = rand() < 0.3;
    // Frost happens in early-mid April
    const frostDay = 5 + Math.floor(rand() * 15); // Apr 5–20
    const frostSeverity = -1.5 - rand() * 3; // -1.5 to -4.5°C

    for (
      let t = start.getTime();
      t <= end.getTime();
      t += 3600_000
    ) {
      const d = new Date(t);
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const hour = d.getHours();

      // Base temperature: seasonal curve + diurnal cycle
      const seasonProgress = ((month - 3) * 30 + day) / 120; // 0→1 over Mar–Jun
      const baseTemp = 2 + seasonProgress * 18; // 2°C in March → 20°C in June
      const diurnal = -5 * Math.cos(((hour - 14) / 24) * 2 * Math.PI); // peak at 2pm
      const noise = (rand() - 0.5) * 2;

      let temp = baseTemp + diurnal + noise;

      // Inject frost event
      if (hasFrost && month === 4 && day === frostDay) {
        // Nighttime frost: 10pm → 7am
        if (hour >= 22 || hour <= 7) {
          const frostProgress = hour >= 22 ? (hour - 22) / 9 : (hour + 2) / 9;
          const frostDip = frostSeverity * Math.sin(frostProgress * Math.PI);
          temp = Math.min(temp, frostDip);
        }
      }

      const timeStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00`;
      data.push({
        time: timeStr,
        temperature: +temp.toFixed(1),
        quality: "ok",
      });
    }
  }

  return data;
}

/**
 * Lightweight ERA5 fetch for correlation analysis.
 * Fetches only March–May for 3 recent years — enough data for a
 * statistically meaningful correlation without a heavy API call.
 * Cached separately from the full historical dataset.
 */
export async function fetchSpringTemperatures(
  lat: number,
  lng: number,
): Promise<Map<string, number>> {
  const cacheKeySuffix = `_spring_${lat.toFixed(3)}_${lng.toFixed(3)}`;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + cacheKeySuffix);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
          return new Map(cached.data);
        }
      }
    } catch { /* ignore */ }
  }

  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    start_date: "2022-03-01",
    end_date: "2024-05-31",
    hourly: "temperature_2m",
    timezone: "Europe/Sofia",
  });

  const res = await fetch(`${OPEN_METEO_ARCHIVE}?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);

  const json = await res.json();
  const times: string[] = json.hourly?.time ?? [];
  const temps: (number | null)[] = json.hourly?.temperature_2m ?? [];

  const map = new Map<string, number>();
  for (let i = 0; i < times.length; i++) {
    if (temps[i] !== null && temps[i] !== undefined) {
      map.set(times[i], temps[i] as number);
    }
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(
        CACHE_PREFIX + cacheKeySuffix,
        JSON.stringify({ timestamp: Date.now(), data: [...map.entries()] }),
      );
    } catch { /* ignore */ }
  }

  return map;
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
