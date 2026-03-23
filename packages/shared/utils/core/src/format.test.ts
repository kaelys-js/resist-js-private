/**
 * Tests for format utilities.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import type { NonNegativeNumber, Str } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { escapeXml, formatDuration } from './format';

// ── escapeXml ───────────────────────────────────────────────────────────

describe('escapeXml', () => {
  it('escapes ampersand, angle brackets, and quotes', () => {
    const result: Result<Str> = escapeXml('foo & "bar" <baz> \'qux\'');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('foo &amp; &quot;bar&quot; &lt;baz&gt; &apos;qux&apos;');
    }
  });

  it('returns unchanged string with no special characters', () => {
    const result: Result<Str> = escapeXml('hello world');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('hello world');
  });

  it('returns validation error for non-string input', () => {
    const result: Result<Str> = escapeXml(42 as unknown as Str);
    expect(result.ok).toBe(false);
  });
});

// ── formatDuration ──────────────────────────────────────────────────────

describe('formatDuration', () => {
  it('returns <1ms for 0', () => {
    const result: Result<Str> = formatDuration(0 as NonNegativeNumber);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('<1ms');
  });

  it('returns <1ms for sub-millisecond values', () => {
    const result: Result<Str> = formatDuration(0.5 as NonNegativeNumber);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('<1ms');
  });

  it('returns milliseconds for values < 1000', () => {
    const result: Result<Str> = formatDuration(42 as NonNegativeNumber);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('42ms');
  });

  it('rounds milliseconds to nearest integer', () => {
    const result: Result<Str> = formatDuration(42.7 as NonNegativeNumber);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('43ms');
  });

  it('returns seconds with 2 decimals for values < 60000', () => {
    const result: Result<Str> = formatDuration(1500 as NonNegativeNumber);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('1.50s');
  });

  it('returns minutes and seconds for values >= 60000', () => {
    const result: Result<Str> = formatDuration(90000 as NonNegativeNumber);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('1m 30.0s');
  });

  it('returns validation error for negative input', () => {
    const result: Result<Str> = formatDuration(-1 as unknown as NonNegativeNumber);
    expect(result.ok).toBe(false);
  });
});
