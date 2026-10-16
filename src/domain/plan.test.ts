import { toDayKey } from './dates';
import {
  currentStreak,
  dailyTarget,
  daysSinceLastQada,
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
