import { diffDays, inclusiveDays } from './dates';
import { activePrayers, emptyCounts, type Prayer, type PrayerCounts } from './prayers';

/** How much of a period's prayers were missed. */
export const MISSED_LEVELS = { all: 1, most: 0.75, half: 0.5, some: 0.25 } as const;
export type MissedLevel = keyof typeof MISSED_LEVELS;

export interface EstimatePeriod {
  start: Date;
  end: Date;
  level: MissedLevel;
  /** Optional per-prayer override of the period's level, e.g. "I mostly missed Fajr". */
  perPrayer?: Partial<Record<Prayer, MissedLevel>>;
}

export interface EstimateInput {
  periods: EstimatePeriod[];
  gender: 'm' | 'f';
  includeWitr: boolean;
  /** Women only: average days of hayd per month (no qada for them). */
  avgCycleDays?: number;
  /** Women only: total days of nifas across all births (no qada for them). */
  nifasDaysTotal?: number;
}

/** Inclusive local-day ranges overlap even when they share only one day. */
export function overlappingPeriods(periods: EstimatePeriod[]): boolean {
  const valid = periods.filter((p) => inclusiveDays(p.start, p.end) > 0);
  return valid.some((a, i) => valid.slice(i + 1).some((b) =>
    diffDays(a.start, b.end) >= 0 && diffDays(b.start, a.end) >= 0,
  ));
}

const AVG_MONTH_DAYS = 30;

/**
 * Estimates the number of missed prayers per prayer.
 * Always rounds up: when unsure, the fiqh guidance is to overestimate (docs/fiqh-rules.md §3).
 */
export function estimateMissed(input: EstimateInput): PrayerCounts {
  const counts = emptyCounts();
  const prayers = activePrayers(input.includeWitr);
  const isFemale = input.gender === 'f';
  const cycleShare = isFemale ? clamp((input.avgCycleDays ?? 0) / AVG_MONTH_DAYS, 0, 1) : 0;
  const nifasTotal = isFemale ? Math.max(0, input.nifasDaysTotal ?? 0) : 0;

  const periodDays = input.periods.map((p) => inclusiveDays(p.start, p.end));
  const totalDays = periodDays.reduce((a, b) => a + b, 0);

  input.periods.forEach((period, i) => {
    const days = periodDays[i];
    if (days === 0) return;
    // nifas is spread over the periods in proportion to their length
    const nifasHere = totalDays > 0 ? nifasTotal * (days / totalDays) : 0;
    const effectiveDays = Math.max(0, days * (1 - cycleShare) - nifasHere);

    for (const prayer of prayers) {
      // Witr follows Isha's level unless explicitly overridden
      const level =
        period.perPrayer?.[prayer] ??
        (prayer === 'witr' ? period.perPrayer?.isha : undefined) ??
        period.level;
      counts[prayer] += effectiveDays * MISSED_LEVELS[level];
    }
  });

  for (const prayer of prayers) counts[prayer] = Math.ceil(counts[prayer]);
  return counts;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
