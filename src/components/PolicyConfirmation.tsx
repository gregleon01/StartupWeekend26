"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import type { PolicySelection, FarmerParcel } from "@/types";
import { contracts } from "@/lib/contracts";

interface PolicyConfirmationProps {
  selections: PolicySelection[];
  parcels: FarmerParcel[];
  farmerName: string;
  onActivate: () => void;
  onBack: () => void;
}

export default function PolicyConfirmation({
  selections,
  farmerName,
  onActivate,
  onBack,
}: PolicyConfirmationProps) {
  const policyNumber = React.useMemo(
    () => `POL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    [],
  );

  const covered = selections.filter((s) => s.tierIndex >= 0);
  const totalPremium = covered.reduce((s, sel) => s + sel.totalAnnualPremium, 0);
  const totalHectares = covered.reduce((s, sel) => s + sel.hectares, 0);

  return (
    <motion.div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" />

      <motion.div
        className="relative w-full max-w-md bg-white/8 backdrop-blur-2xl border border-white/12 rounded-2xl overflow-hidden shadow-2xl"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.05, type: "spring", damping: 24, stiffness: 200 }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-accent-amber/15 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-accent-amber" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Policy Summary</p>
              <p className="text-white/40 text-[10px] font-mono">{policyNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <p className="text-white/40 text-[9px] uppercase tracking-widest mb-0.5">Policyholder</p>
              <p className="text-white text-sm font-medium">{farmerName || "Farmer"}</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <p className="text-white/40 text-[9px] uppercase tracking-widest mb-0.5">Coverage period</p>
              <p className="text-white text-sm font-medium">2025 season</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <p className="text-white/40 text-[9px] uppercase tracking-widest mb-0.5">Total area</p>
              <p className="text-white text-sm font-medium font-mono">{totalHectares.toFixed(1)} ha</p>
            </div>
          </div>
        </div>

        {/* Coverage rows */}
        <div className="px-6 py-3 space-y-2">
          {selections.map((sel) => {
            const contract = contracts[sel.cropKey];
            const hasCoverage = sel.tierIndex >= 0;
            return (
              <div
                key={sel.cropKey}
                className={`flex items-center gap-3 py-2.5 px-3 rounded-xl ${
                  hasCoverage ? "bg-white/6" : "bg-white/3 opacity-50"
                }`}
              >
                <span className="text-lg">{contract.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium">{contract.crop}</p>
                  <p className="text-white/40 text-[10px]">
                    {hasCoverage
                      ? `${sel.tierName} · ${sel.hectares.toFixed(1)} ha`
                      : "No coverage"}
                  </p>
                </div>
                {hasCoverage ? (
                  <div className="text-right">
                    <p className="font-mono text-accent-amber text-sm font-semibold">
                      €{sel.totalAnnualPremium.toLocaleString()}
                    </p>
                    <p className="text-white/30 text-[9px]">/season</p>
                  </div>
                ) : (
                  <p className="text-white/25 text-xs">—</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Total */}
        <div className="mx-6 mb-4 pt-3 border-t border-white/10 flex items-baseline justify-between">
          <p className="text-white/50 text-xs">Total annual premium</p>
          <p className="font-mono text-white text-xl font-bold">
            €{totalPremium.toLocaleString()}
          </p>
        </div>

        {/* CTAs */}
        <div className="px-6 pb-6 space-y-2">
          <motion.button
            onClick={onActivate}
            className="w-full py-3 bg-accent-amber text-bg-primary rounded-xl text-sm font-semibold
                       hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Activate Policy →
          </motion.button>
          <button
            onClick={onBack}
            className="w-full text-white/35 text-xs hover:text-white/60 transition-colors cursor-pointer py-1 outline-none"
          >
            ← Back to Coverage
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
