"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
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
  const [showTooltip, setShowTooltip] = useState(false);
  const showNav = parcelTotal !== undefined && parcelTotal > 1;
  const confidencePercent = Math.round(enrichment.basisRiskConfidence * 100);
  const confidenceColor =
    confidencePercent >= 85
      ? "text-success-green"
      : confidencePercent >= 65
        ? "text-accent-amber"
        : "text-danger-red";

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
          {/* Location */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] text-white/50 uppercase tracking-widest whitespace-nowrap">
                {t("field.location")}
              </span>
              <span className="text-sm font-medium font-mono whitespace-nowrap text-white">
                {enrichment.municipality !== "Unknown"
                  ? enrichment.municipality
                  : `${pin.lat.toFixed(3)}°N, ${pin.lng.toFixed(3)}°E`}
              </span>
            </div>
            <div className="w-px h-6 bg-white/10" />
          </div>

          {/* Elevation */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] text-white/50 uppercase tracking-widest whitespace-nowrap">
                {t("field.elevation")}
              </span>
              <span className="text-sm font-medium font-mono whitespace-nowrap text-white">
                {enrichment.elevation > 0 ? `${enrichment.elevation} m` : "—"}
              </span>
            </div>
            <div className="w-px h-6 bg-white/10" />
          </div>

          {/* Station */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] text-white/50 uppercase tracking-widest whitespace-nowrap">
                {t("field.station")}
              </span>
              <span className="text-sm font-medium font-mono whitespace-nowrap text-white">
                {enrichment.nearestStation.name} · {enrichment.stationDistance} km
              </span>
            </div>
            <div className="w-px h-6 bg-white/10" />
          </div>

          {/* Confidence — with tooltip */}
          <div className="relative flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-white/50 uppercase tracking-widest whitespace-nowrap">
                {t("field.confidence")}
              </span>
              <button
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={() => setShowTooltip((v) => !v)}
                className="text-white/30 hover:text-white/70 transition-colors outline-none cursor-pointer"
              >
                <Info className="w-3 h-3" />
              </button>
            </div>
            <span className={`text-sm font-medium font-mono whitespace-nowrap ${confidenceColor}`}>
              {confidencePercent}%
            </span>

            {/* Tooltip */}
            <AnimatePresence>
              {showTooltip && (
                <motion.div
                  className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-72
                             bg-bg-primary/95 backdrop-blur-xl border border-white/20
                             rounded-2xl px-4 py-4 shadow-2xl pointer-events-none z-50"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.15 }}
                >
                  <p className="text-white text-sm font-semibold mb-2">Basis Risk Confidence</p>
                  <p className="text-white/70 text-xs leading-relaxed mb-3">
                    How closely your field's temperature tracks the{" "}
                    <span className="text-white font-medium">{enrichment.nearestStation.name}</span> station —
                    computed from the Pearson correlation of 3 years of spring ERA5 readings at both locations.
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-success-green" />
                      <span className="text-success-green text-xs">≥85% reliable</span>
                    </div>
                    <span className="text-white/20">·</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-accent-amber" />
                      <span className="text-accent-amber text-xs">65–84%</span>
                    </div>
                    <span className="text-white/20">·</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-danger-red" />
                      <span className="text-danger-red text-xs">&lt;65% high risk</span>
                    </div>
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-bg-primary/95 border-r border-b border-white/20 rotate-45 -mt-1.5" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
