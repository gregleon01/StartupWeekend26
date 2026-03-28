"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { CropKey, FarmerParcel, ParametricContract, FieldEnrichment } from "@/types";
import { contracts } from "@/lib/contracts";
import { useWeatherData } from "@/hooks/useWeatherData";
import { enrichField } from "@/lib/geoEnrich";
import { computeHectares, computeCentroid } from "@/lib/geo";

import { useLocale } from "@/lib/i18n";
import LanguageToggle from "@/components/LanguageToggle";
import { type OverlayMode } from "@/components/WeatherOverlay";
import { Cloud, CloudRain, Thermometer, Layers, ChevronDown } from "lucide-react";
import DrawableMap from "@/components/DrawableMap";
import ParcelCropSheet from "@/components/ParcelCropSheet";
import ParcelSidebar from "@/components/ParcelSidebar";
import FieldInfoBar from "@/components/FieldInfoBar";
import HistoricalTimeline from "@/components/HistoricalTimeline";
import CoverageCard from "@/components/CoverageCard";
import FrostSimulation from "@/components/FrostSimulation";

type FarmerState =
  | "DRAWING"        // Drawing polygon on map
  | "ASSIGN_CROP"    // Polygon drawn, pick crop
  | "PARCELS"        // Viewing all parcels, can add more
  | "HISTORY"        // Viewing frost history for selected parcel
  | "COVERAGE"       // Coverage offer
  | "SIMULATION";    // Frost simulation

