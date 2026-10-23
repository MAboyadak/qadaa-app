import { lastUndoable, madeUpByDay, madeUpTotal, remainingCounts, totalDebt, type LedgerEntry } from './ledger';

let nextId = 1;
const entry = (partial: Partial<LedgerEntry>): LedgerEntry => ({
  id: nextId++,
  prayer: 'fajr',
  delta: 0,
  kind: 'estimate',
  refId: null,
  day: '2026-01-01',
  createdAt: '2026-01-01T10:00:00',
  ...partial,
});

describe('ledger', () => {
  const estimate = entry({ prayer: 'fajr', delta: 10, kind: 'estimate' });
  const adjust = entry({ prayer: 'fajr', delta: 2, kind: 'adjust' });
  const made1 = entry({ prayer: 'fajr', delta: -1, kind: 'made_up', day: '2026-01-02' });
  const made2 = entry({ prayer: 'fajr', delta: -1, kind: 'made_up', day: '2026-01-02' });
  const undo2 = entry({ prayer: 'fajr', delta: 1, kind: 'undo', refId: made2.id, day: '2026-01-03' });
  const all = [estimate, adjust, made1, made2, undo2];

  it('computes remaining from deltas', () => {
    expect(remainingCounts(all).fajr).toBe(11);
    expect(remainingCounts(all).dhuhr).toBe(0);
  });

  it('never goes below zero', () => {
    const extra = entry({ prayer: 'asr', delta: -1, kind: 'made_up' });
    expect(remainingCounts([extra]).asr).toBe(0);
  });

  it('computes total debt from estimate + adjustments only', () => {
    expect(totalDebt(all)).toBe(12);
  });

  it('nets made_up and undo per day', () => {
    expect(madeUpByDay(all).get('2026-01-02')).toBe(1);
    expect(madeUpTotal(all)).toBe(1);
    expect(madeUpByDay(all).has('2026-01-03')).toBe(false);
  });

  it('uses the undo day when its reference is missing', () => {
    const orphan = entry({ delta: 1, kind: 'undo', refId: 999, day: '2026-01-04' });
    expect(madeUpByDay([orphan])).toEqual(new Map([['2026-01-04', -1]]));
  });

  it('attributes undo correctly even when entries are not ordered', () => {
    expect(madeUpByDay([undo2, made2])).toEqual(new Map([['2026-01-02', 0]]));
  });

  it('finds the last made_up entry that has not been undone', () => {
    expect(lastUndoable(all, 'fajr')?.id).toBe(made1.id);
    expect(lastUndoable([estimate], 'fajr')).toBeUndefined();
  });
});
