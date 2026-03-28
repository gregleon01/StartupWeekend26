"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Thermometer, Clock, Calendar, Shield } from "lucide-react";
import type { CropKey } from "@/types";
import { contracts } from "@/lib/contracts";
import { useLocale } from "@/lib/i18n";

interface ParcelCropSheetProps {
  hectares: number;
  onSelect: (crop: CropKey) => void;
}

const CROPS: CropKey[] = ["cherries", "grapes", "wheat", "sunflower"];

function formatWindow(start: string, end: string): string {
  const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const [sm, sd] = start.split("-").map(Number);
  const [em, ed] = end.split("-").map(Number);
  return `${m[sm-1]} ${sd} – ${m[em-1]} ${ed}`;
}

export default function ParcelCropSheet({ hectares, onSelect }: ParcelCropSheetProps) {
  const { locale } = useLocale();
  const [hoveredCrop, setHoveredCrop] = useState<CropKey | null>(null);
  const hovered = hoveredCrop ? contracts[hoveredCrop] : null;

  return (
    <motion.div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-4"
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 24, opacity: 0 }}
      transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
    >
      <div className="bg-white/8 backdrop-blur-xl border border-white/12 rounded-3xl px-6 pt-5 pb-5 shadow-2xl">

        <div className="text-center mb-5">
          <p className="text-accent-amber font-mono text-2xl font-bold">
            {hectares} ha
          </p>
          <p className="text-white/70 text-sm mt-1">
            {locale === "bg"
              ? "Какво отглеждате на тази нива?"
              : "What do you grow on this field?"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          {CROPS.map((key) => {
            const c = contracts[key];
            const totalPayout = Math.round(c.payoutPerHectare * hectares);
            const totalPremium = Math.round(c.premiumPerHectare * hectares);
            return (
              <motion.button
                key={key}
                onClick={() => onSelect(key)}
                onMouseEnter={() => setHoveredCrop(key)}
                onMouseLeave={() => setHoveredCrop(null)}
                whileTap={{ scale: 0.97 }}
                className="p-4 rounded-xl text-left bg-white/6 border border-white/8
                          hover:ring-1 hover:ring-accent-amber/40 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{c.icon}</span>
                  <div>
                    <span className="text-white text-sm font-medium block">
                      {locale === "bg" ? c.cropBg : c.crop}
                    </span>
                    <span className="text-white/50 text-[10px] block">
                      {locale === "bg" ? c.crop : c.cropBg}
                    </span>
                  </div>
                </div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-white/50">
                      {locale === "bg" ? "Изплащане" : "Payout"}
                    </span>
                    <span className="font-mono text-accent-amber font-bold">
                      €{totalPayout.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">
                      {locale === "bg" ? "Премия" : "Premium"}
                    </span>
                    <span className="font-mono text-white/70">
                      €{totalPremium}/{locale === "bg" ? "сезон" : "season"}
                    </span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Contract detail preview — fixed height, no layout shift */}
        <div className="max-w-md mx-auto mt-4 h-[36px] flex items-center justify-center">
          {hovered ? (
            <div className="flex items-center justify-center gap-5 text-[11px] text-white/50">
              <span className="flex items-center gap-1">
                <Thermometer className="w-3 h-3" />
                {hovered.triggerDirection === "below" ? "<" : ">"} {hovered.threshold}{hovered.thresholdUnit}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {hovered.durationThreshold}h
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatWindow(hovered.sensitiveStart, hovered.sensitiveEnd)}
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                €{hovered.payoutPerHectare}/ha
              </span>
            </div>
          ) : (
            <p className="text-white/25 text-[11px]">
              {locale === "bg" ? "Задръжте за детайли" : "Hover for details"}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
