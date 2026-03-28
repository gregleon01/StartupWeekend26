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
  const showBack = state === "ASSIGN_CROP" || state === "HISTORY" || state === "COVERAGE";
  const mapDimmed = state === "ASSIGN_CROP" || state === "COVERAGE";

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-bg-primary">
      <DrawableMap
        parcels={parcels}
        drawingEnabled={drawingEnabled}
        onPolygonComplete={handlePolygonComplete}
        dimmed={mapDimmed}
      />

      {/* Unified top bar pill */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center
                      bg-black/40 backdrop-blur-md border border-white/15 rounded-full
                      overflow-hidden shadow-lg">
        {/* ← Aklima */}
        <Link
          href="/"
          className="flex items-center gap-1.5 px-4 py-2 text-white/70 text-xs hover:text-white
                     hover:bg-white/10 transition-all whitespace-nowrap"
        >
          <ArrowLeft className="w-3 h-3" />
          Aklima
        </Link>

        {/* Divider */}
        <div className="w-px h-4 bg-white/15" />

        {/* Context label */}
        <div className="px-4 py-2 text-xs text-white/80 whitespace-nowrap">
          {state === "DRAWING" && (locale === "bg" ? "Начертайте полето" : "Draw your field boundary")}
          {state === "ASSIGN_CROP" && (locale === "bg" ? "Изберете култура" : "Select crop")}
          {state === "PARCELS" && (locale === "bg" ? "Вашите полета" : "Your fields")}
          {state === "HISTORY" && (locale === "bg" ? "Исторически анализ" : "Frost history")}
          {state === "COVERAGE" && (locale === "bg" ? "Покритие" : "Coverage")}
          {state === "SIMULATION" && (locale === "bg" ? "Симулация" : "Simulation")}
        </div>

        {/* Back button — shown on inner steps */}
        {showBack && (
          <>
            <div className="w-px h-4 bg-white/15" />
            <motion.button
              onClick={handleBack}
              className="px-4 py-2 text-white/60 text-xs hover:text-white hover:bg-white/10
                         transition-all cursor-pointer whitespace-nowrap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              ← {locale === "bg" ? "Назад" : "Back"}
            </motion.button>
          </>
        )}

        {/* Divider */}
        <div className="w-px h-4 bg-white/15" />

        {/* Language toggle inline */}
        <div className="px-3 py-1.5">
          <LanguageToggle />
        </div>
      </div>

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
