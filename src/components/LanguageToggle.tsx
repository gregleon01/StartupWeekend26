"use client";

import { useLocale } from "@/lib/i18n";

export default function LanguageToggle() {
  const { locale, setLocale, t } = useLocale();

  return (
    <button
      onClick={() => setLocale(locale === "bg" ? "en" : "bg")}
      className="px-2.5 py-1 bg-bg-tertiary/60 backdrop-blur-md border border-border-subtle
                 rounded-lg text-text-secondary text-xs font-mono hover:text-text-primary
                 hover:bg-bg-tertiary transition-all cursor-pointer"
    >
      {t("lang")}
    </button>
  );
}
