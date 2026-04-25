/**
 * Tests for string utilities.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import type { CamelCaseString, NonNegativeInteger, Str } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { padRight, truncateLine, toCamelCase } from './string';

// ── padRight ────────────────────────────────────────────────────────────

describe('padRight', () => {
  it('pads string to target length', () => {
    const result: Result<Str> = padRight('hello', 10 as NonNegativeInteger);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('hello     ');
    }
  });

  it('returns unchanged when already at length', () => {
    const result: Result<Str> = padRight('hello', 5 as NonNegativeInteger);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('hello');
    }
  });

  it('returns unchanged when longer than target', () => {
    const result: Result<Str> = padRight('long text', 4 as NonNegativeInteger);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('long text');
    }
  });

  it('returns validation error for non-string input', () => {
    const result: Result<Str> = padRight(42 as unknown as Str, 10 as NonNegativeInteger);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('returns validation error for negative length', () => {
    const result: Result<Str> = padRight('hello', -1 as unknown as NonNegativeInteger);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('returns validation error for non-integer length', () => {
    const result: Result<Str> = padRight('hello', 1.5 as unknown as NonNegativeInteger);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('pads empty string to target width', () => {
    const result: Result<Str> = padRight('', 3 as NonNegativeInteger);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('   ');
    }
  });
});

// ── truncateLine ────────────────────────────────────────────────────────

describe('truncateLine', () => {
  it('truncates long string with ellipsis', () => {
    const result: Result<Str> = truncateLine('Hello, world!', 8 as NonNegativeInteger);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('…');
      expect(result.data.length).toBeLessThanOrEqual(8 + 1); // 7 chars + ellipsis
    }
  });

  it('returns unchanged when within width', () => {
    const result: Result<Str> = truncateLine('short', 20 as NonNegativeInteger);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('short');
    }
  });

  it('handles ANSI codes (not counted as visible)', () => {
    const ansiStr = '\u001B[31mred text\u001B[0m';
    const result: Result<Str> = truncateLine(ansiStr, 20 as NonNegativeInteger);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // 'red text' is 8 visible chars, well within 20 — no truncation
      expect(result.data).toBe(ansiStr);
    }
  });

  it('handles zero width', () => {
    const result: Result<Str> = truncateLine('hello', 0 as NonNegativeInteger);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('…');
    }
  });

  it('preserves trailing ANSI reset codes after truncation point', () => {
    /* Visible text "abcdefgh" (8 visible) plus a trailing reset escape.
     * Width 5 forces truncation, and the trailing ANSI cluster sits exactly
     * at the truncation index — exercises the trailing-ANSI loop (lines 122–127). */
    const input: Str = 'abcdefgh\u001B[0m';
    const result: Result<Str> = truncateLine(input, 5 as NonNegativeInteger);
    expect(result.ok).toBe(true);
    if (result.ok) {
      /* Slice keeps the first 4 visible chars then ellipsis — no trailing reset
       * is appended because the cursor sits before the ANSI cluster. */
      expect(result.data).toBe('abcd…');
    }
  });

  it('walks past a malformed trailing ANSI escape with no terminator', () => {
    /* A bare ESC byte at the truncation index has no `m` terminator; the loop
     * must `break` (line 125) instead of looping forever. */
    const input: Str = 'abcd\u001B';
    const result: Result<Str> = truncateLine(input, 3 as NonNegativeInteger);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ab…');
    }
  });

  it('returns validation error for non-string input', () => {
    const result: Result<Str> = truncateLine(null as unknown as Str, 10 as NonNegativeInteger);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('returns validation error for negative width', () => {
    const result: Result<Str> = truncateLine('hello', -5 as unknown as NonNegativeInteger);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('returns empty string when input is empty', () => {
    const result: Result<Str> = truncateLine('', 10 as NonNegativeInteger);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('');
    }
  });

  it('truncates long string with embedded ANSI codes', () => {
    // Visible "Hello, world!" is 13 chars; truncated to 8 visible + ellipsis
    const ansiStr = '\u001B[31mHello, world!\u001B[0m';
    const result: Result<Str> = truncateLine(ansiStr, 8 as NonNegativeInteger);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('…');
      // Ensure ANSI prefix preserved
      expect(result.data.startsWith('\u001B[31m')).toBe(true);
    }
  });

  it('truncates when incomplete ANSI escape sequence present', () => {
    // ESC [ without closing 'm' — should still count each character
    const broken = '\u001B[aaaaaaaaaaaaa';
    const result: Result<Str> = truncateLine(broken, 5 as NonNegativeInteger);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('…');
    }
  });
});

// ── toCamelCase ─────────────────────────────────────────────────────────

describe('toCamelCase', () => {
  it('converts kebab-case to camelCase', () => {
    const result: Result<CamelCaseString> = toCamelCase('fail-fast');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('failFast');
    }
  });

  it('returns unchanged when no hyphens', () => {
    const result: Result<CamelCaseString> = toCamelCase('simple');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('simple');
    }
  });

  it('handles multiple hyphens', () => {
    const result: Result<CamelCaseString> = toCamelCase('no-color-output');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('noColorOutput');
    }
  });

  it('returns validation error for non-string input', () => {
    const result: Result<CamelCaseString> = toCamelCase(42 as unknown as Str);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('rejects empty string (CamelCaseString requires ≥1 char)', () => {
    const result: Result<CamelCaseString> = toCamelCase('');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INTERNAL.OUTPUT_VALIDATION_FAILED');
    }
  });

  it('fails output validation for mixed hyphen-uppercase (not camelCase)', () => {
    // Regex replaces `-[a-z]`; `-B` is NOT matched, leaving the hyphen.
    // Output "foo-Bar" fails CamelCaseString's regex → OUTPUT_VALIDATION_FAILED.
    const result: Result<CamelCaseString> = toCamelCase('foo-Bar');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INTERNAL.OUTPUT_VALIDATION_FAILED');
    }
  });
});
