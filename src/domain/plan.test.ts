import { toDayKey } from './dates';
import {
  currentStreak,
  dailyTarget,
  daysSinceLastQada,
  longestStreak,
  projectedFinish,
  qadaDaysPerDay,
  splitDuration,
} from './plan';
import { crossedMilestone, milestonesFor, nextMilestone } from './milestones';

const today = new Date('2026-10-16T12:00:00');

describe('plan', () => {
  it('converts paces to qada days per day', () => {
    expect(qadaDaysPerDay({ type: 'with_each', value: 0 })).toBe(1);
    expect(qadaDaysPerDay({ type: 'days_per_day', value: 2 })).toBe(2);
    expect(qadaDaysPerDay({ type: 'minutes_per_day', value: 6 }, 12)).toBe(0.5);
  });

  it('computes a daily target of at least one prayer', () => {
    expect(dailyTarget({ type: 'with_each', value: 0 }, 5)).toBe(5);
    expect(dailyTarget({ type: 'minutes_per_day', value: 1 }, 5, 12)).toBe(1);
    expect(dailyTarget({ type: 'days_per_day', value: 0 }, 5)).toBe(0);
  });

  it('projects the finish date', () => {
    expect(toDayKey(projectedFinish(10, 5, today)!)).toBe('2026-10-18');
    expect(toDayKey(projectedFinish(11, 5, today)!)).toBe('2026-10-19');
    expect(projectedFinish(10, 0, today)).toBeNull();
    expect(projectedFinish(0, 0, today)).toBe(today);
  });

  it('splits durations', () => {
    expect(splitDuration(400)).toEqual({ years: 1, months: 1, days: 5 });
  });

  it('keeps the streak alive when today is not done yet', () => {
    const byDay = new Map([
      ['2026-10-15', 3],
      ['2026-10-14', 1],
      ['2026-10-12', 2],
    ]);
    expect(currentStreak(byDay, today)).toBe(2);
    byDay.set('2026-10-16', 1);
    expect(currentStreak(byDay, today)).toBe(3);
  });

  it('returns zero for an empty best streak', () => {
    expect(longestStreak(new Map())).toBe(0);
  });

  it('counts a single day as the best streak', () => {
    expect(longestStreak(new Map([['2026-10-12', 3]]))).toBe(1);
  });

  it('ignores zero and negative days when finding the best streak', () => {
    const byDay = new Map([
      ['2026-10-10', 1],
      ['2026-10-11', 0],
      ['2026-10-12', 2],
      ['2026-10-13', -1],
      ['2026-10-14', 1],
    ]);
    expect(longestStreak(byDay)).toBe(1);
    expect(longestStreak(new Map([['2026-10-11', 0], ['2026-10-13', -1]]))).toBe(0);
  });

  it('picks the earlier, longer run across several runs', () => {
    const byDay = new Map([
      ['2026-10-01', 1],
      ['2026-10-02', 2],
      ['2026-10-03', 1],
      ['2026-10-06', 1],
      ['2026-10-07', 1],
      ['2026-10-10', 1],
    ]);
    expect(longestStreak(byDay)).toBe(3);
  });

  it('counts a best streak across month and year boundaries', () => {
    const byDay = new Map([
      ['2026-12-30', 1],
      ['2026-12-31', 1],
      ['2027-01-01', 2],
      ['2027-01-02', 1],
    ]);
    expect(longestStreak(byDay)).toBe(4);
  });

  it('finds the best streak without changing unordered map entries', () => {
    const byDay = new Map([
      ['2026-03-09', 1],
      ['2026-03-07', 2],
      ['2026-03-12', 1],
      ['2026-03-08', 1],
    ]);
    const entries = [...byDay];
    expect(longestStreak(byDay)).toBe(3);
    expect([...byDay]).toEqual(entries);
  });

  it('computes days since the last qada', () => {
    expect(daysSinceLastQada(new Map(), today)).toBeNull();
    expect(daysSinceLastQada(new Map([['2026-10-12', 2]]), today)).toBe(4);
  });
});

describe('milestones', () => {
  it('orders milestones and drops ones beyond the total', () => {
    const ms = milestonesFor(100, 5);
    expect(ms[0].id).toBe('first_prayer');
    expect(ms[ms.length - 1].id).toBe('done');
    expect(ms.find((m) => m.id === 'year')).toBeUndefined();
  });

  it('detects a crossed milestone', () => {
    expect(crossedMilestone(4, 5, 1000, 5)?.id).toBe('first_day');
    expect(crossedMilestone(5, 6, 1000, 5)).toBeUndefined();
    expect(nextMilestone(5, 1000, 5)?.id).toBe('week');
  });
});
