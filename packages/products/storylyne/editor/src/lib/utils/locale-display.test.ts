import { describe, expect, it } from 'vitest';
import { getLanguageDisplayName, getLanguageDisplayNames } from './locale-display';
import { SUPPORTED_LOCALES } from '$lib/schemas/editor-state';

describe('getLanguageDisplayName', () => {
  it('returns endonym and exonym for Japanese viewed from English', () => {
    const result = getLanguageDisplayName('ja', 'en');
    if (!result.ok) throw new Error(result.error.message);
    expect(result.data.code).toBe('ja');
    expect(result.data.endonym).toBe('日本語');
    expect(result.data.exonym).toBe('Japanese');
  });

  it('returns matching endonym/exonym for English viewed from English', () => {
    const result = getLanguageDisplayName('en', 'en');
    if (!result.ok) throw new Error(result.error.message);
    expect(result.data.endonym).toBe('English');
    expect(result.data.exonym).toBe('English');
  });

  it('returns French exonym when viewed from French locale', () => {
    const result = getLanguageDisplayName('ja', 'fr');
    if (!result.ok) throw new Error(result.error.message);
    expect(result.data.exonym).toBe('japonais');
  });

  it('returns German exonym when viewed from German locale', () => {
    const result = getLanguageDisplayName('ja', 'de');
    if (!result.ok) throw new Error(result.error.message);
    expect(result.data.exonym).toBe('Japanisch');
  });

  it('returns error for empty code', () => {
    const result = getLanguageDisplayName('', 'en');
    expect(result.ok).toBe(false);
  });

  it('returns error for empty currentLocale', () => {
    const result = getLanguageDisplayName('en', '');
    expect(result.ok).toBe(false);
  });
});

describe('getLanguageDisplayNames', () => {
  it('returns display info for all supported locales', () => {
    const result = getLanguageDisplayNames(SUPPORTED_LOCALES, 'en');
    if (!result.ok) throw new Error(result.error.message);
    expect(result.data).toHaveLength(SUPPORTED_LOCALES.length);
  });

  it('each entry has code, endonym, and exonym', () => {
    const result = getLanguageDisplayNames(SUPPORTED_LOCALES, 'en');
    if (!result.ok) throw new Error(result.error.message);
    for (const entry of result.data) {
      expect(entry.code).toBeTruthy();
      expect(entry.endonym).toBeTruthy();
      expect(entry.exonym).toBeTruthy();
    }
  });

  it('English entry has matching endonym and exonym when viewed from English', () => {
    const result = getLanguageDisplayNames(SUPPORTED_LOCALES, 'en');
    if (!result.ok) throw new Error(result.error.message);
    const english = result.data.find((l) => l.code === 'en');
    expect(english).toBeDefined();
    expect(english!.endonym).toBe(english!.exonym);
  });

  it('Japanese entry has different endonym and exonym when viewed from English', () => {
    const result = getLanguageDisplayNames(SUPPORTED_LOCALES, 'en');
    if (!result.ok) throw new Error(result.error.message);
    const japanese = result.data.find((l) => l.code === 'ja');
    expect(japanese).toBeDefined();
    expect(japanese!.endonym).toBe('日本語');
    expect(japanese!.exonym).toBe('Japanese');
  });
});
