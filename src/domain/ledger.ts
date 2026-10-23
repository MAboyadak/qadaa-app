import type { DayKey } from './dates';
import type { Prayer } from './prayers';

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
