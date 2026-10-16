import { estimateMissed } from './estimate';

const d = (s: string) => new Date(`${s}T12:00:00`);

describe('estimateMissed', () => {
  it('counts one prayer of each per day for a fully missed period', () => {
    const counts = estimateMissed({
      gender: 'm',
      includeWitr: false,
      periods: [{ start: d('2020-01-01'), end: d('2020-01-10'), level: 'all' }],
    });
    expect(counts).toEqual({ fajr: 10, dhuhr: 10, asr: 10, maghrib: 10, isha: 10, witr: 0 });
  });

  it('includes witr only when enabled, following isha', () => {
    const counts = estimateMissed({
      gender: 'm',
      includeWitr: true,
      periods: [
        { start: d('2020-01-01'), end: d('2020-01-10'), level: 'all', perPrayer: { isha: 'half' } },
      ],
    });
    expect(counts.isha).toBe(5);
    expect(counts.witr).toBe(5);
  });

  it('applies levels and per-prayer overrides, rounding up', () => {
    const counts = estimateMissed({
      gender: 'm',
      includeWitr: false,
      periods: [
        { start: d('2020-01-01'), end: d('2020-01-03'), level: 'half', perPrayer: { fajr: 'all' } },
      ],
    });
    expect(counts.fajr).toBe(3);
    expect(counts.dhuhr).toBe(2); // 1.5 → 2
  });

  it('sums multiple periods', () => {
    const counts = estimateMissed({
      gender: 'm',
      includeWitr: false,
      periods: [
        { start: d('2020-01-01'), end: d('2020-01-10'), level: 'all' },
        { start: d('2021-01-01'), end: d('2021-01-10'), level: 'some' },
      ],
    });
    expect(counts.asr).toBe(13); // 10 + 2.5 → ceil(12.5)
  });

  it('excludes hayd and nifas days for women', () => {
    const counts = estimateMissed({
      gender: 'f',
      includeWitr: false,
      avgCycleDays: 6,
      nifasDaysTotal: 40,
      periods: [{ start: d('2020-01-01'), end: d('2020-12-31'), level: 'all' }],
    });
    // 366 days * (1 - 6/30) - 40 = 252.8 → 253
    expect(counts.dhuhr).toBe(253);
  });

  it('ignores cycle inputs for men', () => {
    const counts = estimateMissed({
      gender: 'm',
      includeWitr: false,
      avgCycleDays: 6,
      nifasDaysTotal: 40,
      periods: [{ start: d('2020-01-01'), end: d('2020-01-30'), level: 'all' }],
    });
    expect(counts.fajr).toBe(30);
  });

  it('treats inverted or empty ranges as zero', () => {
    const counts = estimateMissed({
      gender: 'm',
      includeWitr: false,
      periods: [{ start: d('2020-02-01'), end: d('2020-01-01'), level: 'all' }],
    });
    expect(counts.fajr).toBe(0);
  });
});
