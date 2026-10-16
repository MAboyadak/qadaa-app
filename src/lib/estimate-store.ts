import type { SQLiteDatabase } from 'expo-sqlite';

import { getEstimateInputs, getProfile } from '@/db/repo';
import { fromDayKey } from '@/domain/dates';
import { estimateMissed } from '@/domain/estimate';
import type { PrayerCounts } from '@/domain/prayers';

/** Re-runs the estimate from the saved onboarding inputs (e.g. when Witr is switched on later). */
export async function estimateFromStored(db: SQLiteDatabase, includeWitr: boolean): Promise<PrayerCounts | null> {
  const [inputs, profile] = await Promise.all([getEstimateInputs(db), getProfile(db)]);
  if (inputs.periods.length === 0) return null;
  return estimateMissed({
    gender: profile?.gender ?? 'm',
    includeWitr,
    avgCycleDays: inputs.women?.avgCycleDays,
    nifasDaysTotal: inputs.women?.nifasDaysTotal,
    periods: inputs.periods.map((p) => ({
      start: fromDayKey(p.start),
      end: fromDayKey(p.end),
      level: p.level,
      perPrayer: p.perPrayer,
    })),
  });
}
