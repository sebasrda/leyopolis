"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import es from "../../locales/es/translation.json";
import en from "../../locales/en/translation.json";
import fr from "../../locales/fr/translation.json";
import zh from "../../locales/zh/translation.json";
import de from "../../locales/de/translation.json";

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
    return parsed as Record<string, string>;
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

  i18n.use(initReactI18next).init({
    resources: {
      es: { translation: { ...(es as Record<string, string>), ...dynamicEs } },
      en: { translation: { ...(en as Record<string, string>), ...dynamicEn } },
      fr: { translation: { ...(fr as Record<string, string>), ...dynamicFr } },
      zh: { translation: { ...(zh as Record<string, string>), ...dynamicZh } },
      de: { translation: { ...(de as Record<string, string>), ...dynamicDe } },
    },
    lng: getInitialLanguage(),
    fallbackLng: "es",
    interpolation: { escapeValue: false },
    returnEmptyString: false,
    returnNull: false,
  });
}

export default i18n;
