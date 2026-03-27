import type { HourlyDataPoint } from "@/types";

const OPEN_METEO_ARCHIVE = "https://archive-api.open-meteo.com/v1/archive";

/**
 * Fetches hourly temperature data for a location across multiple years.
 * Only fetches March–June to cover all crop sensitive windows while
 * minimizing API calls. Open-Meteo allows max ~1 year per request,
 * so we batch by year and merge results.
 */
export async function fetchHistoricalTemperature(
  lat: number,
  lng: number,
  startYear: number = 2015,
  endYear: number = 2025,
): Promise<HourlyDataPoint[]> {
  const allData: HourlyDataPoint[] = [];

  // Batch requests — fetch 2 years at a time for efficiency
  const batches: [number, number][] = [];
  for (let y = startYear; y <= endYear; y += 2) {
    batches.push([y, Math.min(y + 1, endYear)]);
  }

  const results = await Promise.allSettled(
    batches.map(async ([batchStart, batchEnd]) => {
      const startDate = `${batchStart}-03-01`;
      const endDate = `${batchEnd}-06-30`;

      const params = new URLSearchParams({
        latitude: lat.toFixed(4),
        longitude: lng.toFixed(4),
        start_date: startDate,
        end_date: endDate,
        hourly: "temperature_2m",
        timezone: "Europe/Sofia",
      });

      const res = await fetch(`${OPEN_METEO_ARCHIVE}?${params}`);
      if (!res.ok) throw new Error(`API ${res.status}`);

      const json = await res.json();
      const times: string[] = json.hourly?.time ?? [];
      const temps: (number | null)[] = json.hourly?.temperature_2m ?? [];

      return times
        .map((time, i) => ({
          time,
          temperature: temps[i] ?? 0,
        }))
        .filter((d) => d.temperature !== null);
    }),
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      allData.push(...result.value);
    }
  }

  // Sort chronologically
  allData.sort((a, b) => a.time.localeCompare(b.time));
  return allData;
}
