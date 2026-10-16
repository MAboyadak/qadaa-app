# Design system

Source of truth: `src/theme/tokens.ts`. Icon source: `design/motif.svg`.

## Principles
1. **Calm, not alarming.** No red, no "failure" states. Being behind is shown neutrally.
2. **Hope first.** Every screen offers progress or a line of hope before the raw debt number.
3. **One-tap core loop.** Logging a prayer is a single large button (52 dp), with undo always close by.
4. **Arabic-first typography.** Generous line heights (about 1.6×) because Arabic script has tall ascenders and descenders.
5. **Respectful imagery.** Only a crescent motif and geometric dots; no figurative images.

## Color

| Token | Light | Dark | Use |
|---|---|---|---|
| background | `#F7F3EC` sand | `#0E1513` | screen background |
| surface | `#FFFFFF` | `#17211F` | cards |
| surfaceMuted | `#EFE9DE` | `#1F2B28` | chips, inputs, empty heatmap cells |
| border | `#E2DACB` | `#2A3835` | card outlines, dividers |
| text / textMuted | `#1C2422` / `#5E6A66` | `#EEF3F1` / `#A3B1AD` | |
| primary | `#0F5E55` emerald | `#4FBFA8` | actions, progress |
| primarySoft | `#DCEDE9` | `#173B35` | secondary buttons, highlighted cards |
| accent | `#B8901F` gold | `#E0BE5A` | milestones, celebration, hope card |
| heat1 / heat2 | `#B7DCD3` / `#6FB8A7` | `#1E4A42` / `#2F7F6F` | heatmap levels |

## Type: IBM Plex Sans Arabic
| Variant | Size / line height | Weight |
|---|---|---|
| display | 34 / 50 | Bold |
| title | 24 / 36 | Bold |
| heading | 18 / 28 | SemiBold |
| body / bodyStrong | 16 / 26 | Regular / SemiBold |
| label | 14 / 22 | Medium |
| caption | 13 / 20 | Regular |

## Spacing and shape
- Spacing scale: 4 · 8 · 12 · 16 · 24 · 32 · 48
- Radius: 8 (small) · 14 (prayer cards, inputs) · 20 (cards) · pill (buttons, chips)
- Minimum touch target: 48 dp

## Components (`src/components`)
- `Card` (surface / primary / accent / muted tones), `Button` (primary / secondary / ghost), `IconButton`
- `Segmented` chips, `Stepper`, `SwitchRow`, `ListRow`, `DateField`, `CountInput`
- `ProgressRing` (SVG), `PrayerCard`, `PacePicker`, `Heatmap`, `LocationPicker`, `Toast` (with undo / celebrate)

## Screens
Onboarding (language → intro → about → periods → [women] → result → pace → reminders) · Home · Plan · Progress · Settings · Sources (modal) · Adjust (modal)
