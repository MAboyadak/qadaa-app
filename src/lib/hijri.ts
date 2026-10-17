/**
 * Tabular (arithmetic) Islamic calendar, used when the JS engine's Intl lacks
 * `islamic-umalqura` (Hermes on Android). May differ from Umm al-Qura by ±1 day.
 */
export interface HijriDate {
  year: number;
  month: number; // 1-12
  day: number;
}

const MONTHS_AR = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];
const MONTHS_EN = [
  'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Akhir', 'Jumada al-Ula', 'Jumada al-Akhira',
  'Rajab', 'Shaban', 'Ramadan', 'Shawwal', 'Dhu al-Qadah', 'Dhu al-Hijjah',
];

/** Julian Day Number for a Gregorian calendar date. */
function julianDay(date: Date): number {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

/** JDN of the first day of a Hijri month (civil tabular calendar, epoch JDN 1948440). */
function monthStart(year: number, month: number): number {
  return 1948439 + 1 + Math.ceil(29.5 * (month - 1)) + (year - 1) * 354 + Math.floor((3 + 11 * year) / 30);
}

export function toHijri(date: Date): HijriDate {
  const jd = julianDay(date);
  let year = Math.floor((30 * (jd - 1948440) + 10646) / 10631);
  while (jd < monthStart(year, 1)) year--;
  while (jd >= monthStart(year + 1, 1)) year++;
  let month = 12;
  while (month > 1 && jd < monthStart(year, month)) month--;
  return { year, month, day: jd - monthStart(year, month) + 1 };
}

export function hijriMonthName(month: number, locale: 'ar' | 'en'): string {
  return (locale === 'ar' ? MONTHS_AR : MONTHS_EN)[month - 1];
}
