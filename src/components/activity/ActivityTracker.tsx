"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function ActivityTracker() {
  const pathname = usePathname();
  const lastSent = useRef<string>("");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (pathname === "/demo" || pathname.startsWith("/demo/")) return;
    if (lastSent.current === pathname) return;

    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      lastSent.current = pathname;
      fetch("/api/activity/pageview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname }),
      }).catch(() => {});
    }, 800);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = null;
    };
  }, [pathname]);

  return null;
}
