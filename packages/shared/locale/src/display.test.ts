/**
 * Unit tests for the language display name utilities.
 *
 * Tests `getLanguageDisplayName` and `getLanguageDisplayNames` which wrap
 * the browser-native `Intl.DisplayNames` API to produce endonym/exonym pairs.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Str } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';

import {
  getLanguageDisplayName,
  getLanguageDisplayNames,
  LanguageDisplayInfoSchema,
  type LanguageDisplayInfo,
} from './display';

/* ------------------------------------------------------------------ */
/*  LanguageDisplayInfoSchema                                          */
/* ------------------------------------------------------------------ */
describe('LanguageDisplayInfoSchema', () => {
  it('accepts valid display info', () => {
    const result = safeParse(LanguageDisplayInfoSchema, {
      code: 'ja' as Str,
      endonym: '日本語' as Str,
      exonym: 'Japanese' as Str,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.code).toBe('ja' as Str);
    expect(result.data.endonym).toBe('日本語' as Str);
    expect(result.data.exonym).toBe('Japanese' as Str);
  });

  it('rejects unknown keys via strictObject', () => {
    const result = safeParse(LanguageDisplayInfoSchema, {
      code: 'ja' as Str,
      endonym: '日本語' as Str,
      exonym: 'Japanese' as Str,
      extra: 'nope' as Str,
    });
    expect(result.ok).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  getLanguageDisplayName                                             */
/* ------------------------------------------------------------------ */
describe('getLanguageDisplayName', () => {
  it('returns endonym and exonym for Japanese viewed from English', () => {
    const result = getLanguageDisplayName('ja' as Str, 'en' as Str);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.code).toBe('ja' as Str);
    expect(result.data.endonym).toBe('日本語' as Str);
    expect(result.data.exonym).toBe('Japanese' as Str);
  });

  it('returns matching endonym/exonym for English viewed from English', () => {
    const result = getLanguageDisplayName('en' as Str, 'en' as Str);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.endonym).toBe('English' as Str);
    expect(result.data.exonym).toBe('English' as Str);
  });

  it('returns French exonym when viewed from French locale', () => {
    const result = getLanguageDisplayName('ja' as Str, 'fr' as Str);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.exonym).toBe('japonais' as Str);
  });

  it('returns German exonym when viewed from German locale', () => {
    const result = getLanguageDisplayName('ja' as Str, 'de' as Str);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.exonym).toBe('Japanisch' as Str);
  });

  it('returns LOCALE.INVALID_LOCALE for empty code', () => {
    const result = getLanguageDisplayName('' as Str, 'en' as Str);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('LOCALE.INVALID_LOCALE');
    }
  });

  it('returns LOCALE.INVALID_LOCALE for empty currentLocale', () => {
    const result = getLanguageDisplayName('en' as Str, '' as Str);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('LOCALE.INVALID_LOCALE');
    }
  });

  it('returns a result for unknown language codes (Node returns code as-is)', () => {
    const result = getLanguageDisplayName('zzz' as Str, 'en' as Str);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.code).toBe('zzz');
      // Node 25 returns the code as-is for unknown languages
      expect(result.data.endonym).toBe('zzz');
    }
  });
});

/* ------------------------------------------------------------------ */
/*  getLanguageDisplayNames                                            */
/* ------------------------------------------------------------------ */
const TEST_LOCALES: readonly Str[] = [
  'en' as Str,
  'ja' as Str,
  'zh' as Str,
  'ko' as Str,
  'fr' as Str,
  'de' as Str,
  'es' as Str,
];

describe('getLanguageDisplayNames', () => {
  it('returns display info for all provided locale codes', () => {
    const result = getLanguageDisplayNames(TEST_LOCALES, 'en' as Str);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data).toHaveLength(TEST_LOCALES.length);
  });

  it('each entry has code, endonym, and exonym', () => {
    const result = getLanguageDisplayNames(TEST_LOCALES, 'en' as Str);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    for (const entry of result.data) {
      expect(entry.code).toBeTruthy();
      expect(entry.endonym).toBeTruthy();
      expect(entry.exonym).toBeTruthy();
    }
  });

  it('English entry has matching endonym and exonym when viewed from English', () => {
    const result = getLanguageDisplayNames(TEST_LOCALES, 'en' as Str);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const english: LanguageDisplayInfo | undefined = result.data.find(
      (l: LanguageDisplayInfo) => l.code === ('en' as Str),
    );
    expect(english).toBeDefined();
    expect(english!.endonym).toBe(english!.exonym);
  });

  it('Japanese entry has different endonym and exonym when viewed from English', () => {
    const result = getLanguageDisplayNames(TEST_LOCALES, 'en' as Str);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const japanese: LanguageDisplayInfo | undefined = result.data.find(
      (l: LanguageDisplayInfo) => l.code === ('ja' as Str),
    );
    expect(japanese).toBeDefined();
    expect(japanese!.endonym).toBe('日本語' as Str);
    expect(japanese!.exonym).toBe('Japanese' as Str);
  });

  it('returns error if any code in the array is invalid', () => {
    const result = getLanguageDisplayNames(['' as Str, 'en' as Str], 'en' as Str);
    expect(result.ok).toBe(false);
  });

  it('returns empty array for empty input', () => {
    const result = getLanguageDisplayNames([], 'en' as Str);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data).toHaveLength(0);
  });
});

// =============================================================================
// Edge cases — Intl.DisplayNames returning undefined
// =============================================================================

describe('getLanguageDisplayName — Intl.DisplayNames edge cases', () => {
  const RealDisplayNames = Intl.DisplayNames;

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(Intl, 'DisplayNames', { value: RealDisplayNames, configurable: true });
  });

  it('returns error when DisplayNames.of returns undefined (line 109)', () => {
    const FakeDisplayNames = class {
      of(): string | undefined {
        return undefined;
      }
    };
    Object.defineProperty(Intl, 'DisplayNames', { value: FakeDisplayNames, configurable: true });

    const result = getLanguageDisplayName('en' as Str, 'en' as Str);
    expect(result.ok).toBe(false);
  });
});

// =============================================================================
// safeParse validation error paths
// =============================================================================

describe('getLanguageDisplayName — safeParse validation errors', () => {
  it('returns error when code is non-string (lines 82-83)', () => {
    const result = getLanguageDisplayName(123 as unknown as Str, 'en' as Str);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('LOCALE.INVALID_LOCALE');
    }
  });

  it('returns error when currentLocale is non-string (lines 92-93)', () => {
    const result = getLanguageDisplayName('en' as Str, 456 as unknown as Str);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('LOCALE.INVALID_LOCALE');
    }
  });
});

describe('getLanguageDisplayNames — safeParse validation errors', () => {
  it('returns error when codes contains non-strings (lines 144-145)', () => {
    const result = getLanguageDisplayNames([123 as unknown as Str], 'en' as Str);
    expect(result.ok).toBe(false);
  });

  it('returns error when currentLocale is non-string (lines 150-151)', () => {
    const result = getLanguageDisplayNames(['en' as Str], 789 as unknown as Str);
    expect(result.ok).toBe(false);
  });
});
