"use client";

import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import type { AppState, CropKey, FieldPin, ParametricContract } from "@/types";
import { contracts } from "@/lib/contracts";
import { useWeatherData } from "@/hooks/useWeatherData";

import MapView from "@/components/MapView";
import CropSelector from "@/components/CropSelector";
import HistoricalTimeline from "@/components/HistoricalTimeline";
import CoverageCard from "@/components/CoverageCard";
import FrostSimulation from "@/components/FrostSimulation";

export default function Home() {
  const [state, setState] = useState<AppState>("MAP_SELECT");
  const [pin, setPin] = useState<FieldPin | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<CropKey | null>(null);
  const [contract, setContract] = useState<ParametricContract | null>(null);

  const weather = useWeatherData();

  const handlePinDrop = useCallback((p: FieldPin) => {
    setPin(p);
    // Small delay to let fly-to animation start
    setTimeout(() => setState("CROP_SELECT"), 800);
  }, []);

  const handleCropSelect = useCallback(
    (crop: CropKey) => {
      setSelectedCrop(crop);
      const c = contracts[crop];
      setContract(c);
      setState("HISTORY");

      // Start fetching weather data immediately
      if (pin) {
        weather.fetchAndAnalyze(pin.lat, pin.lng, c);
      }
    },
    [pin, weather],
  );

  const handleSeeCoverage = useCallback(() => {
    setState("COVERAGE");
  }, []);

  const handleSimulate = useCallback(() => {
    setState("SIMULATION");
  }, []);

  // Determine if map should be dimmed
  const mapDimmed =
    state === "CROP_SELECT" ||
    state === "COVERAGE";

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-bg-primary">
      {/* Map — always present */}
      <MapView
        pin={pin}
        onPinDrop={handlePinDrop}
        appState={state}
        dimmed={mapDimmed}
      />

      {/* State overlays */}
      <AnimatePresence mode="wait">
        {state === "CROP_SELECT" && (
          <CropSelector key="crop" onSelect={handleCropSelect} />
        )}

        {state === "HISTORY" && contract && (
          <HistoricalTimeline
            key="history"
            events={weather.frostEvents}
            contract={contract}
            loading={weather.loading}
            onSeeCoverage={handleSeeCoverage}
          />
        )}

        {state === "COVERAGE" && contract && (
          <CoverageCard
            key="coverage"
            contract={contract}
            onSimulate={handleSimulate}
          />
        )}
      </AnimatePresence>

      {/* Simulation — layered on top of everything */}
      {state === "SIMULATION" && contract && (
        <FrostSimulation key="simulation" contract={contract} />
      )}
    </main>
  );
}
