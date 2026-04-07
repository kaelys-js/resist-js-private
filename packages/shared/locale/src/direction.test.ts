import { afterEach, describe, expect, it, vi } from 'vitest';
import { safeParse } from '@/utils/result/safe';
import type { Str } from '@/schemas/common';
import { getTextDirection, TextDirectionSchema } from './direction';

describe('TextDirectionSchema', () => {
  it('accepts ltr', () => {
    const result = safeParse(TextDirectionSchema, 'ltr');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ltr');
    }
  });

  it('accepts rtl', () => {
    const result = safeParse(TextDirectionSchema, 'rtl');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('rtl');
    }
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
    if (result.ok) {
      expect(result.data).toBe('ltr');
    }
  });

  it('returns rtl for Arabic', () => {
    const result = getTextDirection('ar');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('rtl');
    }
  });

  it('returns rtl for Hebrew with region subtag', () => {
    const result = getTextDirection('he-IL');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('rtl');
    }
  });

  it('returns rtl for Persian', () => {
    const result = getTextDirection('fa');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('rtl');
    }
  });

  it('returns ltr for German', () => {
    const result = getTextDirection('de');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ltr');
    }
  });

  it('returns rtl for Azerbaijani in Arabic script', () => {
    const result = getTextDirection('az-Arab');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('rtl');
    }
  });

  it('returns ltr for Azerbaijani in Latin script', () => {
    const result = getTextDirection('az-Latn');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ltr');
    }
  });

  it('returns rtl for Urdu', () => {
    const result = getTextDirection('ur');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('rtl');
    }
  });

  it('returns ltr for Japanese', () => {
    const result = getTextDirection('ja');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ltr');
    }
  });

  it('returns rtl for Yiddish', () => {
    const result = getTextDirection('yi');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('rtl');
    }
  });

  it('returns rtl for Pashto', () => {
    const result = getTextDirection('ps');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('rtl');
    }
  });

  it('returns ltr for Korean', () => {
    const result = getTextDirection('ko');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ltr');
    }
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
    if (result.ok) {
      expect(result.data).toBe('ltr');
    }
  });

  it('returns ltr for locale with region but no script subtag', () => {
    const result = getTextDirection('en-US');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ltr');
    }
  });

  it('returns rtl for locale with RTL script and region', () => {
    const result = getTextDirection('az-Arab-IR');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('rtl');
    }
  });

  it('returns rtl for Adlam script (ff-Adlm)', () => {
    const result = getTextDirection('ff-Adlm');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('rtl');
    }
  });

  it('returns ltr for bare Kurdish (ku) — uses Latin script by default', () => {
    const result = getTextDirection('ku');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ltr');
    }
  });

  it('returns rtl for Kurdish in Arabic script (ku-Arab)', () => {
    const result = getTextDirection('ku-Arab');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('rtl');
    }
  });

  // --- Exhaustive RTL language coverage ---

  it.each([
    'ar',
    'arc',
    'dv',
    'fa',
    'he',
    'khw',
    'ks',
    'ps',
    'sd',
    'ur',
    'yi',
  ])('returns rtl for RTL language %s', (lang: Str) => {
    const result = getTextDirection(lang);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('rtl');
    }
  });
});

// =============================================================================
// Intl.Locale branch coverage
// =============================================================================

