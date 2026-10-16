export const FARD_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export const ALL_PRAYERS = [...FARD_PRAYERS, 'witr'] as const;

export type FardPrayer = (typeof FARD_PRAYERS)[number];
export type Prayer = (typeof ALL_PRAYERS)[number];

export const RAKAAT: Record<Prayer, number> = {
  fajr: 2,
  dhuhr: 4,
  asr: 4,
  maghrib: 3,
  isha: 4,
  witr: 1,
};

export function activePrayers(includeWitr: boolean): Prayer[] {
  return includeWitr ? [...ALL_PRAYERS] : [...FARD_PRAYERS];
}

export function isPrayer(value: string): value is Prayer {
  return (ALL_PRAYERS as readonly string[]).includes(value);
}

export type PrayerCounts = Record<Prayer, number>;

export function emptyCounts(): PrayerCounts {
  return { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, witr: 0 };
}

export function sumCounts(counts: PrayerCounts, includeWitr: boolean): number {
  return activePrayers(includeWitr).reduce((acc, p) => acc + counts[p], 0);
}
