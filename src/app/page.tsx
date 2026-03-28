"use client";

import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import type { AppState, CropKey, FieldPin, ParametricContract, FieldEnrichment } from "@/types";
import { contracts } from "@/lib/contracts";
import { useWeatherData } from "@/hooks/useWeatherData";
import { enrichField } from "@/lib/geoEnrich";

import MapView from "@/components/MapView";
import CropSelector from "@/components/CropSelector";
import FieldInfoBar from "@/components/FieldInfoBar";
import HistoricalTimeline from "@/components/HistoricalTimeline";
import CoverageCard from "@/components/CoverageCard";
import FrostSimulation from "@/components/FrostSimulation";

export default function Home() {
  const [state, setState] = useState<AppState>("MAP_SELECT");
  const [pin, setPin] = useState<FieldPin | null>(null);
  const [contract, setContract] = useState<ParametricContract | null>(null);
  const [enrichment, setEnrichment] = useState<FieldEnrichment | null>(null);

  const weather = useWeatherData();

  const handlePinDrop = useCallback(async (p: FieldPin) => {
    setPin(p);
    // Start enrichment immediately (geocode + elevation + basis risk)
    enrichField(p).then(setEnrichment);
    setTimeout(() => setState("CROP_SELECT"), 800);
  }, []);

  const handleCropSelect = useCallback(
    (crop: CropKey) => {
      const c = contracts[crop];
      setContract(c);
      setState("HISTORY");
      if (pin) weather.fetchAndAnalyze(pin.lat, pin.lng, c);
    },
    [pin, weather],
  );

  const handleSeeCoverage = useCallback(() => setState("COVERAGE"), []);
  const handleSimulate = useCallback(() => setState("SIMULATION"), []);

  const mapDimmed = state === "CROP_SELECT" || state === "COVERAGE";

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-bg-primary">
      <MapView
        pin={pin}
        onPinDrop={handlePinDrop}
        appState={state}
        dimmed={mapDimmed}
      />

      {/* Field info bar — shows after pin is placed */}
      {pin && enrichment && state !== "MAP_SELECT" && state !== "SIMULATION" && (
        <FieldInfoBar pin={pin} enrichment={enrichment} />
      )}

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
            enrichment={enrichment}
          />
        )}
      </AnimatePresence>

      {state === "SIMULATION" && contract && (
        <FrostSimulation key="simulation" contract={contract} />
      )}
    </main>
  );
}
