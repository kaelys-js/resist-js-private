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
import { matchLocale, detectFromAcceptLanguage } from './detect';

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
