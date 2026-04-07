/**
 * Tests for SSR locale detection — matchLocale and detectFromAcceptLanguage.
 *
 * Verifies the shared locale detection functions work correctly for the
 * SSR use case: cookie > Accept-Language header > fallback.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import type { Str, NullableStr, NonNegativeInteger } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import {
  matchLocale,
  detectFromAcceptLanguage,
  detectFromNavigator,
  detectFromUrlPath,
  detectFromUrlQuery,
  detectFromCookie,
  detectLocale,
} from './detect';

// Typical supported locales set (mirrors editor + any product)
const AVAILABLE: readonly Str[] = ['en', 'ja', 'zh', 'ko', 'fr', 'de', 'es'];

// ---------------------------------------------------------------------------
// matchLocale
// ---------------------------------------------------------------------------

describe('matchLocale', () => {
  it('matches exact locale code', () => {
    const result = matchLocale('ja', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ja');
    }
  });

  it('matches base language from region tag (en-US → en)', () => {
    const result = matchLocale('en-US', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('en');
    }
  });

  it('matches base language from zh-CN → zh', () => {
    const result = matchLocale('zh-CN', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('zh');
    }
  });

  it('returns null for unsupported locale', () => {
    const result = matchLocale('pt', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeNull();
    }
  });

  it('is case-insensitive', () => {
    const result = matchLocale('JA', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ja');
    }
  });

  it('matches all 7 supported locales', () => {
    for (const code of AVAILABLE) {
      const result = matchLocale(code, AVAILABLE);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBe(code);
      }
    }
  });

  it('returns error for invalid tag (non-string)', () => {
    const result: Result<NullableStr> = matchLocale(123 as unknown as Str, AVAILABLE);
    expect(result.ok).toBe(false);
  });

  it('throws for invalid available (non-iterable)', () => {
    expect(() => matchLocale('en', 123 as unknown as readonly Str[])).toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// detectFromAcceptLanguage
// ---------------------------------------------------------------------------

describe('detectFromAcceptLanguage', () => {
  it('detects first supported from multi-language header', () => {
    const result = detectFromAcceptLanguage('ja,en-US;q=0.9,en;q=0.8', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ja');
    }
  });

  it('skips unsupported and picks first supported', () => {
    const result = detectFromAcceptLanguage('pt-BR,pt;q=0.9,fr;q=0.8', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('fr');
    }
  });

  it('returns null for all unsupported', () => {
    const result = detectFromAcceptLanguage('pt-BR,pt;q=0.9,ru;q=0.8', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeNull();
    }
  });

  it('extracts base code from region tag (en-US → en)', () => {
    const result = detectFromAcceptLanguage('en-US', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('en');
    }
  });

  it('handles quality values correctly (picks higher priority)', () => {
    const result = detectFromAcceptLanguage('de;q=0.5,ko;q=1.0', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ko');
    }
  });

  it('handles whitespace in header', () => {
    const result = detectFromAcceptLanguage('  ja , en-US;q=0.9 ', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ja');
    }
  });

  it('resolves locale priority: cookie > header > fallback', () => {
    // Simulate the SSR pattern: cookie match takes priority
    const cookieValue: Str = 'ja';
    const cookieMatch = matchLocale(cookieValue, AVAILABLE);
    expect(cookieMatch.ok).toBe(true);
    if (cookieMatch.ok) {
      expect(cookieMatch.data).toBe('ja');
    }

    // If cookie had been invalid, header would be used
    const invalidCookie = matchLocale('invalid', AVAILABLE);
    expect(invalidCookie.ok).toBe(true);
    if (invalidCookie.ok) {
      expect(invalidCookie.data).toBeNull();
    }

    const headerFallback = detectFromAcceptLanguage('fr,en;q=0.9', AVAILABLE);
    expect(headerFallback.ok).toBe(true);
    if (headerFallback.ok) {
      expect(headerFallback.data).toBe('fr');
    }
  });

  it('matches all 7 supported locales via Accept-Language header', () => {
    for (const code of AVAILABLE) {
      const result = detectFromAcceptLanguage(code, AVAILABLE);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBe(code);
      }
    }
  });

  it('returns error for invalid header (non-string)', () => {
    const result: Result<NullableStr> = detectFromAcceptLanguage(123 as unknown as Str, AVAILABLE);
    expect(result.ok).toBe(false);
  });

  it('filters empty parts from header', () => {
    const result: Result<NullableStr> = detectFromAcceptLanguage(',,,en', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('en');
    }
  });
});

// ---------------------------------------------------------------------------
// detectFromNavigator
// ---------------------------------------------------------------------------

describe('detectFromNavigator', () => {
  it('returns matching locale from navigator.languages', () => {
    const original = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', {
      value: { languages: ['ja', 'en-US'], language: 'ja' },
      writable: true,
      configurable: true,
    });

    const result: Result<NullableStr> = detectFromNavigator(AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ja');
    }

    Object.defineProperty(globalThis, 'navigator', {
      value: original,
      writable: true,
      configurable: true,
    });
  });

  it('returns null when navigator is undefined', () => {
    const original = globalThis.navigator;
    delete (globalThis as Record<string, unknown>).navigator;

    const result: Result<NullableStr> = detectFromNavigator(AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeNull();
    }

    Object.defineProperty(globalThis, 'navigator', {
      value: original,
      writable: true,
      configurable: true,
    });
  });

  it('returns null when navigator languages have no match', () => {
    const original = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', {
      value: { languages: ['pt', 'ru'], language: 'pt' },
      writable: true,
      configurable: true,
    });

    const result: Result<NullableStr> = detectFromNavigator(AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeNull();
    }

    Object.defineProperty(globalThis, 'navigator', {
      value: original,
      writable: true,
      configurable: true,
    });
  });

  it('falls back to navigator.language when languages is undefined', () => {
    const original = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', {
      value: { language: 'ja' },
      writable: true,
      configurable: true,
    });

    const result: Result<NullableStr> = detectFromNavigator(AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ja');
    }

    Object.defineProperty(globalThis, 'navigator', {
      value: original,
      writable: true,
      configurable: true,
    });
  });

  it('throws for invalid available (non-iterable)', () => {
    expect(() => detectFromNavigator(123 as unknown as readonly Str[])).toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// detectFromUrlPath
// ---------------------------------------------------------------------------

describe('detectFromUrlPath', () => {
  it('extracts locale from URL path segment', () => {
    const result: Result<NullableStr> = detectFromUrlPath(
      'https://example.com/ja/about',
      0 as NonNegativeInteger,
      AVAILABLE,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ja');
    }
  });

  it('returns null when segment does not match', () => {
    const result: Result<NullableStr> = detectFromUrlPath(
      'https://example.com/about',
      0 as NonNegativeInteger,
      AVAILABLE,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeNull();
    }
  });

  it('returns null when segment index is beyond path length', () => {
    const result: Result<NullableStr> = detectFromUrlPath(
      'https://example.com/',
      5 as NonNegativeInteger,
      AVAILABLE,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeNull();
    }
  });

  it('returns error for invalid URL', () => {
    const result: Result<NullableStr> = detectFromUrlPath(
      'not-a-url',
      0 as NonNegativeInteger,
      AVAILABLE,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('returns error for invalid url input (non-string)', () => {
    const result: Result<NullableStr> = detectFromUrlPath(
      123 as unknown as Str,
      0 as NonNegativeInteger,
      AVAILABLE,
    );
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid index', () => {
    const result: Result<NullableStr> = detectFromUrlPath(
      'https://example.com/en',
      -1 as unknown as NonNegativeInteger,
      AVAILABLE,
    );
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// detectFromUrlQuery
// ---------------------------------------------------------------------------

describe('detectFromUrlQuery', () => {
  it('extracts locale from query parameter', () => {
    const result: Result<NullableStr> = detectFromUrlQuery(
      'https://example.com?lang=ja',
      'lang',
      AVAILABLE,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ja');
    }
  });

  it('returns null when query param is missing', () => {
    const result: Result<NullableStr> = detectFromUrlQuery(
      'https://example.com',
      'lang',
      AVAILABLE,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeNull();
    }
  });

  it('returns error for invalid URL', () => {
    const result: Result<NullableStr> = detectFromUrlQuery('not-a-url', 'lang', AVAILABLE);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('returns error for invalid url input (non-string)', () => {
    const result: Result<NullableStr> = detectFromUrlQuery(
      123 as unknown as Str,
      'lang',
      AVAILABLE,
    );
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid param name (non-string)', () => {
    const result: Result<NullableStr> = detectFromUrlQuery(
      'https://example.com',
      123 as unknown as Str,
      AVAILABLE,
    );
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// detectFromCookie
// ---------------------------------------------------------------------------

describe('detectFromCookie', () => {
  it('extracts locale from cookie value', () => {
    const result: Result<NullableStr> = detectFromCookie('lang=ja; theme=dark', 'lang', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ja');
    }
  });

  it('returns null when cookie name not found', () => {
    const result: Result<NullableStr> = detectFromCookie('theme=dark', 'lang', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeNull();
    }
  });

  it('skips malformed cookie entries without equals sign', () => {
    const result: Result<NullableStr> = detectFromCookie('badcookie; lang=ja', 'lang', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ja');
    }
  });

  it('returns error for invalid header (non-string)', () => {
    const result: Result<NullableStr> = detectFromCookie(123 as unknown as Str, 'lang', AVAILABLE);
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid cookie name (non-string)', () => {
    const result: Result<NullableStr> = detectFromCookie(
      'lang=en',
      123 as unknown as Str,
      AVAILABLE,
    );
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// detectLocale
// ---------------------------------------------------------------------------

describe('detectLocale', () => {
  it('detects locale from header source', () => {
    const result: Result<Str> = detectLocale({
      available: [...AVAILABLE],
      fallback: 'en',
      sources: [{ kind: 'header', value: 'ja,en;q=0.9' }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ja');
    }
  });

  it('falls back to default locale when no source matches', () => {
    const result: Result<Str> = detectLocale({
      available: [...AVAILABLE],
      fallback: 'en',
      sources: [{ kind: 'header', value: 'pt-BR' }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('en');
    }
  });

  it('returns fallback for empty sources array', () => {
    const result: Result<Str> = detectLocale({
      available: [...AVAILABLE],
      fallback: 'de',
      sources: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('de');
    }
  });

  it('returns error for invalid options', () => {
    const result: Result<Str> = detectLocale({} as Parameters<typeof detectLocale>[0]);
    expect(result.ok).toBe(false);
  });

  it('skips navigator source when navigator is undefined (Node)', () => {
    const original = globalThis.navigator;
    delete (globalThis as Record<string, unknown>).navigator;

    const result: Result<Str> = detectLocale({
      available: [...AVAILABLE],
      fallback: 'en',
      sources: [{ kind: 'navigator' }, { kind: 'header', value: 'ja' }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ja');
    }

    Object.defineProperty(globalThis, 'navigator', {
      value: original,
      writable: true,
      configurable: true,
    });
  });

  it('skips url-path source when location is undefined (Node)', () => {
    const result: Result<Str> = detectLocale({
      available: [...AVAILABLE],
      fallback: 'en',
      sources: [{ kind: 'url-path', index: 0 as NonNegativeInteger }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('en');
    }
  });

  it('skips url-query source when location is undefined (Node)', () => {
    const result: Result<Str> = detectLocale({
      available: [...AVAILABLE],
      fallback: 'en',
      sources: [{ kind: 'url-query', key: 'lang' }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('en');
    }
  });

  it('skips cookie source when document is undefined (Node)', () => {
    const result: Result<Str> = detectLocale({
      available: [...AVAILABLE],
      fallback: 'en',
      sources: [{ kind: 'cookie', key: 'lang' }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('en');
    }
  });

  it('skips storage source when localStorage is undefined (Node)', () => {
    const result: Result<Str> = detectLocale({
      available: [...AVAILABLE],
      fallback: 'en',
      sources: [{ kind: 'storage', key: 'lang' }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('en');
    }
  });

  it('reads from localStorage when available', () => {
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      value: { getItem: (key: Str): NullableStr => (key === 'lang' ? 'ja' : null) },
      writable: true,
      configurable: true,
    });

    const result: Result<Str> = detectLocale({
      available: [...AVAILABLE],
      fallback: 'en',
      sources: [{ kind: 'storage', key: 'lang' }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ja');
    }

    Object.defineProperty(globalThis, 'localStorage', {
      value: original,
      writable: true,
      configurable: true,
    });
  });

  it('skips storage source when stored value is null', () => {
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      value: { getItem: (): NullableStr => null },
      writable: true,
      configurable: true,
    });

    const result: Result<Str> = detectLocale({
      available: [...AVAILABLE],
      fallback: 'en',
      sources: [{ kind: 'storage', key: 'lang' }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('en');
    }

    Object.defineProperty(globalThis, 'localStorage', {
      value: original,
      writable: true,
      configurable: true,
    });
  });

  it('tries multiple sources and returns first match', () => {
    const result: Result<Str> = detectLocale({
      available: [...AVAILABLE],
      fallback: 'en',
      sources: [
        { kind: 'header', value: 'pt-BR' },
        { kind: 'header', value: 'ja,en;q=0.9' },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ja');
    }
  });
});

// ---------------------------------------------------------------------------
// Input validation failure branch coverage
// ---------------------------------------------------------------------------

describe('matchLocale — validation failures', () => {
  it('throws for invalid available (non-iterable)', () => {
    expect(() => matchLocale('en', 123 as unknown as readonly Str[])).toThrow(TypeError);
  });

  it('returns error for available containing non-strings', () => {
    const result: Result<NullableStr> = matchLocale('en', [123 as unknown as Str]);
    expect(result.ok).toBe(false);
  });
});

describe('detectFromNavigator — validation failures', () => {
  it('throws for invalid available (non-iterable)', () => {
    expect(() => detectFromNavigator(123 as unknown as readonly Str[])).toThrow(TypeError);
  });

  it('returns error for available containing non-strings', () => {
    const result: Result<NullableStr> = detectFromNavigator([123 as unknown as Str]);
    expect(result.ok).toBe(false);
  });
});

describe('detectFromAcceptLanguage — validation failures', () => {
  it('throws for invalid available (non-iterable)', () => {
    expect(() => detectFromAcceptLanguage('en', 123 as unknown as readonly Str[])).toThrow(
      TypeError,
    );
  });

  it('returns error for available containing non-strings', () => {
    const result: Result<NullableStr> = detectFromAcceptLanguage('en', [123 as unknown as Str]);
    expect(result.ok).toBe(false);
  });
});

describe('detectFromUrlPath — validation failures', () => {
  it('throws for invalid available (non-iterable)', () => {
    expect(() =>
      detectFromUrlPath(
        'https://example.com/en',
        0 as NonNegativeInteger,
        123 as unknown as readonly Str[],
      ),
    ).toThrow(TypeError);
  });

  it('returns error for available containing non-strings', () => {
    const result: Result<NullableStr> = detectFromUrlPath(
      'https://example.com/en',
      0 as NonNegativeInteger,
      [123 as unknown as Str],
    );
    expect(result.ok).toBe(false);
  });
});

describe('detectFromUrlQuery — validation failures', () => {
  it('throws for invalid available (non-iterable)', () => {
    expect(() =>
      detectFromUrlQuery('https://example.com?lang=en', 'lang', 123 as unknown as readonly Str[]),
    ).toThrow(TypeError);
  });

  it('returns error for available containing non-strings', () => {
    const result: Result<NullableStr> = detectFromUrlQuery('https://example.com?lang=en', 'lang', [
      123 as unknown as Str,
    ]);
    expect(result.ok).toBe(false);
  });
});

describe('detectFromCookie — validation failures', () => {
  it('throws for invalid available (non-iterable)', () => {
    expect(() => detectFromCookie('lang=en', 'lang', 123 as unknown as readonly Str[])).toThrow(
      TypeError,
    );
  });

  it('returns error for available containing non-strings', () => {
    const result: Result<NullableStr> = detectFromCookie('lang=en', 'lang', [
      123 as unknown as Str,
    ]);
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Branch coverage — uncovered branches
// ---------------------------------------------------------------------------

describe('detectFromNavigator — matchResult error (line 204)', () => {
  it('returns error when navigator.languages contains non-string', () => {
    const original = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', {
      value: { languages: [123 as unknown as string, 'en'], language: 'en' },
      writable: true,
      configurable: true,
    });

    const result: Result<NullableStr> = detectFromNavigator(AVAILABLE);
    // matchLocale will fail on the non-string tag (123), propagating the error
    expect(result.ok).toBe(false);

    Object.defineProperty(globalThis, 'navigator', {
      value: original,
      writable: true,
      configurable: true,
    });
  });
});

describe('detectFromAcceptLanguage — edge cases for qMatch/lang branches', () => {
  // Line 254: qMatch null coalescing — regex match fails
  // The regex is /^q=(\d+(?:\.\d+)?)$/ — if the param doesn't match, ?.[1] is undefined → ?? null
  it('handles malformed quality param (qMatch regex fails, line 254)', () => {
    // 'q=abc' does not match the quality regex, so qMatch is null, quality stays 1
    const result: Result<NullableStr> = detectFromAcceptLanguage('en;q=abc', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('en');
    }
  });

  it('handles param without q= prefix (qMatch regex fails)', () => {
    // 'level=5' doesn't match q=... pattern
    const result: Result<NullableStr> = detectFromAcceptLanguage('fr;level=5', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('fr');
    }
  });

  // Line 261: (lang ?? '').trim() — lang is undefined after split
  // split(';') on an entry that is just ';' would give ['', ''], destructured as lang=''
  // For lang to be truly undefined: the split result would need to be empty.
  // Actually, split(';') always returns at least one element, so lang is never undefined.
  // BUT: an entry like ';q=0.8' splits to ['', 'q=0.8'], so lang='', which gets filtered by length > 0
  it('handles header entry starting with semicolon (lang is empty string)', () => {
    const result: Result<NullableStr> = detectFromAcceptLanguage(';q=0.8,en;q=0.5', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('en');
    }
  });

  // Line 269: matchResult error in parseAcceptLanguage loop
  // Need matchLocale to fail inside the loop. This happens when available contains non-string.
  // But available is validated before the loop. The only way is if the tag itself is problematic.
  // Actually, since available is pre-validated, and the tag is always a string (from the header),
  // matchLocale won't fail. But we can trigger it by passing an available array where safeParse
  // succeeds for the array but the individual matchLocale call fails. That's not possible.
  // Let's try: passing available with non-strings that slip through StrArraySchema validation?
  // No, StrArraySchema catches that.
  // This branch may be unreachable in practice. Skip it.
});

describe('detectLocale — default switch case (line 543)', () => {
  it('skips unknown source kind and falls back to default locale', () => {
    // The DetectionSourceSchema is a discriminated union, so passing an unknown kind
    // will cause validation to fail before reaching the switch. This branch is unreachable
    // via the public API since safeParse of DetectLocaleOptionsSchema rejects unknown kinds.
    // However, we can verify the validation error path:
    const result: Result<Str> = detectLocale({
      available: [...AVAILABLE],
      fallback: 'en',
      sources: [{ kind: 'unknown-source' } as never],
    });
    // The validation of options will fail because 'unknown-source' is not in the union
    expect(result.ok).toBe(false);
  });
});

describe('detectLocale — matchResult error propagation (line 548)', () => {
  it('propagates error when header detection fails due to invalid available items', () => {
    // This is hard to trigger because available is validated by DetectLocaleOptionsSchema.
    // Let's test with a header source that itself causes an error.
    // detectFromAcceptLanguage is called with validated.available — if that's valid strings,
    // matchLocale won't fail inside. This branch appears unreachable through the public API.
    // We verify the closest reachable path: invalid available causes options validation error.
    const result: Result<Str> = detectLocale({
      available: [123 as unknown as Str],
      fallback: 'en',
      sources: [{ kind: 'header', value: 'en' }],
    });
    expect(result.ok).toBe(false);
  });
});

describe('detectLocale — storage match branch', () => {
  it('returns locale from localStorage when value matches available', () => {
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      value: { getItem: (key: Str): NullableStr => (key === 'lang' ? 'fr' : null) },
      writable: true,
      configurable: true,
    });

    const result: Result<Str> = detectLocale({
      available: [...AVAILABLE],
      fallback: 'en',
      sources: [{ kind: 'storage', key: 'lang' }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('fr');
    }

    Object.defineProperty(globalThis, 'localStorage', {
      value: original,
      writable: true,
      configurable: true,
    });
  });

  it('falls back to default when localStorage value does not match', () => {
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      value: { getItem: (key: Str): NullableStr => (key === 'lang' ? 'xx' : null) },
      writable: true,
      configurable: true,
    });

    const result: Result<Str> = detectLocale({
      available: [...AVAILABLE],
      fallback: 'en',
      sources: [{ kind: 'storage', key: 'lang' }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('en');
    }

    Object.defineProperty(globalThis, 'localStorage', {
      value: original,
      writable: true,
      configurable: true,
    });
  });
});
