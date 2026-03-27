/**
 * Tests for locale registry.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import { resolveLocale, getAvailableLocales, type LocaleResult } from './registry.ts';

// =============================================================================
// resolveLocale
// =============================================================================

describe('resolveLocale', () => {
  it('returns en strings when no locale is requested', () => {
    const result: LocaleResult = resolveLocale();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.strings.cli).toBeDefined();
      expect(result.strings.errors).toBeDefined();
      expect(result.strings.tools).toBeDefined();
    }
  });

  it('returns en strings when "en" is requested', () => {
    const result: LocaleResult = resolveLocale('en');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.strings.cli.optionsHeader).toBeDefined();
    }
  });

  it('returns error for an invalid locale', () => {
    const result: LocaleResult = resolveLocale('xx');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Unknown locale');
      expect(result.error).toContain('"xx"');
      expect(result.error).toContain('en');
    }
  });

  it('returns error for empty string locale', () => {
    const result: LocaleResult = resolveLocale('');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Unknown locale');
    }
  });

  it('returns error for a locale that looks valid but is not registered', () => {
    const result: LocaleResult = resolveLocale('es');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Available locales: en');
    }
  });

  it('falls back to en when undefined is passed explicitly', () => {
    const result: LocaleResult = resolveLocale(undefined);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.strings).toBeDefined();
    }
  });
});

// =============================================================================
// getAvailableLocales
// =============================================================================

describe('getAvailableLocales', () => {
  it('returns an array containing "en"', () => {
    const locales: readonly string[] = getAvailableLocales();
    expect(locales).toContain('en');
  });

  it('returns at least one locale', () => {
    const locales: readonly string[] = getAvailableLocales();
    expect(locales.length).toBeGreaterThanOrEqual(1);
  });

  it('returns a frozen-compatible readonly array', () => {
    const locales: readonly string[] = getAvailableLocales();
    expect(Array.isArray(locales)).toBe(true);
  });
});
