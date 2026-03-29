"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import Map, { Source, Layer, type MapLayerMouseEvent, type MapRef } from "react-map-gl";
import type { MockField, CropKey } from "@/types";
import { contracts } from "@/lib/contracts";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const ZONE_COLORS: Record<string, string> = {
  "bg-kyustendil":   "#4FC3F7",
  "bg-sofia":        "#AB47BC",
  "bg-plovdiv":      "#66BB6A",
  "bg-blagoevgrad":  "#F5A623",
  "bg-dupnitsa":     "#EF5350",
  "bg-pernik":       "#26C6DA",
  "bg-sandanski":    "#FF7043",
  "bg-montana":      "#8D6E63",
  "bg-pazardzhik":   "#FFEE58",
  "bg-lovech":       "#78909C",
  "bg-pleven":       "#EC407A",
  "bg-vt":           "#7E57C2",
  "bg-ruse":         "#29B6F6",
  "bg-varna":        "#26A69A",
  "bg-burgas":       "#D4E157",
  "bg-stara-zagora": "#FF8A65",
  "bg-vratsa":       "#A5D6A7",
  "bg-kardzhali":    "#F48FB1",
  "bg-smolyan":      "#80DEEA",
  "bg-dobrich":      "#FFCC02",
};

interface InsuredFieldsMapProps {
  fields: MockField[];
  simulatedTriggerIds?: number[];
}

export default function InsuredFieldsMap({ fields, simulatedTriggerIds }: InsuredFieldsMapProps) {
  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    const el = document.getElementById("insured-fields-map-container");
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const [tooltip, setTooltip] = useState<{ field: MockField; x: number; y: number } | null>(null);
  const simSet = useMemo(() => new Set(simulatedTriggerIds ?? []), [simulatedTriggerIds]);

  const geojson = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: fields.map((f) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [f.lng, f.lat] },
      properties: {
        id: f.id,
        color: simSet.has(f.id) ? "#EF5350" : (ZONE_COLORS[f.stationZone] ?? "#888"),
        payoutTriggered: f.payoutTriggered,
        isSimTrigger: simSet.has(f.id),
        crop: f.crop,
        hectares: f.hectares,
        riskScore: f.riskScore,
        payoutAmount: f.payoutAmount,
        stationZone: f.stationZone,
        covered: f.covered,
      },
    })),
  }), [fields, simSet]);

  const handleMouseMove = useCallback((e: MapLayerMouseEvent) => {
    if (e.features && e.features.length > 0) {
      const props = e.features[0].properties;
      if (!props) return;
      const field = fields.find((f) => f.id === props.id);
      if (field) setTooltip({ field, x: e.point.x, y: e.point.y });
    } else {
      setTooltip(null);
    }
  }, [fields]);

  return (
    <div id="insured-fields-map-container" className="absolute inset-0">
      <Map
        ref={mapRef}
        initialViewState={{
          bounds: [22.3, 41.2, 28.6, 44.2] as [number, number, number, number],
          fitBoundsOptions: { padding: { top: 40, bottom: 40, left: 40, right: 400 } },
        }}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        style={{ width: "100%", height: "100%" }}
        interactiveLayerIds={["fields-circle"]}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <Source id="fields" type="geojson" data={geojson}>
          {/* Outer glow for simulated frost triggers */}
          <Layer
            id="fields-sim-glow-outer"
            type="circle"
            filter={["==", ["get", "isSimTrigger"], true]}
            paint={{
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 22, 10, 36],
              "circle-color": "#EF5350",
              "circle-opacity": 0.08,
              "circle-stroke-width": 0,
            }}
          />
          {/* Inner glow for simulated frost triggers */}
          <Layer
            id="fields-sim-glow-inner"
            type="circle"
            filter={["==", ["get", "isSimTrigger"], true]}
            paint={{
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 14, 10, 22],
              "circle-color": "#EF5350",
              "circle-opacity": 0.22,
              "circle-stroke-width": 0,
            }}
          />
          {/* Glow ring for normal triggered payouts */}
          <Layer
            id="fields-glow"
            type="circle"
            filter={["all", ["==", ["get", "payoutTriggered"], true], ["==", ["get", "isSimTrigger"], false]]}
            paint={{
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 14, 10, 22],
              "circle-color": ["get", "color"],
              "circle-opacity": 0.2,
              "circle-stroke-width": 0,
            }}
          />
          {/* Main dots — colored by station zone or red if simulated */}
          <Layer
            id="fields-circle"
            type="circle"
            paint={{
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 5, 10, 9, 13, 14],
              "circle-color": ["get", "color"],
              "circle-opacity": 0.88,
              "circle-stroke-width": ["case", ["get", "isSimTrigger"], 2.5, 1.5],
              "circle-stroke-color": ["case", ["get", "isSimTrigger"], "rgba(239,83,80,0.7)", "rgba(255,255,255,0.35)"],
            }}
          />
        </Source>
      </Map>

      {/* Hover tooltip */}
      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none bg-black/70 backdrop-blur-xl border border-white/15 rounded-xl px-3 py-2.5 text-xs shadow-2xl"
          style={{ left: tooltip.x + 14, top: tooltip.y - 12 }}
        >
          <p className="text-white font-semibold mb-1">
            {contracts[tooltip.field.crop as CropKey]?.icon} Field #{tooltip.field.id}
          </p>
          <p className="text-white/60">
            {contracts[tooltip.field.crop as CropKey]?.crop} · {tooltip.field.hectares}ha
          </p>
          <p className="text-white/40 text-[10px] mt-0.5">
            Zone: {tooltip.field.stationZone.replace("bg-", "").replace(/-/g, " ")}
          </p>
          {tooltip.field.payoutTriggered && (
            <p className="text-danger-red font-mono font-bold mt-1">
              Payout: €{tooltip.field.payoutAmount.toLocaleString()}
            </p>
          )}
          {!tooltip.field.covered && (
            <p className="text-white/30 italic mt-0.5">Not covered</p>
          )}
        </div>
      )}
    </div>
  );
}
