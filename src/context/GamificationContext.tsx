"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";

export interface Achievement {
  id: string; name: string; description: string; icon: string; unlockedAt?: string;
}

export interface UserProgress {
  level: number; xp: number; streakDays: number; lastActiveDate: string;
  booksRead: number; gamesWon: number; achievements: Achievement[];
}

interface GamificationContextType {
  progress: UserProgress;
  levelUpNotice: { level: number } | null;
  clearLevelUp: () => void;
  addXp: (amount: number) => Promise<void>;
  completeGame: (gameId: string, score: number, maxScore: number) => Promise<void>;
  checkDailyStreak: () => Promise<void>;
  unlockAchievement: (achievementId: string) => void;
}

const DEFAULT_PROGRESS: UserProgress = {
  level: 1, xp: 0, streakDays: 0, lastActiveDate: new Date().toISOString(),
  booksRead: 0, gamesWon: 0, achievements: [],
};

// Mirror of src/lib/gamification.ts. THRESHOLD[n] = 50 * n * (n + 1).
// Same shape as the legacy 10-level table, extended to a hard cap of 50.
export const MAX_LEVEL = 50;
export const LEVEL_THRESHOLDS: number[] = Array.from({ length: MAX_LEVEL }, (_, i) => 50 * i * (i + 1));

function calcLevel(xp: number): number {
  if (xp <= 0) return 1;
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1; else break;
  }
  return Math.min(level, MAX_LEVEL);
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<UserProgress>(DEFAULT_PROGRESS);
  const [levelUpNotice, setLevelUpNotice] = useState<{ level: number } | null>(null);
  const { status } = useSession();
  const prevLevelRef = useRef<number>(1);

  const syncFromApi = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const res = await fetch(`/api/user/progress?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const newXp: number = data.xp ?? 0;
      // Always recompute level from XP locally to avoid a stale/race level
      // from the API. The server may have legacy `user.level` rows or return
      // a level that doesn't match the XP for a fraction of a second.
      const computed = calcLevel(newXp);
      const apiLevel: number = data.level ?? computed;
      // Trust the LOWER of the two when they disagree — prevents firing a
      // bogus "level up" popup when the API briefly reports a higher level
      // than the XP justifies.
      const newLevel = Math.min(computed, apiLevel);
      const newStreak: number = data.streak ?? 0;
      if (newLevel > prevLevelRef.current && newXp >= LEVEL_THRESHOLDS[Math.min(newLevel - 1, LEVEL_THRESHOLDS.length - 1)]) {
        setLevelUpNotice({ level: newLevel });
      }
      prevLevelRef.current = newLevel;
      setProgress(prev => ({ ...prev, xp: newXp, level: newLevel, streakDays: newStreak }));
      return data;
    } catch { /* silent */ }
  }, [status]);

  // Initial load on mount — fetch immediately when authenticated
  useEffect(() => {
    if (status !== "authenticated") return;

    const loadInitial = async () => {
      try {
        const res = await fetch(`/api/user/progress?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const newXp: number = data.xp ?? 0;
        const newLevel: number = data.level ?? calcLevel(newXp);
        const newStreak: number = data.streak ?? 0;
        prevLevelRef.current = newLevel;
        setProgress(prev => ({ ...prev, xp: newXp, level: newLevel, streakDays: newStreak }));

        // If XP is 0 or suspiciously low (< 50), repair from activity history
        if (newXp < 50) {
          try {
            const r = await fetch('/api/user/repair-xp', { method: 'POST' });
            if (r.ok) {
              const res2 = await fetch(`/api/user/progress?t=${Date.now()}`, { cache: 'no-store' });
              if (res2.ok) {
                const data2 = await res2.json();
                const xp2: number = data2.xp ?? 0;
                const level2: number = data2.level ?? calcLevel(xp2);
                prevLevelRef.current = level2;
                setProgress(prev => ({ ...prev, xp: xp2, level: level2, streakDays: data2.streak ?? 0 }));
              }
            }
          } catch { /* silent */ }
        }
      } catch { /* silent */ }
    };

    loadInitial();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Poll every 10 seconds to pick up server-side XP grants (reading, quiz, etc.)
  useEffect(() => {
    if (status !== "authenticated") return;
    const id = setInterval(syncFromApi, 10000);
    return () => clearInterval(id);
  }, [status, syncFromApi]);

  const addXp = useCallback(async (amount: number) => {
    if (amount <= 0) return;
    try {
      const res = await fetch('/api/user/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xp_delta: amount }),
      });
      if (res.ok) {
        const data = await res.json();
        const newXp: number = data.xp ?? 0;
        const computed = calcLevel(newXp);
        const apiLevel: number = data.level ?? computed;
        const newLevel = Math.min(computed, apiLevel);
        // Only celebrate when the new XP actually crosses the new level's
        // threshold AND the level genuinely went up.
        if (newLevel > prevLevelRef.current && newXp >= LEVEL_THRESHOLDS[Math.min(newLevel - 1, LEVEL_THRESHOLDS.length - 1)]) {
          setLevelUpNotice({ level: newLevel });
        }
        prevLevelRef.current = newLevel;
        setProgress(prev => ({ ...prev, xp: newXp, level: newLevel }));
      }
    } catch { /* silent */ }
  }, []);

  const completeGame = useCallback(async (_gameId: string, score: number, maxScore: number) => {
    const pct = maxScore > 0 ? score / maxScore : 0;
    const xp = pct === 1 ? 150 : pct >= 0.7 ? 100 : pct >= 0.5 ? 50 : 10;
    await addXp(xp);
    if (pct >= 0.5) setProgress(prev => ({ ...prev, gamesWon: prev.gamesWon + 1 }));
  }, [addXp]);

  const checkDailyStreak = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const lastActive = progress.lastActiveDate.split('T')[0];
    if (today === lastActive) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const newStreak = lastActive === yesterday ? progress.streakDays + 1 : 1;
    setProgress(prev => ({ ...prev, streakDays: newStreak, lastActiveDate: new Date().toISOString() }));
    try {
      await fetch('/api/user/progress', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streak: newStreak }),
      });
    } catch { /* silent */ }
  }, [progress.lastActiveDate, progress.streakDays]);

  const unlockAchievement = useCallback((achievementId: string) => {
    setProgress(prev => {
      if (prev.achievements.some(a => a.id === achievementId)) return prev;
      return {
        ...prev,
        achievements: [...prev.achievements, {
          id: achievementId, name: "Achievement Unlocked",
          description: "You did something cool!", icon: "🏆",
          unlockedAt: new Date().toISOString(),
        }],
      };
    });
  }, []);

  const clearLevelUp = useCallback(() => setLevelUpNotice(null), []);

  return (
    <GamificationContext.Provider value={{ progress, levelUpNotice, clearLevelUp, addXp, completeGame, checkDailyStreak, unlockAchievement }}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const ctx = useContext(GamificationContext);
  if (!ctx) throw new Error("useGamification must be used within a GamificationProvider");
  return ctx;
}
