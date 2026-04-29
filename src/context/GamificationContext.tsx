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

export const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500];

function calcLevel(xp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1; else break;
  }
  return Math.min(level, LEVEL_THRESHOLDS.length);
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
      const res = await fetch('/api/user/progress', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const newXp: number = data.xp ?? 0;
      const newLevel: number = data.level ?? calcLevel(newXp);
      const newStreak: number = data.streak ?? 0;
      if (newLevel > prevLevelRef.current) setLevelUpNotice({ level: newLevel });
      prevLevelRef.current = newLevel;
      setProgress(prev => ({ ...prev, xp: newXp, level: newLevel, streakDays: newStreak }));
      return data;
    } catch { /* silent */ }
  }, [status]);

  // Initial load — if user has 0 XP, repair from existing activity history
  useEffect(() => {
    if (status !== "authenticated") return;
    (async () => {
      const data = await syncFromApi();
      if (data && (data.xp ?? 0) === 0) {
        try {
          const r = await fetch('/api/user/repair-xp', { method: 'POST' });
          if (r.ok) await syncFromApi();
        } catch { /* silent */ }
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Poll every 5 seconds to pick up server-side XP grants (reading, quiz, etc.)
  useEffect(() => {
    if (status !== "authenticated") return;
    const id = setInterval(syncFromApi, 5000);
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
        const newLevel: number = data.level ?? calcLevel(newXp);
        if (newLevel > prevLevelRef.current) setLevelUpNotice({ level: newLevel });
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
