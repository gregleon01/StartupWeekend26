"use client";

import { motion } from "framer-motion";
import { MapPin, Mountain, Radio, ShieldCheck } from "lucide-react";
import type { FieldPin, FieldEnrichment } from "@/types";

interface FieldInfoBarProps {
  pin: FieldPin;
  enrichment: FieldEnrichment;
}

/**
 * Displays enriched field data: coordinates, elevation, municipality,
 * nearest weather station distance, and basis risk confidence score.
 */
export default function FieldInfoBar({ pin, enrichment }: FieldInfoBarProps) {
  const confidencePercent = Math.round(enrichment.basisRiskConfidence * 100);
  const confidenceColor =
    confidencePercent >= 85
      ? "text-success-green"
      : confidencePercent >= 65
        ? "text-accent-amber"
        : "text-danger-red";

  return (
    <motion.div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-20"
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: "spring", damping: 20 }}
    >
      <div className="flex items-center gap-4 px-4 py-2.5 bg-bg-secondary/90 backdrop-blur-xl border border-border-subtle rounded-xl">
        <InfoChip icon={<MapPin className="w-3 h-3" />}>
          {pin.lat.toFixed(3)}°N, {pin.lng.toFixed(3)}°E
        </InfoChip>

        {enrichment.elevation > 0 && (
          <InfoChip icon={<Mountain className="w-3 h-3" />}>
            {enrichment.elevation}m
          </InfoChip>
        )}

        {enrichment.municipality !== "Unknown" && (
          <InfoChip icon={<MapPin className="w-3 h-3" />}>
            {enrichment.municipality}
          </InfoChip>
        )}

        <InfoChip icon={<Radio className="w-3 h-3" />}>
          {enrichment.nearestStation.name} · {enrichment.stationDistance}km
        </InfoChip>

        <InfoChip icon={<ShieldCheck className="w-3 h-3" />}>
          <span className={confidenceColor}>
            {confidencePercent}%
          </span>
          <span className="text-text-tertiary ml-1">confidence</span>
        </InfoChip>
      </div>
    </motion.div>
  );
}

function InfoChip({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 text-text-secondary text-xs font-mono whitespace-nowrap">
      <span className="text-text-tertiary">{icon}</span>
      {children}
    </div>
  );
}
