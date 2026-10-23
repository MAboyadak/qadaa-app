import { addDays, diffDays, fromDayKey, toDayKey, type DayKey } from './dates';

export type PaceType = 'with_each' | 'days_per_day' | 'minutes_per_day';

export interface Pace {
  type: PaceType;
  /** with_each: ignored (1 day/day). days_per_day: N. minutes_per_day: minutes. */
  value: number;
}

/** Default minutes needed to pray one full qada day (17 rakaat ≈ 12 min). */
export const DEFAULT_MINUTES_PER_QADA_DAY = 12;

/** How many qada "days" (one of each prayer) the pace covers per calendar day. */
export function qadaDaysPerDay(pace: Pace, minutesPerQadaDay = DEFAULT_MINUTES_PER_QADA_DAY): number {
  switch (pace.type) {
    case 'with_each':
      return 1;
    case 'days_per_day':
      return Math.max(0, pace.value);
    case 'minutes_per_day':
      return minutesPerQadaDay > 0 ? Math.max(0, pace.value) / minutesPerQadaDay : 0;
  }
}

/** Daily target in individual prayers; at least 1 when the pace is non-zero. */
export function dailyTarget(pace: Pace, prayersPerDay: number, minutesPerQadaDay?: number): number {
  const perDay = qadaDaysPerDay(pace, minutesPerQadaDay) * prayersPerDay;
  return perDay > 0 ? Math.max(1, Math.round(perDay)) : 0;
}

/**
 * Projected finish date from the total remaining prayers and the daily target.
 * Uses the total (not per-prayer) so praying extra of a heavier prayer counts.
 */
export function projectedFinish(remainingTotal: number, target: number, today: Date): Date | null {
  if (remainingTotal <= 0) return today;
  if (target <= 0) return null;
  return addDays(today, Math.ceil(remainingTotal / target));
}

/** Human-sized view of a duration in days → years/months/days. */
export function splitDuration(days: number): { years: number; months: number; days: number } {
  const years = Math.floor(days / 365);
  const rest = days - years * 365;
  const months = Math.floor(rest / 30);
  return { years, months, days: rest - months * 30 };
}

/**
 * Gentle streak: consecutive days with at least one qada, ending today or yesterday
 * (today not being done yet doesn't "break" anything).
 */
export function currentStreak(byDay: Map<DayKey, number>, today: Date): number {
  let cursor = (byDay.get(toDayKey(today)) ?? 0) > 0 ? today : addDays(today, -1);
  let streak = 0;
  while ((byDay.get(toDayKey(cursor)) ?? 0) > 0) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Longest run of consecutive calendar days with at least one net qada. */
export function longestStreak(byDay: Map<DayKey, number>): number {
  const days = [...byDay].filter(([, n]) => n > 0).map(([day]) => day).sort();
  let longest = 0;
  let streak = 0;
  let previous: Date | null = null;
  for (const day of days) {
    const date = fromDayKey(day);
    streak = previous !== null && diffDays(previous, date) === 1 ? streak + 1 : 1;
    longest = Math.max(longest, streak);
    previous = date;
  }
  return longest;
}

/** Days since the user stopped logging (0 if they logged today). Null if they never logged. */
export function daysSinceLastQada(byDay: Map<DayKey, number>, today: Date): number | null {
  let last: DayKey | null = null;
  for (const [day, n] of byDay) if (n > 0 && (last === null || day > last)) last = day;
  return last === null ? null : diffDays(fromDayKey(last), today);
}
