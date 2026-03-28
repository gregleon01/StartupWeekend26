"use client";

import { useLocale } from "@/lib/i18n";

export default function LanguageToggle() {
  const { locale, setLocale, t } = useLocale();

  return (
    <button
      onClick={() => setLocale(locale === "bg" ? "en" : "bg")}
      className="px-2 py-0.5 text-white/70 text-xs font-medium hover:text-white
                 transition-all cursor-pointer outline-none"
    >
      {t("lang")}
    </button>
  );
}
