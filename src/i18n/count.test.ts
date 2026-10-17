import { countOf } from './index';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'ar' }] }));
jest.mock('react-native', () => ({ I18nManager: {}, Platform: { OS: 'android' } }));

describe('countOf (Arabic agreement)', () => {
  const ar = (n: number) => countOf(n, 'day', 'ar').replace(/[٠-٩,٬]/g, '').trim();
  it('uses the right form for each range', () => {
    expect(countOf(1, 'prayer', 'ar')).toBe('صلاة واحدة');
    expect(countOf(2, 'minute', 'ar')).toBe('دقيقتان');
    expect(ar(5)).toBe('أيام');
    expect(ar(10)).toBe('أيام');
    expect(ar(11)).toBe('يومًا');
    expect(ar(99)).toBe('يومًا');
    expect(ar(100)).toBe('يوم');
    expect(ar(4384)).toBe('يومًا');
    expect(ar(103)).toBe('أيام');
  });
  it('pluralizes English', () => {
    expect(countOf(1, 'prayer', 'en')).toBe('1 prayer');
    expect(countOf(5, 'day', 'en')).toBe('5 days');
  });
});
