"use client";

import { motion } from "framer-motion";
import type { CropKey } from "@/types";
import { contracts } from "@/lib/contracts";
import { useLocale } from "@/lib/i18n";

interface ParcelCropSheetProps {
  hectares: number;
  onSelect: (crop: CropKey) => void;
}

const CROPS: CropKey[] = ["cherries", "grapes", "wheat", "sunflower"];

export default function ParcelCropSheet({ hectares, onSelect }: ParcelCropSheetProps) {
  const { locale } = useLocale();

  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 z-30"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
    >
      <div className="bg-bg-secondary/95 backdrop-blur-xl border-t border-border-subtle rounded-t-3xl px-6 pt-5 pb-8">
        <div className="w-10 h-1 bg-text-tertiary/40 rounded-full mx-auto mb-4" />

        <div className="text-center mb-5">
          <p className="text-accent-amber font-mono text-2xl font-bold">
            {hectares} ha
          </p>
          <p className="text-text-secondary text-sm mt-1">
            {locale === "bg"
              ? "Какво отглеждате на тази нива?"
              : "What do you grow on this field?"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
          {CROPS.map((key) => {
            const c = contracts[key];
            return (
              <motion.button
                key={key}
                onClick={() => onSelect(key)}
                whileTap={{ scale: 0.97 }}
                className="p-4 rounded-xl text-center bg-bg-tertiary/60
                          hover:ring-1 hover:ring-accent-amber/40 transition-all cursor-pointer"
              >
                <span className="text-2xl block mb-1.5">{c.icon}</span>
                <span className="text-text-primary text-sm font-medium block">
                  {locale === "bg" ? c.cropBg : c.crop}
                </span>
                <span className="text-text-tertiary text-[11px] block mt-0.5">
                  €{c.premiumPerHectare}/ha
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
