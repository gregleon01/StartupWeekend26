"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ArrowRight, Trash2, Shield, MapPin, ArrowRight as Go } from "lucide-react";
import type { FarmerParcel } from "@/types";
import { contracts } from "@/lib/contracts";
import { useLocale } from "@/lib/i18n";

interface ParcelSidebarProps {
  parcels: FarmerParcel[];
  onAddMore: (address: string) => void;
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
  const [searching, setSearching] = useState(false);
  const [searchAddress, setSearchAddress] = useState("");

  const totalHa = parcels.reduce((s, p) => s + p.hectares, 0);
  const totalPremium = parcels.reduce(
    (s, p) => s + p.hectares * contracts[p.crop].premiumPerHectare,
    0,
  );
  const totalPayout = parcels.reduce(
    (s, p) => s + p.hectares * contracts[p.crop].payoutPerHectare,
    0,
  );

  return (
    <motion.div
      className="absolute top-20 right-4 bottom-4 w-[280px] z-30 bg-white/8 backdrop-blur-xl
                 border border-white/12 rounded-2xl overflow-hidden flex flex-col"
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 25 }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10">
        <p className="text-white text-sm font-medium">
          {locale === "bg" ? "Вашите полета" : "Your Fields"}
        </p>
        <p className="text-white/50 text-xs mt-0.5">
          {parcels.length} {locale === "bg" ? "полета" : "fields"} · {totalHa.toFixed(1)} ha
        </p>
      </div>

      {/* Parcel list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {parcels.map((p, i) => {
          const c = contracts[p.crop];
          const parcelPayout = Math.round(p.hectares * c.payoutPerHectare);
          return (
            <motion.div
              key={p.id}
              className="p-3 bg-white/6 rounded-lg group"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{c.icon}</span>
                  <div>
                    <p className="text-white text-xs font-medium">
                      {locale === "bg" ? c.cropBg : c.crop}
                    </p>
                    <p className="text-white/50 text-[11px] font-mono">
                      {p.hectares} ha
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onRemove(p.id)}
                  className="opacity-0 group-hover:opacity-100 text-white/50 hover:text-danger-red
                             transition-all cursor-pointer p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* Per-parcel coverage summary */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10 text-[10px]">
                <span className="text-white/50 flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5" />
                  {locale === "bg" ? "Макс. изплащане" : "Max payout"}
                </span>
                <span className="font-mono text-accent-amber font-bold text-xs">
                  €{parcelPayout.toLocaleString()}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Summary + Actions */}
      <div className="px-3 py-3 border-t border-white/10 space-y-2">
        {/* Totals */}
        <div className="space-y-1 px-1">
          <div className="flex justify-between text-xs">
            <span className="text-white/50">
              {locale === "bg" ? "Макс. изплащане" : "Max payout"}
            </span>
            <span className="font-mono text-accent-amber font-bold">
              €{Math.round(totalPayout).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/50">
              {locale === "bg" ? "Обща премия" : "Total premium"}
            </span>
            <span className="font-mono text-white/70">
              €{Math.round(totalPremium).toLocaleString()}/{locale === "bg" ? "сезон" : "season"}
            </span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {searching ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2 px-3 py-2.5 bg-white/6 border border-accent-amber/40
                         rounded-xl focus-within:border-accent-amber/70 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
              <input
                autoFocus
                type="text"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onAddMore(searchAddress);
                    setSearching(false);
                    setSearchAddress("");
                  }
                  if (e.key === "Escape") {
                    setSearching(false);
                    setSearchAddress("");
                  }
                }}
                placeholder={locale === "bg" ? "Населено място..." : "Location..."}
                className="flex-1 bg-transparent text-white text-xs outline-none placeholder:text-white/30"
              />
              <button
                onClick={() => {
                  onAddMore(searchAddress);
                  setSearching(false);
                  setSearchAddress("");
                }}
                className="text-accent-amber hover:brightness-110 cursor-pointer"
              >
                <Go className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="add-btn"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              onClick={() => setSearching(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/6
                         border border-white/10 rounded-xl text-white/70 text-xs
                         hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {locale === "bg" ? "Добави ново поле" : "Add another field"}
            </motion.button>
          )}
        </AnimatePresence>

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
