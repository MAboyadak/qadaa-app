import type { SQLiteDatabase } from 'expo-sqlite';

import { BACKUP_VERSION, validateBackup } from '@/domain/backup';
import { toDayKey, type DayKey } from '@/domain/dates';
import type { EstimatePeriod, MissedLevel } from '@/domain/estimate';
import type { LedgerKind } from '@/domain/ledger';
import type { Pace, PaceType } from '@/domain/plan';
import { ALL_PRAYERS, emptyCounts, isPrayer, type Prayer, type PrayerCounts } from '@/domain/prayers';
import type { Locale } from '@/i18n';

export interface Profile {
  locale: Locale;
  gender: 'm' | 'f' | null;
  birthDate: string | null;
  pubertyAge: number | null;
  includeWitr: boolean;
  calcMethod: string;
  lat: number | null;
  lng: number | null;
  locationLabel: string | null;
  minutesPerQadaDay: number;
  nudgesEnabled: boolean;
  nudgeOffsetMin: number;
  onboardedAt: string | null;
}

interface ProfileRow {
  locale: string;
  gender: string | null;
  birth_date: string | null;
  puberty_age: number | null;
  include_witr: number;
  calc_method: string;
  lat: number | null;
  lng: number | null;
  location_label: string | null;
  minutes_per_qada_day: number;
  nudges_enabled: number;
  nudge_offset_min: number;
  onboarded_at: string | null;
}

export async function getProfile(db: SQLiteDatabase): Promise<Profile | null> {
  const r = await db.getFirstAsync<ProfileRow>('SELECT * FROM profile WHERE id = 1');
  if (!r) return null;
  return {
    locale: r.locale === 'en' ? 'en' : 'ar',
    gender: r.gender === 'm' || r.gender === 'f' ? r.gender : null,
    birthDate: r.birth_date,
    pubertyAge: r.puberty_age,
    includeWitr: !!r.include_witr,
    calcMethod: r.calc_method,
    lat: r.lat,
    lng: r.lng,
    locationLabel: r.location_label,
    minutesPerQadaDay: r.minutes_per_qada_day,
    nudgesEnabled: !!r.nudges_enabled,
    nudgeOffsetMin: r.nudge_offset_min,
    onboardedAt: r.onboarded_at,
  };
}

const profileColumns: Record<keyof Profile, string> = {
  locale: 'locale',
  gender: 'gender',
  birthDate: 'birth_date',
  pubertyAge: 'puberty_age',
  includeWitr: 'include_witr',
  calcMethod: 'calc_method',
  lat: 'lat',
  lng: 'lng',
  locationLabel: 'location_label',
  minutesPerQadaDay: 'minutes_per_qada_day',
  nudgesEnabled: 'nudges_enabled',
  nudgeOffsetMin: 'nudge_offset_min',
  onboardedAt: 'onboarded_at',
};

export async function updateProfile(db: SQLiteDatabase, patch: Partial<Profile>): Promise<void> {
  await db.runAsync('INSERT OR IGNORE INTO profile (id) VALUES (1)');
  const entries = Object.entries(patch) as [keyof Profile, Profile[keyof Profile]][];
  if (entries.length === 0) return;
  const sets = entries.map(([k]) => `${profileColumns[k]} = ?`).join(', ');
  const values = entries.map(([, v]) => (typeof v === 'boolean' ? (v ? 1 : 0) : (v ?? null)));
  await db.runAsync(`UPDATE profile SET ${sets} WHERE id = 1`, ...values);
}

// ---------- estimate inputs ----------

export interface WomenInputs {
  avgCycleDays: number;
  nifasDaysTotal: number;
}

export async function saveEstimateInputs(
  db: SQLiteDatabase,
  periods: EstimatePeriod[],
  women: WomenInputs | null,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM estimate_period');
    for (const p of periods) {
      await db.runAsync(
        'INSERT INTO estimate_period (start_date, end_date, level, per_prayer_json) VALUES (?, ?, ?, ?)',
        toDayKey(p.start),
        toDayKey(p.end),
        p.level,
        p.perPrayer ? JSON.stringify(p.perPrayer) : null,
      );
    }
    await db.runAsync('DELETE FROM estimate_women');
    if (women) {
      await db.runAsync(
        'INSERT INTO estimate_women (id, avg_cycle_days, nifas_days_total) VALUES (1, ?, ?)',
        women.avgCycleDays,
        women.nifasDaysTotal,
      );
    }
  });
}

