import { CalculationMethod, Coordinates, PrayerTimes } from 'adhan';

import type { FardPrayer } from '@/domain/prayers';

export const CALC_METHODS = [
  'UmmAlQura',
  'Egyptian',
  'MuslimWorldLeague',
  'Dubai',
  'Kuwait',
  'Qatar',
  'Karachi',
  'NorthAmerica',
  'Turkey',
] as const;
export type CalcMethod = (typeof CALC_METHODS)[number];

export function isCalcMethod(value: string): value is CalcMethod {
  return (CALC_METHODS as readonly string[]).includes(value);
}

/** Default calculation method by ISO region code (from the device locale, no network). */
export function methodForRegion(region: string | null | undefined): CalcMethod {
  switch (region?.toUpperCase()) {
    case 'SA':
    case 'YE':
    case 'BH':
    case 'OM':
      return 'UmmAlQura';
    case 'EG':
    case 'SD':
    case 'LY':
    case 'SY':
    case 'LB':
    case 'IQ':
      return 'Egyptian';
    case 'AE':
      return 'Dubai';
    case 'KW':
      return 'Kuwait';
    case 'QA':
      return 'Qatar';
    case 'PK':
    case 'IN':
    case 'BD':
      return 'Karachi';
    case 'US':
    case 'CA':
      return 'NorthAmerica';
    case 'TR':
      return 'Turkey';
    default:
      return 'MuslimWorldLeague';
  }
}

export interface City {
  id: string;
  ar: string;
  en: string;
  lat: number;
  lng: number;
  method: CalcMethod;
}

/** Bundled city list so the app works without location permission or network. */
export const CITIES: City[] = [
  { id: 'riyadh', ar: 'الرياض', en: 'Riyadh', lat: 24.7136, lng: 46.6753, method: 'UmmAlQura' },
  { id: 'jeddah', ar: 'جدة', en: 'Jeddah', lat: 21.4858, lng: 39.1925, method: 'UmmAlQura' },
  { id: 'makkah', ar: 'مكة المكرمة', en: 'Makkah', lat: 21.3891, lng: 39.8579, method: 'UmmAlQura' },
  { id: 'madinah', ar: 'المدينة المنورة', en: 'Madinah', lat: 24.5247, lng: 39.5692, method: 'UmmAlQura' },
  { id: 'dammam', ar: 'الدمام', en: 'Dammam', lat: 26.4207, lng: 50.0888, method: 'UmmAlQura' },
  { id: 'abha', ar: 'أبها', en: 'Abha', lat: 18.2465, lng: 42.5117, method: 'UmmAlQura' },
  { id: 'tabuk', ar: 'تبوك', en: 'Tabuk', lat: 28.3835, lng: 36.5662, method: 'UmmAlQura' },
  { id: 'cairo', ar: 'القاهرة', en: 'Cairo', lat: 30.0444, lng: 31.2357, method: 'Egyptian' },
  { id: 'giza', ar: 'الجيزة', en: 'Giza', lat: 30.0131, lng: 31.2089, method: 'Egyptian' },
  { id: 'alexandria', ar: 'الإسكندرية', en: 'Alexandria', lat: 31.2001, lng: 29.9187, method: 'Egyptian' },
  { id: 'mansoura', ar: 'المنصورة', en: 'Mansoura', lat: 31.0409, lng: 31.3785, method: 'Egyptian' },
  { id: 'tanta', ar: 'طنطا', en: 'Tanta', lat: 30.7865, lng: 31.0004, method: 'Egyptian' },
  { id: 'asyut', ar: 'أسيوط', en: 'Asyut', lat: 27.1783, lng: 31.1859, method: 'Egyptian' },
  { id: 'aswan', ar: 'أسوان', en: 'Aswan', lat: 24.0889, lng: 32.8998, method: 'Egyptian' },
  { id: 'dubai', ar: 'دبي', en: 'Dubai', lat: 25.2048, lng: 55.2708, method: 'Dubai' },
  { id: 'abudhabi', ar: 'أبوظبي', en: 'Abu Dhabi', lat: 24.4539, lng: 54.3773, method: 'Dubai' },
  { id: 'kuwait', ar: 'الكويت', en: 'Kuwait City', lat: 29.3759, lng: 47.9774, method: 'Kuwait' },
  { id: 'doha', ar: 'الدوحة', en: 'Doha', lat: 25.2854, lng: 51.531, method: 'Qatar' },
  { id: 'amman', ar: 'عمّان', en: 'Amman', lat: 31.9454, lng: 35.9284, method: 'MuslimWorldLeague' },
  { id: 'london', ar: 'لندن', en: 'London', lat: 51.5074, lng: -0.1278, method: 'MuslimWorldLeague' },
];

export function prayerTimesFor(
  date: Date,
  lat: number,
  lng: number,
  method: string,
): Record<FardPrayer, Date> {
  const params = CalculationMethod[isCalcMethod(method) ? method : 'MuslimWorldLeague']();
  const times = new PrayerTimes(new Coordinates(lat, lng), date, params);
  return { fajr: times.fajr, dhuhr: times.dhuhr, asr: times.asr, maghrib: times.maghrib, isha: times.isha };
}

/** The next prayer from `now` (looks into tomorrow after Isha). */
export function nextPrayer(
  now: Date,
  lat: number,
  lng: number,
  method: string,
): { prayer: FardPrayer; time: Date } {
  const today = prayerTimesFor(now, lat, lng, method);
  for (const [prayer, time] of Object.entries(today) as [FardPrayer, Date][]) {
    if (time > now) return { prayer, time };
  }
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { prayer: 'fajr', time: prayerTimesFor(tomorrow, lat, lng, method).fajr };
}
