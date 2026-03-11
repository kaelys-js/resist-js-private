import { describe, expect, it } from 'vitest';
import { SUPPORTED_LOCALES } from '$lib/schemas/editor-state';
import { OG_LOCALES } from './og-locales';
import type { Str } from '@/schemas/common';

describe('OG_LOCALES', () => {
  it('has a mapping for every supported locale', () => {
    for (const code of SUPPORTED_LOCALES) {
      expect(OG_LOCALES[code], `missing OG mapping for '${code}'`).toBeDefined();
    }
  });

  it('has no extra mappings beyond supported locales', () => {
    const keys: readonly Str[] = Object.keys(OG_LOCALES);
    expect([...keys].toSorted()).toEqual([...SUPPORTED_LOCALES].toSorted());
  });

  it('all values match xx_YY format', () => {
    for (const [code, ogValue] of Object.entries(OG_LOCALES)) {
      expect(ogValue, `OG_LOCALES['${code}'] should match xx_YY format`).toMatch(
        /^[a-z]{2}_[A-Z]{2}$/,
      );
    }
  });

  it('no undefined values', () => {
    for (const code of SUPPORTED_LOCALES) {
      expect(typeof OG_LOCALES[code]).toBe('string');
      expect((OG_LOCALES[code] ?? '').length).toBeGreaterThan(0);
    }
  });

  it('maps known values correctly', () => {
    expect(OG_LOCALES.en).toBe('en_US');
    expect(OG_LOCALES.ja).toBe('ja_JP');
    expect(OG_LOCALES.zh).toBe('zh_CN');
    expect(OG_LOCALES.ko).toBe('ko_KR');
    expect(OG_LOCALES.fr).toBe('fr_FR');
    expect(OG_LOCALES.de).toBe('de_DE');
    expect(OG_LOCALES.es).toBe('es_ES');
  });
});
