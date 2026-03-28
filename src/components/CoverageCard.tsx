"use client";

import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import type { ParametricContract, FieldEnrichment } from "@/types";
import { useLocale } from "@/lib/i18n";

interface CoverageCardProps {
  contract: ParametricContract;
  onSimulate: () => void;
  enrichment?: FieldEnrichment | null;
}

function formatWindow(start: string, end: string) {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const [sm, sd] = start.split("-").map(Number);
  const [em, ed] = end.split("-").map(Number);
  return `${months[sm - 1]} ${sd} \u2014 ${months[em - 1]} ${ed}`;
}

export default function CoverageCard({
  contract,
  onSimulate,
  enrichment,
}: CoverageCardProps) {
  const { t } = useLocale();
  return (
    <motion.div
      className="absolute inset-0 z-30 flex items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <motion.div
        className="relative w-full max-w-[400px] bg-bg-secondary border border-border-subtle rounded-2xl p-6 shadow-2xl"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
      >
        {/* Crop header */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-3xl">{contract.icon}</span>
          <div>
            <p className="text-text-primary font-medium">{contract.crop}</p>
            <p className="text-text-tertiary text-xs">{contract.cropBg}</p>
          </div>
          <Shield className="w-5 h-5 text-accent-amber ml-auto" />
        </div>

        {/* Condition */}
        <div className="mb-6 space-y-1.5">
          <p className="text-text-secondary text-sm leading-relaxed">
            {t("coverage.if")}{" "}
            <span className="font-mono text-frost-blue font-semibold">
              {contract.threshold}°C
            </span>
          </p>
          <p className="text-text-secondary text-sm leading-relaxed">
            {t("coverage.for")}{" "}
            <span className="font-mono text-text-primary font-semibold">
              {contract.durationThreshold} {t("coverage.hours")}
            </span>
          </p>
          <p className="text-text-secondary text-sm leading-relaxed">
            {t("coverage.during")}{" "}
            <span className="text-text-primary font-medium">
              {formatWindow(contract.sensitiveStart, contract.sensitiveEnd)}
            </span>
          </p>
        </div>

        {/* Payout amount — the star */}
        <div className="mb-1">
          <p className="text-text-tertiary text-xs uppercase tracking-widest mb-1">
            {t("coverage.receive")}
          </p>
          <p className="font-mono text-5xl font-bold text-accent-amber leading-none">
            &euro;{contract.payoutPerHectare}
            <span className="text-lg text-text-tertiary font-normal ml-1">
              /ha
            </span>
          </p>
        </div>

        {/* Premium */}
        <p className="text-text-secondary text-sm mb-4">
          {t("coverage.premium")}:{" "}
          <span className="font-mono text-text-primary">
            &euro;{contract.premiumPerHectare}
          </span>
          {t("coverage.perSeason")}
        </p>

        {/* Basis risk confidence */}
        {enrichment && (
          <div className="p-3 bg-bg-tertiary/50 rounded-lg mb-5 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-tertiary uppercase tracking-wider">
                  {t("coverage.confidence")}
                </p>
                <p className="text-text-secondary mt-0.5">
                  {enrichment.stationDistance}km from {enrichment.nearestStation.name} station
                </p>
              </div>
              <span
                className={`font-mono text-lg font-bold ${
                  enrichment.basisRiskConfidence >= 0.85
                    ? "text-success-green"
                    : enrichment.basisRiskConfidence >= 0.65
                      ? "text-accent-amber"
                      : "text-danger-red"
                }`}
              >
                {Math.round(enrichment.basisRiskConfidence * 100)}%
              </span>
            </div>
            <p className="text-text-tertiary leading-relaxed">
              {t("coverage.confidenceDesc")}
            </p>
          </div>
        )}

        {/* CTA */}
        <motion.button
          onClick={onSimulate}
          className="w-full py-4 bg-accent-amber text-bg-primary rounded-xl font-semibold text-base
                     hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
          whileTap={{ scale: 0.98 }}
        >
          {t("coverage.simulate")}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
