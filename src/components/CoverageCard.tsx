"use client";

import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import type { ParametricContract, FieldEnrichment, FarmerParcel } from "@/types";
import { contracts } from "@/lib/contracts";
import { useLocale } from "@/lib/i18n";

interface CoverageCardProps {
  contract: ParametricContract;
  onSimulate: () => void;
  enrichment?: FieldEnrichment | null;
  parcels?: FarmerParcel[];
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
  parcels,
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
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" />

      <motion.div
        className="relative w-full max-w-[400px] bg-white/8 backdrop-blur-2xl border border-white/12 rounded-2xl p-6 shadow-2xl"
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
          <div className="p-3 bg-white/6 border border-white/8 rounded-lg mb-5 text-xs space-y-2">
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

        {/* Multi-parcel portfolio breakdown */}
        {parcels && parcels.length > 1 && (
          <div className="mb-5 p-3 bg-white/6 border border-white/8 rounded-lg space-y-2">
            <p className="text-text-tertiary text-[9px] uppercase tracking-widest mb-2">
              {t("coverage.allFields")}
            </p>
            {parcels.map((p) => {
              const c = contracts[p.crop];
              return (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <span>{c.icon}</span>
                    <span>{p.hectares} ha</span>
                  </span>
                  <span className="font-mono text-text-primary">
                    €{Math.round(c.payoutPerHectare * p.hectares).toLocaleString()}
                  </span>
                </div>
              );
            })}
            <div className="border-t border-white/10 pt-2 flex justify-between text-xs">
              <span className="text-text-tertiary">{t("coverage.totalPayout")}</span>
              <span className="font-mono font-bold text-accent-amber">
                €{parcels.reduce((s, p) => s + Math.round(contracts[p.crop].payoutPerHectare * p.hectares), 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-tertiary">{t("coverage.totalPremium")}</span>
              <span className="font-mono text-text-secondary">
                €{parcels.reduce((s, p) => s + Math.round(contracts[p.crop].premiumPerHectare * p.hectares), 0).toLocaleString()}/season
              </span>
            </div>
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
