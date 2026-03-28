"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, MapPin, ArrowRight } from "lucide-react";
import { useLocale } from "@/lib/i18n";

interface FarmerOnboardingProps {
  name: string;
  address: string;
  onNameChange: (name: string) => void;
  onAddressChange: (address: string) => void;
  onContinue: () => void;
}

export default function FarmerOnboarding({
  name,
  address,
  onNameChange,
  onAddressChange,
  onContinue,
}: FarmerOnboardingProps) {
  const { locale } = useLocale();
  const [focused, setFocused] = useState<string | null>(null);

  const canContinue = name.trim().length >= 2;

  return (
    <motion.div
      className="absolute inset-0 z-30 flex items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <motion.div
        className="relative w-full max-w-[420px] bg-white/8 backdrop-blur-2xl border border-white/12 rounded-2xl p-7 shadow-2xl"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-white text-lg font-semibold">
            {locale === "bg" ? "Здравейте!" : "Welcome!"}
          </p>
          <p className="text-white/70 text-sm mt-1">
            {locale === "bg"
              ? "Кажете ни за вашето стопанство"
              : "Tell us about your farm"}
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-white/50 text-xs uppercase tracking-wider block mb-1.5">
              {locale === "bg" ? "Вашето име" : "Your name"}
            </label>
            <div
              className={`flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border transition-colors ${
                focused === "name"
                  ? "border-accent-amber/50"
                  : "border-white/10"
              }`}
            >
              <User className="w-4 h-4 text-white/40 flex-shrink-0" />
              <input
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                onFocus={() => setFocused("name")}
                onBlur={() => setFocused(null)}
                placeholder={locale === "bg" ? "Иван Петров" : "Ivan Petrov"}
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-white/50 text-xs uppercase tracking-wider block mb-1.5">
              {locale === "bg" ? "Адрес на стопанството" : "Farm address"}
              <span className="text-white/30 ml-1 normal-case tracking-normal">
                ({locale === "bg" ? "по избор" : "optional"})
              </span>
            </label>
            <div
              className={`flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border transition-colors ${
                focused === "address"
                  ? "border-accent-amber/50"
                  : "border-white/10"
              }`}
            >
              <MapPin className="w-4 h-4 text-white/40 flex-shrink-0" />
              <input
                type="text"
                value={address}
                onChange={(e) => onAddressChange(e.target.value)}
                onFocus={() => setFocused("address")}
                onBlur={() => setFocused(null)}
                placeholder={locale === "bg" ? "с. Граница, Кюстендил" : "Granitsa, Kyustendil"}
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
              />
            </div>
          </div>
        </div>

        {/* Info */}
        <p className="text-white/40 text-xs mt-4 leading-relaxed text-center">
          {locale === "bg"
            ? "След това ще начертаете полетата си на картата и ще изберете култура за всяко."
            : "Next, you'll draw your fields on the map and assign a crop to each one."}
        </p>

        {/* CTA */}
        <motion.button
          onClick={onContinue}
          disabled={!canContinue}
          className={`w-full flex items-center justify-center gap-2 mt-6 py-3.5 rounded-xl text-sm font-semibold
                     transition-all cursor-pointer ${
                       canContinue
                         ? "bg-accent-amber text-bg-primary hover:brightness-110"
                         : "bg-white/6 text-white/30 cursor-not-allowed"
                     }`}
          whileTap={canContinue ? { scale: 0.98 } : undefined}
        >
          {locale === "bg" ? "Начертай полетата" : "Draw my fields"}
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
