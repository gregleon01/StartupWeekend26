"use client";

import { useState, useEffect } from "react";
import { fetchHistoricalTemperature } from "@/lib/weather";
import { detectFrostEvents } from "@/lib/frostAnalysis";
import { contracts } from "@/lib/contracts";
import type { CropKey } from "@/types";

/**
 * Reference coordinate for the Kyustendil portfolio region.
 * Used to fetch real historical weather data to drive trigger rates
 * across all 207 mock fields — replacing the hardcoded i < 15 logic
 * with rates derived from actual FSM evaluation of historical data.
 */
const REGION_CENTER = { lat: 42.28, lng: 22.69 };

/**
 * Fallback trigger rates if the API is unavailable.
 * Conservative estimates based on regional climatology.
 */
const FALLBACK_RATES: Record<CropKey, number> = {
  cherries: 0.36,
  grapes: 0.27,
  wheat: 0.18,
  sunflower: 0.27,
};

export interface PortfolioWeatherResult {
  /** Fraction of years (2015–2025) where each crop's contract would have triggered */
  triggerRates: Record<CropKey, number>;
  /** True while the API fetch is in progress */
  loading: boolean;
  /** True if rates came from real API data, false if fallback was used */
  isLiveData: boolean;
}

/**
 * Fetches 10 years of real hourly temperature data for the portfolio region,
 * runs the parametric FSM for each crop contract, and returns the historical
 * trigger rate per crop. Rates are used to determine which mock fields
 * receive payout-triggered status on the insurer dashboard.
 */
export function usePortfolioWeather(): PortfolioWeatherResult {
  const [triggerRates, setTriggerRates] =
    useState<Record<CropKey, number>>(FALLBACK_RATES);
  const [loading, setLoading] = useState(true);
  const [isLiveData, setIsLiveData] = useState(false);

  useEffect(() => {
    async function run() {
      try {
        const data = await fetchHistoricalTemperature(
          REGION_CENTER.lat,
          REGION_CENTER.lng,
        );

        const rates = {} as Record<CropKey, number>;

        for (const key of Object.keys(contracts) as CropKey[]) {
          const contract = contracts[key];
          const events = detectFrostEvents(data, contract);
          const totalYears = events.length;
          const triggeredYears = events.filter((e) => e.triggered).length;
          // Guard against empty results
          rates[key] = totalYears > 0 ? triggeredYears / totalYears : FALLBACK_RATES[key];
        }

        setTriggerRates(rates);
        setIsLiveData(true);
      } catch {
        // API unavailable — fallback rates already set in initial state
        setIsLiveData(false);
      } finally {
        setLoading(false);
      }
    }

    run();
  }, []);

  return { triggerRates, loading, isLiveData };
}
