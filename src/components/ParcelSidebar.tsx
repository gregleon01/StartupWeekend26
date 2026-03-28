"use client";

import { motion } from "framer-motion";
import { Plus, ArrowRight, Trash2 } from "lucide-react";
import type { FarmerParcel } from "@/types";
import { contracts } from "@/lib/contracts";
import { useLocale } from "@/lib/i18n";

interface ParcelSidebarProps {
  parcels: FarmerParcel[];
  onAddMore: () => void;
  onContinue: () => void;
  onRemove: (id: string) => void;
}

export default function ParcelSidebar({
  parcels,
  onAddMore,
  onContinue,
  onRemove,
}: ParcelSidebarProps) {
  const { locale } = useLocale();

  const totalHa = parcels.reduce((s, p) => s + p.hectares, 0);
  const totalPremium = parcels.reduce(
    (s, p) => s + p.hectares * contracts[p.crop].premiumPerHectare,
    0,
  );

  return (
    <motion.div
      className="absolute top-4 right-4 bottom-4 w-[280px] z-30 bg-bg-secondary/90 backdrop-blur-xl
                 border border-border-subtle rounded-2xl overflow-hidden flex flex-col"
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 25 }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-subtle">
        <p className="text-text-primary text-sm font-medium">
          {locale === "bg" ? "Вашите полета" : "Your Fields"}
        </p>
        <p className="text-text-tertiary text-xs mt-0.5">
          {parcels.length} {locale === "bg" ? "полета" : "fields"} · {totalHa} ha
        </p>
      </div>

      {/* Parcel list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {parcels.map((p, i) => {
          const c = contracts[p.crop];
          return (
            <motion.div
              key={p.id}
              className="flex items-center justify-between p-3 bg-bg-tertiary/50 rounded-lg group"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{c.icon}</span>
                <div>
                  <p className="text-text-primary text-xs font-medium">
                    {locale === "bg" ? c.cropBg : c.crop}
                  </p>
                  <p className="text-text-tertiary text-[11px] font-mono">
                    {p.hectares} ha · €{Math.round(p.hectares * c.premiumPerHectare)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onRemove(p.id)}
                className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-danger-red
                           transition-all cursor-pointer p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="px-3 py-3 border-t border-border-subtle space-y-2">
        {/* Total premium */}
        <div className="flex justify-between text-xs px-1">
          <span className="text-text-tertiary">
            {locale === "bg" ? "Обща премия" : "Total premium"}
          </span>
          <span className="font-mono text-accent-amber font-bold">
            €{Math.round(totalPremium)}
          </span>
        </div>

        <button
          onClick={onAddMore}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-bg-tertiary/50
                     border border-border-subtle rounded-xl text-text-secondary text-xs
                     hover:text-text-primary hover:bg-bg-tertiary transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          {locale === "bg" ? "Добави ново поле" : "Add another field"}
        </button>

        <button
          onClick={onContinue}
          className="w-full flex items-center justify-center gap-2 py-3 bg-accent-amber
                     text-bg-primary rounded-xl text-sm font-semibold
                     hover:brightness-110 transition-all cursor-pointer"
        >
          {locale === "bg" ? "Виж покритието" : "See coverage"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
