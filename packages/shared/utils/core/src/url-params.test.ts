/**
 * Unit tests for the shared URL parameter parsing utilities.
 *
 * Tests `parsePrefixedParams` (generic prefix-based URL param extraction)
 * and `UrlOverridesSchema` (record schema validation).
 *
 * @module
 */
import { describe, expect, it } from 'vitest';
import * as v from 'valibot';
import type { Str } from '@/schemas/common';

import { parsePrefixedParams, UrlOverridesSchema } from './url-params';

// ── parsePrefixedParams ─────────────────────────────────────────────────

describe('parsePrefixedParams', () => {
  const PREFIX: Str = 'app.';

  it('returns empty overrides for URL with no prefixed params', () => {
    const result = parsePrefixedParams(new URL('http://localhost'), PREFIX);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({});
  });

  it('extracts single prefixed param', () => {
    const result = parsePrefixedParams(new URL(`http://localhost?${PREFIX}debug=true`), PREFIX);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ debug: 'true' });
  });

  it('extracts multiple prefixed params', () => {
    const result = parsePrefixedParams(
      new URL(`http://localhost?${PREFIX}debug=true&${PREFIX}level=trace&${PREFIX}theme=midnight`),
      PREFIX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({
        debug: 'true',
        level: 'trace',
        theme: 'midnight',
      });
    }
  });

  it('ignores non-prefixed params', () => {
    const result = parsePrefixedParams(
      new URL(`http://localhost?foo=bar&${PREFIX}debug=true&baz=qux`),
      PREFIX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ debug: 'true' });
  });

  it('handles empty value', () => {
    const result = parsePrefixedParams(new URL(`http://localhost?${PREFIX}debug=`), PREFIX);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ debug: '' });
  });

  it('handles URL with hash and path', () => {
    const result = parsePrefixedParams(
      new URL(`http://localhost/editor?${PREFIX}debug=true#section`),
      PREFIX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ debug: 'true' });
  });

  it('works with different prefix values', () => {
    const customPrefix: Str = 'wf_';
    const result = parsePrefixedParams(
      new URL(`http://localhost?wf_mode=dark&wf_lang=ja`),
      customPrefix,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ mode: 'dark', lang: 'ja' });
    }
  });

  it('preserves dotted keys after prefix (e.g., ff.settings)', () => {
    const result = parsePrefixedParams(
      new URL(`http://localhost?${PREFIX}ff.settings=false`),
      PREFIX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ 'ff.settings': 'false' });
  });

  it('returns empty overrides when all params use a different prefix', () => {
    const result = parsePrefixedParams(
      new URL('http://localhost?other.debug=true&other.theme=dark'),
      PREFIX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({});
  });
});

// ── UrlOverridesSchema ──────────────────────────────────────────────────

describe('UrlOverridesSchema', () => {
  it('validates a valid overrides map', () => {
    const result = v.safeParse(UrlOverridesSchema, { theme: 'midnight', locale: 'ja' });
    expect(result.success).toBe(true);
  });

  it('rejects non-string values', () => {
    const result = v.safeParse(UrlOverridesSchema, { theme: 123 });
    expect(result.success).toBe(false);
  });
});
