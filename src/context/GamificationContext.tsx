"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

// Types
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string; // ISO Date
}

export interface UserProgress {
  level: number;
  xp: number;
  streakDays: number;
  lastActiveDate: string; // ISO Date
  booksRead: number;
  gamesWon: number;
  achievements: Achievement[];
}

interface GamificationContextType {
  progress: UserProgress;
  addXp: (amount: number) => Promise<void>;
  completeGame: (gameId: string, score: number, maxScore: number) => Promise<void>;
  checkDailyStreak: () => Promise<void>;
  unlockAchievement: (achievementId: string) => void;
}

const DEFAULT_PROGRESS: UserProgress = {
  level: 1,
  xp: 0,
  streakDays: 0,
  lastActiveDate: new Date().toISOString(),
  booksRead: 0,
  gamesWon: 0,
  achievements: [],
};

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500]; // XP needed for next level

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<UserProgress>(DEFAULT_PROGRESS);

  // Load from API on mount
  useEffect(() => {
    const fetchProgress = async () => {
        try {
            const res = await fetch('/api/user/progress');
            if (res.ok) {
                const data = await res.json();
                // Merge API data with default structure (in case some fields are missing in DB or partial)
                // Note: API returns { xp, level, streak, ... }
                // We map DB 'streak' to 'streakDays'
                setProgress(prev => ({
                    ...prev,
                    xp: data.xp ?? prev.xp,
                    level: data.level ?? prev.level,
                    streakDays: data.streak ?? prev.streakDays,
                    // Keep local achievements/stats for now if API doesn't return them
                }));
            }
        } catch (e) {
            console.error("Failed to load gamification data", e);
            // Fallback to local storage if API fails
            const saved = localStorage.getItem("leyopolis_gamification");
            if (saved) {
                try { setProgress(JSON.parse(saved)); } catch (e) {}
            }
        }
    };
    
    fetchProgress();
  }, []);

  // Save to localStorage as backup
  useEffect(() => {
    localStorage.setItem("leyopolis_gamification", JSON.stringify(progress));
  }, [progress]);

  const saveToApi = async (newProgress: Partial<UserProgress>) => {
      try {
          await fetch('/api/user/progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  xp: newProgress.xp,
                  level: newProgress.level,
                  streak: newProgress.streakDays
              })
          });
      } catch (e) {
          console.error("Failed to save progress to API", e);
      }
  };

  const addXp = async (amount: number) => {
    // Optimistic update
    setProgress((prev) => {
      const newXp = prev.xp + amount;
      let newLevel = prev.level;
      
      // Check level up
      // Simple logic: if newXp > threshold of current level
      // Note: LEVEL_THRESHOLDS index is level-1 (e.g. index 0 is lvl 1 start, index 1 is lvl 2 start)
      // If we have 10 levels, max index is 9.
      if (newLevel < LEVEL_THRESHOLDS.length && newXp >= LEVEL_THRESHOLDS[newLevel]) {
        newLevel++;
        // TODO: Trigger Level Up Modal/Sound here
        alert(`¡Nivel Subido! Ahora eres Nivel ${newLevel}`);
      }

      const newState = { ...prev, xp: newXp, level: newLevel };
      saveToApi(newState); // Sync to DB
      return newState;
    });
  };

  // Poll for updates (in case XP was added by server-side actions like posts/readings)
  useEffect(() => {
    const pollInterval = setInterval(async () => {
        try {
            const res = await fetch('/api/user/progress');
            if (res.ok) {
                const data = await res.json();
                setProgress(prev => {
                    // Only update if changed to avoid re-renders
                    if (data.xp !== prev.xp || data.level !== prev.level) {
                        return {
                            ...prev,
                            xp: data.xp,
                            level: data.level,
                            streakDays: data.streak
                        };
                    }
                    return prev;
                });
            }
        } catch (e) {
            // Silent fail on poll
        }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(pollInterval);
  }, []);

  const completeGame = async (gameId: string, score: number, maxScore: number) => {
    const percentage = score / maxScore;
    let xpEarned = 0;
    
    if (percentage === 1) xpEarned = 150; // Perfect
    else if (percentage >= 0.7) xpEarned = 100; // Good
    else if (percentage >= 0.5) xpEarned = 50; // Pass
    else xpEarned = 10; // Participation

    await addXp(xpEarned);

    if (percentage >= 0.5) {
        setProgress(prev => ({ ...prev, gamesWon: prev.gamesWon + 1 }));
    }
  };

  const checkDailyStreak = async () => {
    const today = new Date().toISOString().split('T')[0];
    const lastActive = progress.lastActiveDate.split('T')[0];

    if (today !== lastActive) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        let newStreak = progress.streakDays;
        
        if (lastActive === yesterday) {
            newStreak += 1;
        } else {
            newStreak = 1;
        }

        setProgress(prev => ({
            ...prev,
            streakDays: newStreak,
            lastActiveDate: new Date().toISOString()
        }));

        await saveToApi({ streakDays: newStreak });
    }
  };

  const unlockAchievement = (achievementId: string) => {
    if (progress.achievements.some(a => a.id === achievementId)) return;

    const newAchievement: Achievement = {
        id: achievementId,
        name: "Achievement Unlocked",
        description: "You did something cool!",
        icon: "🏆",
        unlockedAt: new Date().toISOString()
    };

    setProgress(prev => ({
        ...prev,
        achievements: [...prev.achievements, newAchievement]
    }));
  };

  return (
    <GamificationContext.Provider value={{ progress, addXp, completeGame, checkDailyStreak, unlockAchievement }}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (context === undefined) {
    throw new Error("useGamification must be used within a GamificationProvider");
  }
  return context;
}