export async function getEstimateInputs(
  db: SQLiteDatabase,
): Promise<{ periods: { start: string; end: string; level: MissedLevel; perPrayer?: Partial<Record<Prayer, MissedLevel>> }[]; women: WomenInputs | null }> {
  const rows = await db.getAllAsync<{ start_date: string; end_date: string; level: MissedLevel; per_prayer_json: string | null }>(
    'SELECT * FROM estimate_period ORDER BY id',
  );
  const w = await db.getFirstAsync<{ avg_cycle_days: number; nifas_days_total: number }>('SELECT * FROM estimate_women');
  return {
    periods: rows.map((r) => ({
      start: r.start_date,
      end: r.end_date,
      level: r.level,
      perPrayer: r.per_prayer_json ? JSON.parse(r.per_prayer_json) : undefined,
    })),
    women: w ? { avgCycleDays: w.avg_cycle_days, nifasDaysTotal: w.nifas_days_total } : null,
  };
}

// ---------- ledger ----------

async function append(
  db: SQLiteDatabase,
  prayer: Prayer,
  delta: number,
  kind: LedgerKind,
  opts: { refId?: number; source?: string; now?: Date } = {},
): Promise<number> {
  const now = opts.now ?? new Date();
  const res = await db.runAsync(
    'INSERT INTO ledger (prayer, delta, kind, ref_id, source, day, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    prayer,
    delta,
    kind,
    opts.refId ?? null,
    opts.source ?? 'app',
    toDayKey(now),
    now.toISOString(),
  );
  return res.lastInsertRowId;
}

export interface PrayerSummary {
  remaining: PrayerCounts;
  debt: PrayerCounts;
  madeUp: PrayerCounts;
}

export async function getSummary(db: SQLiteDatabase): Promise<PrayerSummary> {
  const rows = await db.getAllAsync<{ prayer: string; remaining: number; debt: number; made: number }>(`
    SELECT prayer,
      SUM(delta) AS remaining,
      SUM(CASE WHEN kind IN ('estimate','adjust') THEN delta ELSE 0 END) AS debt,
      SUM(CASE WHEN kind IN ('made_up','undo') THEN -delta ELSE 0 END) AS made
    FROM ledger GROUP BY prayer`);
  const summary: PrayerSummary = { remaining: emptyCounts(), debt: emptyCounts(), madeUp: emptyCounts() };
  for (const r of rows) {
    if (!isPrayer(r.prayer)) continue;
    summary.remaining[r.prayer] = Math.max(0, r.remaining);
    summary.debt[r.prayer] = r.debt;
    summary.madeUp[r.prayer] = r.made;
  }
  return summary;
}

export async function getMadeUpByDay(db: SQLiteDatabase, sinceDay?: DayKey): Promise<Map<DayKey, number>> {
  const rows = await db.getAllAsync<{ day: string; n: number }>(
    `SELECT CASE WHEN l.kind = 'undo' THEN COALESCE(r.day, l.day) ELSE l.day END AS day,
       SUM(-l.delta) AS n
     FROM ledger l LEFT JOIN ledger r ON r.id = l.ref_id
     WHERE l.kind IN ('made_up','undo')
       AND (CASE WHEN l.kind = 'undo' THEN COALESCE(r.day, l.day) ELSE l.day END) >= ?
     GROUP BY 1`,
    sinceDay ?? '0000-00-00',
  );
  return new Map(rows.map((r) => [r.day, r.n]));
}

/** Records the initial estimate, or moves the total debt to a new estimate (re-estimate). */
export async function setDebt(db: SQLiteDatabase, target: PrayerCounts, prayers: Prayer[]): Promise<void> {
  await db.withTransactionAsync(async () => {
    const { debt } = await getSummary(db);
    const hasAny = ALL_PRAYERS.some((p) => debt[p] !== 0);
    for (const p of prayers) {
      const delta = target[p] - debt[p];
      if (delta !== 0) await append(db, p, delta, hasAny ? 'adjust' : 'estimate');
    }
  });
}

/** Sets what remains for each prayer by appending adjustments. */
export async function setRemaining(db: SQLiteDatabase, target: Partial<PrayerCounts>): Promise<void> {
  await db.withTransactionAsync(async () => {
    const { remaining } = await getSummary(db);
    for (const [p, value] of Object.entries(target) as [Prayer, number][]) {
      const delta = Math.max(0, Math.round(value)) - remaining[p];
      if (delta !== 0) await append(db, p, delta, 'adjust');
    }
  });
}

