"use client";

import { useMemo, useState, useCallback } from "react";
import Map, { Source, Layer, type MapLayerMouseEvent } from "react-map-gl";
import type { MockField, CropKey } from "@/types";
import { contracts } from "@/lib/contracts";
import WeatherOverlay from "./WeatherOverlay";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

/** Distinct colors for station zone grouping — shows correlated risk */
const ZONE_COLORS: Record<string, string> = {
  "bg-kyustendil": "#4FC3F7",
  "bg-sofia": "#AB47BC",
  "bg-plovdiv": "#66BB6A",
  "bg-blagoevgrad": "#F5A623",
  "bg-dupnitsa": "#EF5350",
  "bg-pernik": "#26C6DA",
  "bg-sandanski": "#FF7043",
  "bg-montana": "#8D6E63",
  "bg-pazardzhik": "#FFEE58",
  "bg-lovech": "#78909C",
};

type ColorMode = "risk" | "zone";

interface InsuredFieldsMapProps {
  fields: MockField[];
}

function fieldColor(field: MockField, mode: ColorMode): string {
  if (mode === "zone") {
    return ZONE_COLORS[field.stationZone] ?? "#888888";
  }
  if (field.payoutTriggered) return "#EF5350";
  if (!field.covered) return "#555555";
  if (field.riskScore > 70) return "#F5A623";
  return "#66BB6A";
}

export default function InsuredFieldsMap({ fields }: InsuredFieldsMapProps) {
  const [tooltip, setTooltip] = useState<{
    field: MockField;
    x: number;
    y: number;
  } | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>("risk");

  const geojson = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: fields.map((f) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [f.lng, f.lat],
        },
        properties: {
          id: f.id,
          color: fieldColor(f, colorMode),
          crop: f.crop,
          hectares: f.hectares,
          covered: f.covered,
          riskScore: f.riskScore,
          payoutTriggered: f.payoutTriggered,
          payoutAmount: f.payoutAmount,
          stationZone: f.stationZone,
        },
      })),
    };
  }, [fields, colorMode]);

  const handleMouseMove = useCallback(
    (e: MapLayerMouseEvent) => {
      if (e.features && e.features.length > 0) {
        const props = e.features[0].properties;
        if (!props) return;
        const field = fields.find((f) => f.id === props.id);
        if (field) {
          setTooltip({ field, x: e.point.x, y: e.point.y });
        }
      } else {
        setTooltip(null);
      }
    },
    [fields],
  );

  return (
    <div className="absolute inset-0">
      <Map
        initialViewState={{
          latitude: 42.3,
          longitude: 22.65,
          zoom: 11,
        }}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        style={{ width: "100%", height: "100%" }}
        interactiveLayerIds={["fields-circle"]}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Live weather overlays — rendered BELOW field markers, off by default */}
        <WeatherOverlay showControls={true} defaultMode="none" />

        {/* Field markers — rendered ABOVE weather overlays */}
        <Source id="fields" type="geojson" data={geojson}>
          {/* Glow ring for triggered payouts — rendered first (below circles) */}
          <Layer
            id="fields-glow"
            type="circle"
            filter={["==", ["get", "payoutTriggered"], true]}
            paint={{
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10, 12,
                13, 22,
                16, 32,
              ],
              "circle-color": "rgba(239,83,80,0.25)",
              "circle-stroke-width": 0,
            }}
          />
          {/* Main field circles */}
          <Layer
            id="fields-circle"
            type="circle"
            paint={{
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10, 6,
                13, 10,
                16, 16,
              ],
              "circle-color": ["get", "color"],
              "circle-opacity": 0.9,
              "circle-stroke-width": 2,
              "circle-stroke-color": "rgba(255,255,255,0.4)",
            }}
          />
        </Source>
      </Map>

      {/* Color mode toggle — offset from right to avoid sidebar overlap */}
      <div className="absolute top-4 right-[340px] z-50 flex gap-1 bg-white/8 backdrop-blur-xl border border-white/12 rounded-full p-1 text-xs pointer-events-auto shadow-xl">
        <button
          onClick={() => setColorMode("risk")}
          className={`px-3 py-1.5 rounded transition-colors ${
            colorMode === "risk"
              ? "bg-white/15 text-white"
              : "text-white/50 hover:text-white/70"
          }`}
        >
          Risk
        </button>
        <button
          onClick={() => setColorMode("zone")}
          className={`px-3 py-1.5 rounded transition-colors ${
            colorMode === "zone"
              ? "bg-white/15 text-white"
              : "text-white/50 hover:text-white/70"
          }`}
        >
          Station Zones
        </button>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none bg-white/10 backdrop-blur-xl border border-white/15 rounded-lg px-3 py-2 text-xs shadow-xl"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 10,
          }}
        >
          <p className="text-white font-medium">
            {contracts[tooltip.field.crop as CropKey]?.icon} Field #{tooltip.field.id}
          </p>
          <p className="text-white/70 mt-0.5">
            {contracts[tooltip.field.crop as CropKey]?.crop} &middot;{" "}
            {tooltip.field.hectares} ha
          </p>
          <p className="text-white/70">
            Risk: {tooltip.field.riskScore}/100
          </p>
          {tooltip.field.payoutTriggered && (
            <p className="text-danger-red font-mono font-bold mt-0.5">
              Payout: &euro;{tooltip.field.payoutAmount}
            </p>
          )}
          {colorMode === "zone" && (
            <p className="text-white/70 mt-0.5">
              Zone: {tooltip.field.stationZone.replace("bg-", "").replace(/-/g, " ")}
            </p>
          )}
          {!tooltip.field.covered && (
            <p className="text-white/50 italic mt-0.5">Not covered</p>
          )}
        </div>
      )}
    </div>
  );
}
