# Qadaa app

A free (sadaqah) offline app for estimating, planning and tracking the make-up of missed prayers (قضاء الفوائت).
Read `docs/PRD.md`, `docs/fiqh-rules.md` and `docs/data-model.md` before working on a feature.

## Stack
- Expo (React Native) + TypeScript, Expo Router.
- `expo-sqlite` for all data (local only, no backend, no network calls).
- `adhan` (adhan-js) for prayer times; `expo-notifications` for local notifications.
- i18n: Arabic (default, RTL) + English. **No hard-coded user-facing strings**; everything goes through the i18n files.
- Android first; keep code iOS-compatible.

## Rules
- **Privacy:** no analytics, no tracking SDKs, no network requests. Anything that would change this needs explicit approval.
- **Fiqh:** never invent religious rulings or adhkar text. Rules come only from `docs/fiqh-rules.md`. Dhikr and hope content comes only from `src/content/*.json` with a source. If something isn't covered, ask.
- **Tone:** gentle and hopeful; never shaming, no red "failure" states.
- **Ledger:** prayer counts change only by appending to `ledger` (never UPDATE/DELETE rows). Undo = a compensating entry.
- Estimate and plan maths live in pure TS modules under `src/domain/` with Jest tests. Ledger aggregates are computed in SQL in `src/db/repo.ts` and tested against real SQLite.
- RTL: use logical styles (`start`/`end`, `marginStart`), never `left`/`right`.
- Use design tokens from `src/theme/` for all colors, spacing and type; no raw hex in components.

## Commands
- `npm test`: domain unit tests (Jest)
- `npm run typecheck` and `npm run lint`: run both before committing
- `npm start`: dev server; `npm run android` builds and installs a dev build (needs the Android SDK, see `docs/dev-setup.md`)

## Docs
- `docs/DECISIONS.md`: every product/tech decision with its reason; add a row when you make a new one
- `docs/PROGRESS.md`: milestone status and open blockers
- `docs/design.md`: design system (tokens in `src/theme/tokens.ts`)
