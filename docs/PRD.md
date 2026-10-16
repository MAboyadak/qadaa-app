# PRD: Qadaa app (working name)

**Status:** draft v0.1 · **Owner:** Mohamed · **Intent:** free sadaqah jariyah, no ads, no account, no tracking

## 1. Problem
Many Muslims who return to regular prayer carry years of missed prayers. The number feels
impossibly large. They don't know how to estimate it, they lose count, they burn out after
an ambitious start, and guilt pushes them to give up. Existing apps are mostly bare counters,
iPhone-only, English-first, and often Hanafi-only.

## 2. Target user
- **Primary:** an Arabic-speaking adult (KSA/Egypt) who prays daily now and wants to make up
  past prayers steadily.
- **Secondary:** English speakers (diaspora).
- **Platform:** Android first (Expo, so iOS can follow).

## 3. Goals (MVP)
1. **Estimate** the debt per prayer in under 3 minutes, without fiqh anxiety.
2. **Log** a make-up prayer in one tap, right after the daily prayer.
3. **Plan** a sustainable pace with a live projected finish date.
4. **Remind** gently, after each prayer time and with optional dhikr.
5. **Motivate** with visible progress and hope-based messaging.

## 4. Non-goals (MVP)
- No fatwas, and no deciding between scholarly views (see `fiqh-rules.md`).
- No accounts, cloud sync, social or community features.
- No missed-fasts (صيام) tracking. This is a strong v2 candidate.
- No Quran or full adhkar library, and no adhan audio.
- No analytics or third-party SDKs that collect data.

## 5. Features

### F1. Onboarding and estimate calculator
- Language (Arabic / English) → short intro card (the tawbah + qada framing, sources).
- Gender (needed only for the hayd/nifas exclusion).
- Date of birth (or age), plus age at puberty (default per `fiqh-rules.md` §3).
- **Periods of missed prayer:** a list of `[from, to, how much I missed: all / most / half / some]`.
  The simple path is one period, "from puberty until I prayed regularly".
- Per-prayer tweak, optional: "I mostly missed Fajr" → that prayer's ratio goes up.
- Women: average cycle days per month, plus total nifas days.
- Include Witr? (off by default)
- **Result screen:** count per prayer, rounded **up**, shown as "≈ N days of prayers".
  Every count can be edited before confirming.

### F2. Home (daily use)
- A card for each prayer: remaining count, with **+1 (made up)** and **undo**.
- Overall progress ring with % complete, days made up, and projected finish date.
- Today's target vs done, from the plan.
- A subtle, rotating line of hope (curated, with sources).

### F3. Planner
- Pace options:
  - "One qada with each prayer" → 1 day per day.
  - "N qada days per day" (N = 1, 2, 3…).
  - "I have X minutes per day" → converted using about 12 minutes per qada day (17 rakʿāt); this estimate is user-adjustable.
- Live projected finish date (Hijri + Gregorian).
- Changing the pace is never framed as failure.

### F4. Reminders
- Prayer times calculated on the device (`adhan-js`). Method defaults by country:
  Umm al-Qura (KSA) or Egyptian General Authority. Location from GPS or a manually picked city.
- "Qada nudge" at the prayer time + X minutes (default 15), per prayer, can be switched on or off.
- Dhikr reminders: user-chosen times, from a **curated list of authentic adhkar with references**.
  ⚠ the content must be reviewed.
- Quiet hours.

### F5. History and progress
- A calendar or heatmap of qada done per day, plus streak (gentle: a missed day doesn't "break" anything).
- Milestones, e.g. "you've made up 1 full month", "a quarter of the way there".

### F6. Settings and data
- Language, Witr on/off, calculation method, reminder settings.
- **Export / import a backup file** (JSON) so the count is never lost when changing phones.
- Re-run the estimate (with a warning: "your current progress is kept").
- About page, sources, sadaqah dedication, contact.

## 6. Non-functional
- **Privacy:** all data stays on the device (SQLite). The Play Store data-safety label should say "No data collected".
- **Offline:** 100%.
- **i18n:** Arabic (RTL) and English from day one. Arabic copy in clear Modern Standard Arabic.
- **Accessibility:** large tap targets, font scaling, good contrast; this works for older users too.
- **Reliability:** logging must never lose a tap. Use an append-only ledger (see `data-model.md`).

## 7. Success metrics (no analytics, so these are proxies)
- Play Store rating and reviews; the number of users exporting a backup (unknown, since nothing is tracked).
- Personal: you yourself use it daily for 30 days.

## 8. Release plan
1. **M0:** docs and design (this folder) → Figma screens.
2. **M1:** F1 + F2 + local storage → personal daily use on your phone.
3. **M2:** F3 + F4 + F6 export.
4. **M3:** F5, polish, store assets → Play closed testing (12 testers × 14 days; required for new personal developer accounts) → production.
5. **v2 ideas:** iOS, missed-fasts tracking, home-screen widget, cloud backup to Google Drive, Wear OS.

## 9. Open questions
- App name (Arabic + English). Ideas: «قضاء», «ذِمّة», «فوائت», «سدّ الدَّين».
- Scholar review of `fiqh-rules.md` ⚠ items and the dhikr content: who?
- Witr default for the Egyptian audience?
