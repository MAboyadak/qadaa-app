# Progress

## Milestones

| Milestone | Status |
|---|---|
| M0: research, PRD, fiqh rules, flows, data model, design system, icon | ✅ done |
| M1: estimate (onboarding) + home logging + local DB | ✅ code done |
| M2: planner, reminders (prayer-time nudges + dhikr), backup export/import | ✅ code done |
| M3: progress screen, milestones, store listing, privacy policy, feature graphic | ✅ code/docs done |
| Emulator verification + screenshots | ⏳ in progress (slow Android SDK download) |
| Launch video | ⏳ after screenshots |

## Quality gates
- `npm test`: 20 domain tests pass
- `npm run typecheck`: clean
- `npm run lint`: clean
- `npx expo export --platform android`: bundles successfully
- `npx expo-doctor`: all checks pass

## Needs you (blockers)
1. **Google Play developer account** ($25) and the 12-tester closed test (14 days).
2. **Scholar review** of `docs/fiqh-rules.md` ⚠ items, `src/content/adhkar.json` and `src/content/hope.json` (all marked `reviewed: false`).
3. **Contact email** for the privacy policy (`docs/store/privacy-policy.md`) and a public URL to host it.
4. **Confirm the app name and package id** (`com.qadaa.prayers`). The package can't change after the first upload.
5. **Git identity:** commits use your global git email (work address). For a personal project you may want `git config user.email <personal>` in this repo.
6. **Expo account** (free), only if you want cloud builds via EAS instead of local Gradle builds.
