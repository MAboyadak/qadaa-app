import { getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { I18nManager, Platform } from 'react-native';

import { ar, type Strings } from './ar';
import { en } from './en';

export type Locale = 'ar' | 'en';

const dictionaries: Record<Locale, Strings> = { ar, en };

type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];

export type StringKey = Paths<Strings>;
export type TParams = Record<string, string | number>;

export function deviceLocale(): Locale {
  const code = getLocales()[0]?.languageCode;
  return code === 'en' ? 'en' : 'ar';
}

export function isRtlLocale(locale: Locale): boolean {
  return locale === 'ar';
}

const numberFormatters = new Map<Locale, Intl.NumberFormat>();

export function formatNumber(n: number, locale: Locale): string {
  let fmt = numberFormatters.get(locale);
  if (!fmt) {
    try {
      fmt = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { maximumFractionDigits: 1 });
    } catch {
      return String(n);
    }
    numberFormatters.set(locale, fmt);
  }
  return fmt.format(n);
}

const UNITS = {
  prayer: { one: 'صلاة واحدة', two: 'صلاتان', few: 'صلوات', acc: 'صلاة', gen: 'صلاة', en: ['prayer', 'prayers'] },
  day: { one: 'يوم واحد', two: 'يومان', few: 'أيام', acc: 'يومًا', gen: 'يوم', en: ['day', 'days'] },
  minute: { one: 'دقيقة واحدة', two: 'دقيقتان', few: 'دقائق', acc: 'دقيقة', gen: 'دقيقة', en: ['min', 'min'] },
} as const;
export type CountUnit = keyof typeof UNITS;

/**
 * "N units" with Arabic number agreement: 1 and 2 have their own forms, 3–10 take the
 * plural, 11–99 the accusative singular, and round hundreds/thousands the genitive singular.
 */
export function countOf(n: number, unit: CountUnit, locale: Locale): string {
  const u = UNITS[unit];
  const num = formatNumber(n, locale);
  if (locale === 'en') return `${num} ${u.en[n === 1 ? 0 : 1]}`;
  if (n === 1) return u.one;
  if (n === 2) return u.two;
  const mod100 = n % 100;
  if (mod100 >= 3 && mod100 <= 10) return `${num} ${u.few}`;
  return `${num} ${mod100 >= 11 ? u.acc : u.gen}`;
}

export function countPrayers(n: number, locale: Locale): string {
  return countOf(n, 'prayer', locale);
}

export function translate(locale: Locale, key: StringKey, params?: TParams): string {
  const value = key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], dictionaries[locale]);
  if (typeof value !== 'string') return key;
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (_, name: string) => {
    const p = params[name];
    if (p === undefined) return `{${name}}`;
    return typeof p === 'number' ? formatNumber(p, locale) : p;
  });
}

/**
 * Persists the native layout direction for the next cold start. The current session is
 * flipped by the root view's `direction` style instead: in the new architecture a JS
 * reload does not refresh `I18nManager.isRTL`, so reloading would loop forever.
 */
export function persistDirection(locale: Locale): void {
  const rtl = isRtlLocale(locale);
  if (Platform.OS === 'web' || I18nManager.isRTL === rtl) return;
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
}

interface I18nValue {
  locale: Locale;
  rtl: boolean;
  t: (key: StringKey, params?: TParams) => string;
  n: (value: number) => string;
  /** Localized "N prayers" with correct plural/dual forms. */
  np: (value: number) => string;
  /** Localized count of any unit, e.g. nc(5, 'minute'). */
  nc: (value: number, unit: CountUnit) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const t = useCallback((key: StringKey, params?: TParams) => translate(locale, key, params), [locale]);
  const n = useCallback((value: number) => formatNumber(value, locale), [locale]);
  const np = useCallback((value: number) => countPrayers(value, locale), [locale]);
  const nc = useCallback((value: number, unit: CountUnit) => countOf(value, unit, locale), [locale]);
  const value = useMemo(() => ({ locale, rtl: isRtlLocale(locale), t, n, np, nc }), [locale, t, n, np, nc]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
