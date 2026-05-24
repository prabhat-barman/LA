import {
  buildVideoProfileImageUrl,
  inferCategory,
  isPaywallMessage,
  normalizeDuration,
  parseVideosResponse,
  resolveAssetUrl,
} from './helpers';

jest.mock('../../../config/Config', () => ({
  mediaUrl: 'https://media.example.com',
}));

describe('Videos helpers', () => {
  describe('resolveAssetUrl', () => {
    it('returns undefined for empty input', () => {
      expect(resolveAssetUrl(undefined)).toBeUndefined();
      expect(resolveAssetUrl(null)).toBeUndefined();
      expect(resolveAssetUrl('')).toBeUndefined();
    });

    it('passes through absolute URLs', () => {
      expect(resolveAssetUrl('https://x.com/a.jpg')).toBe(
        'https://x.com/a.jpg',
      );
      expect(resolveAssetUrl('http://x.com/a.jpg')).toBe(
        'http://x.com/a.jpg',
      );
    });

    it('joins relative paths with mediaUrl', () => {
      expect(resolveAssetUrl('foo.jpg')).toBe(
        'https://media.example.com/foo.jpg',
      );
      expect(resolveAssetUrl('/foo.jpg')).toBe(
        'https://media.example.com/foo.jpg',
      );
    });
  });

  describe('inferCategory', () => {
    it('maps numeric stgy_video_cat_id to skill names', () => {
      expect(inferCategory({ stgy_video_cat_id: 2 })).toBe('Speaking');
      expect(inferCategory({ stgy_video_cat_id: '5' })).toBe('Listening');
    });

    it('falls back to string `category`', () => {
      expect(inferCategory({ category: 'reading' })).toBe('Reading');
    });

    it('returns undefined for unknown shapes', () => {
      expect(inferCategory({})).toBeUndefined();
      expect(inferCategory({ category: 'mystery' })).toBeUndefined();
    });
  });

  describe('normalizeDuration', () => {
    it('handles numbers', () => {
      expect(normalizeDuration(5)).toBe('5 min');
    });

    it('handles numeric strings', () => {
      expect(normalizeDuration('7')).toBe('7 min');
    });

    it('passes through non-numeric strings', () => {
      expect(normalizeDuration('5 min')).toBe('5 min');
    });

    it('returns undefined for null / empty', () => {
      expect(normalizeDuration(null)).toBeUndefined();
      expect(normalizeDuration('')).toBeUndefined();
    });
  });

  describe('isPaywallMessage', () => {
    it('matches keywords', () => {
      expect(isPaywallMessage('Please subscribe to access')).toBe(true);
      expect(isPaywallMessage('Upgrade your plan')).toBe(true);
      expect(isPaywallMessage('PREMIUM only')).toBe(true);
    });

    it('does not match generic success messages', () => {
      expect(isPaywallMessage('Videos fetched')).toBe(false);
    });
  });

  describe('parseVideosResponse', () => {
    it('parses primary verified shape', () => {
      const data = {
        message: 'Videos fetched',
        video: [
          {
            id: 1,
            stgy_vid: [
              { id: 100, title: 'Intro', video: 'https://v.com/intro.mp4' },
            ],
          },
          {
            id: 2,
            stgy_vid: [
              { id: 200, title: 'S1', video: 'https://v.com/s1.mp4' },
            ],
          },
        ],
      };
      const out = parseVideosResponse(data);
      expect(out.message).toBeUndefined();
      expect(out.items).toHaveLength(2);
      expect(out.items[0].isIntro).toBe(true);
      expect(out.items[1].category).toBe('Speaking');
    });

    it('forwards paywall messages', () => {
      const data = {
        message: 'Please subscribe',
        video: [],
      };
      expect(parseVideosResponse(data).message).toBe('Please subscribe');
    });

    it('returns empty list for malformed shape', () => {
      expect(parseVideosResponse(null).items).toEqual([]);
      expect(parseVideosResponse(42).items).toEqual([]);
    });
  });

  describe('buildVideoProfileImageUrl', () => {
    const fallback = 'https://x.com/fallback.jpg';

    it('returns fallback for missing path', () => {
      expect(
        buildVideoProfileImageUrl(null, 'https://b.com', fallback),
      ).toBe(fallback);
      expect(
        buildVideoProfileImageUrl({}, 'https://b.com', fallback),
      ).toBe(fallback);
    });

    it('uses dashboard.image when present', () => {
      expect(
        buildVideoProfileImageUrl(
          { image: 'avatar.png' },
          'https://b.com',
          fallback,
        ),
      ).toBe('https://b.com/avatar.png');
    });

    it('falls back to user.image', () => {
      expect(
        buildVideoProfileImageUrl(
          { user: { image: '/avatar.png' } },
          'https://b.com/',
          fallback,
        ),
      ).toBe('https://b.com/avatar.png');
    });

    it('passes absolute URLs through', () => {
      expect(
        buildVideoProfileImageUrl(
          { image: 'https://other.com/me.jpg' },
          'https://b.com',
          fallback,
        ),
      ).toBe('https://other.com/me.jpg');
    });
  });
});
