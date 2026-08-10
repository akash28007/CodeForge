import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

export interface BadgeState {
  code: string;
  name: string;
  description: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  threshold: number;
  criteria: string;
  earned: boolean;
  earnedAt: string | null;
}

export interface GamificationSummary {
  xp: number;
  level: { rank: number; name: string; minXp: number };
  nextLevel: { rank: number; name: string; minXp: number } | null;
  percentToNext: number;
  xpRemaining: number;
  streak: { current: number; longest: number };
  badges: BadgeState[];
  earnedBadges: number;
  totalBadges: number;
}

interface GamificationContextValue {
  summary: GamificationSummary | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const GamificationContext = createContext<GamificationContextValue | null>(null);

export function GamificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<GamificationSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setSummary(null);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get<GamificationSummary>('/me/gamification');
      setSummary(res.data);
    } catch {
      // A failed XP fetch must never block the app — the rest of the UI works without it.
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <GamificationContext.Provider value={{ summary, loading, refresh }}>{children}</GamificationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGamification(): GamificationContextValue {
  const ctx = useContext(GamificationContext);
  if (!ctx) throw new Error('useGamification must be used within a GamificationProvider');
  return ctx;
}