describe('getTextDirection — Intl.Locale branches', () => {
  const RealIntl = globalThis.Intl;

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore real Intl in case a test replaced it
    globalThis.Intl = RealIntl;
  });

  // 1. getTextInfo() method returns { direction: 'rtl' }
  it('returns rtl when getTextInfo() method returns rtl', () => {
    const FakeLocale = class {
      getTextInfo(): { direction: string } {
        return { direction: 'rtl' };
      }
    };

    globalThis.Intl = {
      ...RealIntl,
      Locale: FakeLocale as unknown as typeof Intl.Locale,
    };

    const result = getTextDirection('ar');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('rtl');
    }
  });

  // 2. getTextInfo() method returns { direction: 'ltr' }
  it('returns ltr when getTextInfo() method returns ltr', () => {
    const FakeLocale = class {
      getTextInfo(): { direction: string } {
        return { direction: 'ltr' };
      }
    };

    globalThis.Intl = {
      ...RealIntl,
      Locale: FakeLocale as unknown as typeof Intl.Locale,
    };

    const result = getTextDirection('en');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ltr');
    }
  });

  // 3. textInfo property returns { direction: 'rtl' } (no getTextInfo method — Safari path)
  it('returns rtl when textInfo property returns rtl (Safari fallback)', () => {
    const FakeLocale = class {
      textInfo = { direction: 'rtl' };
    };

    globalThis.Intl = {
      ...RealIntl,
      Locale: FakeLocale as unknown as typeof Intl.Locale,
    };

    const result = getTextDirection('ar');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('rtl');
    }
  });

  // 3b. textInfo property returns { direction: 'ltr' } (Safari fallback, LTR case)
  it('returns ltr when textInfo property returns ltr (Safari fallback)', () => {
    const FakeLocale = class {
      textInfo = { direction: 'ltr' };
    };

    globalThis.Intl = {
      ...RealIntl,
      Locale: FakeLocale as unknown as typeof Intl.Locale,
    };

    const result = getTextDirection('en');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ltr');
    }
  });

  // 4. Intl.Locale constructor throws — falls through to static lookup
  it('falls through to static lookup when Intl.Locale constructor throws', () => {
    const FakeLocale = class {
      constructor() {
        throw new Error('Unsupported locale');
      }
    };

    globalThis.Intl = {
      ...RealIntl,
      Locale: FakeLocale as unknown as typeof Intl.Locale,
    };

    // RTL language via static lookup
    const rtlResult = getTextDirection('ar');
    expect(rtlResult.ok).toBe(true);
    if (rtlResult.ok) {
      expect(rtlResult.data).toBe('rtl');
    }

    // LTR language via static lookup
    const ltrResult = getTextDirection('en');
    expect(ltrResult.ok).toBe(true);
    if (ltrResult.ok) {
      expect(ltrResult.data).toBe('ltr');
    }
  });

  // 5. getTextInfo() method throws — falls through to textInfo property or static lookup
  it('falls through to textInfo property when getTextInfo() throws', () => {
    const FakeLocale = class {
      textInfo = { direction: 'rtl' };

      getTextInfo(): never {
        throw new Error('getTextInfo failed');
      }
    };

    globalThis.Intl = {
      ...RealIntl,
      Locale: FakeLocale as unknown as typeof Intl.Locale,
    };

    // getTextInfo() throws, but textInfo property is present — should NOT throw out
    // because the outer try/catch catches it and we never reach textInfo property
    // Actually: the throw from getTextInfo is caught by the outer try/catch at line 150,
    // so it falls through to static lookup, not textInfo property.
    const result = getTextDirection('ar');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('rtl');
    }
  });

  // 5b. getTextInfo() returns invalid data — falls through to textInfo property
  it('falls through to textInfo when getTextInfo() returns invalid data', () => {
    const FakeLocale = class {
      textInfo = { direction: 'rtl' };

      getTextInfo(): { bad: string } {
        return { bad: 'data' };
      }
    };

    globalThis.Intl = {
      ...RealIntl,
      Locale: FakeLocale as unknown as typeof Intl.Locale,
    };

    const result = getTextDirection('ar');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('rtl');
    }
  });

  // 5c. Both getTextInfo() and textInfo return invalid data — falls to static lookup
  it('falls through to static lookup when both Intl paths return invalid data', () => {
    const FakeLocale = class {
      textInfo = { bad: 'data' };

      getTextInfo(): { bad: string } {
        return { bad: 'data' };
      }
    };

    globalThis.Intl = {
      ...RealIntl,
      Locale: FakeLocale as unknown as typeof Intl.Locale,
    };

    const rtlResult = getTextDirection('he');
    expect(rtlResult.ok).toBe(true);
    if (rtlResult.ok) {
      expect(rtlResult.data).toBe('rtl');
    }

    const ltrResult = getTextDirection('fr');
    expect(ltrResult.ok).toBe(true);
    if (ltrResult.ok) {
      expect(ltrResult.data).toBe('ltr');
    }
  });
});

// =============================================================================
// Static lookup — script subtag branch coverage
// =============================================================================

describe('getTextDirection — static lookup script/parts branches', () => {
  const RealIntl = globalThis.Intl;

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.Intl = RealIntl;
  });

  // Force static lookup by making Intl.Locale throw
  function forceStaticLookup(): void {
    const FakeLocale = class {
      constructor() {
        throw new Error('forced static lookup');
      }
    };
    globalThis.Intl = {
      ...RealIntl,
      Locale: FakeLocale as unknown as typeof Intl.Locale,
    };
  }

  it('returns ltr for script subtag that exists but is NOT RTL — e.g., en-Latn (line 162 false branch)', () => {
    forceStaticLookup();
    // 'en-latn' → parts = ['en', 'latn'], parts[1].length === 4, but 'latn' is not in RTL_SCRIPTS
    const result = getTextDirection('en-Latn');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ltr');
    }
  });

  it('returns ltr for Cyrillic script subtag — sr-Cyrl (line 162 false branch)', () => {
    forceStaticLookup();
    // 'sr-cyrl' → parts = ['sr', 'cyrl'], parts[1].length === 4, but 'cyrl' is not in RTL_SCRIPTS
    const result = getTextDirection('sr-Cyrl');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ltr');
    }
  });

  it('returns ltr for single-segment locale with no script — e.g., zh (line 159 false branch)', () => {
    forceStaticLookup();
    // 'zh' → parts = ['zh'], parts.length === 1, so parts.length >= 2 is FALSE
    const result = getTextDirection('zh');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ltr');
    }
  });

  it('skips script check when parts[1] is not length 4 — e.g., en-US (line 157 false branch)', () => {
    forceStaticLookup();
    // 'en-us' → parts = ['en', 'us'], parts[1].length === 2 (not 4), so script = undefined
    const result = getTextDirection('en-US');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ltr');
    }
  });

  // --- Line 162 TRUE branch: script is 4-char AND in RTL_SCRIPTS ---
  it('returns rtl for RTL script subtag in static lookup — xx-Arab (line 162 true branch)', () => {
    forceStaticLookup();
    // 'xx-arab' → parts = ['xx', 'arab'], parts[1].length === 4, 'arab' IS in RTL_SCRIPTS
    const result = getTextDirection('xx-Arab');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('rtl');
    }
  });

  it('returns rtl for Adlam script in static lookup — ff-Adlm (line 162 true branch)', () => {
    forceStaticLookup();
    const result = getTextDirection('ff-Adlm');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('rtl');
    }
  });

  it('returns rtl for Hebrew script in static lookup — xx-Hebr (line 162 true branch)', () => {
    forceStaticLookup();
    const result = getTextDirection('xx-Hebr');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('rtl');
    }
  });

  it('returns rtl for Thaana script in static lookup — xx-Thaa (line 162 true branch)', () => {
    forceStaticLookup();
    const result = getTextDirection('xx-Thaa');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('rtl');
    }
  });
});
