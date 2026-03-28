"use client";

import { useLocale } from "@/lib/i18n";

export default function LanguageToggle() {
  const { locale, setLocale, t } = useLocale();

  return (
    <button
      onClick={() => setLocale(locale === "bg" ? "en" : "bg")}
      className="px-3 py-1.5 bg-white/10 backdrop-blur-md border border-white/30
                 rounded-lg text-white/80 text-xs font-medium hover:text-white
                 hover:bg-white/18 hover:border-white/50 transition-all cursor-pointer"
    >
      {t("lang")}
    </button>
  );
}
