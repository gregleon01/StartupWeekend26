"use client";

import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import type { ParametricContract } from "@/types";

interface CoverageCardProps {
  contract: ParametricContract;
  onSimulate: () => void;
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
}: CoverageCardProps) {
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
            IF temperature drops below{" "}
            <span className="font-mono text-frost-blue font-semibold">
              {contract.temperatureThreshold}°C
            </span>
          </p>
          <p className="text-text-secondary text-sm leading-relaxed">
            for more than{" "}
            <span className="font-mono text-text-primary font-semibold">
              {contract.durationThreshold} consecutive hours
            </span>
          </p>
          <p className="text-text-secondary text-sm leading-relaxed">
            during{" "}
            <span className="text-text-primary font-medium">
              {formatWindow(contract.sensitiveStart, contract.sensitiveEnd)}
            </span>
          </p>
        </div>

        {/* Payout amount — the star */}
        <div className="mb-1">
          <p className="text-text-tertiary text-xs uppercase tracking-widest mb-1">
            You receive
          </p>
          <p className="font-mono text-5xl font-bold text-accent-amber leading-none">
            &euro;{contract.payoutPerHectare}
            <span className="text-lg text-text-tertiary font-normal ml-1">
              /ha
            </span>
          </p>
        </div>

        {/* Premium */}
        <p className="text-text-secondary text-sm mb-6">
          Premium:{" "}
          <span className="font-mono text-text-primary">
            &euro;{contract.premiumPerHectare}
          </span>
          /ha per season
        </p>

        {/* CTA */}
        <motion.button
          onClick={onSimulate}
          className="w-full py-4 bg-accent-amber text-bg-primary rounded-xl font-semibold text-base
                     hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
          whileTap={{ scale: 0.98 }}
        >
          Simulate Frost Event
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
