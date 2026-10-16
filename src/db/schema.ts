import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'qadaa.db';
const DATABASE_VERSION = 1;

/** Runs on every app start (SQLiteProvider onInit) and in the background task. */
export async function migrate(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version >= DATABASE_VERSION) return;

  if (version === 0) {
    await db.execAsync(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  locale TEXT NOT NULL DEFAULT 'ar',
  gender TEXT,
  birth_date TEXT,
  puberty_age REAL,
  include_witr INTEGER NOT NULL DEFAULT 0,
  calc_method TEXT NOT NULL DEFAULT 'UmmAlQura',
  lat REAL,
  lng REAL,
  location_label TEXT,
  minutes_per_qada_day INTEGER NOT NULL DEFAULT 12,
  nudges_enabled INTEGER NOT NULL DEFAULT 1,
  nudge_offset_min INTEGER NOT NULL DEFAULT 20,
  onboarded_at TEXT
);
CREATE TABLE IF NOT EXISTS estimate_period (
  id INTEGER PRIMARY KEY,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  level TEXT NOT NULL,
  per_prayer_json TEXT
);
CREATE TABLE IF NOT EXISTS estimate_women (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  avg_cycle_days REAL NOT NULL DEFAULT 0,
  nifas_days_total INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS ledger (
  id INTEGER PRIMARY KEY,
  prayer TEXT NOT NULL CHECK (prayer IN ('fajr','dhuhr','asr','maghrib','isha','witr')),
  delta INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('estimate','adjust','made_up','undo')),
  ref_id INTEGER REFERENCES ledger(id),
  source TEXT,
  day TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ledger_prayer ON ledger(prayer);
CREATE INDEX IF NOT EXISTS ledger_day ON ledger(day);
CREATE TABLE IF NOT EXISTS plan (
  id INTEGER PRIMARY KEY,
  pace_type TEXT NOT NULL CHECK (pace_type IN ('with_each','days_per_day','minutes_per_day')),
  pace_value REAL NOT NULL,
  started_at TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS reminder (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('dhikr')),
  time_of_day TEXT NOT NULL,
  dhikr_id TEXT,
  enabled INTEGER NOT NULL DEFAULT 1
);
`);
    version = 1;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
