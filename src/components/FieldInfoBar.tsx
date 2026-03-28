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
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: "spring", damping: 22, stiffness: 180 }}
    >
      <div className="flex items-center gap-6 px-5 py-3 bg-white/8 backdrop-blur-xl border border-white/12 rounded-2xl shadow-lg">
        {stats.map((s, i) => (
          <div key={s.label} className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] text-white/50 uppercase tracking-widest whitespace-nowrap">
                {s.label}
              </span>
              <span className={`text-sm font-medium font-mono whitespace-nowrap ${s.valueClass ?? "text-white"}`}>
                {s.value}
              </span>
            </div>
            {i < stats.length - 1 && (
              <div className="w-px h-6 bg-white/10" />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
