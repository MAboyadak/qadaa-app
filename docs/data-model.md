# Data model (local SQLite via expo-sqlite)

Design: an **append-only ledger** for prayer counts (event-sourced). Remaining count = `SUM(delta)` per prayer.
Undo appends a compensating entry, so history is never rewritten. This makes export, history and debugging easy.

```sql
-- singleton settings row
CREATE TABLE profile (
  id               INTEGER PRIMARY KEY CHECK (id = 1),
  locale           TEXT    NOT NULL DEFAULT 'ar',        -- 'ar' | 'en'
  gender           TEXT,                                 -- 'm' | 'f'
  birth_date       TEXT,                                 -- ISO date
  puberty_age      REAL,                                 -- years
  include_witr     INTEGER NOT NULL DEFAULT 0,
  calc_method      TEXT    NOT NULL DEFAULT 'UmmAlQura', -- adhan-js method key
  lat REAL, lng REAL, city TEXT,
  minutes_per_day_of_qada INTEGER NOT NULL DEFAULT 12,
  onboarded_at     TEXT
);

-- estimate inputs, kept so the user can see or redo how the number was derived
CREATE TABLE estimate_period (
  id          INTEGER PRIMARY KEY,
  start_date  TEXT NOT NULL,
  end_date    TEXT NOT NULL,
  missed_ratio REAL NOT NULL,          -- 1.0 all, 0.75 most, 0.5 half, 0.25 some
  per_prayer_ratio_json TEXT           -- optional overrides {"fajr":1.0,...}
);
CREATE TABLE estimate_women (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  avg_cycle_days REAL NOT NULL DEFAULT 0,
  nifas_days_total INTEGER NOT NULL DEFAULT 0
);

-- the ledger
CREATE TABLE ledger (
  id          INTEGER PRIMARY KEY,
  prayer      TEXT NOT NULL CHECK (prayer IN ('fajr','dhuhr','asr','maghrib','isha','witr')),
  delta       INTEGER NOT NULL,         -- +N debt, -1 made up, +1 undo
  kind        TEXT NOT NULL CHECK (kind IN ('estimate','adjust','made_up','undo')),
  ref_id      INTEGER REFERENCES ledger(id), -- undo → the made_up entry it reverses
  source      TEXT,                     -- 'app' | 'notification'
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX ledger_prayer ON ledger(prayer);
CREATE INDEX ledger_created ON ledger(created_at);

CREATE TABLE plan (
  id          INTEGER PRIMARY KEY,
  pace_type   TEXT NOT NULL CHECK (pace_type IN ('with_each','days_per_day','minutes_per_day')),
  pace_value  REAL NOT NULL,
  started_at  TEXT NOT NULL,
  active      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE reminder (
  id          INTEGER PRIMARY KEY,
  type        TEXT NOT NULL CHECK (type IN ('qada_nudge','dhikr')),
  prayer      TEXT,                     -- for qada_nudge
  offset_min  INTEGER,                  -- for qada_nudge
  time_of_day TEXT,                     -- 'HH:MM', for dhikr
  dhikr_id    TEXT,                     -- key into bundled adhkar JSON
  enabled     INTEGER NOT NULL DEFAULT 1
);
```

## Derived values (computed, not stored)
- `remaining(prayer) = SUM(delta) WHERE prayer = ?`
- `made_up_total = -SUM(delta) WHERE kind IN ('made_up','undo')`
- `qada_days_done = made_up_total / prayers_per_day` (5, or 6 with Witr)
- `projected_finish = today + ceil(max(remaining) / days_per_day)`

## Estimate formula
```
for each period:
  days = end - start (inclusive)
  if female: days -= days * (avg_cycle_days / 30) + share of nifas_days in this period
  for each prayer p: debt[p] += ceil(days * ratio(p))
```
Rounded **up** (fiqh: overestimate when unsure).

## Backup format
JSON `{ version, exported_at, profile, estimate_period[], estimate_women, ledger[], plan[], reminder[] }`.
Import replaces all data inside one transaction, after a confirmation.

## Static content (bundled, not in the DB)
- `content/adhkar.json`: `{id, ar, en, source}`, scholar-reviewed.
- `content/hope.json`: motivational lines with references.
