import { BACKUP_VERSION, BackupError, validateBackup } from './backup';
import { BackupError as RepoBackupError, exportBackup, importBackup } from '../db/repo';

const validBackup = () => ({
  app: 'qadaa',
  version: BACKUP_VERSION,
  exportedAt: '2026-03-01T12:00:00.000Z',
  profile: [{
    id: 1, locale: 'ar', gender: 'f', birth_date: '1995-05-20', puberty_age: 12.5,
    include_witr: 1, calc_method: 'UmmAlQura', lat: 21.4, lng: 39.8,
    location_label: null, minutes_per_qada_day: 12, nudges_enabled: 1,
    nudge_offset_min: 20, onboarded_at: '2026-01-01T12:00:00.000Z',
  }],
  estimate_period: [{
    id: 1, start_date: '2024-02-29', end_date: '2025-01-01', level: 'all', per_prayer_json: null,
  }],
  estimate_women: [{ id: 1, avg_cycle_days: 6.5, nifas_days_total: 40 }],
  ledger: [
    { id: 1, prayer: 'fajr', delta: 100, kind: 'estimate', ref_id: null as number | null, source: 'app' as string | null, day: '2026-01-01', created_at: '2026-01-01T12:00:00.000Z' },
    { id: 2, prayer: 'fajr', delta: -1, kind: 'made_up', ref_id: null, source: 'notification', day: '2026-03-01', created_at: '2026-03-01T10:00:00.000Z' },
    { id: 3, prayer: 'fajr', delta: 1, kind: 'undo', ref_id: 2, source: null, day: '2026-03-01', created_at: '2026-03-01T12:00:00.000Z' },
    { id: 4, prayer: 'witr', delta: -2, kind: 'adjust', ref_id: null, source: 'app', day: '2026-03-01', created_at: '2026-03-01T12:00:00.000Z' },
  ],
  plan: [{ id: 1, pace_type: 'with_each', pace_value: 1, started_at: '2026-01-01', active: 1 }],
  reminder: [{ id: 1, type: 'dhikr', time_of_day: '23:59', dhikr_id: null as string | null, enabled: 1 }],
});

type Fixture = ReturnType<typeof validBackup>;

function expectInvalid(json: string, code: BackupError['code']) {
  expect(() => validateBackup(json)).toThrow(BackupError);
  expect(() => validateBackup(json)).toThrow(expect.objectContaining({ code }));
}

