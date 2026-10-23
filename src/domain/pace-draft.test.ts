import { reconcilePaceDraft, samePace, type PaceDraft } from './pace-draft';
import type { Pace } from './plan';

const p0: Pace = { type: 'with_each', value: 1 };
const p1: Pace = { type: 'days_per_day', value: 2 };
const p2: Pace = { type: 'days_per_day', value: 3 };
const edited: PaceDraft = { source: p0, pace: p2, local: [p1, p2], externalRevision: 0 };

describe('planner draft reconciliation', () => {
  it('compares both type and value rather than object identity', () => {
    expect(samePace(p1, { ...p1 })).toBe(true);
    expect(samePace(p1, p2)).toBe(false);
    expect(samePace(p1, { type: 'minutes_per_day', value: 2 })).toBe(false);
    expect(samePace(null, null)).toBe(true);
    expect(samePace(null, p0)).toBe(false);
  });

  it('preserves p2 when a refresh returns a copy of the original plan', () => {
    expect(reconcilePaceDraft(edited, { ...p0 })).toBe(edited);
  });

  it('preserves p2 and its pending save when the in-flight p1 save is acknowledged', () => {
    const acknowledged = reconcilePaceDraft(edited, { ...p1 });
    expect(acknowledged.pace).toEqual(p2);
    expect(acknowledged.local).toEqual([p2]);
    expect(acknowledged.externalRevision).toBe(0);
    expect(reconcilePaceDraft(acknowledged, { ...p1 })).toBe(acknowledged);
    expect(reconcilePaceDraft(acknowledged, { ...p2 })).toEqual({
      ...acknowledged, source: p2, local: [],
    });
  });

  it('adopts an external plan and invalidates the pending save', () => {
    const imported: Pace = { type: 'minutes_per_day', value: 20 };
    expect(reconcilePaceDraft(edited, imported)).toEqual({
      source: imported, pace: imported, local: [], externalRevision: 1,
    });
    expect(reconcilePaceDraft(edited, null)).toEqual({
      source: null, pace: null, local: [], externalRevision: 1,
    });
  });
});
