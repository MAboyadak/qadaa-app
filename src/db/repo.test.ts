import type { NotificationResponse } from 'expo-notifications';
import * as Notifications from 'expo-notifications';

import { getMadeUpByDay, logMadeUp, undoLast } from './repo';
import { migrate } from './schema';
import { createTestDb } from './test-db';
import { ACTION_DONE, ACTION_LATER, CATEGORY_QADA, handleResponse, sendTestNudge } from '../notifications';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
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
    const history = await getMadeUpByDay(db);
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
    expect(await getMadeUpByDay(db)).toEqual(new Map([['2026-10-20', 0]]));
    expect(await getMadeUpByDay(db, '2026-10-21')).toEqual(new Map());
  });

  it('falls back to the undo day when its reference is missing', async () => {
    await db.runAsync(
      `INSERT INTO ledger (prayer, delta, kind, ref_id, day, created_at)
       VALUES ('fajr', 1, 'undo', NULL, '2026-10-23', ?)`,
      undoDay.toISOString(),
    );
    expect(await getMadeUpByDay(db, '2026-10-23')).toEqual(new Map([['2026-10-23', -1]]));
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
