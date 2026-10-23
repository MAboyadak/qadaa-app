import type { DayKey } from './dates';
import { emptyCounts, type Prayer, type PrayerCounts } from './prayers';

export type LedgerKind = 'estimate' | 'adjust' | 'made_up' | 'undo';

export interface LedgerEntry {
  id: number;
  prayer: Prayer;
  /** + adds debt, - pays it off. made_up is always -1, its undo +1. */
  delta: number;
  kind: LedgerKind;
  refId: number | null;
  day: DayKey;
  createdAt: string;
}

/** Remaining debt per prayer = sum of all deltas, never below zero. */
export function remainingCounts(entries: LedgerEntry[]): PrayerCounts {
  const counts = emptyCounts();
  for (const e of entries) counts[e.prayer] += e.delta;
  for (const p of Object.keys(counts) as Prayer[]) counts[p] = Math.max(0, counts[p]);
  return counts;
}

/** Total debt ever registered (estimate + adjustments), the denominator for progress. */
export function totalDebt(entries: LedgerEntry[]): number {
  return entries
    .filter((e) => e.kind === 'estimate' || e.kind === 'adjust')
    .reduce((acc, e) => acc + e.delta, 0);
}

/** Net prayers made up per day; undo uses its referenced row's day, or its own if missing. */
export function madeUpByDay(entries: LedgerEntry[]): Map<DayKey, number> {
  const byDay = new Map<DayKey, number>();
  const byId = new Map(entries.map((e) => [e.id, e]));
  for (const e of entries) {
    if (e.kind !== 'made_up' && e.kind !== 'undo') continue;
    const day = e.kind === 'undo' ? (byId.get(e.refId ?? -1)?.day ?? e.day) : e.day;
    byDay.set(day, (byDay.get(day) ?? 0) - e.delta);
  }
  return byDay;
}

export function madeUpTotal(entries: LedgerEntry[]): number {
  let total = 0;
  for (const e of entries) if (e.kind === 'made_up' || e.kind === 'undo') total -= e.delta;
  return total;
}

/** Most recent made_up entry for a prayer that hasn't been undone yet, if any. */
export function lastUndoable(entries: LedgerEntry[], prayer: Prayer): LedgerEntry | undefined {
  const undone = new Set(entries.filter((e) => e.kind === 'undo').map((e) => e.refId));
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.prayer === prayer && e.kind === 'made_up' && !undone.has(e.id)) return e;
  }
  return undefined;
}
