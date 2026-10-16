/** Local calendar day as `YYYY-MM-DD`. All day bucketing uses the device's local time. */
export type DayKey = string;

const MS_PER_DAY = 86_400_000;

export function toDayKey(date: Date): DayKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses `YYYY-MM-DD` as a local date at noon (noon avoids DST edge cases). */
export function fromDayKey(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Whole days from `a` to `b` (b - a), by calendar day. */
export function diffDays(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / MS_PER_DAY);
}

/** Number of days in an inclusive range; 0 when `end` is before `start`. */
export function inclusiveDays(start: Date, end: Date): number {
  return Math.max(0, diffDays(start, end) + 1);
}

/** Adds (possibly fractional) years using the average Gregorian year length. */
export function addYears(date: Date, years: number): Date {
  return addDays(date, Math.round(years * 365.2425));
}

/** Hijri (lunar) years are ~354.367 days; used for the 15-Hijri-year puberty default. */
export const HIJRI_YEAR_DAYS = 354.367;

export function addHijriYears(date: Date, years: number): Date {
  return addDays(date, Math.round(years * HIJRI_YEAR_DAYS));
}
