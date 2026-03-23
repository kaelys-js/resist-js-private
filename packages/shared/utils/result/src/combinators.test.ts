/**
 * Tests for Result combinators.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest';
import { type AppError, type KnownErrorCode, type Result, okUnchecked, err, ERRORS } from '@/schemas/result/result';
import {
  map,
  mapErr,
  andThen,
  orElse,
  match,
  unwrapOr,
  tap,
  tapErr,
  combine,
  combineWithAllErrors,
  fromThrowable,
  fromAsyncThrowable,
} from './combinators';

// ── Helpers ─────────────────────────────────────────────────────────────

const okResult = <T>(data: T): Result<T> => okUnchecked<T>(data);
const errResult = <T>(code: KnownErrorCode = ERRORS.INTERNAL.UNEXPECTED, message: string = 'test error'): Result<T> =>
  err(code, message) as Result<T>;

// ── map ─────────────────────────────────────────────────────────────────

describe('map', () => {
  it('transforms ok data', () => {
    const result = map(okResult(42), (n) => String(n));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('42');
  });

  it('passes through error', () => {
    const result = map(errResult<number>(), (n) => String(n));
    expect(result.ok).toBe(false);
  });

  it('catches thrown exception in transform fn', () => {
    const result = map(okResult(42), () => {
      throw new Error('boom');
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toContain('INTERNAL');
  });
});

// ── mapErr ──────────────────────────────────────────────────────────────

describe('mapErr', () => {
  it('transforms error', () => {
    const result = mapErr(errResult<number>(), () => ({
      code: ERRORS.HTTP.SERVER_ERROR,
      message: 'mapped',
    }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('HTTP.SERVER_ERROR');
  });

  it('passes through ok', () => {
    const result = mapErr(okResult(42), () => ({
      code: ERRORS.HTTP.SERVER_ERROR,
    }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(42);
  });
});

// ── andThen ─────────────────────────────────────────────────────────────

describe('andThen', () => {
  it('chains ok results', () => {
    const result = andThen(okResult(42), (n) => okResult(n * 2));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(84);
  });

  it('passes through error', () => {
    const result = andThen(errResult<number>(), (n) => okResult(n * 2));
    expect(result.ok).toBe(false);
  });

  it('catches thrown exception in chain fn', () => {
    const result = andThen(okResult(42), () => {
      throw new Error('chain boom');
    });
    expect(result.ok).toBe(false);
  });
});

// ── orElse ──────────────────────────────────────────────────────────────

describe('orElse', () => {
  it('provides fallback for error', () => {
    const result = orElse(errResult<number>(), () => okResult(0));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(0);
  });

  it('passes through ok', () => {
    const result = orElse(okResult(42), () => okResult(0));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(42);
  });

  it('catches thrown exception in fallback fn', () => {
    const result = orElse(errResult<number>(), () => {
      throw new Error('fallback boom');
    });
    expect(result.ok).toBe(false);
  });
});

// ── match ───────────────────────────────────────────────────────────────

describe('match', () => {
  it('calls ok handler for success', () => {
    const value = match(okResult(42), {
      ok: (n) => `got ${String(n)}`,
      err: (e) => `error: ${e.code}`,
    });
    expect(value).toBe('got 42');
  });

  it('calls err handler for error', () => {
    const value = match(errResult<number>(ERRORS.INTERNAL.UNEXPECTED), {
      ok: (n) => `got ${String(n)}`,
      err: (e) => `error: ${e.code}`,
    });
    expect(value).toBe(`error: ${ERRORS.INTERNAL.UNEXPECTED}`);
  });
});

// ── unwrapOr ────────────────────────────────────────────────────────────

describe('unwrapOr', () => {
  it('returns data for ok', () => {
    expect(unwrapOr(okResult(42), 0)).toBe(42);
  });

  it('returns default for error', () => {
    expect(unwrapOr(errResult<number>(), 0)).toBe(0);
  });
});

// ── tap ─────────────────────────────────────────────────────────────────

describe('tap', () => {
  it('runs side-effect for ok', () => {
    const spy = vi.fn();
    const result = tap(okResult(42), spy);
    expect(spy).toHaveBeenCalledWith(42);
    expect(result.ok).toBe(true);
  });

  it('skips for error', () => {
    const spy = vi.fn();
    tap(errResult<number>(), spy);
    expect(spy).not.toHaveBeenCalled();
  });

  it('swallows exception in side-effect and returns original result', () => {
    const result = tap(okResult(42), () => {
      throw new Error('side-effect boom');
    });
    // tap swallows the error — original result returned unchanged
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(42);
  });
});

// ── tapErr ──────────────────────────────────────────────────────────────

describe('tapErr', () => {
  it('runs side-effect for error', () => {
    const spy = vi.fn();
    tapErr(errResult<number>(), spy);
    expect(spy).toHaveBeenCalledOnce();
  });

  it('skips for ok', () => {
    const spy = vi.fn();
    tapErr(okResult(42), spy);
    expect(spy).not.toHaveBeenCalled();
  });

  it('swallows exception in side-effect and returns original result', () => {
    const result = tapErr(errResult<number>(), () => {
      throw new Error('side-effect boom');
    });
    // tapErr swallows the error — original result returned unchanged
    expect(result.ok).toBe(false);
  });
});

// ── combine ─────────────────────────────────────────────────────────────

describe('combine', () => {
  it('collects all ok values', () => {
    const result = combine([okResult(1), okResult(2), okResult(3)]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([1, 2, 3]);
  });

  it('short-circuits on first error', () => {
    const result = combine([okResult(1), errResult<number>(ERRORS.DB.NOT_FOUND), okResult(3)]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(ERRORS.DB.NOT_FOUND);
  });
});

// ── combineWithAllErrors ────────────────────────────────────────────────

describe('combineWithAllErrors', () => {
  it('collects all errors', () => {
    const result = combineWithAllErrors([
      errResult<number>(ERRORS.DB.NOT_FOUND),
      errResult<number>(ERRORS.DB.CONSTRAINT),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(ERRORS.DB.NOT_FOUND);
      expect(result.error.related).toBeDefined();
      expect(result.error.related!).toHaveLength(1);
    }
  });

  it('returns ok when all succeed', () => {
    const result = combineWithAllErrors([okResult(1), okResult(2)]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([1, 2]);
  });
});

// ── fromThrowable ───────────────────────────────────────────────────────

describe('fromThrowable', () => {
  it('wraps successful return', () => {
    const safeFn = fromThrowable((x: number) => x * 2, ERRORS.INTERNAL.UNEXPECTED);
    const result = safeFn(21);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(42);
  });

  it('catches thrown exception', () => {
    const safeFn = fromThrowable(() => {
      throw new Error('kaboom');
    }, ERRORS.INTERNAL.UNEXPECTED);
    const result = safeFn();
    expect(result.ok).toBe(false);
  });
});

// ── fromAsyncThrowable ──────────────────────────────────────────────────

describe('fromAsyncThrowable', () => {
  it('wraps successful async return', async () => {
    const safeFn = fromAsyncThrowable(async (x: number) => x * 2, ERRORS.INTERNAL.UNEXPECTED);
    const result = await safeFn(21);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(42);
  });

  it('catches thrown async exception', async () => {
    const safeFn = fromAsyncThrowable(async () => {
      throw new Error('async kaboom');
    }, ERRORS.INTERNAL.UNEXPECTED);
    const result = await safeFn();
    expect(result.ok).toBe(false);
  });
});
