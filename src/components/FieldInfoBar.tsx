"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { FieldPin, FieldEnrichment } from "@/types";
import { useLocale } from "@/lib/i18n";

interface FieldInfoBarProps {
  pin: FieldPin;
  enrichment: FieldEnrichment;
  parcelIndex?: number;
  parcelTotal?: number;
  onPrev?: () => void;
  onNext?: () => void;
}

export default function FieldInfoBar({ pin, enrichment, parcelIndex, parcelTotal, onPrev, onNext }: FieldInfoBarProps) {
  const { t } = useLocale();
  const showNav = parcelTotal !== undefined && parcelTotal > 1;
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
      <div className="flex items-center gap-4 px-4 py-3 bg-white/8 backdrop-blur-xl border border-white/12 rounded-2xl shadow-lg">
        {/* Prev arrow */}
        {showNav && (
          <button
            onClick={onPrev}
            className="text-white/50 hover:text-white transition-colors cursor-pointer outline-none"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Stats */}
        <div className="flex items-center gap-6">
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

        {/* Next arrow */}
        {showNav && (
          <button
            onClick={onNext}
            className="text-white/50 hover:text-white transition-colors cursor-pointer outline-none"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Field counter */}
        {showNav && (
          <span className="text-white/30 text-xs font-mono ml-1">
            {(parcelIndex ?? 0) + 1}/{parcelTotal}
          </span>
        )}
      </div>
    </motion.div>
  );
}
