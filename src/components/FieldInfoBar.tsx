"use client";

import { motion } from "framer-motion";
import type { FieldPin, FieldEnrichment } from "@/types";
import { useLocale } from "@/lib/i18n";

interface FieldInfoBarProps {
  pin: FieldPin;
  enrichment: FieldEnrichment;
}

export default function FieldInfoBar({ pin, enrichment }: FieldInfoBarProps) {
  const { t } = useLocale();
  const confidencePercent = Math.round(enrichment.basisRiskConfidence * 100);
  const confidenceColor =
    confidencePercent >= 85
      ? "text-success-green"
      : confidencePercent >= 65
        ? "text-accent-amber"
        : "text-danger-red";

  const stats = [
    {
      label: t("field.location"),
      value: enrichment.municipality !== "Unknown"
        ? enrichment.municipality
        : `${pin.lat.toFixed(3)}°N, ${pin.lng.toFixed(3)}°E`,
    },
    {
      label: t("field.elevation"),
      value: enrichment.elevation > 0 ? `${enrichment.elevation} m` : "—",
    },
    {
      label: t("field.station"),
      value: `${enrichment.nearestStation.name} · ${enrichment.stationDistance} km`,
    },
    {
      label: t("field.confidence"),
      value: `${confidencePercent}%`,
      valueClass: confidenceColor,
    },
  ];

  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 z-20"
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: "spring", damping: 22, stiffness: 180 }}
    >
      <div className="flex items-center justify-around px-8 py-4 bg-bg-secondary/70 backdrop-blur-xl border-t border-border-subtle">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] text-text-tertiary uppercase tracking-widest">
              {s.label}
            </span>
            <span className={`text-sm font-medium font-mono whitespace-nowrap ${s.valueClass ?? "text-text-primary"}`}>
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
