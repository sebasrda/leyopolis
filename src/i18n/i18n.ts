"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import es from "../../locales/es/translation.json";
import en from "../../locales/en/translation.json";
import fr from "../../locales/fr/translation.json";
import zh from "../../locales/zh/translation.json";
import de from "../../locales/de/translation.json";
import pt from "../../locales/pt/translation.json";
import it from "../../locales/it/translation.json";

const STORAGE_KEY = "leyopolis_language";
const DYNAMIC_PREFIX = "leyopolis_i18n_dynamic_";

function getInitialLanguage() {
  if (typeof window === "undefined") return "es";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;
  return "es";
}

function readDynamic(lang: string) {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(`${DYNAMIC_PREFIX}${lang}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    // Strip out invalid entries that have leaked into localStorage from earlier
    // bugs: empty values, identical key=value (no real translation), or values
    // that obviously contain the Spanish original. Those overrode the base
    // locale and made strings like 'Inicio' / 'Seguridad' stay in Spanish even
    // after switching language. Returning a cleaned dict prevents that.
    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value !== "string") continue;
      const v = value.trim();
      if (!v) continue;
      if (v === key.trim()) continue;
      sanitized[key] = v;
    }
    // If we removed anything, persist the cleaned copy back so future loads
    // are fast and we don't pay the filter cost forever.
    if (Object.keys(sanitized).length !== Object.keys(parsed as object).length) {
      try { window.localStorage.setItem(`${DYNAMIC_PREFIX}${lang}`, JSON.stringify(sanitized)); } catch {}
    }
    return sanitized;
  } catch {
    return {};
  }
}

function writeDynamic(lang: string, data: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${DYNAMIC_PREFIX}${lang}`, JSON.stringify(data));
  } catch {
  }
}

export function setStoredLanguage(lang: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, lang);
}

export function addDynamicTranslation(lang: string, key: string, value: string) {
  const normalizedKey = key.trim();
  if (!normalizedKey) return;
  const normalizedValue = value.trim();
  if (!normalizedValue) return;

  i18n.addResource(lang, "translation", normalizedKey, normalizedValue);

  const current = readDynamic(lang);
  if (current[normalizedKey] === normalizedValue) return;
  const next = { ...current, [normalizedKey]: normalizedValue };
  writeDynamic(lang, next);
}

if (!i18n.isInitialized) {
  const dynamicEs = readDynamic("es");
  const dynamicEn = readDynamic("en");
  const dynamicFr = readDynamic("fr");
  const dynamicZh = readDynamic("zh");
  const dynamicDe = readDynamic("de");
  const dynamicPt = readDynamic("pt");
  const dynamicIt = readDynamic("it");

  // Merge order matters: dynamic FIRST, base file SECOND so the curated
  // translations always win over anything saved in localStorage. This
  // prevents an old bad dynamic value (e.g. AI returned the same Spanish
  // string) from leaving the UI partially untranslated.
  i18n.use(initReactI18next).init({
    resources: {
      es: { translation: { ...dynamicEs, ...(es as Record<string, string>) } },
      en: { translation: { ...dynamicEn, ...(en as Record<string, string>) } },
      fr: { translation: { ...dynamicFr, ...(fr as Record<string, string>) } },
      zh: { translation: { ...dynamicZh, ...(zh as Record<string, string>) } },
      de: { translation: { ...dynamicDe, ...(de as Record<string, string>) } },
      pt: { translation: { ...dynamicPt, ...(pt as Record<string, string>) } },
      it: { translation: { ...dynamicIt, ...(it as Record<string, string>) } },
    },
    lng: getInitialLanguage(),
    fallbackLng: "es",
    interpolation: { escapeValue: false },
    returnEmptyString: false,
    returnNull: false,
  });
}

export default i18n;
