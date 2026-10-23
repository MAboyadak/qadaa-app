# Progress

## Milestones

| Milestone | Status |
|---|---|
| M0: research, PRD, fiqh rules, flows, data model, design system, icon | ✅ done |
| M1: estimate (onboarding) + home logging + local DB | ✅ code done |
| M2: planner, reminders (prayer-time nudges + dhikr), backup export/import | ✅ code done |
| M3: progress screen, milestones, store listing, privacy policy, feature graphic | ✅ code/docs done |
| Emulator verification (Arabic + English, light + dark, notifications) | ✅ done, 8 issues found and fixed |
| Store screenshots (5, framed) + feature graphic | ✅ `docs/store/` |
| Launch video | ✅ `video/out/qadaa-launch.mp4` (render with `npm run render`) |
| Release APK for sideloading | ✅ `android/app/build/outputs/apk/release/app-release.apk` (debug-signed) |

## Quality gates
- `npm test`: 24 tests pass
- `npm run typecheck`: clean
- `npm run lint`: clean
- `npx expo export --platform android`: bundles successfully
- `npx expo-doctor`: only warns that 14 Expo packages have newer SDK 58 patch versions (`npx expo install --fix`, then retest)
- GitHub Actions (`.github/workflows/ci.yml`) runs all of the above on pull requests, pushes to `main`, `v*` tags and manual runs; APK builds run on `main`, tags and manual runs

## Needs you (blockers)
1. **Google Play developer account** ($25) and the 12-tester closed test (14 days).
2. **Scholar review** of `docs/fiqh-rules.md` ⚠ items, `src/content/adhkar.json` and `src/content/hope.json` (all marked `reviewed: false`).
3. **Contact email** for the privacy policy (`docs/store/privacy-policy.md`) and a public URL to host it.
4. **Confirm the app name and package id** (`com.qadaa.prayers`). The package can't change after the first upload.
5. ~~Git identity~~: done, this repo commits with your personal email.
6. **Expo account** (free), only if you want cloud builds via EAS instead of local Gradle builds.

## Verified on the emulator (Pixel 7, Android 16 / API 36)
- Onboarding end-to-end in Arabic (RTL); live language switch both ways
- Estimate maths (16 years × 75% → 4,384 per prayer), pace and finish dates
- Log, undo, milestone celebration, today's target dots
- Manual adjust (append-only ledger), re-estimate flow, data survives reinstall
- Notification with action buttons; "Prayed it ✓" logs from the background exactly once
- Plan, Progress (heatmap, milestones), Settings; dark mode

## Not yet verified
- Export/import backup on a real device (share sheet / file picker)
- GPS location (the emulator used a city from the list)
- Reminders on Samsung/Xiaomi battery savers (use Settings → "Send a test reminder")
- Release-signed AAB for Play (needs your upload key, or let EAS manage signing)
