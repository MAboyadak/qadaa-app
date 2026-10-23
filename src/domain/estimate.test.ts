import { estimateMissed, newEstimatePeriod, overlappingPeriods, periodDateBounds, type EstimatePeriod } from './estimate';

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


describe('overlappingPeriods', () => {
  const period = (start: string, end: string): EstimatePeriod => ({ start: d(start), end: d(end), level: 'all' });
  it('allows empty lists and separate ranges in any order', () => {
    expect(overlappingPeriods([])).toBe(false);
    expect(overlappingPeriods([period('2021-01-01', '2021-01-10'), period('2020-01-01', '2020-12-31')])).toBe(false);
  });
  it('detects a shared calendar day regardless of time', () => {
    const a = period('2020-01-01', '2020-01-10');
    a.end.setHours(0);
    const b = period('2020-01-10', '2020-01-20');
    b.start.setHours(23);
    expect(overlappingPeriods([a, b])).toBe(true);
  });
  it('detects contained, identical and partially overlapping ranges', () => {
    const a = period('2020-01-01', '2020-01-10');
    for (const b of [a, period('2020-01-03', '2020-01-04'), period('2020-01-05', '2020-01-20')]) {
      expect(overlappingPeriods([b, a])).toBe(true);
    }
  });
  it('ignores reversed periods even inside another range', () => {
    expect(overlappingPeriods([period('2020-01-01', '2020-01-20'), period('2020-01-10', '2020-01-05')])).toBe(false);
  });
});


describe('onboarding period defaults and picker bounds', () => {
  const puberty = d('2010-01-01');
  const period = (start: string, end: string): EstimatePeriod => ({ start: d(start), end: d(end), level: 'all' });

  it('defaults to the year before the earliest period when there is room', () => {
    const periods = [period('2015-01-01', '2015-12-31'), period('2013-01-01', '2013-12-31')];
    const next = newEstimatePeriod(periods, puberty);
    expect(next.start).toEqual(d('2012-01-02'));
    expect(next.end).toEqual(d('2012-12-31'));
    expect(overlappingPeriods([...periods, next])).toBe(false);
  });

  it('shortens the earlier year at puberty', () => {
    const periods = [period('2010-06-01', '2011-01-01')];
    const next = newEstimatePeriod(periods, puberty);
    expect(next.start).toEqual(puberty);
    expect(next.end).toEqual(d('2010-05-31'));
    expect(overlappingPeriods([...periods, next])).toBe(false);
  });

  it('defaults both dates to puberty when there is no earlier room', () => {
    const periods = [period('2010-01-01', '2011-01-01')];
    const next = newEstimatePeriod(periods, puberty);
    expect(next.start).toEqual(puberty);
    expect(next.end).toEqual(puberty);
    // Estimates count inclusive days, so the existing overlap guidance blocks continuation.
    expect(overlappingPeriods([...periods, next])).toBe(true);
  });

  it('never defaults before puberty even with old pre-birth inputs or no periods', () => {
    for (const periods of [[], [period('1980-01-01', '1980-12-31')]]) {
      const next = newEstimatePeriod(periods, puberty);
      expect(next.start).toEqual(puberty);
      expect(next.end).toEqual(puberty);
    }
  });

  it.each([
    ['2000-01-01', '2001-01-01'], // old inputs before puberty
    ['2011-01-01', '2009-01-01'], // reversed input
    ['2030-01-01', '2031-01-01'], // minimum beyond today
    ['2010-01-01', '2010-01-01'], // no earlier room
  ])('keeps both picker bounds ordered for %s to %s', (start, end) => {
    const bounds = periodDateBounds(period(start, end), puberty, d('2026-01-01'));
    for (const field of [bounds.start, bounds.end]) {
      expect(field.minimumDate.getTime()).toBeGreaterThanOrEqual(puberty.getTime());
      expect(field.maximumDate.getTime()).toBeGreaterThanOrEqual(field.minimumDate.getTime());
    }
  });

  it('keeps bounds ordered when puberty itself is in the future', () => {
    const futurePuberty = d('2035-01-01');
    const bounds = periodDateBounds(period('2010-01-01', '2020-01-01'), futurePuberty, d('2026-01-01'));
    expect(bounds.start).toEqual({ minimumDate: futurePuberty, maximumDate: futurePuberty });
    expect(bounds.end).toEqual({ minimumDate: futurePuberty, maximumDate: futurePuberty });
  });
});
