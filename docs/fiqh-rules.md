# Fiqh rules the app implements

> The app is a **tracking tool, not a fatwa**. Every rule below is a product default
> backed by a cited source, and the user can override counts. Anything marked
> **⚠ VERIFY** must be reviewed by a qualified scholar before public release.

## 1. Is qada required? (the disagreement)

| Position | Who | Source |
|---|---|---|
| Missed fard prayers are a debt that must be made up, however many | Majority (jumhur), four madhhabs; Egypt's Dar al-Ifta; Ali Gomaa | [Dar al-Ifta 17233](https://www.dar-alifta.org/ar/fatwa/details/17233/), [Masrawy / Ali Gomaa 2026](https://www.masrawy.com/ramadan/islamic/details/2026/2/28/2950036/) |
| Deliberate, long abandonment: sincere tawbah, no qada; increase nawafil | Ibn Taymiyyah, Ibn Hazm; in KSA, Ibn Baz (based on the view that the one who abandons prayer out of negligence has left Islam, so tawbah alone) | [binbaz.org.sa 10390](https://binbaz.org.sa/fatwas/10390/), [binbaz.org.sa 31538](https://binbaz.org.sa/fatwas/31538/), [IslamQA 293798](https://islamqa.info/ar/answers/293798) |
| Both sides agree: **qada alone does not remove the sin, tawbah does** | — | [IslamOnline](https://fiqh.islamonline.net/%D9%82%D8%B6%D8%A7%D8%A1-%D8%A7%D9%84%D9%81%D9%88%D8%A7%D8%A6%D8%AA-%D8%A8%D9%8A%D9%86-%D8%A7%D9%84%D8%B9%D9%81%D9%88-%D9%88%D8%A7%D9%84%D9%85%D8%A4%D8%A7%D8%AE%D8%B0%D8%A9-3/) |

**Product decision:** The app serves people who *chose* to make up prayers. It follows the
Ali Gomaa advice: **combine sincere tawbah with qada** to get out of the disagreement (الخروج من الخلاف).
Onboarding shows one neutral info card that explains both views and links the sources. The app never says "you must".

**Note:** KSA and Egypt do **not** take the same position on deliberate abandonment, so we use the
"tawbah + qada" framing that is acceptable under both.

## 2. What is counted

- The five fard prayers: Fajr, Dhuhr, Asr, Maghrib, Isha.
- **Witr is off by default.** Under Shafi'i, Maliki and Hanbali it is sunnah, and Hanafi considers it wajib. The setting "Include Witr" is optional.
- Sunnah and nafl prayers are **not** counted.
- Women: days of **hayd (menstruation) and nifas (postnatal bleeding) are excluded**, since there is no qada for them.
- ⚠ VERIFY: prayers missed while travelling are made up as shortened prayers (qasr) under some schools. This is out of scope for the MVP, which counts by prayer, not by rakʿah.

## 3. Estimating the start (puberty)

- Qada is owed from **puberty (bulugh)**: by its physical signs, or at **15 Hijri years** if there were no signs (majority view).
- If the user is unsure, **round toward more prayers** (start earlier), as the Hanafi fatwas advise for overestimation.
  ([Darul Iftaa Zambia](https://islamqa.org/hanafi/daruliftaazambia/134588/how-to-calculate-missed-salaah-qadha-umri/))
- ⚠ VERIFY: the default age offered in the UI when the user doesn't know (15 Hijri years, or ask for a signs-based age with a 12–15 hint).

## 4. Estimate, don't agonize

- Strongest belief (غلبة الظن) is enough; you don't need an exact count. ([Dar al-Ifta 17233](https://www.dar-alifta.org/ar/fatwa/details/17233/))
- Dates aren't needed. The intention "the first Dhuhr I missed" is enough, then continue in order.
  ([eFiqh](https://islamqa.org/hanafi/efiqh/22006/))
- → The app stores **counts per prayer**, not dates. After onboarding it discourages recalculating (to avoid waswasa), but always allows manual adjustment.

## 5. How to make them up (pace suggestions)

- Dar al-Ifta: pray **one qada with each current prayer, of the same kind** (Dhuhr with Dhuhr), and make up missed prayers instead of the optional nawafil during that period. Qada may be prayed before or after the current fard.
- Small but consistent beats big and sporadic: even 5 per day is fine if kept steadily. A person who repents and keeps a steady schedule is hoped to be forgiven for what remains if they die before finishing.
  ([SeekersGuidance](https://seekersguidance.org/answers/hanafi-fiqh/how-to-make-up-many-years-of-missed-prayers/))
- ⚠ VERIFY: whether qada is allowed at the disliked times (sunrise, zenith, after Asr). The majority view is that obligatory qada is allowed. The app should **not** block logging at any time, only avoid *suggesting* those windows.
- ⚠ VERIFY: tartib (making them up in order) is not required when there are many. The app doesn't enforce an order.

## 6. Tone rules (from research on user blockers)

- Never shaming. Frame the count as a debt being paid off, with hope, not a list of sins.
- Show progress as "days made up" and a projected finish date, not just a scary total.
- Lowering your pace is always allowed and never shown as a failure.