/** Logs one made-up prayer. Returns false when nothing remains for that prayer. */
export async function logMadeUp(
  db: SQLiteDatabase,
  prayer: Prayer,
  source = 'app',
  now = new Date(),
): Promise<boolean> {
  const notificationGuard = source.startsWith('notif:')
    ? 'AND NOT EXISTS (SELECT 1 FROM ledger WHERE source = ?)'
    : '';
  const result = await db.runAsync(
    `INSERT INTO ledger (prayer, delta, kind, ref_id, source, day, created_at)
     SELECT ?, -1, 'made_up', NULL, ?, ?, ?
     WHERE COALESCE((SELECT SUM(delta) FROM ledger WHERE prayer = ?), 0) > 0
       ${notificationGuard}`,
    prayer,
    source,
    toDayKey(now),
    now.toISOString(),
    prayer,
    ...(source.startsWith('notif:') ? [source] : []),
  );
  return result.changes === 1;
}

/** Reverses the latest not-yet-undone made-up entry on its original day. */
export async function undoLast(db: SQLiteDatabase, prayer: Prayer, now = new Date()): Promise<boolean> {
  const result = await db.runAsync(
    `INSERT INTO ledger (prayer, delta, kind, ref_id, source, day, created_at)
     SELECT ?, 1, 'undo', l.id, 'app', l.day, ? FROM ledger l
     WHERE l.prayer = ? AND l.kind = 'made_up'
       AND NOT EXISTS (SELECT 1 FROM ledger u WHERE u.kind = 'undo' AND u.ref_id = l.id)
     ORDER BY l.id DESC LIMIT 1`,
    prayer,
    now.toISOString(),
    prayer,
  );
  return result.changes === 1;
}

// ---------- plan ----------

export async function getPlan(db: SQLiteDatabase): Promise<Pace | null> {
  const r = await db.getFirstAsync<{ pace_type: PaceType; pace_value: number }>(
    'SELECT pace_type, pace_value FROM plan WHERE active = 1 ORDER BY id DESC LIMIT 1',
  );
  return r ? { type: r.pace_type, value: r.pace_value } : null;
}

export async function setPlan(db: SQLiteDatabase, pace: Pace): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE plan SET active = 0 WHERE active = 1');
    await db.runAsync(
      'INSERT INTO plan (pace_type, pace_value, started_at, active) VALUES (?, ?, ?, 1)',
      pace.type,
      pace.value,
      new Date().toISOString(),
    );
  });
}

// ---------- dhikr reminders ----------

export interface DhikrReminder {
  id: number;
  timeOfDay: string;
  dhikrId: string | null;
  enabled: boolean;
}

export async function getDhikrReminders(db: SQLiteDatabase): Promise<DhikrReminder[]> {
  const rows = await db.getAllAsync<{ id: number; time_of_day: string; dhikr_id: string | null; enabled: number }>(
    "SELECT * FROM reminder WHERE type = 'dhikr' ORDER BY time_of_day",
  );
  return rows.map((r) => ({ id: r.id, timeOfDay: r.time_of_day, dhikrId: r.dhikr_id, enabled: !!r.enabled }));
}

export async function addDhikrReminder(db: SQLiteDatabase, timeOfDay: string, dhikrId: string | null) {
  await db.runAsync("INSERT INTO reminder (type, time_of_day, dhikr_id) VALUES ('dhikr', ?, ?)", timeOfDay, dhikrId);
}

export async function removeDhikrReminder(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM reminder WHERE id = ?', id);
}

// ---------- backup ----------

export { BackupError } from '@/domain/backup';
const TABLES = ['profile', 'estimate_period', 'estimate_women', 'ledger', 'plan', 'reminder'] as const;

export async function exportBackup(db: SQLiteDatabase): Promise<string> {
  const data: Record<string, unknown> = { app: 'qadaa', version: BACKUP_VERSION, exportedAt: new Date().toISOString() };
  for (const table of TABLES) data[table] = await db.getAllAsync(`SELECT * FROM ${table}`);
  return JSON.stringify(data);
}

/** Replaces all data with the backup inside one transaction. Throws BackupError when invalid. */
export async function importBackup(db: SQLiteDatabase, json: string): Promise<void> {
  const data = validateBackup(json);

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const table of TABLES) {
      await txn.runAsync(`DELETE FROM ${table}`);
      for (const row of data[table]) {
        const entries = Object.entries(row);
        const cols = entries.map(([column]) => column);
        await txn.runAsync(
          `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
          ...entries.map(([, value]) => value),
        );
      }
    }
  });
}
