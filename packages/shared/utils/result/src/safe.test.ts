/**
 * Tests for safeParse and fromUnknownError.
 *
 * @module
 */

import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import type { Str } from '@/schemas/common';
import type { AppError, Result } from '@/schemas/result/result';
import { safeParse, fromUnknownError } from './safe';

// ── Test schemas ────────────────────────────────────────────────────────

const UserSchema = v.strictObject({
  name: v.pipe(v.string(), v.minLength(1)),
  age: v.pipe(v.number(), v.integer(), v.minValue(0)),
});

type User = v.InferOutput<typeof UserSchema>;

// ── safeParse ───────────────────────────────────────────────────────────

describe('safeParse', () => {
  it('returns ok with validated data for valid input', () => {
    const result: Result<User> = safeParse(UserSchema, { name: 'Alice', age: 30 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe('Alice');
      expect(result.data.age).toBe(30);
    }
  });

  it('returns error for invalid input', () => {
    const result: Result<User> = safeParse(UserSchema, { name: '', age: -1 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toContain('VALIDATION');
      expect(result.error.validation).toBeDefined();
      expect(result.error.validation!.issues.length).toBeGreaterThan(0);
    }
  });

  it('deep-freezes successful output', () => {
    const result: Result<User> = safeParse(UserSchema, { name: 'Bob', age: 25 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.isFrozen(result.data)).toBe(true);
    }
  });

  it('freezes the result envelope itself', () => {
    const result: Result<User> = safeParse(UserSchema, { name: 'Bob', age: 25 });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('includes flattened errors in validation detail', () => {
    const result: Result<User> = safeParse(UserSchema, { name: '', age: 'not a number' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.validation!.flattened).toBeDefined();
    }
  });

  it('returns INTERNAL.SAFE_PARSE_THREW when schema validator throws', () => {
    // Create a schema that throws during parse
    const throwingSchema = v.custom<unknown>(() => {
      throw new Error('validator exploded');
    });
    const result = safeParse(throwingSchema, 'anything');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INTERNAL.SAFE_PARSE_THREW');
    }
  });
});

// ── fromUnknownError ────────────────────────────────────────────────────

describe('fromUnknownError', () => {
  it('returns existing AppError as-is when thrown is AppError', () => {
    const appError: AppError = {
      code: 'HTTP.REQUEST_FAILED' as Str,
      message: 'Request failed' as Str,
      id: '550e8400-e29b-41d4-a716-446655440000' as Str,
      timestamp: '2026-03-05T12:00:00.000Z' as Str,
      stack: '' as Str,
    } as AppError;

    const result: AppError = fromUnknownError(appError);
    expect(result.code).toBe('HTTP.REQUEST_FAILED');
    expect(result.message).toBe('Request failed');
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('wraps Error instance with stack and message', () => {
    const error = new Error('Something broke');
    const result: AppError = fromUnknownError(error);
    expect(result.code).toContain('INTERNAL');
    expect(result.message).toBe('Something broke');
    expect(result.stack).toContain('Something broke');
  });

  it('wraps string thrown value', () => {
    const result: AppError = fromUnknownError('string error');
    expect(result.message).toBe('string error');
    expect(result.code).toContain('INTERNAL');
  });

  it('wraps non-Error non-string thrown value', () => {
    const result: AppError = fromUnknownError(42);
    expect(result.message).toBe('42');

    const result2: AppError = fromUnknownError(null);
    expect(result2.message).toBe('null');

    const result3: AppError = fromUnknownError(undefined);
    expect(result3.message).toBe('undefined');
  });

  it('preserves custom error class name in meta', () => {
    const result: AppError = fromUnknownError(new TypeError('type error'));
    expect(result.meta).toBeDefined();
    expect(result.meta!.errorName).toBe('TypeError');
  });

  it('does not add meta for plain Error', () => {
    const result: AppError = fromUnknownError(new Error('plain'));
    expect(result.meta).toBeUndefined();
  });

  it('returns frozen AppError', () => {
    const result: AppError = fromUnknownError(new Error('test'));
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('wraps object with non-string code as INTERNAL.UNEXPECTED', () => {
    // Object has code/id/timestamp but code is not a string — should NOT be treated as AppError
    const result: AppError = fromUnknownError({ code: 123, id: 'x', timestamp: 'y', message: 456 });
    expect(result.code).toContain('INTERNAL');
    expect(result.message).not.toBe(456);
  });
});
