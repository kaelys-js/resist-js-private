/**
 * Tests for SSR locale detection — matchLocale and detectFromAcceptLanguage.
 *
 * Verifies the shared locale detection functions work correctly for the
 * SSR use case: cookie > Accept-Language header > fallback.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import type { Str } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import type { NullableStr, NonNegativeInteger } from '@/schemas/common';
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
    if (result.ok) expect(result.data).toBe('ja');
  });

  it('matches base language from region tag (en-US → en)', () => {
    const result = matchLocale('en-US', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('en');
  });

  it('matches base language from zh-CN → zh', () => {
    const result = matchLocale('zh-CN', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('zh');
  });

  it('returns null for unsupported locale', () => {
    const result = matchLocale('pt', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBeNull();
  });

  it('is case-insensitive', () => {
    const result = matchLocale('JA', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('ja');
  });

  it('matches all 7 supported locales', () => {
    for (const code of AVAILABLE) {
      const result = matchLocale(code, AVAILABLE);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data).toBe(code);
    }
  });
});

// ---------------------------------------------------------------------------
// detectFromAcceptLanguage
// ---------------------------------------------------------------------------

describe('detectFromAcceptLanguage', () => {
  it('detects first supported from multi-language header', () => {
    const result = detectFromAcceptLanguage('ja,en-US;q=0.9,en;q=0.8', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('ja');
  });

  it('skips unsupported and picks first supported', () => {
    const result = detectFromAcceptLanguage('pt-BR,pt;q=0.9,fr;q=0.8', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('fr');
  });

  it('returns null for all unsupported', () => {
    const result = detectFromAcceptLanguage('pt-BR,pt;q=0.9,ru;q=0.8', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBeNull();
  });

  it('extracts base code from region tag (en-US → en)', () => {
    const result = detectFromAcceptLanguage('en-US', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('en');
  });

  it('handles quality values correctly (picks higher priority)', () => {
    const result = detectFromAcceptLanguage('de;q=0.5,ko;q=1.0', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('ko');
  });

  it('handles whitespace in header', () => {
    const result = detectFromAcceptLanguage('  ja , en-US;q=0.9 ', AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('ja');
  });

  it('resolves locale priority: cookie > header > fallback', () => {
    // Simulate the SSR pattern: cookie match takes priority
    const cookieValue: Str = 'ja';
    const cookieMatch = matchLocale(cookieValue, AVAILABLE);
    expect(cookieMatch.ok).toBe(true);
    if (cookieMatch.ok) expect(cookieMatch.data).toBe('ja');

    // If cookie had been invalid, header would be used
    const invalidCookie = matchLocale('invalid', AVAILABLE);
    expect(invalidCookie.ok).toBe(true);
    if (invalidCookie.ok) expect(invalidCookie.data).toBeNull();

    const headerFallback = detectFromAcceptLanguage('fr,en;q=0.9', AVAILABLE);
    expect(headerFallback.ok).toBe(true);
    if (headerFallback.ok) expect(headerFallback.data).toBe('fr');
  });

  it('matches all 7 supported locales via Accept-Language header', () => {
    for (const code of AVAILABLE) {
      const result = detectFromAcceptLanguage(code, AVAILABLE);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data).toBe(code);
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
    if (result.ok) expect(result.data).toBe('ja');

    Object.defineProperty(globalThis, 'navigator', { value: original, writable: true, configurable: true });
  });

  it('returns null when navigator is undefined', () => {
    const original = globalThis.navigator;
    // @ts-expect-error — simulating non-browser
    delete (globalThis as Record<string, unknown>).navigator;

    const result: Result<NullableStr> = detectFromNavigator(AVAILABLE);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBeNull();

    Object.defineProperty(globalThis, 'navigator', { value: original, writable: true, configurable: true });
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
    if (result.ok) expect(result.data).toBe('ja');
  });

  it('returns null when segment does not match', () => {
    const result: Result<NullableStr> = detectFromUrlPath(
      'https://example.com/about',
      0 as NonNegativeInteger,
      AVAILABLE,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBeNull();
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
    if (result.ok) expect(result.data).toBe('ja');
  });

  it('returns null when query param is missing', () => {
    const result: Result<NullableStr> = detectFromUrlQuery(
      'https://example.com',
      'lang',
      AVAILABLE,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// detectFromCookie
// ---------------------------------------------------------------------------

describe('detectFromCookie', () => {
  it('extracts locale from cookie value', () => {
    const result: Result<NullableStr> = detectFromCookie(
      'lang=ja; theme=dark',
      'lang',
      AVAILABLE,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('ja');
  });

  it('returns null when cookie name not found', () => {
    const result: Result<NullableStr> = detectFromCookie(
      'theme=dark',
      'lang',
      AVAILABLE,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBeNull();
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
      sources: [
        { kind: 'header', value: 'ja,en;q=0.9' },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('ja');
  });

  it('falls back to default locale when no source matches', () => {
    const result: Result<Str> = detectLocale({
      available: [...AVAILABLE],
      fallback: 'en',
      sources: [
        { kind: 'header', value: 'pt-BR' },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('en');
  });

  it('returns fallback for empty sources array', () => {
    const result: Result<Str> = detectLocale({
      available: [...AVAILABLE],
      fallback: 'de',
      sources: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('de');
  });
});
