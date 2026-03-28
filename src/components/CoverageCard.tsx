"use client";

import React from "react";
import { motion } from "framer-motion";
import type { ParametricContract, FieldEnrichment, FarmerParcel } from "@/types";
import { contracts as contractsLib } from "@/lib/contracts";
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
  selected,
  onSelect,
}: {
  tier: Tier;
  contract: ParametricContract;
  onSimulate: () => void;
  index: number;
  selected: boolean;
  onSelect: () => void;
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
      onClick={onSelect}
      className={`flex-1 min-w-0 bg-white/8 backdrop-blur-xl border rounded-2xl p-5 transition-all duration-150 ease-out cursor-pointer ${
        selected || tier.recommended ? "border-accent-amber ring-1 ring-accent-amber" : "border-white/12 hover:border-white/25"
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
        onClick={(e) => { e.stopPropagation(); onSimulate(); }}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
          selected || tier.recommended
            ? "bg-accent-amber text-bg-primary hover:brightness-110"
            : "bg-white/10 text-white hover:bg-white/15"
        } active:scale-[0.98]`}
        whileTap={{ scale: 0.98 }}
      >
        {selected ? "Continue →" : "Select"}
      </motion.button>
    </motion.div>
  );
}

export default function CoverageCard({
  contract,
  onSimulate,
  parcels,
}: CoverageCardProps) {
  const { locale } = useLocale();

  // Derive unique contracts from parcels
  const uniqueContracts: ParametricContract[] = React.useMemo(() => {
    if (!parcels || parcels.length === 0) return [contract];
    const seen = new Set<string>();
    const result: ParametricContract[] = [];
    for (const p of parcels) {
      if (!seen.has(p.crop)) {
        seen.add(p.crop);
        result.push(contractsLib[p.crop]);
      }
    }
    return result;
  }, [parcels, contract]);

  const [step, setStep] = React.useState(0);
  const [selectedTier, setSelectedTier] = React.useState<number>(1);

  const activeContract = uniqueContracts[step] ?? contract;
  const isLast = step === uniqueContracts.length - 1;
  const total = uniqueContracts.length;

  const advance = () => {
    if (isLast) {
      onSimulate();
    } else {
      setStep((s) => s + 1);
      setSelectedTier(1);
    }
  };

  return (
    <motion.div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6 gap-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" />

      {/* Step indicator */}
      {total > 1 && (
        <div className="relative flex items-center gap-3">
          {uniqueContracts.map((c, i) => (
            <div
              key={c.crop}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all
                ${i === step
                  ? "bg-accent-amber text-bg-primary"
                  : i < step
                    ? "bg-white/16 text-white/60"
                    : "bg-white/8 border border-white/12 text-white/40"
                }`}
            >
              <span>{c.icon}</span>
              {c.crop}
              {i < step && <span className="ml-1 text-xs">✓</span>}
            </div>
          ))}
        </div>
      )}

      {/* Tier cards */}
      <motion.div
        key={step}
        className="relative flex items-stretch gap-4 max-w-[900px] w-full"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        {TIERS.map((tier, i) => (
          <TierCard
            key={`${activeContract.crop}-${tier.name}`}
            tier={tier}
            contract={activeContract}
            onSimulate={advance}
            index={i}
            selected={selectedTier === i}
            onSelect={() => setSelectedTier(i)}
          />
        ))}
      </motion.div>

      {/* No insurance option */}
      <button
        onClick={advance}
        className="relative text-white/35 text-xs hover:text-white/60 transition-colors cursor-pointer underline underline-offset-2 outline-none"
      >
        {locale === "bg"
          ? `Не искам застраховка за ${activeContract.crop}`
          : `I don't want insurance for ${activeContract.crop}`}
      </button>
    </motion.div>
  );
}
