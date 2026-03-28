"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import Map, { Marker, type MapRef } from "react-map-gl";
import { motion, AnimatePresence } from "framer-motion";
import type { FieldPin, AppState } from "@/types";
import WeatherOverlay from "./WeatherOverlay";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

interface MapViewProps {
  pin: FieldPin | null;
  onPinDrop: (pin: FieldPin) => void;
  appState: AppState;
  dimmed?: boolean;
}

export default function MapView({
  pin,
  onPinDrop,
  appState,
  dimmed = false,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState({
    latitude: 42.7,
    longitude: 25.5,
    zoom: 7,
  });

  const handleClick = useCallback(
    (e: mapboxgl.MapLayerMouseEvent) => {
      if (appState !== "MAP_SELECT") return;
      const { lng, lat } = e.lngLat;
      onPinDrop({ lat, lng });

      // Fly to pinned location
      mapRef.current?.flyTo({
        center: [lng, lat],
        zoom: 15,
        duration: 1500,
        essential: true,
      });
    },
    [appState, onPinDrop],
  );

  // When entering simulation, slowly zoom in for drama
  useEffect(() => {
    if (appState === "SIMULATION" && pin) {
      mapRef.current?.flyTo({
        center: [pin.lng, pin.lat],
        zoom: 16,
        duration: 3000,
        essential: true,
      });
    }
  }, [appState, pin]);

  return (
    <div className="absolute inset-0">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(e) => setViewState(e.viewState)}
        onClick={handleClick}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        style={{ width: "100%", height: "100%" }}
        cursor={appState === "MAP_SELECT" ? "crosshair" : "default"}
        interactive={appState === "MAP_SELECT" || appState === "HISTORY"}
      >
        {/* Weather overlays — clouds, radar, temperature */}
        <WeatherOverlay showControls={appState === "MAP_SELECT" || appState === "HISTORY"} />

        {pin && (
          <Marker latitude={pin.lat} longitude={pin.lng} anchor="center">
            <div className="relative flex items-center justify-center">
              {/* Pulse ring */}
              <div
                className="absolute w-4 h-4 rounded-full bg-accent-amber"
                style={{
                  animation: "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                }}
              />
              {/* Core dot */}
              <div className="w-4 h-4 rounded-full bg-accent-amber border-2 border-bg-primary shadow-lg shadow-accent-amber/40 relative z-10" />
            </div>
          </Marker>
        )}
      </Map>

      {/* Map dimming overlay */}
      <AnimatePresence>
        {dimmed && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ backgroundColor: "rgba(0,0,0,0)" }}
            animate={{ backgroundColor: "rgba(0,0,0,0.4)" }}
            exit={{ backgroundColor: "rgba(0,0,0,0)" }}
            transition={{ duration: 0.4 }}
          />
        )}
      </AnimatePresence>

      {/* Instruction text for MAP_SELECT */}
      <AnimatePresence>
        {appState === "MAP_SELECT" && !pin && (
          <motion.div
            className="absolute top-8 left-1/2 -translate-x-1/2 z-10 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <p className="text-white text-lg font-medium drop-shadow-lg">
              Натиснете върху вашата нива
            </p>
            <p className="text-white/70 text-sm mt-1 drop-shadow-lg">
              Tap on your field
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
