"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import Map, { Source, Layer, type MapRef } from "react-map-gl";
import { motion, AnimatePresence } from "framer-motion";
import type { FarmerParcel, CropKey } from "@/types";
import { contracts } from "@/lib/contracts";
import { useLocale } from "@/lib/i18n";
import WeatherOverlay, { type OverlayMode } from "./WeatherOverlay";
import { detectFieldPolygon } from "@/lib/floodSelect";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const CROP_COLORS: Record<CropKey, string> = {
  cherries: "#EF5350",
  grapes: "#AB47BC",
  wheat: "#F5A623",
  sunflower: "#66BB6A",
};

interface DrawableMapProps {
  parcels: FarmerParcel[];
  drawingEnabled: boolean;
  onPolygonComplete: (coords: [number, number][]) => void;
  dimmed?: boolean;
  weatherMode?: OverlayMode;
  onWeatherModeChange?: (mode: OverlayMode) => void;
  flyTo?: [number, number] | null;
}

/**
 * Calculates the centroid of a polygon.
 */
function centroid(coords: [number, number][]): [number, number] {
  let latSum = 0, lngSum = 0;
  for (const [lng, lat] of coords) {
    latSum += lat;
    lngSum += lng;
  }
  return [lngSum / coords.length, latSum / coords.length];
}

