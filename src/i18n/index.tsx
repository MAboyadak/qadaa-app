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
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const t = useCallback((key: StringKey, params?: TParams) => translate(locale, key, params), [locale]);
  const n = useCallback((value: number) => formatNumber(value, locale), [locale]);
  const value = useMemo(() => ({ locale, rtl: isRtlLocale(locale), t, n }), [locale, t, n]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
