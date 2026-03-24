"use client";

import { useEffect, useMemo, useRef } from "react";
import i18n, { addDynamicTranslation } from "@/i18n/i18n";
import { useTranslation } from "react-i18next";

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "CODE", "PRE"]);
const TRANSLATABLE_ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;

const TARGET_LANGUAGE: Record<string, string> = {
  en: "English",
  fr: "French",
  de: "German",
  zh: "Simplified Chinese (Mandarin)",
};

function shouldSkipNode(node: Text) {
  const parent = node.parentElement;
  if (!parent) return true;
  if (SKIP_TAGS.has(parent.tagName)) return true;
  if (parent.closest("[data-i18n-skip='true']")) return true;
  return false;
}

function translateTextKeepingWhitespace(original: string) {
  const leading = original.match(/^\s*/)?.[0] ?? "";
  const trailing = original.match(/\s*$/)?.[0] ?? "";
  const core = original.trim();
  if (!core) return original;
  if (/[0-9]/.test(core)) return original;
  const translated = i18n.t(core, { defaultValue: core });
  return `${leading}${translated}${trailing}`;
}

function shouldTranslateKey(key: string) {
  const core = key.trim();
  if (!core) return false;
  if (core.length < 2) return false;
  if (core.length > 180) return false;
  if (/[0-9]/.test(core)) return false;
  if (core.includes("http://") || core.includes("https://")) return false;
  if (core.startsWith("/") || core.includes("{") || core.includes("}")) return false;
  return true;
}

export function DomTranslationOverlay() {
  const { i18n: reactI18n } = useTranslation();

  const originals = useMemo(() => new WeakMap<Text, string>(), []);
  const originalsByElement = useMemo(() => new WeakMap<Element, Record<string, string>>(), []);
  const pending = useRef<Set<string>>(new Set());
  const inflight = useRef<Set<string>>(new Set());
  const workerRunning = useRef(false);

  useEffect(() => {
    let raf = 0;
    let scheduled = false;

    const apply = () => {
      scheduled = false;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let current = walker.nextNode() as Text | null;
      while (current) {
        const node = current;
        current = walker.nextNode() as Text | null;

        if (shouldSkipNode(node)) continue;
        const value = node.nodeValue;
        if (value == null) continue;
        if (!value.trim()) continue;

        if (!originals.has(node)) {
          originals.set(node, value);
        }

        const original = originals.get(node) ?? value;
        const next = translateTextKeepingWhitespace(original);
        if (node.nodeValue !== next) {
          node.nodeValue = next;
        }

        const lang = reactI18n.language;
        const core = (originals.get(node) ?? value).trim();
        if (lang !== "es" && shouldTranslateKey(core)) {
          const translated = i18n.t(core, { defaultValue: core });
          if (translated === core) pending.current.add(core);
        }
      }

      const lang = reactI18n.language;
      if (lang !== "es") {
        const elements = document.querySelectorAll<HTMLElement>(
          TRANSLATABLE_ATTRS.map((a) => `[${a}]`).join(",")
        );
        elements.forEach((el) => {
          if (el.closest("[data-i18n-skip='true']")) return;
          const tag = el.tagName;
          if (SKIP_TAGS.has(tag)) return;

          const originalMap = originalsByElement.get(el) ?? {};

          TRANSLATABLE_ATTRS.forEach((attr) => {
            const currentValue = el.getAttribute(attr);
            if (!currentValue) return;
            const originalValue = originalMap[attr] ?? currentValue;
            originalMap[attr] = originalValue;

            const core = originalValue.trim();
            if (!shouldTranslateKey(core)) return;
            const translated = i18n.t(core, { defaultValue: core });
            if (translated !== core) {
              if (el.getAttribute(attr) !== translated) el.setAttribute(attr, translated);
            } else {
              pending.current.add(core);
            }
          });

          originalsByElement.set(el, originalMap);
        });
      }
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      raf = window.requestAnimationFrame(apply);
    };

    schedule();

    const observer = new MutationObserver(() => schedule());
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [originals, originalsByElement, reactI18n.language]);

  useEffect(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode() as Text | null;
    while (current) {
      const node = current;
      current = walker.nextNode() as Text | null;
      const original = originals.get(node);
      if (original !== undefined) {
        node.nodeValue = translateTextKeepingWhitespace(original);
      }
    }

    const lang = reactI18n.language;
    const elements = document.querySelectorAll<HTMLElement>(
      TRANSLATABLE_ATTRS.map((a) => `[${a}]`).join(",")
    );
    elements.forEach((el) => {
      const originalMap = originalsByElement.get(el);
      if (!originalMap) return;
      TRANSLATABLE_ATTRS.forEach((attr) => {
        const original = originalMap[attr];
        if (!original) return;
        const core = original.trim();
        const translated = lang === "es" ? core : i18n.t(core, { defaultValue: core });
        el.setAttribute(attr, translated);
      });
    });
  }, [reactI18n.language, originals]);

  useEffect(() => {
    const lang = reactI18n.language;
    if (lang === "es") return;
    const target = TARGET_LANGUAGE[lang] ?? lang;

    const tick = async () => {
      if (workerRunning.current) return;
      workerRunning.current = true;
      try {
        const nextBatch: string[] = [];
        pending.current.forEach((k) => {
          if (nextBatch.length >= 3) return;
          if (inflight.current.has(k)) return;
          nextBatch.push(k);
        });
        if (nextBatch.length === 0) return;

        for (const key of nextBatch) {
          inflight.current.add(key);
          pending.current.delete(key);
          try {
            const res = await fetch("/api/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: key, targetLanguage: target }),
            });
            if (!res.ok) continue;
            const data = (await res.json()) as { translation?: string };
            const translation = (data.translation ?? "").trim();
            if (translation) addDynamicTranslation(lang, key, translation);
          } catch {
          } finally {
            inflight.current.delete(key);
          }
        }
      } finally {
        workerRunning.current = false;
      }
    };

    const interval = setInterval(() => {
      void tick();
    }, 1200);

    return () => clearInterval(interval);
  }, [reactI18n.language]);

  return null;
}
