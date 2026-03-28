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
import FarmerOnboarding from "@/components/FarmerOnboarding";
import DrawableMap from "@/components/DrawableMap";
import ParcelCropSheet from "@/components/ParcelCropSheet";
import ParcelSidebar from "@/components/ParcelSidebar";
import FieldInfoBar from "@/components/FieldInfoBar";
import HistoricalTimeline from "@/components/HistoricalTimeline";
import CoverageCard from "@/components/CoverageCard";
import FrostSimulation from "@/components/FrostSimulation";

type FarmerState =
  | "ONBOARDING"     // Farmer enters name + farm info
  | "DRAWING"        // Drawing polygon on map
  | "ASSIGN_CROP"    // Polygon drawn, pick crop
  | "PARCELS"        // Viewing all parcels, can add more
  | "HISTORY"        // Viewing frost history for selected parcel
  | "COVERAGE"       // Coverage offer
  | "SIMULATION";    // Frost simulation

export default function FarmerPage() {
  const { locale } = useLocale();
  const [state, setState] = useState<FarmerState>("ONBOARDING");
  const [farmerName, setFarmerName] = useState("");
  const [farmAddress, setFarmAddress] = useState("");
  const [parcels, setParcels] = useState<FarmerParcel[]>([]);
  const [pendingCoords, setPendingCoords] = useState<[number, number][] | null>(null);
  const [pendingHectares, setPendingHectares] = useState(0);
  const [activeParcel, setActiveParcel] = useState<FarmerParcel | null>(null);
  const [contract, setContract] = useState<ParametricContract | null>(null);
  const [enrichment, setEnrichment] = useState<FieldEnrichment | null>(null);

  const [flyToCoords, setFlyToCoords] = useState<[number, number] | null>(null);

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

  // Geocode the typed address and fly the map there, then enable drawing
  const handleAddMore = useCallback(async (address: string) => {
    if (address.trim()) {
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&limit=1&bbox=22.3,41.2,28.6,44.2`
        );
        const data = await res.json();
        const coords = data.features?.[0]?.center as [number, number] | undefined;
        if (coords) setFlyToCoords(coords);
      } catch { /* silently ignore */ }
    }
    setState("DRAWING");
  }, []);

  // Analyze the most valuable parcel (highest payout × hectares)
  // The CoverageCard already shows the full multi-parcel breakdown
  const handleContinue = useCallback(() => {
    if (parcels.length === 0) return;
    const mostValuable = [...parcels].sort(
      (a, b) =>
        b.hectares * contracts[b.crop].payoutPerHectare -
        a.hectares * contracts[a.crop].payoutPerHectare,
    )[0];
    setActiveParcel(mostValuable);
    const c = contracts[mostValuable.crop];
    setContract(c);
    setState("HISTORY");

    // Enrich and fetch weather for this parcel's centroid
    enrichField(mostValuable.centroid).then(setEnrichment);
    weather.fetchAndAnalyze(mostValuable.centroid.lat, mostValuable.centroid.lng, c);
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
    setState("ONBOARDING");
  }, []);

  const handleBack = useCallback(() => {
    if (state === "DRAWING") {
      setState("ONBOARDING");
    } else if (state === "ASSIGN_CROP") {
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

  const drawingEnabled = state === "DRAWING" || state === "PARCELS";
  const showBack = state === "DRAWING" || state === "ASSIGN_CROP" || state === "PARCELS" || state === "HISTORY" || state === "COVERAGE";
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
        flyTo={flyToCoords}
      />

      {/* Aklima home — top left */}
      <Link
        href="/"
        className="absolute top-4 left-4 z-40 flex items-center gap-1.5 px-4 py-2
                   bg-white/8 backdrop-blur-xl border border-white/12 rounded-full
                   text-white/60 text-xs hover:text-white hover:bg-white/14 transition-all shadow-xl outline-none"
      >
        <ArrowLeft className="w-3 h-3" />
        Aklima
      </Link>

      {/* State label — centered chip at top, hidden during onboarding */}
      {state !== "ONBOARDING" && <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40">
        <motion.div
          key={state}
          className="px-5 py-2 bg-white/8 backdrop-blur-xl border border-white/12 rounded-full shadow-xl whitespace-nowrap"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <p className="text-white text-sm font-medium tracking-wide">
            {state === "DRAWING" && (locale === "bg" ? "Начертайте полето" : "Draw your field boundary")}
            {state === "ASSIGN_CROP" && (locale === "bg" ? "Изберете култура" : "Select crop")}
            {state === "PARCELS" && (locale === "bg" ? "Вашите полета" : "Your fields")}
            {state === "HISTORY" && (locale === "bg" ? "Исторически анализ" : "Frost history")}
            {state === "COVERAGE" && (locale === "bg" ? "Покритие" : "Coverage")}
            {state === "SIMULATION" && (locale === "bg" ? "Симулация" : "Simulation")}
          </p>
        </motion.div>
      </div>}

      {/* Vertical icon pill — left side */}
      <div className="absolute top-1/2 -translate-y-1/2 left-4 z-40
                      flex flex-col items-center gap-1 py-3 px-2
                      bg-white/8 backdrop-blur-xl border border-white/12 rounded-3xl shadow-xl">

        {/* Back */}
        <AnimatePresence>
          {showBack && (
            <motion.button
              onClick={handleBack}
              className="w-9 h-9 flex items-center justify-center rounded-2xl
                         text-white/60 hover:text-white hover:bg-white/12 transition-all cursor-pointer outline-none"
              title={locale === "bg" ? "Назад" : "Back"}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <ArrowLeft className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Divider */}
        {showBack && <div className="w-5 h-px bg-white/12" />}

        {/* Layers */}
        <button
          onClick={() => setWeatherOpen((o) => !o)}
          className={`w-9 h-9 flex items-center justify-center rounded-2xl transition-all cursor-pointer outline-none
            ${weatherOpen || weatherMode !== "none"
              ? "bg-white/16 text-white"
              : "text-white/60 hover:text-white hover:bg-white/12"}`}
          title="Layers"
        >
          {weatherMode === "none" && <Layers className="w-4 h-4" />}
          {weatherMode === "clouds" && <Cloud className="w-4 h-4" />}
          {weatherMode === "radar" && <CloudRain className="w-4 h-4" />}
          {weatherMode === "temperature" && <Thermometer className="w-4 h-4" />}
        </button>

        {/* Divider */}
        <div className="w-5 h-px bg-white/12" />

        {/* Language */}
        <div className="w-9 h-9 flex items-center justify-center">
          <LanguageToggle />
        </div>
      </div>

      {/* Weather flyout — appears to the left of the vertical pill */}
      <AnimatePresence>
        {weatherOpen && (
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 left-20 z-40 w-40
                       bg-white/8 backdrop-blur-xl border border-white/12 rounded-2xl
                       overflow-hidden shadow-xl"
            initial={{ opacity: 0, x: -8, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -8, scale: 0.96 }}
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

      {/* Crop assignment — separate AnimatePresence so it doesn't fight with other panels */}
      <AnimatePresence>
        {state === "ASSIGN_CROP" && (
          <ParcelCropSheet
            key="assign"
            hectares={pendingHectares}
            onSelect={handleCropAssign}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* Farmer onboarding */}
        {state === "ONBOARDING" && (
          <FarmerOnboarding
            key="onboarding"
            name={farmerName}
            address={farmAddress}
            onNameChange={setFarmerName}
            onAddressChange={setFarmAddress}
            onContinue={async () => {
              if (farmAddress.trim()) {
                try {
                  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
                  const res = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(farmAddress)}.json?access_token=${token}&limit=1&bbox=22.3,41.2,28.6,44.2`
                  );
                  const data = await res.json();
                  const coords = data.features?.[0]?.center as [number, number] | undefined;
                  if (coords) setFlyToCoords(coords);
                } catch { /* silently ignore */ }
              }
              setState("DRAWING");
            }}
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