export default function DrawableMap({
  parcels,
  drawingEnabled,
  onPolygonComplete,
  dimmed = false,
  weatherMode,
  onWeatherModeChange,
  flyTo,
}: DrawableMapProps) {
  const { locale } = useLocale();
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState({
    latitude: 42.7,
    longitude: 25.5,
    zoom: 7,
  });
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const justCompleted = useRef(false);
  const [smartMode, setSmartMode] = useState(false);

  // Build GeoJSON for completed parcels
  const parcelsGeoJSON = {
    type: "FeatureCollection" as const,
    features: parcels.map((p) => ({
      type: "Feature" as const,
      geometry: {
        type: "Polygon" as const,
        coordinates: [[...p.coordinates, p.coordinates[0]]],
      },
      properties: {
        id: p.id,
        crop: p.crop,
        hectares: p.hectares,
        color: CROP_COLORS[p.crop],
        fillColor: CROP_COLORS[p.crop] + "40",
      },
    })),
  };

  // Build GeoJSON for in-progress drawing
  const drawingGeoJSON = {
    type: "FeatureCollection" as const,
    features: drawPoints.length >= 2
      ? [
          {
            type: "Feature" as const,
            geometry: {
              type: "LineString" as const,
              coordinates: drawPoints,
            },
            properties: {},
          },
        ]
      : [],
  };

  const drawPointsGeoJSON = {
    type: "FeatureCollection" as const,
    features: drawPoints.map((p, i) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: p },
      properties: { index: i },
    })),
  };

  const completePolygon = useCallback(
    (points: [number, number][]) => {
      if (justCompleted.current) return;
      justCompleted.current = true;
      setDrawPoints([]);
      setIsDrawing(false);
      onPolygonComplete(points);
      setTimeout(() => { justCompleted.current = false; }, 300);
    },
    [onPolygonComplete],
  );

  const smartDetect = useCallback(
    (e: mapboxgl.MapLayerMouseEvent) => {
      if (!mapRef.current || justCompleted.current) return;
      const map = mapRef.current.getMap();
      const canvas = map.getCanvas();
      const ratio = window.devicePixelRatio || 1;
      const coords = detectFieldPolygon(
        canvas,
        e.point.x * ratio,
        e.point.y * ratio,
        (pt) => map.unproject(pt),
        32,
      );
      if (coords && coords.length >= 3) {
        completePolygon(coords);
      }
    },
    [completePolygon],
  );

  const handleClick = useCallback(
    (e: mapboxgl.MapLayerMouseEvent) => {
      if (!drawingEnabled || justCompleted.current) return;

      if (smartMode) {
        smartDetect(e);
        return;
      }

      const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      if (!isDrawing) {
        setIsDrawing(true);
        setDrawPoints([point]);
        return;
      }

      // Check if clicking near the first point to close the polygon
      if (drawPoints.length >= 3) {
        const first = drawPoints[0];
        const firstScreen = mapRef.current?.project(first);
        if (firstScreen) {
          const dist = Math.sqrt(
            (e.point.x - firstScreen.x) ** 2 + (e.point.y - firstScreen.y) ** 2,
          );
          if (dist < 20) {
            completePolygon(drawPoints);
            return;
          }
        }
      }

      setDrawPoints((prev) => [...prev, point]);
    },
    [drawingEnabled, isDrawing, drawPoints, completePolygon, smartMode, smartDetect],
  );

  // Double-click to close polygon
  const handleDblClick = useCallback(
    (e: mapboxgl.MapLayerMouseEvent) => {
      if (!drawingEnabled || !isDrawing || drawPoints.length < 3 || justCompleted.current) return;
      e.preventDefault();
      completePolygon(drawPoints);
    },
    [drawingEnabled, isDrawing, drawPoints, completePolygon],
  );

  // Undo last point with Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDrawing) {
        if (drawPoints.length <= 1) {
          setDrawPoints([]);
          setIsDrawing(false);
        } else {
          setDrawPoints((prev) => prev.slice(0, -1));
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawing, drawPoints.length]);

  // Fly to first parcel centroid
  useEffect(() => {
    if (parcels.length === 1 && mapRef.current) {
      const c = centroid(parcels[0].coordinates);
      mapRef.current.flyTo({
        center: c,
        zoom: 15,
        duration: 1500,
      });
    }
  }, [parcels.length]);

  // Fly to geocoded address when provided
  useEffect(() => {
    if (flyTo && mapRef.current) {
      mapRef.current.flyTo({
        center: flyTo,
        zoom: 12,
        duration: 1800,
      });
    }
  }, [flyTo]);

  return (
    <div className="absolute inset-0">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(e) => setViewState(e.viewState)}
        onClick={handleClick}
        onDblClick={handleDblClick}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        style={{ width: "100%", height: "100%" }}
        cursor={drawingEnabled ? (smartMode ? "pointer" : "crosshair") : "default"}
        doubleClickZoom={!drawingEnabled}
        preserveDrawingBuffer={true}
      >
        <WeatherOverlay
          showControls={false}
          defaultMode="none"
          externalMode={weatherMode}
          onModeChange={onWeatherModeChange}
        />

        {/* Completed parcels — fill */}
        <Source id="parcels-fill" type="geojson" data={parcelsGeoJSON}>
          <Layer
            id="parcels-fill-layer"
            type="fill"
            paint={{
              "fill-color": ["get", "fillColor"],
              "fill-opacity": 0.4,
            }}
          />
          <Layer
            id="parcels-outline-layer"
            type="line"
            paint={{
              "line-color": ["get", "color"],
              "line-width": 2.5,
              "line-opacity": 0.9,
            }}
          />
        </Source>

        {/* Parcel labels */}
        {parcels.map((p) => {
          const c = centroid(p.coordinates);
          return (
            <Source
              key={`label-${p.id}`}
              id={`label-${p.id}`}
              type="geojson"
              data={{
                type: "Feature",
                geometry: { type: "Point", coordinates: c },
                properties: {
                  label: `${contracts[p.crop]?.icon} ${p.hectares} ha`,
                },
              }}
            >
              <Layer
                id={`label-layer-${p.id}`}
                type="symbol"
                layout={{
                  "text-field": ["get", "label"],
                  "text-size": 13,
                  "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
                  "text-allow-overlap": true,
                }}
                paint={{
                  "text-color": "#ffffff",
                  "text-halo-color": "rgba(0,0,0,0.8)",
                  "text-halo-width": 1.5,
                }}
              />
            </Source>
          );
        })}

        {/* Drawing in progress — line */}
        <Source id="drawing-line" type="geojson" data={drawingGeoJSON}>
          <Layer
            id="drawing-line-layer"
            type="line"
            paint={{
              "line-color": "#F5A623",
              "line-width": 2,
              "line-dasharray": [3, 2],
            }}
          />
        </Source>

        {/* Drawing points */}
        <Source id="drawing-points" type="geojson" data={drawPointsGeoJSON}>
          <Layer
            id="drawing-points-layer"
            type="circle"
            paint={{
              "circle-radius": 6,
              "circle-color": "#F5A623",
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            }}
          />
        </Source>
      </Map>

      {/* Dim overlay */}
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

      {/* Drawing point counter — shown while actively drawing (manual mode) */}
      <AnimatePresence>
        {isDrawing && (
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="px-3 py-1.5 bg-black/50 backdrop-blur-md border border-accent-amber/30 rounded-full">
              <p className="text-accent-amber text-xs font-medium">
                {drawPoints.length} {locale === "bg" ? "точки" : "pts"} · {drawPoints.length >= 3
                  ? (locale === "bg" ? "двоен клик за затваряне" : "double-click to close")
                  : (locale === "bg" ? "продължи да кликаш" : "keep clicking")}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode toggle — bottom center */}
      {drawingEnabled && !isDrawing && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex bg-black/40 backdrop-blur-xl border border-white/15 rounded-full p-1 shadow-xl">
          <button
            onClick={() => setSmartMode(false)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              !smartMode ? "bg-white text-black shadow-sm" : "text-white/60 hover:text-white"
            }`}
          >
            ✏️ Draw
          </button>
          <button
            onClick={() => setSmartMode(true)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              smartMode ? "bg-accent-amber text-black shadow-sm" : "text-white/60 hover:text-white"
            }`}
          >
            ✨ Auto-detect
          </button>
        </div>
      )}
    </div>
  );
}
