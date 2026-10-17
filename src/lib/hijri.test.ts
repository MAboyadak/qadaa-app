import { toHijri } from './hijri';

const d = (s: string) => new Date(`${s}T12:00:00`);

describe('toHijri (tabular)', () => {
  it('matches known Umm al-Qura dates within a day', () => {
    // 1 Ramadan 1447 = 18 Feb 2026 (Umm al-Qura)
    const r = toHijri(d('2026-02-18'));
    expect([r.year, r.month]).toEqual([1447, 9]);
    expect(r.day).toBeLessThanOrEqual(2);

    // 1 Muharram 1448 ≈ 16 June 2026
    const m = toHijri(d('2026-06-17'));
    expect(m.year).toBe(1448);
    expect(m.month).toBe(1);
  });

  it('always yields a valid day and month', () => {
    for (let i = 0; i < 800; i++) {
      const h = toHijri(new Date(2025, 0, 1 + i, 12));
      expect(h.month).toBeGreaterThanOrEqual(1);
      expect(h.month).toBeLessThanOrEqual(12);
      expect(h.day).toBeGreaterThanOrEqual(1);
      expect(h.day).toBeLessThanOrEqual(30);
    }
  });
});
