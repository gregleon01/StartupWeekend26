"use client";

import { useMemo, useState, useCallback } from "react";
import Map, { Source, Layer, type MapLayerMouseEvent } from "react-map-gl";
import type { MockField, CropKey } from "@/types";
import { contracts } from "@/lib/contracts";
import WeatherOverlay from "./WeatherOverlay";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

interface InsuredFieldsMapProps {
  fields: MockField[];
}

function fieldColor(field: MockField): string {
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
          color: fieldColor(f),
          crop: f.crop,
          hectares: f.hectares,
          covered: f.covered,
          riskScore: f.riskScore,
          payoutTriggered: f.payoutTriggered,
          payoutAmount: f.payoutAmount,
        },
      })),
    };
  }, [fields]);

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
        {/* Live weather overlays */}
        <WeatherOverlay showControls={true} />

        <Source id="fields" type="geojson" data={geojson}>
          <Layer
            id="fields-circle"
            type="circle"
            paint={{
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10, 4,
                13, 8,
                16, 14,
              ],
              "circle-color": ["get", "color"],
              "circle-opacity": 0.85,
              "circle-stroke-width": 1,
              "circle-stroke-color": "rgba(255,255,255,0.13)",
            }}
          />
          {/* Glow ring for triggered payouts */}
          <Layer
            id="fields-glow"
            type="circle"
            filter={["==", ["get", "payoutTriggered"], true]}
            paint={{
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10, 8,
                13, 16,
                16, 24,
              ],
              "circle-color": "rgba(239,83,80,0.19)",
              "circle-stroke-width": 0,
            }}
          />
        </Source>
      </Map>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none bg-bg-tertiary/95 backdrop-blur border border-border-subtle rounded-lg px-3 py-2 text-xs shadow-xl"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 10,
          }}
        >
          <p className="text-text-primary font-medium">
            {contracts[tooltip.field.crop as CropKey]?.icon} Field #{tooltip.field.id}
          </p>
          <p className="text-text-secondary mt-0.5">
            {contracts[tooltip.field.crop as CropKey]?.crop} &middot;{" "}
            {tooltip.field.hectares} ha
          </p>
          <p className="text-text-secondary">
            Risk: {tooltip.field.riskScore}/100
          </p>
          {tooltip.field.payoutTriggered && (
            <p className="text-danger-red font-mono font-bold mt-0.5">
              Payout: &euro;{tooltip.field.payoutAmount}
            </p>
          )}
          {!tooltip.field.covered && (
            <p className="text-text-tertiary italic mt-0.5">Not covered</p>
          )}
        </div>
      )}
    </div>
  );
}
