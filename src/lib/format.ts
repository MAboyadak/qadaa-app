import { formatNumber, type Locale } from '@/i18n';

import { hijriMonthName, toHijri } from './hijri';

const cache = new Map<string, Intl.DateTimeFormat | null>();

function formatter(key: string, locales: string, options: Intl.DateTimeFormatOptions) {
  if (!cache.has(key)) {
    try {
      const fmt = new Intl.DateTimeFormat(locales, options);
      // Some Intl implementations silently ignore the calendar; detect that.
      if (options.calendar && fmt.resolvedOptions().calendar !== options.calendar) cache.set(key, null);
      else cache.set(key, fmt);
    } catch {
      cache.set(key, null);
    }
  }
  return cache.get(key) ?? null;
}

const lang = (locale: Locale) => (locale === 'ar' ? 'ar-EG' : 'en-GB');

export function formatDate(date: Date, locale: Locale): string {
  const fmt = formatter(`g-${locale}`, lang(locale), { day: 'numeric', month: 'long', year: 'numeric' });
  return fmt ? fmt.format(date) : date.toDateString();
}

export function formatShortDate(date: Date, locale: Locale): string {
  const fmt = formatter(`gs-${locale}`, lang(locale), { day: 'numeric', month: 'short', year: 'numeric' });
  return fmt ? fmt.format(date) : date.toDateString();
}

/** Hijri date: Umm al-Qura via Intl when available, otherwise the tabular calendar. */
export function formatHijri(date: Date, locale: Locale): string {
  const fmt = formatter(`h-${locale}`, `${lang(locale)}-u-ca-islamic-umalqura`, {
    calendar: 'islamic-umalqura',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  if (fmt) return fmt.format(date);
  const h = toHijri(date);
  const n = (v: number) => formatNumber(v, locale).replace(/[,٬]/g, '');
  return `${n(h.day)} ${hijriMonthName(h.month, locale)} ${n(h.year)}${locale === 'ar' ? 'هـ' : ' AH'}`;
}

export function formatTime(date: Date, locale: Locale): string {
  const fmt = formatter(`t-${locale}`, lang(locale), { hour: 'numeric', minute: '2-digit' });
  if (fmt) return fmt.format(date);
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}
