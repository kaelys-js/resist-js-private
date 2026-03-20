/**
 * Unit tests for the `t()` locale helper function.
 *
 * Tests the convenience wrapper that calls a locale function and returns
 * the translated string, falling back to a default on error.
 *
 * @module
 */
import { describe, expect, it } from 'vitest';
import type { Str } from '@/schemas/common';
import { ERRORS, err, type Result } from '@/schemas/result/result';

import { t } from './t';

/**
 * Creates an error Result for testing.
 *
 * @returns An error Result with LOCALE.LOAD_FAILED code
 */
function errResult(): Result<Str> {
  return err(ERRORS.LOCALE.LOAD_FAILED, 'test error');
}

/**
 * Creates an ok Result for testing.
 *
 * @param data - The string to wrap
 * @returns An ok Result containing the data
 */
function okResult(data: Str): Result<Str> {
  return { ok: true, data, error: null };
}

describe('t', () => {
  it('returns translated string for successful locale function', () => {
    const result: Str = t(() => okResult('Hello'), 'FALLBACK');
    expect(result).toBe('Hello');
  });

  it('returns fallback when locale function returns error', () => {
    const result: Str = t(errResult as Parameters<typeof t>[0], 'MY_FALLBACK');
    expect(result).toBe('MY_FALLBACK');
  });

  it('returns empty string fallback when provided', () => {
    const result: Str = t(errResult as Parameters<typeof t>[0], '');
    expect(result).toBe('');
  });

  it('works with parameterized locale functions', () => {
    const result: Str = t(() => okResult('Hello Alice'), 'FALLBACK');
    expect(result).toBe('Hello Alice');
  });
});
