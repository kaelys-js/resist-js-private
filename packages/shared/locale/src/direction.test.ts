import { describe, expect, it } from 'vitest';
import { safeParse } from '@/utils/result/safe';
import type { Str } from '@/schemas/common';
import { getTextDirection, TextDirectionSchema } from './direction';

describe('TextDirectionSchema', () => {
  it('accepts ltr', () => {
    const result = safeParse(TextDirectionSchema, 'ltr');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('ltr');
  });

  it('accepts rtl', () => {
    const result = safeParse(TextDirectionSchema, 'rtl');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('rtl');
  });

  it('rejects invalid value', () => {
    const result = safeParse(TextDirectionSchema, 'bidi');
    expect(result.ok).toBe(false);
  });
});

describe('getTextDirection', () => {
  it('returns ltr for English', () => {
    const result = getTextDirection('en');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('ltr');
  });

  it('returns rtl for Arabic', () => {
    const result = getTextDirection('ar');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('rtl');
  });

  it('returns rtl for Hebrew with region subtag', () => {
    const result = getTextDirection('he-IL');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('rtl');
  });

  it('returns rtl for Persian', () => {
    const result = getTextDirection('fa');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('rtl');
  });

  it('returns ltr for German', () => {
    const result = getTextDirection('de');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('ltr');
  });

  it('returns rtl for Azerbaijani in Arabic script', () => {
    const result = getTextDirection('az-Arab');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('rtl');
  });

  it('returns ltr for Azerbaijani in Latin script', () => {
    const result = getTextDirection('az-Latn');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('ltr');
  });

  it('returns rtl for Urdu', () => {
    const result = getTextDirection('ur');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('rtl');
  });

  it('returns ltr for Japanese', () => {
    const result = getTextDirection('ja');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('ltr');
  });

  it('returns rtl for Yiddish', () => {
    const result = getTextDirection('yi');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('rtl');
  });

  it('returns rtl for Pashto', () => {
    const result = getTextDirection('ps');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('rtl');
  });

  it('returns ltr for Korean', () => {
    const result = getTextDirection('ko');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('ltr');
  });

  // --- Error path ---

  it('returns error for invalid input (non-string)', () => {
    const result = getTextDirection(123 as unknown as Str);
    expect(result.ok).toBe(false);
  });

  // --- Edge cases ---

  it('returns ltr for unknown language without script', () => {
    const result = getTextDirection('zz');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('ltr');
  });

  it('returns ltr for locale with region but no script subtag', () => {
    const result = getTextDirection('en-US');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('ltr');
  });

  it('returns rtl for locale with RTL script and region', () => {
    const result = getTextDirection('az-Arab-IR');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('rtl');
  });

  it('returns rtl for Adlam script (ff-Adlm)', () => {
    const result = getTextDirection('ff-Adlm');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('rtl');
  });

  it('returns ltr for bare Kurdish (ku) — uses Latin script by default', () => {
    const result = getTextDirection('ku');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('ltr');
  });

  it('returns rtl for Kurdish in Arabic script (ku-Arab)', () => {
    const result = getTextDirection('ku-Arab');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('rtl');
  });

  // --- Exhaustive RTL language coverage ---

  it.each(['ar', 'arc', 'dv', 'fa', 'he', 'khw', 'ks', 'ps', 'sd', 'ur', 'yi'])(
    'returns rtl for RTL language %s',
    (lang: Str) => {
      const result = getTextDirection(lang);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data).toBe('rtl');
    },
  );
});
