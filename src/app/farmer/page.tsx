"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import type { AppState, CropKey, FieldPin, ParametricContract, FieldEnrichment } from "@/types";
import { contracts } from "@/lib/contracts";
import { useWeatherData } from "@/hooks/useWeatherData";
import { enrichField } from "@/lib/geoEnrich";

import { useLocale } from "@/lib/i18n";
import LanguageToggle from "@/components/LanguageToggle";
import MapView from "@/components/MapView";
import CropSelector from "@/components/CropSelector";
import FieldInfoBar from "@/components/FieldInfoBar";
import HistoricalTimeline from "@/components/HistoricalTimeline";
import CoverageCard from "@/components/CoverageCard";
import FrostSimulation from "@/components/FrostSimulation";

export default function FarmerPage() {
  const { t } = useLocale();
  const [state, setState] = useState<AppState>("MAP_SELECT");
  const [pin, setPin] = useState<FieldPin | null>(null);
  const [contract, setContract] = useState<ParametricContract | null>(null);
  const [enrichment, setEnrichment] = useState<FieldEnrichment | null>(null);

  const weather = useWeatherData();

  const handlePinDrop = useCallback(async (p: FieldPin) => {
    setPin(p);
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

  const handleBack = useCallback(() => {
    if (state === "CROP_SELECT") {
      setPin(null);
      setEnrichment(null);
      setState("MAP_SELECT");
    } else if (state === "HISTORY") {
      setContract(null);
      setState("CROP_SELECT");
    } else if (state === "COVERAGE") {
      setState("HISTORY");
    }
  }, [state]);

  const handleRestart = useCallback(() => {
    setPin(null);
    setEnrichment(null);
    setContract(null);
    setState("MAP_SELECT");
  }, []);

  const handleSeeCoverage = useCallback(() => setState("COVERAGE"), []);
  const handleSimulate = useCallback(() => setState("SIMULATION"), []);

  const mapDimmed = state === "CROP_SELECT" || state === "COVERAGE";
  const showBack = state === "CROP_SELECT" || state === "HISTORY" || state === "COVERAGE";

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-bg-primary">
      <MapView
        pin={pin}
        onPinDrop={handlePinDrop}
        appState={state}
        dimmed={mapDimmed}
      />

      {/* Language toggle — always top-right */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageToggle />
      </div>

      {/* Back button */}
      {showBack && (
        <motion.button
          onClick={handleBack}
          className={`absolute ${state === "HISTORY" ? "top-14" : "top-4"} left-4 z-40 flex items-center gap-1.5 px-3 py-1.5
                     bg-bg-secondary border border-border-subtle
                     rounded-lg text-text-secondary text-xs hover:text-text-primary
                     hover:brightness-110 transition-all cursor-pointer`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
        >
          <ArrowLeft className="w-3 h-3" />
          {t("back")}
        </motion.button>
      )}

      {/* Field info bar */}
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
        <FrostSimulation
          key="simulation"
          contract={contract}
          onExit={handleRestart}
        />
      )}
    </main>
  );
}