export default function FarmerPage() {
  const { locale } = useLocale();
  const [state, setState] = useState<FarmerState>("DRAWING");
  const [parcels, setParcels] = useState<FarmerParcel[]>([]);
  const [pendingCoords, setPendingCoords] = useState<[number, number][] | null>(null);
  const [pendingHectares, setPendingHectares] = useState(0);
  const [activeParcel, setActiveParcel] = useState<FarmerParcel | null>(null);
  const [contract, setContract] = useState<ParametricContract | null>(null);
  const [enrichment, setEnrichment] = useState<FieldEnrichment | null>(null);

  const weather = useWeatherData();
  const [weatherMode, setWeatherMode] = useState<OverlayMode>("none");
  const [weatherOpen, setWeatherOpen] = useState(false);

  // Polygon completed — show crop selector
  const handlePolygonComplete = useCallback((coords: [number, number][]) => {
    const ha = computeHectares(coords);
    setPendingCoords(coords);
    setPendingHectares(ha);
    setState("ASSIGN_CROP");
  }, []);

  // Crop selected for the drawn polygon
  const handleCropAssign = useCallback(
    (crop: CropKey) => {
      if (!pendingCoords) return;
      const cent = computeCentroid(pendingCoords);
      const parcel: FarmerParcel = {
        id: `parcel-${Date.now()}`,
        coordinates: pendingCoords,
        hectares: pendingHectares,
        crop,
        centroid: cent,
      };
      setParcels((prev) => [...prev, parcel]);
      setPendingCoords(null);
      setPendingHectares(0);
      setState("PARCELS");
    },
    [pendingCoords, pendingHectares],
  );

  const handleAddMore = useCallback(() => {
    setState("DRAWING");
  }, []);

  // Continue to coverage analysis — use the first/largest parcel
  const handleContinue = useCallback(() => {
    if (parcels.length === 0) return;
    // Pick the largest parcel for the demo
    const largest = [...parcels].sort((a, b) => b.hectares - a.hectares)[0];
    setActiveParcel(largest);
    const c = contracts[largest.crop];
    setContract(c);
    setState("HISTORY");

    // Enrich and fetch weather for the parcel centroid
    enrichField(largest.centroid).then(setEnrichment);
    weather.fetchAndAnalyze(largest.centroid.lat, largest.centroid.lng, c);
  }, [parcels, weather]);

  // Remove a parcel
  const handleRemove = useCallback((id: string) => {
    setParcels((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleSeeCoverage = useCallback(() => setState("COVERAGE"), []);
  const handleSimulate = useCallback(() => setState("SIMULATION"), []);

  const handleRestart = useCallback(() => {
    setParcels([]);
    setActiveParcel(null);
    setContract(null);
    setEnrichment(null);
    setState("DRAWING");
  }, []);

  const handleBack = useCallback(() => {
    if (state === "ASSIGN_CROP") {
      setPendingCoords(null);
      setState(parcels.length > 0 ? "PARCELS" : "DRAWING");
    } else if (state === "PARCELS") {
      setState("DRAWING");
    } else if (state === "HISTORY") {
      setActiveParcel(null);
      setContract(null);
      setState("PARCELS");
    } else if (state === "COVERAGE") {
      setState("HISTORY");
    }
  }, [state, parcels.length]);

  const drawingEnabled = state === "DRAWING";
  const showBack = state === "ASSIGN_CROP" || state === "PARCELS" || state === "HISTORY" || state === "COVERAGE";
  const mapDimmed = state === "ASSIGN_CROP" || state === "COVERAGE";

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-bg-primary">
      <DrawableMap
        parcels={parcels}
        drawingEnabled={drawingEnabled}
        onPolygonComplete={handlePolygonComplete}
        dimmed={mapDimmed}
        weatherMode={weatherMode}
        onWeatherModeChange={setWeatherMode}
      />

      {/* Unified top bar pill — two rows */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 w-[580px]
                      bg-white/8 backdrop-blur-xl border border-white/12 rounded-full
                      overflow-hidden shadow-xl">

        {/* Row 1: context label */}
        <div className="px-8 pt-2 pb-1.5 text-center">
          <motion.p
            key={state}
            className="text-white text-sm font-medium tracking-wide"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {state === "DRAWING" && (locale === "bg" ? "Начертайте полето" : "Draw your field boundary")}
            {state === "ASSIGN_CROP" && (locale === "bg" ? "Изберете култура" : "Select crop")}
            {state === "PARCELS" && (locale === "bg" ? "Вашите полета" : "Your fields")}
            {state === "HISTORY" && (locale === "bg" ? "Исторически анализ" : "Frost history")}
            {state === "COVERAGE" && (locale === "bg" ? "Покритие" : "Coverage")}
            {state === "SIMULATION" && (locale === "bg" ? "Симулация" : "Simulation")}
          </motion.p>
        </div>

        {/* Horizontal divider */}
        <div className="h-px bg-white/8 mx-4" />

        {/* Row 2: actions */}
        <div className="flex items-center justify-center gap-1 px-2 pb-1">
          {/* Aklima home */}
          <Link
            href="/"
            className="flex items-center px-4 py-1.5 text-white/50 text-xs
                       hover:text-white hover:bg-white/10 rounded-full transition-all whitespace-nowrap outline-none"
          >
            Aklima
          </Link>

          {/* Back — in-flow navigation */}
          <AnimatePresence>
            {showBack && (
              <motion.button
                onClick={handleBack}
                className="flex items-center gap-1 px-4 py-1.5 text-white/70 text-xs font-medium
                           hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer outline-none whitespace-nowrap"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
              >
                <ArrowLeft className="w-3 h-3" />
                {locale === "bg" ? "Назад" : "Back"}
              </motion.button>
            )}
          </AnimatePresence>

          {/* Divider */}
          <div className="w-px h-3.5 bg-white/12 mx-1" />

          {/* Layers */}
          <button
            onClick={() => setWeatherOpen((o) => !o)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-white/70 text-xs
                       hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer outline-none"
          >
            {weatherMode === "none" && <Layers className="w-3.5 h-3.5" />}
            {weatherMode === "clouds" && <Cloud className="w-3.5 h-3.5" />}
            {weatherMode === "radar" && <CloudRain className="w-3.5 h-3.5" />}
            {weatherMode === "temperature" && <Thermometer className="w-3.5 h-3.5" />}
            <span>{weatherMode === "none" ? "Layers" : weatherMode.charAt(0).toUpperCase() + weatherMode.slice(1)}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${weatherOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Divider */}
          <div className="w-px h-3.5 bg-white/12 mx-1" />

          {/* Language */}
          <div className="px-4 py-1.5 hover:bg-white/10 rounded-full transition-all">
            <LanguageToggle />
          </div>
        </div>
      </div>

      {/* Weather dropdown */}
      <AnimatePresence>
        {weatherOpen && (
          <motion.div
            className="absolute top-[96px] left-1/2 -translate-x-1/2 z-40 w-44
                       bg-white/8 backdrop-blur-xl border border-white/12 rounded-2xl
                       overflow-hidden shadow-xl"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.12 }}
          >
            {([
              { mode: "none" as OverlayMode, icon: <Layers className="w-3.5 h-3.5" />, label: "Off" },
              { mode: "clouds" as OverlayMode, icon: <Cloud className="w-3.5 h-3.5" />, label: "Clouds" },
              { mode: "radar" as OverlayMode, icon: <CloudRain className="w-3.5 h-3.5" />, label: "Radar" },
              { mode: "temperature" as OverlayMode, icon: <Thermometer className="w-3.5 h-3.5" />, label: "Temperature" },
            ]).map(({ mode, icon, label }) => (
              <button
                key={mode}
                onClick={() => { setWeatherMode(mode); setWeatherOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs transition-all cursor-pointer
                  ${weatherMode === mode
                    ? "bg-white/12 text-white font-medium"
                    : "text-white/55 hover:bg-white/8 hover:text-white"
                  }`}
              >
                {icon}
                {label}
                {weatherMode === mode && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-amber" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Field info bar when viewing analysis */}
      {activeParcel && enrichment && (state === "HISTORY" || state === "COVERAGE") && (
        <FieldInfoBar pin={activeParcel.centroid} enrichment={enrichment} />
      )}

      {/* Parcel sidebar — visible only in PARCELS state (drawing still works on the map) */}
      {parcels.length > 0 && state === "PARCELS" && (
        <ParcelSidebar
          parcels={parcels}
          onAddMore={handleAddMore}
          onContinue={handleContinue}
          onRemove={handleRemove}
        />
      )}

      <AnimatePresence mode="wait">
        {/* Crop assignment after polygon drawn */}
        {state === "ASSIGN_CROP" && (
          <ParcelCropSheet
            key="assign"
            hectares={pendingHectares}
            onSelect={handleCropAssign}
          />
        )}

        {/* Historical analysis */}
        {state === "HISTORY" && contract && (
          <HistoricalTimeline
            key="history"
            events={weather.frostEvents}
            contract={contract}
            loading={weather.loading}
            onSeeCoverage={handleSeeCoverage}
          />
        )}

        {/* Coverage card */}
        {state === "COVERAGE" && contract && (
          <CoverageCard
            key="coverage"
            contract={contract}
            onSimulate={handleSimulate}
            enrichment={enrichment}
            parcels={parcels}
          />
        )}
      </AnimatePresence>

      {/* Simulation */}
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
