"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { CropKey } from "@/types";
import { contracts } from "@/lib/contracts";
import { useLocale } from "@/lib/i18n";

interface CropSelectorProps {
  onSelect: (crop: CropKey) => void;
}

const CROPS: CropKey[] = ["cherries", "grapes", "wheat", "sunflower"];

export default function CropSelector({ onSelect }: CropSelectorProps) {
  const { locale, t } = useLocale();
  const [selected, setSelected] = useState<CropKey | null>(null);

  const handlePick = (crop: CropKey) => {
    setSelected(crop);
    // Brief delay so the user sees the selection before transition
    setTimeout(() => onSelect(crop), 350);
  };

  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 z-30"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
    >
      <div className="bg-bg-secondary/95 backdrop-blur-xl border-t border-border-subtle rounded-t-3xl px-6 pt-6 pb-10">
        <div className="w-10 h-1 bg-text-tertiary/40 rounded-full mx-auto mb-5" />

        <p className="text-text-primary text-lg font-medium text-center">
          {t("crop.title")}
        </p>
        <p className="text-text-secondary text-sm text-center mb-6">
          {t("crop.subtitle")}
        </p>

        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
          {CROPS.map((key) => {
            const c = contracts[key];
            const isSelected = selected === key;
            return (
              <motion.button
                key={key}
                onClick={() => handlePick(key)}
                whileTap={{ scale: 0.97 }}
                className={`
                  relative p-5 rounded-xl text-center transition-all duration-200 cursor-pointer
                  ${
                    isSelected
                      ? "bg-bg-tertiary ring-1 ring-accent-amber scale-[1.02]"
                      : "bg-bg-tertiary/60 hover:ring-1 hover:ring-accent-amber/40"
                  }
                `}
              >
                <span className="text-3xl block mb-2">{c.icon}</span>
                <span className="text-text-primary text-sm font-medium block">
                  {locale === "bg" ? c.cropBg : c.crop}
                </span>
                <span className="text-text-tertiary text-xs block mt-0.5">
                  {locale === "bg" ? c.crop : c.cropBg}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
