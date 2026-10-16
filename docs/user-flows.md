# User flows

## Screen map
```
Splash
 └─ Onboarding (first run only)
     1 Language → 2 Intro (tawbah + qada card) → 3 About you (gender, DOB, puberty age)
     → 4 Missed periods → 5 [women] cycle/nifas → 6 Witr toggle → 7 Result (editable counts)
     → 8 Pick pace → 9 Location + notifications permission → Home
Tabs
 ├─ Home        prayer cards (+1/undo), progress ring, today's target
 ├─ Plan        pace picker, projected finish date
 ├─ History     heatmap, milestones
 └─ Settings    language, witr, prayer method, reminders, backup, re-estimate, about
```

## Flow A: first run (target under 3 minutes)
1. Pick a language → the layout switches to RTL or LTR immediately.
2. Intro card: "Prayers you missed are a debt you can repay. Sincere tawbah plus steady qada." → [Learn more] opens the sources sheet.
3. Enter gender, date of birth, and age at puberty (with "Not sure?" help).
4. Periods: default row "from puberty → [date I started praying regularly]", amount = "all". [+ Add period].
5. (Women) average cycle days, total nifas days.
6. Include Witr? (off; info tooltip).
7. Result: "≈ 3,650 days of prayers" plus the count per prayer, each editable. [Confirm]
8. Pace: three cards, each showing its finish date. The default is "one with each prayer".
9. Ask for location (or pick a city) and notification permission, explaining why. → Home.

## Flow B: daily logging (the core loop)
1. Notification 15 minutes after Dhuhr: "Have you prayed your Dhuhr qada?" with actions [Done ✓] [Later].
2. [Done] logs +1 Dhuhr directly from the notification, no need to open the app.
3. Or open the app → Home → Dhuhr card → +1. A snackbar offers "Undo" for 5 seconds; there's also an undo button on the card.
4. Hitting a milestone → a short, gentle celebration and a line of hope.

## Flow C: fell behind
- Home shows the plan target without red or failure states, e.g. "Today: 2 of 5".
- After 3 or more quiet days, show one gentle nudge: "Even one prayer counts. Want to lower the pace?" → Plan.

## Flow D: new phone
- Settings → Backup → Export JSON (share sheet → Drive, WhatsApp, etc.).
- On the new phone: onboarding step 1 offers "Restore from backup".
