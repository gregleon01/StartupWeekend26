"use client";

import { useLocale } from "@/lib/i18n";

export default function LanguageToggle() {
  const { locale, setLocale, t } = useLocale();

  return (
    <button
      onClick={() => setLocale(locale === "bg" ? "en" : "bg")}
      className="px-3 py-1.5 bg-bg-secondary border border-border-subtle
                 rounded-lg text-text-secondary text-xs hover:text-text-primary
                 hover:brightness-110 transition-all cursor-pointer"
    >
      {t("lang")}
    </button>
  );
}
