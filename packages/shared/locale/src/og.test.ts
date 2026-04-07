/**
 * Unit tests for the Open Graph locale conversion utility.
 *
 * Tests `toOgLocale` which dynamically converts BCP 47 language codes
 * to `xx_YY` Open Graph locale format using `Intl.Locale.maximize()`.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Str } from '@/schemas/common';

import { toOgLocale } from './og';

describe('toOgLocale', () => {
  it.each([
    ['en', 'en_US'],
    ['ja', 'ja_JP'],
    ['zh', 'zh_CN'],
    ['ko', 'ko_KR'],
    ['fr', 'fr_FR'],
    ['de', 'de_DE'],
    ['es', 'es_ES'],
  ] as const)('converts %s → %s', (input: Str, expected: Str) => {
    const result = toOgLocale(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(expected);
    }
  });

  it('handles locales not in the original hardcoded list', () => {
    const result = toOgLocale('pt');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('pt_BR');
      expect(result.data).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
    }
  });

  it('handles Russian locale dynamically', () => {
    const result = toOgLocale('ru');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ru_RU');
    }
  });

  it('handles Arabic locale dynamically', () => {
    const result = toOgLocale('ar');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ar_EG');
    }
  });

  it('output always matches xx_YY format', () => {
    const locales: Str[] = ['en', 'ja', 'zh', 'ko', 'fr', 'de', 'es', 'pt', 'ru', 'ar'];
    for (const code of locales) {
      const result = toOgLocale(code);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data, `toOgLocale('${code}') should match xx_YY`).toMatch(
          /^[a-z]{2}_[A-Z]{2}$/,
        );
      }
    }
  });

  it('returns LOCALE.INVALID_LOCALE for empty string', () => {
    const result = toOgLocale('');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('LOCALE.INVALID_LOCALE');
    }
  });

  it('returns LOCALE.INVALID_LOCALE for invalid locale string', () => {
    const result = toOgLocale('not-a-locale-!!!');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('LOCALE.INVALID_LOCALE');
    }
  });

  it('returns error for non-string input', () => {
    const result = toOgLocale(123 as unknown as Str);
    expect(result.ok).toBe(false);
  });

  it('handles locale with existing region (e.g., en-GB)', () => {
    const result = toOgLocale('en-GB');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('en_GB');
    }
  });
});

// =============================================================================
// Edge cases — Intl.Locale mock paths
// =============================================================================

describe('toOgLocale — Intl.Locale edge cases', () => {
  const RealLocale = Intl.Locale;

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(Intl, 'Locale', { value: RealLocale, configurable: true });
  });

  it('returns error when maximize returns no region (line 78-80)', () => {
    const FakeLocale = class {
      language = 'und';
      region: string | undefined = undefined;
      maximize(): { language: string; region: string | undefined } {
        return { language: 'und', region: undefined };
      }
    };
    Object.defineProperty(Intl, 'Locale', { value: FakeLocale, configurable: true });

    const result = toOgLocale('und');
    expect(result.ok).toBe(false);
  });

  it('returns error when maximize() returns data that fails MaximizedLocaleDataSchema validation (lines 78-79)', () => {
    const FakeLocale = class {
      language = 'en';
      region = 'US';
      maximize(): { language: undefined; region: string } {
        // language is not a string — safeParse(MaximizedLocaleDataSchema) will fail
        return { language: undefined as unknown as undefined, region: 'US' };
      }
    };
    Object.defineProperty(Intl, 'Locale', { value: FakeLocale, configurable: true });

    const result = toOgLocale('en');
    expect(result.ok).toBe(false);
  });
});
