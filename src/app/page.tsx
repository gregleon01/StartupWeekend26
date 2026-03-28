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

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Full-screen glass panel */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-xl border-x border-white/8 flex flex-col items-center justify-center">

        {/* Language toggle — glassmorphism style */}
        <div className="absolute top-6 right-6 z-50">
          <LanguageToggle />
        </div>

        {/* Logo */}
        <motion.h1
          className="text-5xl font-bold text-white tracking-tight"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Aklima
        </motion.h1>

        {/* Tagline */}
        <motion.p
          className="text-white/70 text-base mt-5"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {locale === "bg"
            ? "Параметрично земеделско застраховане"
            : "Parametric Crop Insurance"}
        </motion.p>

        {/* Subtitle */}
        <motion.p
          className="text-white/45 text-sm mt-3 mb-14"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {locale === "bg"
            ? "Без документи · Без оценители · Изплащане за 48 часа"
            : "No paperwork · No adjusters · Payout in 48 hours"}
        </motion.p>

        {/* Role cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch w-full max-w-2xl px-6">
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
            floatDelay={0.7}
            floatOffset={0}
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
            floatDelay={1.1}
            floatOffset={0}
          />
        </div>
      </div>

      {/* Footer — pinned to bottom */}
      <motion.p
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-white/30 text-xs whitespace-nowrap"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        HackAUBG 8.0 · The Hub Sofia
      </motion.p>
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
  floatDelay,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
  accentBg: string;
  floatDelay: number;
  floatOffset: number;
}) {
  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: [0, -10, 0] }}
      transition={{
        opacity: { duration: 0.4, delay: floatDelay - 0.5 },
        y: {
          delay: floatDelay,
          duration: 4,
          repeat: Infinity,
          repeatType: "loop",
          ease: "easeInOut",
          times: [0, 0.5, 1],
        },
      }}
    >
      <Link href={href} className="h-full block">
        <div
          className="group relative h-full p-6 bg-white/8 backdrop-blur-md
                     border border-white/20 rounded-2xl
                     hover:bg-white/14 hover:border-white/30 transition-all cursor-pointer"
        >
          <div className={`w-14 h-14 ${accentBg} rounded-xl flex items-center justify-center mb-4`}>
            <span className={accent}>{icon}</span>
          </div>
          <h2 className="text-white text-lg font-semibold mb-1">{title}</h2>
          <p className="text-white/60 text-sm leading-relaxed">{description}</p>
          <ArrowRight
            className={`absolute top-6 right-6 w-5 h-5 text-white/30 group-hover:${accent}
                        group-hover:translate-x-1 transition-all`}
          />
        </div>
      </Link>
    </motion.div>
  );
}
