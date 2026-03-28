"use client";

import React from "react";
import { motion } from "framer-motion";
import type { ParametricContract, FieldEnrichment, FarmerParcel } from "@/types";
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

interface Tier {
  name: string;
  badge?: string;
  payoutMultiplier: number;
  premiumMultiplier: number;
  recommended?: boolean;
}

const TIERS: Tier[] = [
  { name: "Basic", payoutMultiplier: 0.7, premiumMultiplier: 0.6 },
  { name: "Standard", badge: "Recommended", payoutMultiplier: 1, premiumMultiplier: 1, recommended: true },
  { name: "Premium", badge: "Max Protection", payoutMultiplier: 1.8, premiumMultiplier: 1.5 },
];

function TierCard({
  tier,
  contract,
  onSimulate,
  index,
}: {
  tier: Tier;
  contract: ParametricContract;
  onSimulate: () => void;
  index: number;
}) {
  const { t } = useLocale();
  const payout = Math.round(contract.payoutPerHectare * tier.payoutMultiplier);
  const premium = Math.round(contract.premiumPerHectare * tier.premiumMultiplier);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    e.currentTarget.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg)`;
  };
  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg)";
  };

  return (
    <motion.div
      className={`flex-1 min-w-0 bg-white/8 backdrop-blur-xl border border-white/12 rounded-2xl p-5 transition-transform duration-150 ease-out cursor-pointer ${
        tier.recommended ? "ring-1 ring-accent-amber" : ""
      }`}
      style={{ transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.1, type: "spring", damping: 25, stiffness: 200 }}
    >
      {/* Tier header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{contract.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">{tier.name}</p>
          <p className="text-white/40 text-[10px]">{contract.crop}</p>
        </div>
        {tier.badge && (
          <span
            className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              tier.recommended
                ? "bg-accent-amber/20 text-accent-amber"
                : "bg-white/10 text-white/60"
            }`}
          >
            {tier.badge}
          </span>
        )}
      </div>

      {/* Condition */}
      <div className="mb-4 space-y-1">
        <p className="text-white/60 text-xs leading-relaxed">
          {t("coverage.if")}{" "}
          <span className="font-mono text-frost-blue font-semibold">
            {contract.threshold}°C
          </span>
        </p>
        <p className="text-white/60 text-xs leading-relaxed">
          {t("coverage.for")}{" "}
          <span className="font-mono text-white font-semibold">
            {contract.durationThreshold} {t("coverage.hours")}
          </span>
        </p>
        <p className="text-white/60 text-xs leading-relaxed">
          {t("coverage.during")}{" "}
          <span className="text-white font-medium">
            {formatWindow(contract.sensitiveStart, contract.sensitiveEnd)}
          </span>
        </p>
      </div>

      {/* Payout */}
      <div className="mb-1">
        <p className="text-white/40 text-[9px] uppercase tracking-widest mb-1">
          {t("coverage.receive")}
        </p>
        <p className="font-mono text-3xl font-bold text-accent-amber leading-none">
          &euro;{payout}
          <span className="text-sm text-white/40 font-normal ml-1">/ha</span>
        </p>
      </div>

      {/* Premium */}
      <p className="text-white/60 text-xs mb-5">
        {t("coverage.premium")}:{" "}
        <span className="font-mono text-white">
          &euro;{premium}
        </span>
        {t("coverage.perSeason")}
      </p>

      {/* CTA */}
      <motion.button
        onClick={onSimulate}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
          tier.recommended
            ? "bg-accent-amber text-bg-primary hover:brightness-110"
            : "bg-white/10 text-white hover:bg-white/15"
        } active:scale-[0.98]`}
        whileTap={{ scale: 0.98 }}
      >
        Select
      </motion.button>
    </motion.div>
  );
}

export default function CoverageCard({
  contract,
  onSimulate,
}: CoverageCardProps) {
  return (
    <motion.div
      className="absolute inset-0 z-30 flex items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" />

      {/* Tier cards */}
      <div className="relative flex items-stretch gap-4 max-w-[900px] w-full">
        {TIERS.map((tier, i) => (
          <TierCard
            key={tier.name}
            tier={tier}
            contract={contract}
            onSimulate={onSimulate}
            index={i}
          />
        ))}
      </div>
    </motion.div>
  );
}
