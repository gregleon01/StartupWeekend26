"use client";

import { motion } from "framer-motion";
import { Sprout, Shield, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n";
import LanguageToggle from "@/components/LanguageToggle";

export default function LandingPage() {
  const { locale } = useLocale();

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/bg-wheat.jpg')" }}
      />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Language toggle */}
      <div className="absolute top-6 right-6 z-50">
        <LanguageToggle />
      </div>

      {/* Glass content panel — full screen */}
      <motion.div
        className="relative z-10 w-full h-full flex flex-col items-center justify-center px-10 py-12
                   bg-white/5 backdrop-blur-xl border-x border-white/8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
      >
        {/* Logo + tagline */}
        <div className="text-center mb-10 w-full max-w-2xl">
          <h1 className="text-5xl font-bold text-white tracking-tight">
            Niva
          </h1>
          <p className="text-white/70 text-base mt-2">
            {locale === "bg"
              ? "Параметрично земеделско застраховане"
              : "Parametric Crop Insurance"}
          </p>
          <p className="text-white/45 text-sm mt-1">
            {locale === "bg"
              ? "Без документи · Без оценители · Изплащане за 48 часа"
              : "No paperwork · No adjusters · Payout in 48 hours"}
          </p>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch w-full max-w-2xl">
          <RoleCard
            href="/farmer"
            icon={<Sprout className="w-8 h-8" />}
            title={locale === "bg" ? "Земеделец" : "Farmer"}
            description={
              locale === "bg"
                ? "Защитете реколтата си от замръзване"
                : "Protect your harvest from frost"
            }
            accent="text-success-green"
            accentBg="bg-success-green/15"
            delay={0.2}
          />
          <RoleCard
            href="/admin"
            icon={<Shield className="w-8 h-8" />}
            title={locale === "bg" ? "Застраховател" : "Insurer"}
            description={
              locale === "bg"
                ? "Управлявайте портфолиото си"
                : "Manage your portfolio"
            }
            accent="text-accent-amber"
            accentBg="bg-accent-amber/15"
            delay={0.35}
          />
        </div>

        {/* Footer */}
        <motion.p
          className="text-white/30 text-xs text-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          HackAUBG 8.0 · The Hub Sofia
        </motion.p>
      </motion.div>
    </main>
  );
}

function RoleCard({
  href,
  icon,
  title,
  description,
  accent,
  accentBg,
  delay,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
  accentBg: string;
  delay: number;
}) {
  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", damping: 20 }}
    >
      <Link href={href} className="h-full block">
        <div
          className="group relative h-full p-6 bg-white/8 backdrop-blur-md border border-white/12
                     rounded-2xl hover:bg-white/12 hover:border-white/20 transition-all cursor-pointer"
        >
          <div className={`w-14 h-14 ${accentBg} rounded-xl flex items-center justify-center mb-4`}>
            <span className={accent}>{icon}</span>
          </div>
          <h2 className="text-white text-lg font-semibold mb-1">
            {title}
          </h2>
          <p className="text-white/60 text-sm leading-relaxed">
            {description}
          </p>
          <ArrowRight
            className={`absolute top-6 right-6 w-5 h-5 text-white/30 group-hover:${accent}
                        group-hover:translate-x-1 transition-all`}
          />
        </div>
      </Link>
    </motion.div>
  );
}
