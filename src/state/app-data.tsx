import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import * as repo from '@/db/repo';
import { toDayKey, type DayKey } from '@/domain/dates';
import { crossedMilestone, type Milestone } from '@/domain/milestones';
import {
  currentStreak,
  dailyTarget,
  daysSinceLastQada,
  longestStreak,
  projectedFinish,
  type Pace,
} from '@/domain/plan';
import { activePrayers, sumCounts, type Prayer } from '@/domain/prayers';
import { rescheduleAll } from '@/notifications';

export interface AppData {
  profile: repo.Profile | null;
  summary: repo.PrayerSummary;
  plan: Pace | null;
  byDay: Map<DayKey, number>;
  dhikr: repo.DhikrReminder[];
  // derived
  prayers: Prayer[];
  prayersPerDay: number;
  totalDebt: number;
  madeUpTotal: number;
  remainingTotal: number;
  target: number;
  todayDone: number;
  finishDate: Date | null;
  streak: number;
  bestStreak: number;
  idleDays: number | null;
}

interface AppActions {
  refresh: () => Promise<void>;
  logOne: (prayer: Prayer) => Promise<{ logged: boolean; milestone?: Milestone }>;
  undoOne: (prayer: Prayer) => Promise<boolean>;
  setPace: (pace: Pace) => Promise<void>;
  updateProfile: (patch: Partial<repo.Profile>, opts?: { reschedule?: boolean }) => Promise<void>;
  reschedule: () => Promise<void>;
}

const Ctx = createContext<(AppData & AppActions) | null>(null);

const emptySummary = (): repo.PrayerSummary => ({
  remaining: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, witr: 0 },
  debt: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, witr: 0 },
  madeUp: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, witr: 0 },
});

export function AppDataProvider({ children, onReady }: { children: ReactNode; onReady?: () => void }) {
  const db = useSQLiteContext();
  const ledgerWriteInFlight = useRef(false);
  const [state, setState] = useState<{
    profile: repo.Profile | null;
    summary: repo.PrayerSummary;
    plan: Pace | null;
    byDay: Map<DayKey, number>;
    dhikr: repo.DhikrReminder[];
    today: Date;
  } | null>(null);

  const refreshSnapshot = useCallback(async () => {
    const profile = await repo.getProfile(db);
    const [summary, plan, byDay, dhikr] = await Promise.all([
      repo.getSummary(db),
      repo.getPlan(db),
      repo.getMadeUpByDay(db, activePrayers(profile?.includeWitr ?? false)),
      repo.getDhikrReminders(db),
    ]);
    setState({ profile, summary, plan, byDay, dhikr, today: new Date() });
    return { profile, summary };
  }, [db]);

  const refresh = useCallback(async () => {
    await refreshSnapshot();
  }, [refreshSnapshot]);

  const reschedule = useCallback(async () => {
    try {
      await rescheduleAll(db);
    } catch (e) {
      console.warn('reschedule failed', e);
    }
  }, [db]);

  useEffect(() => {
    void (async () => {
      await refresh();
      onReady?.();
      await reschedule();
    })();
    // A notification action may have logged a prayer while we were in the background.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        refresh();
        reschedule();
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  useEffect(() => {
    if (!state) return;
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = setTimeout(() => { void refresh(); }, midnight.getTime() - now.getTime());
    return () => clearTimeout(timer);
  }, [state, refresh]);

  const derived = useMemo(() => {
    const s = state ?? { profile: null, summary: emptySummary(), plan: null, byDay: new Map(), dhikr: [], today: new Date() };
    const includeWitr = s.profile?.includeWitr ?? false;
    const prayers = activePrayers(includeWitr);
    const prayersPerDay = prayers.length;
    const totalDebt = sumCounts(s.summary.debt, includeWitr);
    const madeUpTotal = sumCounts(s.summary.madeUp, includeWitr);
    const remainingTotal = sumCounts(s.summary.remaining, includeWitr);
    const target = s.plan ? dailyTarget(s.plan, prayersPerDay, s.profile?.minutesPerQadaDay) : 0;
    return {
      profile: s.profile,
      summary: s.summary,
      plan: s.plan,
      byDay: s.byDay,
      dhikr: s.dhikr,
      prayers,
      prayersPerDay,
      totalDebt,
      madeUpTotal,
      remainingTotal,
      target,
      todayDone: Math.max(0, s.byDay.get(toDayKey(s.today)) ?? 0),
      finishDate: projectedFinish(remainingTotal, target, s.today),
      streak: currentStreak(s.byDay, s.today),
      bestStreak: longestStreak(s.byDay),
      idleDays: daysSinceLastQada(s.byDay, s.today),
    };
  }, [state]);

  const logOne = useCallback(
    async (prayer: Prayer) => {
      if (ledgerWriteInFlight.current) return { logged: false };
      ledgerWriteInFlight.current = true;
      try {
        const logged = await repo.logMadeUp(db, prayer);
        const { profile, summary } = await refreshSnapshot();
        if (logged && summary.remaining[prayer] === 0) void reschedule();
        const includeWitr = profile?.includeWitr ?? false;
        const after = sumCounts(summary.madeUp, includeWitr);
        const milestone = logged
          ? crossedMilestone(after - 1, after, sumCounts(summary.debt, includeWitr), activePrayers(includeWitr).length)
          : undefined;
        return { logged, milestone };
      } finally {
        ledgerWriteInFlight.current = false;
      }
    },
    [db, refreshSnapshot, reschedule],
  );

  const undoOne = useCallback(
    async (prayer: Prayer) => {
      if (ledgerWriteInFlight.current) return false;
      ledgerWriteInFlight.current = true;
      try {
        const ok = await repo.undoLast(db, prayer);
        if (ok) void reschedule();
        await refresh();
        return ok;
      } finally {
        ledgerWriteInFlight.current = false;
      }
    },
    [db, refresh, reschedule],
  );

  const setPace = useCallback(
    async (pace: Pace) => {
      await repo.setPlan(db, pace);
      await refresh();
    },
    [db, refresh],
  );

  const updateProfile = useCallback(
    async (patch: Partial<repo.Profile>, opts?: { reschedule?: boolean }) => {
      await repo.updateProfile(db, patch);
      await refresh();
      if (opts?.reschedule) await reschedule();
    },
    [db, refresh, reschedule],
  );

  const value = useMemo(
    () => ({ ...derived, refresh, logOne, undoOne, setPace, updateProfile, reschedule }),
    [derived, refresh, logOne, undoOne, setPace, updateProfile, reschedule],
  );

  if (!state) return null;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider');
  return ctx;
}
