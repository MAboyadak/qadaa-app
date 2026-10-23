import { MISSED_LEVELS } from './estimate';
import { isPrayer } from './prayers';

export const BACKUP_VERSION = 1;

export class BackupError extends Error {
  constructor(public readonly code: 'not_json' | 'not_qadaa' | 'version' | 'shape' | 'row', message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

type BackupValue = string | number | null;
type ColumnCheck = (value: unknown) => boolean;

const text: ColumnCheck = (v) => typeof v === 'string';
const nonEmptyText: ColumnCheck = (v) => typeof v === 'string' && v.trim().length > 0;
const finite: ColumnCheck = (v) => typeof v === 'number' && Number.isFinite(v);
// Safe integers only: larger values lose precision in JS or fail SQLite's INTEGER binding mid-import.
const integer: ColumnCheck = (v) => typeof v === 'number' && Number.isSafeInteger(v);
const flag: ColumnCheck = (v) => v === 0 || v === 1;
const singleton: ColumnCheck = (v) => v === 1;
const nullable = (check: ColumnCheck): ColumnCheck => (v) => v === null || check(v);
const oneOf = (...values: string[]): ColumnCheck => (v) => typeof v === 'string' && values.includes(v);

const day: ColumnCheck = (v) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [year, month, date] = v.split('-').map(Number);
  // setUTCFullYear avoids the Date constructor's special handling of years 00–99.
  const parsed = new Date(0);
  parsed.setUTCFullYear(year, month - 1, date);
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === date;
};

const missedLevel: ColumnCheck = (v) => typeof v === 'string' && Object.hasOwn(MISSED_LEVELS, v);

/** null, or JSON of { [prayer]: level } as written by saveEstimateInputs. */
const perPrayerJson: ColumnCheck = (v) => {
  if (v === null) return true;
  if (typeof v !== 'string') return false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(v);
  } catch {
    return false;
  }
  return isObject(parsed) && Object.entries(parsed).every(([p, level]) => isPrayer(p) && missedLevel(level));
};

/** All exported columns from schema.ts; even nullable columns must be present. */
const columns = {
  profile: {
    id: singleton,
    locale: oneOf('ar', 'en'),
    gender: nullable(text),
    birth_date: nullable(text),
    puberty_age: nullable(finite),
    include_witr: flag,
    calc_method: text,
    lat: nullable(finite),
    lng: nullable(finite),
    location_label: nullable(text),
    minutes_per_qada_day: finite,
    nudges_enabled: flag,
    nudge_offset_min: finite,
    onboarded_at: nullable(text),
  },
  estimate_period: {
    id: integer,
    start_date: day,
    end_date: day,
    level: missedLevel,
    per_prayer_json: perPrayerJson,
  },
  estimate_women: { id: singleton, avg_cycle_days: finite, nifas_days_total: finite },
  ledger: {
    id: integer,
    prayer: (v: unknown) => typeof v === 'string' && isPrayer(v),
    delta: integer,
    kind: oneOf('estimate', 'adjust', 'made_up', 'undo'),
    ref_id: nullable(integer),
    source: nullable(text),
    day,
    created_at: nonEmptyText,
  },
  plan: {
    id: integer,
    pace_type: oneOf('with_each', 'days_per_day', 'minutes_per_day'),
    pace_value: (v: unknown) => finite(v) && (v as number) >= 0,
    started_at: text,
    active: flag,
  },
  reminder: {
    id: integer,
    type: oneOf('dhikr'),
    time_of_day: (v: unknown) => typeof v === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v),
    dhikr_id: nullable(text),
    enabled: flag,
  },
} satisfies Record<string, Record<string, ColumnCheck>>;

type Table = keyof typeof columns;
export type ValidBackup = {
  [T in Table]: Record<keyof (typeof columns)[T], BackupValue>[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
}

/** Validates the entire file before the importer can replace any existing data. */
export function validateBackup(json: string): ValidBackup {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new BackupError('not_json', 'not json');
  }
  if (!isObject(data) || data.app !== 'qadaa') throw new BackupError('not_qadaa', 'not a qadaa backup');
  if (typeof data.version !== 'number' || !Number.isInteger(data.version) || data.version < 1 || data.version > BACKUP_VERSION) {
    throw new BackupError('version', 'unsupported backup version');
  }

  const result = {} as ValidBackup;
  for (const table of Object.keys(columns) as Table[]) {
    const rows = data[table];
    if (!Array.isArray(rows)) throw new BackupError('shape', `missing ${table}`);
    if ((table === 'profile' && rows.length !== 1) || (table === 'estimate_women' && rows.length > 1)) {
      throw new BackupError('shape', `invalid ${table} row count`);
    }
    const spec: Record<string, ColumnCheck> = columns[table];
    const ids = new Set<BackupValue>();
    const validated = rows.map((row: unknown, index) => {
      if (!isObject(row)) throw new BackupError('row', `${table}[${index}] is not an object`);
      if (Object.keys(row).some((key) => !Object.hasOwn(spec, key))) {
        throw new BackupError('row', `${table}[${index}] has unknown columns`);
      }
      const clean: Record<string, BackupValue> = {};
      for (const [key, check] of Object.entries(spec)) {
        if (!Object.hasOwn(row, key) || !check(row[key])) {
          throw new BackupError('row', `${table}[${index}].${key} is invalid`);
        }
        clean[key] = row[key] as BackupValue;
      }
      if (ids.has(clean.id)) throw new BackupError('row', `${table} has duplicate ids`);
      ids.add(clean.id);
      return clean;
    });
    // Every row was rebuilt using exactly this table's column specification.
    Object.assign(result, { [table]: validated });
  }

  // A period may end before it starts: onboarding can save one when the birth date is
  // recent, and the estimate treats it as zero days. Rejecting it would refuse real exports.
  const ledgerById = new Map(result.ledger.map((row) => [row.id, row]));
  // Older app versions could record two undos of one entry (a race), so duplicates
  // must still import; rejecting them would lock users out of their own backups.
  for (const row of result.ledger) {
    if (row.kind === 'made_up' && row.delta !== -1) throw new BackupError('row', 'invalid made_up delta');
    if (row.kind !== 'undo') {
      if (row.ref_id !== null) throw new BackupError('row', 'only undo may have a ref_id');
      continue;
    }
    const ref = ledgerById.get(row.ref_id);
    if (row.delta !== 1 || !ref || ref.kind !== 'made_up' || ref.prayer !== row.prayer) {
      throw new BackupError('row', 'invalid undo reference or delta');
    }
  }
  return result;
}
