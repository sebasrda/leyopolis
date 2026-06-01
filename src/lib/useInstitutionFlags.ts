"use client";

import { useEffect, useState } from "react";

export interface InstitutionFlags {
  motionTrackingEnabled: boolean;
  motionGamesEnabled: boolean;
  maxBooks: number; // 0 = unlimited
}

const DEFAULT: InstitutionFlags = {
  motionTrackingEnabled: true,
  motionGamesEnabled: true,
  maxBooks: 0,
};

/**
 * Reads the per-institution feature flags injected by /dashboard/layout.tsx
 * into window.__INSTITUTION_FLAGS__. Falls back to "all enabled" when no
 * institution context is available (e.g. SUPERADMIN with no institutionId).
 */
export function useInstitutionFlags(): InstitutionFlags {
  const [flags, setFlags] = useState<InstitutionFlags>(DEFAULT);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const injected = (window as any).__INSTITUTION_FLAGS__;
    if (injected && typeof injected === "object") {
      setFlags({
        motionTrackingEnabled: injected.motionTrackingEnabled !== false,
        motionGamesEnabled: injected.motionGamesEnabled !== false,
        maxBooks: typeof injected.maxBooks === "number" ? injected.maxBooks : 0,
      });
    }
  }, []);

  return flags;
}
