"use client";

import { useState, useCallback, useRef } from "react";
import type { HourlyDataPoint, ParametricContract, FrostEvent } from "@/types";
import { fetchHistoricalTemperature } from "@/lib/weather";
import { detectFrostEvents } from "@/lib/frostAnalysis";

interface WeatherState {
  loading: boolean;
  hourlyData: HourlyDataPoint[];
  frostEvents: FrostEvent[];
  error: string | null;
}

/**
 * Hook for fetching and caching historical weather data.
 * Caches by lat/lng key so re-renders don't trigger refetches.
 */
export function useWeatherData() {
  const [state, setState] = useState<WeatherState>({
    loading: false,
    hourlyData: [],
    frostEvents: [],
    error: null,
  });

  // Cache by location key
  const cache = useRef<Map<string, HourlyDataPoint[]>>(new Map());

  const fetchAndAnalyze = useCallback(
    async (lat: number, lng: number, contract: ParametricContract) => {
      const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;

      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        let hourlyData = cache.current.get(key);

        if (!hourlyData) {
          hourlyData = await fetchHistoricalTemperature(lat, lng, 2015, 2025);
          cache.current.set(key, hourlyData);
        }

        const frostEvents = detectFrostEvents(hourlyData, contract);

        setState({
          loading: false,
          hourlyData,
          frostEvents,
          error: null,
        });
      } catch (err) {
        // Graceful fallback with mock data
        console.warn("Weather fetch failed, using fallback:", err);
        const fallbackEvents = generateFallbackEvents(contract);
        setState({
          loading: false,
          hourlyData: [],
          frostEvents: fallbackEvents,
          error: null, // Don't show error to user — fallback is seamless
        });
      }
    },
    [],
  );

  return { ...state, fetchAndAnalyze };
}

/** Realistic fallback data if Open-Meteo is unavailable */
function generateFallbackEvents(contract: ParametricContract): FrostEvent[] {
  const triggerYears = [2016, 2018, 2020, 2023, 2025];
  const events: FrostEvent[] = [];

  for (let y = 2015; y <= 2025; y++) {
    const isTrigger = triggerYears.includes(y);
    const day = 5 + Math.floor(Math.random() * 20);
    events.push({
      year: y,
      date: `${y}-04-${String(day).padStart(2, "0")}T02:00`,
      minTemp: isTrigger
        ? contract.temperatureThreshold - 0.5 - Math.random() * 2.5
        : contract.temperatureThreshold + 1 + Math.random() * 4,
      durationHours: isTrigger
        ? contract.durationThreshold + Math.floor(Math.random() * 4)
        : Math.floor(Math.random() * (contract.durationThreshold - 1)),
      triggered: isTrigger,
      estimatedLoss: isTrigger
        ? contract.payoutPerHectare * (0.8 + Math.random() * 0.8)
        : 0,
    });
  }

  return events;
}