describe('validateBackup', () => {
  it('round-trips every row of a realistic exported backup', () => {
    const { app, version, exportedAt, ...rows } = validBackup();
    const validated = validateBackup(JSON.stringify({ app, version, exportedAt, ...rows }));
    expect(validated).toEqual(rows);
    expect(validateBackup(JSON.stringify({ app, version, exportedAt, ...validated }))).toEqual(rows);
  });

  it('accepts two undos of one entry written by older app versions', () => {
    const backup = validBackup();
    backup.ledger.push({ ...backup.ledger[2], id: 5 });
    expect(validateBackup(JSON.stringify(backup)).ledger).toHaveLength(backup.ledger.length);
  });

  it('allows empty optional tables', () => {
    const backup = validBackup();
    backup.estimate_period = [];
    backup.estimate_women = [];
    backup.ledger = [];
    backup.plan = [];
    backup.reminder = [];
    expect(validateBackup(JSON.stringify(backup)).profile).toEqual(backup.profile);
  });

  it('allows nullable profile fields', () => {
    const backup = validBackup();
    Object.assign(backup.profile[0], {
      gender: null, birth_date: null, puberty_age: null, lat: null, lng: null, onboarded_at: null,
    });
    expect(validateBackup(JSON.stringify(backup)).profile).toEqual(backup.profile);
  });

  it('rejects non-JSON', () => expectInvalid('{', 'not_json'));

  it.each([null, [], 'qadaa', 1, { app: 'other' }])('rejects non-qadaa input %j', (value) => {
    expectInvalid(JSON.stringify(value), 'not_qadaa');
  });

  it.each([-1, 0, 1.5, 2, '1'])('rejects version %j', (version) => {
    expectInvalid(JSON.stringify({ ...validBackup(), version }), 'version');
  });

  const invalid: [string, (backup: Fixture) => void, BackupError['code']][] = [
    ['missing table', (b) => { Reflect.deleteProperty(b, 'reminder'); }, 'shape'],
    ['non-array table', (b) => { Object.assign(b, { plan: {} }); }, 'shape'],
    ['empty profile', (b) => { b.profile = []; }, 'shape'],
    ['two profile rows', (b) => { b.profile.push({ ...b.profile[0] }); }, 'shape'],
    ['two women rows', (b) => { b.estimate_women.push({ ...b.estimate_women[0] }); }, 'shape'],
    ['null row', (b) => { Object.assign(b.profile, { 0: null }); }, 'row'],
    ['array row', (b) => { Object.assign(b.plan, { 0: [] }); }, 'row'],
    ['primitive row', (b) => { Object.assign(b.reminder, { 0: 'dhikr' }); }, 'row'],
    ['unknown column', (b) => { Object.assign(b.profile[0], { extra: 1 }); }, 'row'],
    ['prototype column', (b) => { Object.defineProperty(b.profile[0], '__proto__', { value: 1, enumerable: true }); }, 'row'],
    ['missing nullable column', (b) => { Reflect.deleteProperty(b.profile[0], 'onboarded_at'); }, 'row'],
    ['wrong profile id', (b) => { b.profile[0].id = 2; }, 'row'],
    ['wrong women id', (b) => { b.estimate_women[0].id = 2; }, 'row'],
    ['invalid locale', (b) => { b.profile[0].locale = 'fr'; }, 'row'],
    ['non-boolean flag', (b) => { b.profile[0].include_witr = 2; }, 'row'],
    ['invalid numeric field', (b) => { Object.assign(b.profile[0], { lat: '21.4' }); }, 'row'],
    ['null required numeric field', (b) => { Object.assign(b.profile[0], { minutes_per_qada_day: null }); }, 'row'],
    ['fractional delta', (b) => { b.ledger[0].delta = 1.5; }, 'row'],
    ['made_up delta -2', (b) => { b.ledger[1].delta = -2; }, 'row'],
    ['invalid calendar day', (b) => { b.ledger[0].day = '2026-02-30'; }, 'row'],
    ['non-leap February 29', (b) => { b.ledger[0].day = '2025-02-29'; }, 'row'],
    ['unformatted day', (b) => { b.ledger[0].day = '2026-2-01'; }, 'row'],
    ['invalid start date', (b) => { b.estimate_period[0].start_date = '2026-13-01'; }, 'row'],
    ['reversed period', (b) => { b.estimate_period[0].start_date = '2026-01-01'; }, 'row'],
    ['empty level', (b) => { b.estimate_period[0].level = ' '; }, 'row'],
    ['unknown prayer', (b) => { b.ledger[0].prayer = 'unknown'; }, 'row'],
    ['unknown kind', (b) => { b.ledger[0].kind = 'unknown'; }, 'row'],
    ['empty created_at', (b) => { b.ledger[0].created_at = ''; }, 'row'],
    ['fractional id', (b) => { b.ledger[0].id = 1.5; }, 'row'],
    ['duplicate ledger id', (b) => { b.ledger[1].id = 1; }, 'row'],
    ['duplicate plan id', (b) => { b.plan.push({ ...b.plan[0] }); }, 'row'],
    ['non-undo reference', (b) => { b.ledger[0].ref_id = 2; }, 'row'],
    ['undo missing ref', (b) => { b.ledger[2].ref_id = null; }, 'row'],
    ['undo dangling ref', (b) => { b.ledger[2].ref_id = 99; }, 'row'],
    ['undo referencing estimate', (b) => { b.ledger[2].ref_id = 1; }, 'row'],
    ['undo referencing another prayer', (b) => { b.ledger[2].prayer = 'asr'; }, 'row'],
    ['undo delta -1', (b) => { b.ledger[2].delta = -1; }, 'row'],
    ['invalid pace type', (b) => { b.plan[0].pace_type = 'unknown'; }, 'row'],
    ['negative pace', (b) => { b.plan[0].pace_value = -1; }, 'row'],
    ['invalid reminder type', (b) => { b.reminder[0].type = 'other'; }, 'row'],
    ['24:00 reminder', (b) => { b.reminder[0].time_of_day = '24:00'; }, 'row'],
    ['invalid minute', (b) => { b.reminder[0].time_of_day = '12:60'; }, 'row'],
  ];

  it.each(invalid)('rejects %s', (_name, change, code) => {
    const backup = validBackup();
    change(backup);
    expectInvalid(JSON.stringify(backup), code);
  });

  it('rejects a non-finite delta parsed from JSON', () => {
    expectInvalid(JSON.stringify(validBackup()).replace('"delta":100', '"delta":1e400'), 'row');
  });

  it('rejects a non-finite profile number parsed from JSON', () => {
    expectInvalid(JSON.stringify(validBackup()).replace('"lat":21.4', '"lat":1e400'), 'row');
  });

  it('rejects the null produced by JSON serialization of NaN', () => {
    const backup = validBackup();
    backup.ledger[0].delta = NaN;
    expectInvalid(JSON.stringify(backup), 'row');
  });
});

describe('backup repository integration', () => {
  function mockDatabase() {
    const runAsync = jest.fn().mockResolvedValue({});
    const withExclusiveTransactionAsync = jest.fn(async (callback) => callback({ runAsync }));
    const { app: _app, version: _version, exportedAt: _exportedAt, ...tables } = validBackup();
    const getAllAsync = jest.fn(async (sql: string) => tables[sql.replace('SELECT * FROM ', '') as keyof typeof tables]);
    const db = { runAsync, withExclusiveTransactionAsync, getAllAsync };
    return { db: db as unknown as Parameters<typeof importBackup>[0], runAsync, withExclusiveTransactionAsync };
  }

  it('keeps the existing BackupError re-export', () => {
    expect(RepoBackupError).toBe(BackupError);
  });

  it('rejects an empty profile before starting a transaction or changing data', async () => {
    const { db, runAsync, withExclusiveTransactionAsync } = mockDatabase();
    await expect(importBackup(db, JSON.stringify({ ...validBackup(), profile: [] }))).rejects.toBeInstanceOf(BackupError);
    expect(withExclusiveTransactionAsync).not.toHaveBeenCalled();
    expect(runAsync).not.toHaveBeenCalled();
  });

  it('imports an actual export with all rows inside the exclusive transaction', async () => {
    const { db, runAsync, withExclusiveTransactionAsync } = mockDatabase();
    const json = await exportBackup(db);
    expect(validateBackup(json).ledger).toEqual(validBackup().ledger);
    await importBackup(db, json);
    expect(withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
    expect(runAsync.mock.calls.filter(([sql]) => sql.startsWith('DELETE FROM '))).toHaveLength(6);
    expect(runAsync.mock.calls.filter(([sql]) => sql.startsWith('INSERT INTO '))).toHaveLength(9);
    expect(runAsync).toHaveBeenCalledWith(
      'INSERT INTO ledger (id, prayer, delta, kind, ref_id, source, day, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      3, 'fajr', 1, 'undo', 2, null, '2026-03-01', '2026-03-01T12:00:00.000Z',
    );
  });
});
