import type { NotificationResponse } from 'expo-notifications';
import * as Notifications from 'expo-notifications';

import { getMadeUpByDay, getEstimateInputs, getProfile, getSummary, saveEstimate, updateProfile, logMadeUp, setDebt, setRemaining, undoLast } from './repo';
import { migrate } from './schema';
import { createTestDb } from './test-db';
import { activePrayers, ALL_PRAYERS, emptyCounts, sumCounts } from '../domain/prayers';
import { ACTION_DONE, ACTION_LATER, CATEGORY_QADA, handleResponse, rescheduleAll, sendTestNudge } from '../notifications';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval', DATE: 'date', DAILY: 'daily' },
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  setNotificationHandler: jest.fn(),
  dismissNotificationAsync: jest.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('test-id'),
}));
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));

const originalDay = new Date(2026, 9, 20, 12);
const undoDay = new Date(2026, 9, 23, 12);
const response = (data: Record<string, unknown>, actionIdentifier = ACTION_DONE, identifier = 'reminder-1') => ({
  actionIdentifier,
  notification: { request: { identifier, content: { data } } },
}) as Pick<NotificationResponse, 'actionIdentifier' | 'notification'>;

describe('atomic ledger writes (real SQLite)', () => {
  let fixture: ReturnType<typeof createTestDb>;
  let db: ReturnType<typeof createTestDb>['db'];

  beforeEach(async () => {
    jest.clearAllMocks();
    fixture = createTestDb();
    db = fixture.db;
    await migrate(db);
  });
  afterEach(() => fixture.close());

  async function seed(remaining = 1, prayer = 'fajr') {
    await db.runAsync(
      "INSERT INTO ledger (prayer, delta, kind, source, day, created_at) VALUES (?, ?, 'estimate', 'app', ?, ?)",
      prayer, remaining, '2026-10-20', originalDay.toISOString(),
    );
  }
  const rows = (kind: string) => db.getAllAsync('SELECT * FROM ledger WHERE kind = ?', kind);

  it('saves estimate inputs, debt and profile together, preserving completed prayers', async () => {
    await seed(10);
    await logMadeUp(db, 'fajr');
    await saveEstimate(db, [{ start: originalDay, end: undoDay, level: 'half' }],
      { avgCycleDays: 6, nifasDaysTotal: 20 }, { ...emptyCounts(), fajr: 8 }, ['fajr'],
      { gender: 'f', birthDate: '1990-01-01', pubertyAge: 14, includeWitr: false, locale: 'en' });
    expect((await getEstimateInputs(db)).women).toEqual({ avgCycleDays: 6, nifasDaysTotal: 20 });
    expect((await getEstimateInputs(db)).periods[0].level).toBe('half');
    expect(await getProfile(db)).toMatchObject({ gender: 'f', locale: 'en', pubertyAge: 14 });
    expect((await getSummary(db)).remaining.fajr).toBe(7);
    expect((await getSummary(db)).madeUp.fajr).toBe(1);
  });

  it('rolls back inputs and debt when the profile write fails at the end', async () => {
    const profile = { gender: 'm' as const, birthDate: '1990-01-01', pubertyAge: 14, includeWitr: false, locale: 'en' as const };
    await saveEstimate(db, [{ start: originalDay, end: originalDay, level: 'all' }], null,
      { ...emptyCounts(), fajr: 10 }, ['fajr'], profile);
    const inputs = await getEstimateInputs(db);
    const ledger = await db.getAllAsync('SELECT * FROM ledger ORDER BY id');
    await db.execAsync("CREATE TRIGGER reject_profile BEFORE UPDATE ON profile BEGIN SELECT RAISE(ABORT, 'test failure'); END");
    await expect(saveEstimate(db, [{ start: undoDay, end: undoDay, level: 'half' }],
      { avgCycleDays: 7, nifasDaysTotal: 30 }, { ...emptyCounts(), fajr: 20 }, ['fajr'],
      { ...profile, gender: 'f', locale: 'ar' })).rejects.toThrow('test failure');
    expect(await getEstimateInputs(db)).toEqual(inputs);
    expect(await db.getAllAsync('SELECT * FROM ledger ORDER BY id')).toEqual(ledger);
    expect(await getProfile(db)).toMatchObject(profile);
  });

  it('reconciles obsolete Witr from the latest saved inputs, preserving completed Witr', async () => {
    await setDebt(db, { ...emptyCounts(), witr: 100 }, ['witr']);
    await logMadeUp(db, 'witr');
    // Re-estimate while Witr is disabled; update its debt within the same save.
    await saveEstimate(db, [{ start: originalDay, end: undoDay, level: 'all', perPrayer: { isha: 'half' } }],
      { avgCycleDays: 6, nifasDaysTotal: 0 }, { ...emptyCounts(), isha: 2 }, ['isha'],
      { gender: 'f', birthDate: '1990-01-01', pubertyAge: 14, includeWitr: false, locale: 'en' });
    // Follows Isha, including the saved cycle exclusion, without toggling Witr on.
    expect((await getSummary(db)).debt.witr).toBe(2);
    expect((await getSummary(db)).remaining.witr).toBe(1);
    expect((await getSummary(db)).madeUp.witr).toBe(1);
  });

  it.each(['result', 'adjust'] as const)('preserves a manual Witr count from %s across profile toggles', async (source) => {
    await setDebt(db, { ...emptyCounts(), witr: 100 }, ['witr']);
    await logMadeUp(db, 'witr');
    const profile = { gender: 'm' as const, birthDate: '1990-01-01', pubertyAge: 14, includeWitr: true, locale: 'en' as const };
    // The raw period estimate is 4; the result screen's explicit Witr count wins.
    await saveEstimate(db, [{ start: originalDay, end: undoDay, level: 'all' }], null,
      { ...emptyCounts(), witr: 17 }, ALL_PRAYERS.slice(), profile);
    expect((await getSummary(db)).debt.witr).toBe(17);
    if (source === 'adjust') await setRemaining(db, { witr: 6 });
    const before = await getSummary(db);
    const ledger = await db.getAllAsync('SELECT * FROM ledger ORDER BY id');
    await updateProfile(db, { includeWitr: false });
    await updateProfile(db, { includeWitr: true });
    expect(await getSummary(db)).toEqual(before);
    expect((await getSummary(db)).remaining.witr).toBe(source === 'adjust' ? 6 : 16);
    expect((await getSummary(db)).madeUp.witr).toBe(1);
    expect(await db.getAllAsync('SELECT * FROM ledger ORDER BY id')).toEqual(ledger);
  });

  it('keeps completed Witr when a disabled re-estimate falls below the completed count', async () => {
    await setDebt(db, { ...emptyCounts(), witr: 10 }, ['witr']);
    await logMadeUp(db, 'witr');
    await logMadeUp(db, 'witr');
    await saveEstimate(db, [{ start: originalDay, end: originalDay, level: 'all' }], null,
      emptyCounts(), activePrayers(false),
      { gender: 'm', birthDate: '1990-01-01', pubertyAge: 14, includeWitr: false, locale: 'en' });
    const summary = await getSummary(db);
    expect(summary.debt.witr).toBe(1);
    expect(summary.remaining.witr).toBe(0);
    expect(summary.madeUp.witr).toBe(2);
  });

  it('only schedules prayer reminders for prayers with remaining debt', async () => {
    await seed(1);
    await updateProfile(db, { onboardedAt: originalDay.toISOString(), locale: 'en', nudgesEnabled: true, lat: 30, lng: 31 });
    await rescheduleAll(db, originalDay);
    const calls = jest.mocked(Notifications.scheduleNotificationAsync).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every(([request]) => request.content.data?.prayer === 'fajr')).toBe(true);
    jest.mocked(Notifications.scheduleNotificationAsync).mockClear();
    await handleResponse(db, response({ kind: 'qada', prayer: 'fajr' }));
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it.each(['undo', 're-estimate', 'adjust'] as const)(
    'restores reminders after %s makes a finished prayer remaining again',
    async (action) => {
      await seed(1);
      await updateProfile(db, { onboardedAt: originalDay.toISOString(), locale: 'en', nudgesEnabled: true, lat: 30, lng: 31 });
      await logMadeUp(db, 'fajr', 'app', originalDay);
      expect(await rescheduleAll(db, originalDay)).toBe(0);

      if (action === 'undo') {
        expect(await undoLast(db, 'fajr', undoDay)).toBe(true);
      } else if (action === 're-estimate') {
        await saveEstimate(db, [{ start: originalDay, end: undoDay, level: 'half' }], null,
          { ...emptyCounts(), fajr: 2 }, ['fajr'],
          { gender: 'm', birthDate: '1990-01-01', pubertyAge: 14, includeWitr: false, locale: 'en' });
      } else {
        await setRemaining(db, { fajr: 1 });
      }

      expect((await getSummary(db)).remaining.fajr).toBe(1);
      expect(await rescheduleAll(db, originalDay)).toBeGreaterThan(0);
      const calls = jest.mocked(Notifications.scheduleNotificationAsync).mock.calls;
      expect(calls.every(([request]) => request.content.data?.prayer === 'fajr')).toBe(true);
    },
  );

  it('runs overlapping reschedules one after another, never interleaved', async () => {
    await seed(1);
    await updateProfile(db, { onboardedAt: originalDay.toISOString(), locale: 'en', nudgesEnabled: true, lat: 30, lng: 31 });
    const order: string[] = [];
    jest.mocked(Notifications.cancelAllScheduledNotificationsAsync).mockImplementation(async () => { order.push('cancel'); });
    jest.mocked(Notifications.scheduleNotificationAsync).mockImplementation(async () => { order.push('schedule'); return 'id'; });
    try {
      await Promise.all([rescheduleAll(db, originalDay), rescheduleAll(db, originalDay)]);
      // A second 'cancel' may only appear after the first run finished scheduling.
      const second = order.indexOf('cancel', 1);
      expect(second).toBeGreaterThan(1);
      expect(order.slice(1, second).every((step) => step === 'schedule')).toBe(true);
      expect(order.slice(second + 1).every((step) => step === 'schedule')).toBe(true);
    } finally {
      jest.mocked(Notifications.cancelAllScheduledNotificationsAsync).mockResolvedValue(undefined);
      jest.mocked(Notifications.scheduleNotificationAsync).mockResolvedValue('test-id');
    }
  });

  it('keeps a notification log successful when renewal fails', async () => {
    await seed(1);
    jest.mocked(Notifications.cancelAllScheduledNotificationsAsync).mockRejectedValueOnce(new Error('scheduler unavailable'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await expect(handleResponse(db, response({ kind: 'qada', prayer: 'fajr' }))).resolves.toEqual({ logged: true, prayerAction: true });
      expect((await getSummary(db)).madeUp.fajr).toBe(1);
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('aggregates remaining, total debt and net made-up counts from the ledger', async () => {
    await seed(10);
    await setRemaining(db, { fajr: 12 });
    await logMadeUp(db, 'fajr', 'app', originalDay);
    await logMadeUp(db, 'fajr', 'app', originalDay);
    await undoLast(db, 'fajr', undoDay);

    const summary = await getSummary(db);
    expect(summary.remaining).toEqual({ ...emptyCounts(), fajr: 11 });
    expect(sumCounts(summary.debt, true)).toBe(12);
    expect(sumCounts(summary.madeUp, true)).toBe(1);
    expect(await getMadeUpByDay(db, ALL_PRAYERS)).toEqual(new Map([['2026-10-20', 1]]));
  });

  it.each([5, 12])('sets remaining exactly after re-estimating debt to %i', async (debt) => {
    await seed(10);
    for (let i = 0; i < 8; i++) await logMadeUp(db, 'fajr', 'app', originalDay);
    await setDebt(db, { ...emptyCounts(), fajr: debt }, ['fajr']);
    const before = await db.getAllAsync('SELECT * FROM ledger ORDER BY id');
    expect((await getSummary(db)).remaining.fajr).toBe(Math.max(0, debt - 8));
    expect(await db.getFirstAsync('SELECT SUM(delta) AS balance FROM ledger')).toEqual({ balance: debt - 8 });

    await setRemaining(db, { fajr: 2 });
    const after = await db.getAllAsync('SELECT * FROM ledger ORDER BY id');
    expect(after.slice(0, before.length)).toEqual(before);
    expect(after).toHaveLength(before.length + 1);
    expect(after[after.length - 1]).toEqual(expect.objectContaining({ kind: 'adjust', delta: 2 - (debt - 8) }));
    expect((await getSummary(db)).remaining.fajr).toBe(2);
    expect((await getSummary(db)).madeUp.fajr).toBe(8);
    expect(await db.getFirstAsync('SELECT SUM(delta) AS balance FROM ledger')).toEqual({ balance: 2 });
  });

  it('appends nothing when setting remaining to its current value', async () => {
    await seed(10);
    await logMadeUp(db, 'fajr');
    const before = await db.getAllAsync('SELECT * FROM ledger');
    await setRemaining(db, { fajr: 9, dhuhr: 0 });
    expect(await db.getAllAsync('SELECT * FROM ledger')).toEqual(before);
  });

  it('appends nothing when the current displayed remaining is clamped to zero', async () => {
    await seed(2);
    await logMadeUp(db, 'fajr');
    await logMadeUp(db, 'fajr');
    await setDebt(db, { ...emptyCounts(), fajr: 1 }, ['fajr']);
    const before = await db.getAllAsync('SELECT * FROM ledger');
    expect((await getSummary(db)).remaining.fajr).toBe(0);
    await setRemaining(db, { fajr: 0 });
    expect(await db.getAllAsync('SELECT * FROM ledger')).toEqual(before);
  });

  it('sets multiple prayers independently and rounds and clamps requested counts', async () => {
    await seed(10);
    await seed(5, 'asr');
    await setRemaining(db, { fajr: 2.6, asr: -2, dhuhr: 4 });
    expect((await getSummary(db)).remaining).toEqual({ ...emptyCounts(), fajr: 3, dhuhr: 4 });
  });

  it('undoes the latest eligible row, then the previous one, and stops when none remain', async () => {
    await seed(10);
    expect(await undoLast(db, 'fajr')).toBe(false);
    await logMadeUp(db, 'fajr', 'app', originalDay);
    await logMadeUp(db, 'fajr', 'app', originalDay);
    const made = await db.getAllAsync<{ id: number }>("SELECT id FROM ledger WHERE kind = 'made_up' ORDER BY id");
    expect(await undoLast(db, 'dhuhr')).toBe(false);
    expect(await undoLast(db, 'fajr', undoDay)).toBe(true);
    expect(await rows('undo')).toEqual([expect.objectContaining({ ref_id: made[1].id })]);
    expect(await undoLast(db, 'fajr', undoDay)).toBe(true);
    expect(await undoLast(db, 'fajr', undoDay)).toBe(false);
    expect(await rows('undo')).toEqual([
      expect.objectContaining({ ref_id: made[1].id }),
      expect.objectContaining({ ref_id: made[0].id }),
    ]);
    const summary = await getSummary(db);
    expect(summary.remaining.fajr).toBe(10);
    expect(summary.debt.fajr).toBe(10);
    expect(summary.madeUp.fajr).toBe(0);
  });

  it('filters Witr make-ups and undos using the active prayers without losing history', async () => {
    await seed(3, 'witr');
    await seed(1);
    await logMadeUp(db, 'witr', 'app', originalDay);
    await logMadeUp(db, 'witr', 'app', originalDay);
    await undoLast(db, 'witr', undoDay);
    await logMadeUp(db, 'witr', 'app', undoDay);
    await logMadeUp(db, 'fajr', 'app', undoDay);
    expect(await getMadeUpByDay(db, activePrayers(false))).toEqual(new Map([['2026-10-23', 1]]));
    expect(await getMadeUpByDay(db, activePrayers(true))).toEqual(new Map([
      ['2026-10-20', 1], ['2026-10-23', 2],
    ]));
    expect(await getMadeUpByDay(db, activePrayers(true), '2026-10-21')).toEqual(new Map([['2026-10-23', 2]]));
    expect(await getMadeUpByDay(db, [])).toEqual(new Map());
  });

  it('logs exactly once when overlapping calls compete for the last prayer', async () => {
    await seed();
    expect(await Promise.all([logMadeUp(db, 'fajr'), logMadeUp(db, 'fajr')])).toEqual([true, false]);
    expect(await rows('made_up')).toHaveLength(1);
    expect(await db.getFirstAsync('SELECT SUM(delta) AS remaining FROM ledger')).toEqual({ remaining: 0 });
  });

  it('undoes the same row only once across overlapping calls', async () => {
    await seed();
    await logMadeUp(db, 'fajr');
    expect(await Promise.all([undoLast(db, 'fajr'), undoLast(db, 'fajr')])).toEqual([true, false]);
    expect(await rows('undo')).toHaveLength(1);
  });

  it('deduplicates notification sources concurrently and sequentially, while allowing a different id', async () => {
    await seed(5);
    expect(await Promise.all([
      logMadeUp(db, 'fajr', 'notif:one'),
      logMadeUp(db, 'fajr', 'notif:one'),
    ])).toEqual([true, false]);
    expect(await logMadeUp(db, 'fajr', 'notif:one')).toBe(false);
    expect(await logMadeUp(db, 'fajr', 'notif:two')).toBe(true);
    expect(await rows('made_up')).toHaveLength(2);
  });

  it('stamps undo with the original day and current creation time', async () => {
    await seed();
    await logMadeUp(db, 'fajr', 'app', originalDay);
    await undoLast(db, 'fajr', undoDay);
    expect(await rows('undo')).toEqual([
      expect.objectContaining({ day: '2026-10-20', created_at: undoDay.toISOString() }),
    ]);
    const history = await getMadeUpByDay(db, ALL_PRAYERS);
    expect(history.get('2026-10-20')).toBe(0);
    expect(history.get('2026-10-23') ?? 0).toBe(0);
  });

  it('attributes legacy cross-day undos and sinceDay filtering to the referenced day', async () => {
    await seed();
    await logMadeUp(db, 'fajr', 'app', originalDay);
    await db.runAsync(
      `INSERT INTO ledger (prayer, delta, kind, ref_id, source, day, created_at)
       SELECT prayer, 1, 'undo', id, 'app', '2026-10-23', ? FROM ledger WHERE kind = 'made_up'`,
      undoDay.toISOString(),
    );
    expect(await getMadeUpByDay(db, ALL_PRAYERS)).toEqual(new Map([['2026-10-20', 0]]));
    expect(await getMadeUpByDay(db, ALL_PRAYERS, '2026-10-21')).toEqual(new Map());
  });

  it('falls back to the undo day when its reference is missing', async () => {
    await db.runAsync(
      `INSERT INTO ledger (prayer, delta, kind, ref_id, day, created_at)
       VALUES ('fajr', 1, 'undo', NULL, '2026-10-23', ?)`,
      undoDay.toISOString(),
    );
    expect(await getMadeUpByDay(db, ALL_PRAYERS, '2026-10-23')).toEqual(new Map([['2026-10-23', -1]]));
  });

  it('can log again after undo without replaying a handled notification', async () => {
    await seed();
    expect(await logMadeUp(db, 'fajr', 'notif:one')).toBe(true);
    expect(await undoLast(db, 'fajr')).toBe(true);
    expect(await logMadeUp(db, 'fajr', 'notif:one')).toBe(false);
    expect(await logMadeUp(db, 'fajr', 'notif:two')).toBe(true);
    expect(await rows('made_up')).toHaveLength(2);
    expect(await rows('undo')).toHaveLength(1);
  });

  it.each([ACTION_DONE, ACTION_LATER])('dismisses test action %s without logging', async (action) => {
    await seed(2, 'dhuhr');
    const before = await db.getAllAsync('SELECT * FROM ledger');
    expect(await handleResponse(db, response({ kind: 'test' }, action))).toEqual({
      logged: false, prayerAction: false,
    });
    expect(await db.getAllAsync('SELECT * FROM ledger')).toEqual(before);
    expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith('reminder-1');
  });

  it('schedules test nudges with a non-logging payload and the same buttons', async () => {
    await sendTestNudge('en');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.objectContaining({ data: { kind: 'test' }, categoryIdentifier: CATEGORY_QADA }),
    }));
  });

  it('identifies duplicate prayer actions so the foreground can refresh', async () => {
    await seed(3);
    const notification = response({ kind: 'qada', prayer: 'fajr' });
    expect(await Promise.all([handleResponse(db, notification), handleResponse(db, notification)])).toEqual([
      { logged: true, prayerAction: true },
      { logged: false, prayerAction: true },
    ]);
    expect(await rows('made_up')).toHaveLength(1);
  });

  it('logs from the background task payload, where Android sends data as dataString', async () => {
    await seed(3);
    const raw = {
      actionIdentifier: ACTION_DONE,
      notification: { request: { identifier: 'reminder-bg', content: { dataString: JSON.stringify({ kind: 'qada', prayer: 'fajr' }) } } },
    } as unknown as Parameters<typeof handleResponse>[1];
    expect(await handleResponse(db, raw)).toEqual({ logged: true, prayerAction: true });
    expect(await rows('made_up')).toHaveLength(1);
  });

  it('identifies a prayer action even when no debt remains', async () => {
    expect(await handleResponse(db, response({ kind: 'qada', prayer: 'fajr' }))).toEqual({
      logged: false, prayerAction: true,
    });
  });

  it('sets busy_timeout even on an already migrated connection without a version bump', async () => {
    await db.execAsync('PRAGMA busy_timeout = 0');
    await migrate(db);
    expect(await db.getFirstAsync('PRAGMA busy_timeout')).toEqual({ timeout: 5000 });
    expect(await db.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 1 });
  });
});
