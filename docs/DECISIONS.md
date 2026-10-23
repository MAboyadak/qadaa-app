# Decisions log

Choices made during autonomous development. Each can be revisited; the "Why" is the reasoning at the time.

| # | Decision | Why |
|---|---|---|
| 1 | Expo SDK 58, Expo Router, TypeScript | The agreed stack; the latest SDK at project start. |
| 2 | JS tabs (`expo-router/tabs`) instead of NativeTabs | Full control over RTL, fonts and icons with vector icons; NativeTabs needs per-platform image/symbol assets. |
| 3 | **No i18n library**: a small typed `t()` (`src/i18n`) | Two languages, about 200 strings. Typed keys catch missing translations at compile time with zero dependencies. |
| 4 | Arabic is the default unless the device language is English | Primary audience is KSA/Egypt. |
| 5 | Arabic-Indic digits (٠١٢) in Arabic via `Intl.NumberFormat('ar-EG')` | Familiar to Egyptian and Saudi users; English uses Latin digits. |
| 6 | Changing language persists to SQLite, then forces RTL/LTR + reloads | React Native needs a reload to flip layout direction. |
| 7 | Font: **IBM Plex Sans Arabic** (Arabic + Latin in one family) | Highly legible, open license, consistent look in both languages. |
| 8 | Palette: emerald `#0F5E55` + sand `#F7F3EC` + gold accent, plus dark mode | Calm and respectful; no reds anywhere, per the "never shaming" tone rule. |
| 9 | Ledger stores a local `day` column (`YYYY-MM-DD`) | SQLite `datetime('now')` is UTC, which would bucket late-night prayers in KSA/Egypt into the wrong day. |
| 10 | Projected finish uses the **total** remaining ÷ daily target (not the max per prayer) | Praying extra of a heavier prayer (e.g. Fajr) still counts toward finishing; simpler mental model. |
| 11 | 1 qada day ≈ 12 minutes by default (user-adjustable 5–40) | 17 rakʿāt at a calm pace; shown so users can plan "by minutes". |
| 12 | Puberty age is entered in Gregorian years, default **14**, step 0.5 | 15 Hijri years ≈ 14.55 Gregorian; rounding down = more prayers = the cautious side (fiqh-rules §3). |
| 13 | Hayd is subtracted as `avgCycleDays / 30` of each period; nifas is spread across periods by length | Simple, transparent, and errs on the side of counting. |
| 14 | Witr is off by default; turning it on later computes Witr debt from the saved estimate inputs | Matches the majority view (sunnah), keeps the option for Hanafis. |
| 15 | Prayer times on the device with `adhan`; method defaults from the city or the device **region** (no reverse geocoding) | Reverse geocoding needs the network, and the app makes no network calls. |
| 16 | Bundled list of 20 cities for users who decline location | Works offline and without permissions. |
| 17 | Location permission: **coarse only**; fine and background are blocked in `app.json` | Prayer times don't need precise location; it also simplifies the Play data-safety form. |
| 18 | Nudges: 7 days of one-shot DATE notifications, re-scheduled whenever the app opens | Prayer times shift daily, so a repeating trigger can't express them; 35 alarms is far below Android limits. |
| 19 | Nudge default = adhan + 20 min | Enough time to pray the fard before the reminder. |
| 20 | Notification "Prayed it ✓" logs through a background task; deduped by notification id | The task and the foreground listener can both fire for the same tap. |
| 21 | No exact-alarm permission | Play restricts `USE_EXACT_ALARM`; a reminder a few minutes late is fine here. |
| 22 | Streak counts today OR yesterday as alive | "Today not done yet" must not look like a broken streak (tone rule). |
| 23 | Idle nudge after 3+ days offers to *lower* the pace | Research: burnout is a top blocker. |
| 24 | Backup = JSON of all tables via the share sheet; restore replaces everything in one transaction | Simple, inspectable, works with Drive/WhatsApp/Files without any cloud SDK. |
| 25 | Adhkar and hope lines limited to very well-known authentic texts, each with a reference and `reviewed: false` | User wanted dhikr reminders; final wording and references still need a scholar's check before release. |
| 26 | App name «قضاء» / "Qadaa", package `com.qadaa.prayers` | Working name. The package can't change after the first Play upload, so confirm it before then. |
| 27 | Icon: gold crescent completing its circle with 5 dots (the five prayers) | Reads as "completing what was missed". Generated from `design/motif.svg`. |
| 28 | No analytics or crash SDKs (not even Sentry) | Privacy promise: "No data collected". |
| 29 | Jest + ts-jest for pure domain tests only | Fast and simple; UI is verified on the emulator. |
| 30 | Language switch flips layout via the root view's `direction` style, not a reload | In the new architecture a JS reload doesn't refresh `I18nManager.isRTL`; reloading looped forever (found on the emulator). |
| 31 | Built-in tabular Hijri calendar fallback (±1 day vs Umm al-Qura) | Hermes' Intl has no `islamic-umalqura` calendar, so the Hijri date was missing. |
| 32 | `SCHEDULE_EXACT_ALARM` declared + opt-in toggle in Settings, plus a "send test reminder" button | Inexact alarms got a 1-hour delivery window on the emulator. Play allows this permission without a declaration (unlike `USE_EXACT_ALARM`). The test button lets users check reminders on OEM battery savers. |
| 33 | `countOf()` for Arabic number agreement (1, 2, 3–10, 11–99, round hundreds) | "٤ صلاة" / "٥ دقيقة" read as mistakes to Arabic speakers. |
| 34 | Below 0.1% progress, Home shows "made up N so far" instead of "0%" | 0% after real effort is discouraging (tone rule). |
| 35 | Launch video in Remotion (`video/`), 4:5, silent with bilingual captions | Code-driven, so it's easy to re-render when screens change; 4:5 suits the LinkedIn feed. |
| 36 | Store screenshots are framed 1080×1920 images with Arabic headlines | Raw 1080×2400 captures exceed Play's 2:1 aspect limit. |
| 37 | Ledger aggregates use SQL in `src/db/repo.ts`, tested against real SQLite; estimate and plan maths stay pure TypeScript | Keep one ledger implementation, tested where it runs, instead of testing unused pure functions. |
| 38 | Android Auto Backup off (`android.allowBackup: false`) | The app and privacy policy promise that all data stays on the device and that uninstalling deletes it; Auto Backup would copy the database to the user's Google Drive. Manual export/import covers moving to a new phone. |
