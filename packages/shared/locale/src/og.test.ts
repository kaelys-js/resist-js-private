/**
 * Unit tests for the Open Graph locale conversion utility.
 *
 * Tests `toOgLocale` which dynamically converts BCP 47 language codes
 * to `xx_YY` Open Graph locale format using `Intl.Locale.maximize()`.
 *
 * @module
 */
import { describe, expect, it } from 'vitest';
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
    if (result.ok) expect(result.data).toBe(expected);
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
    if (result.ok) expect(result.data).toBe('ru_RU');
  });

  it('handles Arabic locale dynamically', () => {
    const result = toOgLocale('ar');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('ar_EG');
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

  it('returns error for empty string', () => {
    const result = toOgLocale('');
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid locale string', () => {
    const result = toOgLocale('not-a-locale-!!!');
    expect(result.ok).toBe(false);
  });

  it('handles locale with existing region (e.g., en-GB)', () => {
    const result = toOgLocale('en-GB');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('en_GB');
  });
});
