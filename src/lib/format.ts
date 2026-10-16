import type { Locale } from '@/i18n';

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

/** Hijri (Umm al-Qura) date, or null when the runtime lacks the calendar. */
export function formatHijri(date: Date, locale: Locale): string | null {
  const fmt = formatter(`h-${locale}`, `${lang(locale)}-u-ca-islamic-umalqura`, {
    calendar: 'islamic-umalqura',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return fmt ? fmt.format(date) : null;
}

export function formatTime(date: Date, locale: Locale): string {
  const fmt = formatter(`t-${locale}`, lang(locale), { hour: 'numeric', minute: '2-digit' });
  if (fmt) return fmt.format(date);
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}
