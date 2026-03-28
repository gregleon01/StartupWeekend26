"use client";

import { motion } from "framer-motion";
import { Sprout, Shield, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n";
import LanguageToggle from "@/components/LanguageToggle";

export default function LandingPage() {
  const { locale } = useLocale();

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-bg-primary flex items-center justify-center">
      {/* Subtle background gradient */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse at 30% 50%, #F5A62310 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, #4FC3F710 0%, transparent 60%)",
        }}
      />

      {/* Language toggle */}
      <div className="absolute top-6 right-6 z-50">
        <LanguageToggle />
      </div>

      <div className="relative z-10 w-full max-w-2xl px-6">
        {/* Logo + tagline */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-text-primary tracking-tight">
            Niva
          </h1>
          <p className="text-text-secondary text-base mt-2">
            {locale === "bg"
              ? "Параметрично земеделско застраховане"
              : "Parametric Crop Insurance"}
          </p>
          <p className="text-text-tertiary text-sm mt-1">
            {locale === "bg"
              ? "Без документи · Без оценители · Изплащане за 48 часа"
              : "No paperwork · No adjusters · Payout in 48 hours"}
          </p>
        </motion.div>

        {/* Role cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
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
            accentBg="bg-success-green/10"
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
            accentBg="bg-accent-amber/10"
            delay={0.35}
          />
        </div>

        {/* Footer */}
        <motion.p
          className="text-text-tertiary text-xs text-center mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          HackAUBG 8.0 · The Hub Sofia
        </motion.p>
      </div>
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
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", damping: 20 }}
    >
      <Link href={href} className="h-full">
        <div
          className="group relative h-full p-6 bg-bg-secondary border border-border-subtle rounded-2xl
                     hover:border-border-subtle/80 hover:bg-bg-tertiary/30 transition-all cursor-pointer"
        >
          <div className={`w-14 h-14 ${accentBg} rounded-xl flex items-center justify-center mb-4`}>
            <span className={accent}>{icon}</span>
          </div>
          <h2 className="text-text-primary text-lg font-semibold mb-1">
            {title}
          </h2>
          <p className="text-text-secondary text-sm leading-relaxed">
            {description}
          </p>
          <ArrowRight
            className={`absolute top-6 right-6 w-5 h-5 text-text-tertiary group-hover:${accent}
                        group-hover:translate-x-1 transition-all`}
          />
        </div>
      </Link>
    </motion.div>
  );
}
