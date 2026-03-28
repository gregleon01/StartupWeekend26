"use client";

import { createContext, useContext } from "react";

/* ================================================================== */
/*  Internationalization                                                */
/*                                                                     */
/*  Lightweight i18n for Bulgarian farmers. No heavy library needed — */
/*  just a context with string keys. Adding a language means adding   */
/*  one object.                                                        */
/* ================================================================== */

export type Locale = "bg" | "en";

export const translations = {
  bg: {
    // Map screen
    "map.title": "Aklima",
    "map.subtitle": "Параметрично земеделско застраховане",
    "map.prompt": "Натиснете върху полето си",

    // Crop selector
    "crop.title": "Изберете култура",
    "crop.subtitle": "Какво отглеждате?",

    // Field info
    "field.location": "местоположение",
    "field.elevation": "м н.в.",
    "field.station": "станция",
    "field.confidence": "увереност",

    // Historical
    "history.title": "Исторически анализ",
    "history.events": "събития задействали изплащане",
    "history.losses": "неизплатени загуби",
    "history.cta": "Вижте покритието",
    "history.loading": "Зареждане на метеоданни...",

    // Coverage
    "coverage.if": "АКО температурата падне под",
    "coverage.for": "за повече от",
    "coverage.hours": "последователни часа",
    "coverage.during": "в периода",
    "coverage.receive": "Получавате",
    "coverage.premium": "Премия",
    "coverage.perSeason": "/ха на сезон",
    "coverage.confidence": "Увереност на тригера",
    "coverage.confidenceDesc": "Вероятност, че референтната станция точно отразява условията на вашето поле.",
    "coverage.allFields": "Всички полета",
    "coverage.totalPayout": "Общо изплащане",
    "coverage.totalPremium": "Обща премия",
    "coverage.simulate": "Симулирай замръзване",

    // Simulation
    "sim.title": "Симулация на замръзване",
    "sim.hoursBelow": "Часове под",
    "sim.triggered": "Тригер активиран",
    "sim.exit": "Изход",
    "sim.restart": "Ново поле",
    "sim.insure": "Застраховай се",

    // Payout
    "payout.title": "Изплащане одобрено",
    "payout.auto": "Автоматично · Без документи",

    // General
    "back": "Назад",
    "lang": "EN",
  },
  en: {
    "map.title": "Aklima",
    "map.subtitle": "Parametric Crop Insurance",
    "map.prompt": "Tap on your field",

    "crop.title": "Select crop",
    "crop.subtitle": "What do you grow?",

    "field.location": "location",
    "field.elevation": "elevation",
    "field.station": "station",
    "field.confidence": "confidence",

    "history.title": "Historical Analysis",
    "history.events": "events would have triggered",
    "history.losses": "unpaid losses",
    "history.cta": "See coverage",
    "history.loading": "Loading weather data...",

    "coverage.if": "IF temperature drops below",
    "coverage.for": "for more than",
    "coverage.hours": "consecutive hours",
    "coverage.during": "during",
    "coverage.receive": "You receive",
    "coverage.premium": "Premium",
    "coverage.perSeason": "/ha per season",
    "coverage.confidence": "Trigger confidence",
    "coverage.confidenceDesc": "Probability that the reference station accurately reflects conditions at your field.",
    "coverage.allFields": "All fields",
    "coverage.totalPayout": "Total max payout",
    "coverage.totalPremium": "Total premium",
    "coverage.simulate": "Simulate Frost Event",

    "sim.title": "Frost Event Simulation",
    "sim.hoursBelow": "Hours below",
    "sim.triggered": "Trigger Activated",
    "sim.exit": "Exit",
    "sim.restart": "Try another field",
    "sim.insure": "Get insured",

    "payout.title": "Payout Approved",
    "payout.auto": "Automatic · No paperwork",

    "back": "Back",
    "lang": "BG",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
}>({
  locale: "bg",
  setLocale: () => {},
  t: (key) => translations.bg[key] ?? key,
});

export function useLocale() {
  return useContext(LocaleContext);
}
