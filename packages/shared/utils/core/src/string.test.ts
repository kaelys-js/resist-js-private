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
    if (result.ok) expect(result.data).toBe('hello     ');
  });

  it('returns unchanged when already at length', () => {
    const result: Result<Str> = padRight('hello', 5 as NonNegativeInteger);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('hello');
  });

  it('returns unchanged when longer than target', () => {
    const result: Result<Str> = padRight('long text', 4 as NonNegativeInteger);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('long text');
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
    if (result.ok) expect(result.data).toBe('short');
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
    if (result.ok) expect(result.data).toContain('…');
  });
});

// ── toCamelCase ─────────────────────────────────────────────────────────

describe('toCamelCase', () => {
  it('converts kebab-case to camelCase', () => {
    const result: Result<CamelCaseString> = toCamelCase('fail-fast');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('failFast');
  });

  it('returns unchanged when no hyphens', () => {
    const result: Result<CamelCaseString> = toCamelCase('simple');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('simple');
  });

  it('handles multiple hyphens', () => {
    const result: Result<CamelCaseString> = toCamelCase('no-color-output');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('noColorOutput');
  });
});
