import {
  buildProfileImageUrl,
  filterCountriesByQuery,
  formatExamDateDisplay,
  getPhoneMaxLength,
  parsePhoneWithCountry,
  toISODate,
} from './helpers';
import { COUNTRIES } from './constants';

describe('EditProfile helpers', () => {
  describe('getPhoneMaxLength', () => {
    it.each([
      ['IN', 10],
      ['US', 10],
      ['CA', 10],
      ['GB', 10],
      ['AU', 9],
      ['AE', 9],
      ['SG', 8],
      ['XX', 15],
      ['', 15],
    ])('returns %s -> %i', (code, expected) => {
      expect(getPhoneMaxLength(code)).toBe(expected);
    });

    it('uppercases input', () => {
      expect(getPhoneMaxLength('in')).toBe(10);
    });
  });

  describe('formatExamDateDisplay', () => {
    it('returns placeholder for null', () => {
      expect(formatExamDateDisplay(null)).toBe('Set your exam date');
    });

    it('formats a date in en-US', () => {
      const out = formatExamDateDisplay(new Date('2026-05-24T00:00:00Z'));
      expect(out).toMatch(/2026/);
      expect(out).toMatch(/May/);
    });
  });

  describe('toISODate', () => {
    it('produces YYYY-MM-DD with zero-padded month/day', () => {
      const d = new Date(2026, 0, 5); // 5 Jan 2026 local time
      expect(toISODate(d)).toBe('2026-01-05');
    });
  });

  describe('parsePhoneWithCountry', () => {
    it('returns empty defaults for null/undefined input', () => {
      expect(parsePhoneWithCountry(undefined)).toEqual({
        country: null,
        localPhone: '',
      });
      expect(parsePhoneWithCountry('')).toEqual({
        country: null,
        localPhone: '',
      });
    });

    it('strips non-digits and matches longest country code first', () => {
      const parsed = parsePhoneWithCountry('+91 98765 43210');
      expect(parsed.country?.countryCode).toBe('IN');
      expect(parsed.localPhone).toBe('9876543210');
    });

    it('falls back to clean digits when no country code matches', () => {
      const parsed = parsePhoneWithCountry('00000');
      expect(parsed.country).toBeNull();
      expect(parsed.localPhone).toBe('00000');
    });
  });

  describe('filterCountriesByQuery', () => {
    it('returns full list when query is empty', () => {
      expect(filterCountriesByQuery(COUNTRIES, '')).toHaveLength(
        COUNTRIES.length,
      );
      expect(filterCountriesByQuery(COUNTRIES, '   ')).toHaveLength(
        COUNTRIES.length,
      );
    });

    it('matches by country name (case-insensitive)', () => {
      const out = filterCountriesByQuery(COUNTRIES, 'india');
      expect(out.some(c => c.countryCode === 'IN')).toBe(true);
    });

    it('matches by calling code', () => {
      const out = filterCountriesByQuery(COUNTRIES, '91');
      expect(out.some(c => c.countryCode === 'IN')).toBe(true);
    });
  });

  describe('buildProfileImageUrl', () => {
    const fallback = 'https://example.com/fallback.jpg';

    it('returns fallback for empty/sentinel paths', () => {
      expect(buildProfileImageUrl(undefined, 'https://b/', fallback)).toBe(
        fallback,
      );
      expect(buildProfileImageUrl('null', 'https://b/', fallback)).toBe(
        fallback,
      );
      expect(buildProfileImageUrl('undefined', 'https://b/', fallback)).toBe(
        fallback,
      );
    });

    it('passes through absolute URLs', () => {
      expect(
        buildProfileImageUrl('https://x.com/a.jpg', 'https://b/', fallback),
      ).toBe('https://x.com/a.jpg');
    });

    it('joins relative paths with the base URL exactly once', () => {
      expect(
        buildProfileImageUrl('avatar.png', 'https://b.com', fallback),
      ).toBe('https://b.com/avatar.png');
      expect(
        buildProfileImageUrl('/avatar.png', 'https://b.com/', fallback),
      ).toBe('https://b.com/avatar.png');
      expect(
        buildProfileImageUrl('avatar.png', 'https://b.com/', fallback),
      ).toBe('https://b.com/avatar.png');
    });
  });
});
