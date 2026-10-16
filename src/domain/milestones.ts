export type MilestoneId =
  | 'first_prayer'
  | 'first_day'
  | 'week'
  | 'month'
  | 'hundred_days'
  | 'year'
  | 'pct_10'
  | 'pct_25'
  | 'pct_50'
  | 'pct_75'
  | 'done';

export interface Milestone {
  id: MilestoneId;
  /** Prayers made up needed to reach it. */
  threshold: number;
}

/** Milestones in order of their threshold for a given debt size. */
export function milestonesFor(totalDebt: number, prayersPerDay: number): Milestone[] {
  const byDays = (id: MilestoneId, days: number): Milestone => ({ id, threshold: days * prayersPerDay });
  const byPct = (id: MilestoneId, pct: number): Milestone => ({ id, threshold: Math.ceil(totalDebt * pct) });
  const list: Milestone[] = [
    { id: 'first_prayer', threshold: 1 },
    byDays('first_day', 1),
    byDays('week', 7),
    byDays('month', 30),
    byDays('hundred_days', 100),
    byDays('year', 365),
    byPct('pct_10', 0.1),
    byPct('pct_25', 0.25),
    byPct('pct_50', 0.5),
    byPct('pct_75', 0.75),
    { id: 'done', threshold: totalDebt },
  ];
  return list
    .filter((m) => m.threshold > 0 && (m.id === 'done' || m.threshold < totalDebt))
    .sort((a, b) => a.threshold - b.threshold);
}

export function reachedMilestones(madeUp: number, totalDebt: number, prayersPerDay: number): Milestone[] {
  return milestonesFor(totalDebt, prayersPerDay).filter((m) => madeUp >= m.threshold);
}

/** The milestone that was just crossed by going from `before` to `after`, if any. */
export function crossedMilestone(
  before: number,
  after: number,
  totalDebt: number,
  prayersPerDay: number,
): Milestone | undefined {
  return milestonesFor(totalDebt, prayersPerDay)
    .filter((m) => before < m.threshold && after >= m.threshold)
    .pop();
}

export function nextMilestone(madeUp: number, totalDebt: number, prayersPerDay: number): Milestone | undefined {
  return milestonesFor(totalDebt, prayersPerDay).find((m) => madeUp < m.threshold);
}
