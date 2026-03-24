/**
 * Tests for error utility functions.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import type { Str, Bool } from '@/schemas/common';
import {
  type AppError,
  type KnownErrorCode,
  type Result,
  ERRORS,
  okUnchecked,
} from '@/schemas/result/result';
import {
  isAppError,
  isResult,
  hasCode,
  hasAnyCode,
  isInDomain,
  getCauseChain,
  findInCauseChain,
  getRootCause,
  getDomain,
  getSeverity,
  isRetryable,
} from './error-utils';

// ── Helpers ─────────────────────────────────────────────────────────────

const makeError = (overrides?: Partial<AppError>): AppError =>
  ({
    code: ERRORS.HTTP.SERVER_ERROR as Str,
    message: 'Server error' as Str,
    id: '550e8400-e29b-41d4-a716-446655440000' as Str,
    timestamp: '2026-03-05T12:00:00.000Z' as Str,
    stack: '' as Str,
    ...overrides,
  }) as AppError;

// ── isAppError ──────────────────────────────────────────────────────────

describe('isAppError', () => {
  it('returns true for AppError objects', () => {
    expect(isAppError(makeError())).toBe(true);
  });

  it('returns false for non-AppError values', () => {
    expect(isAppError(null)).toBe(false);
    expect(isAppError(42)).toBe(false);
    expect(isAppError('string')).toBe(false);
    expect(isAppError({ code: 'X' })).toBe(false);
  });
});

// ── isResult ────────────────────────────────────────────────────────────

describe('isResult', () => {
  it('returns true for ok result', () => {
    expect(isResult(okUnchecked(42))).toBe(true);
  });

  it('returns true for error result', () => {
    const error = makeError();
    expect(isResult({ ok: false, data: null, error })).toBe(true);
  });

  it('returns false for non-Result values', () => {
    expect(isResult(null)).toBe(false);
    expect(isResult(42)).toBe(false);
    expect(isResult({ ok: 'not boolean' })).toBe(false);
    expect(isResult({ ok: true })).toBe(false); // missing data
  });
});

// ── hasCode ─────────────────────────────────────────────────────────────

describe('hasCode', () => {
  it('matches error code', () => {
    const result: Result<Bool> = hasCode(makeError(), ERRORS.HTTP.SERVER_ERROR);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(true);
  });

  it('rejects wrong code', () => {
    const result: Result<Bool> = hasCode(makeError(), ERRORS.INTERNAL.UNEXPECTED);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(false);
  });
});

// ── hasAnyCode ──────────────────────────────────────────────────────────

describe('hasAnyCode', () => {
  it('matches any code in list', () => {
    const result: Result<Bool> = hasAnyCode(makeError(), [
      ERRORS.INTERNAL.UNEXPECTED,
      ERRORS.HTTP.SERVER_ERROR,
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(true);
  });

  it('returns false when no codes match', () => {
    const result: Result<Bool> = hasAnyCode(makeError(), [ERRORS.INTERNAL.UNEXPECTED]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(false);
  });
});

// ── isInDomain ──────────────────────────────────────────────────────────

describe('isInDomain', () => {
  it('matches domain prefix', () => {
    const result: Result<Bool> = isInDomain(makeError(), 'HTTP');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(true);
  });

  it('rejects wrong domain', () => {
    const result: Result<Bool> = isInDomain(makeError(), 'INTERNAL');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(false);
  });

  it('returns error for code with invalid domain prefix', () => {
    // '123' is not a valid ErrorDomain — safeParse(ErrorDomainSchema) should fail
    const result: Result<Bool> = isInDomain(
      makeError({ code: '123.INVALID' as KnownErrorCode }),
      '123' as never,
    );
    expect(result.ok).toBe(false);
  });
});

// ── getCauseChain ───────────────────────────────────────────────────────

describe('getCauseChain', () => {
  it('returns chain of causes', () => {
    const root = makeError({ code: ERRORS.DB.NOT_FOUND });
    const mid = makeError({ code: ERRORS.DB.CONNECTION, cause: root });
    const top = makeError({ code: ERRORS.AUTH.INVALID_TOKEN, cause: mid });

    const result = getCauseChain(top);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(3);
      expect(result.data[0]!.code).toBe(ERRORS.AUTH.INVALID_TOKEN);
      expect(result.data[2]!.code).toBe(ERRORS.DB.NOT_FOUND);
    }
  });

  it('returns single-element array for error without cause', () => {
    const result = getCauseChain(makeError());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(1);
  });
});

// ── findInCauseChain ────────────────────────────────────────────────────

describe('findInCauseChain', () => {
  it('finds matching code in chain', () => {
    const root = makeError({ code: ERRORS.DB.NOT_FOUND });
    const top = makeError({ code: ERRORS.AUTH.INVALID_TOKEN, cause: root });

    const result = findInCauseChain(top, ERRORS.DB.NOT_FOUND);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).not.toBeNull();
      expect(result.data!.code).toBe(ERRORS.DB.NOT_FOUND);
    }
  });

  it('returns null for no match', () => {
    const result = findInCauseChain(makeError(), 'NONEXISTENT.CODE' as KnownErrorCode);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBeNull();
  });
});

// ── getRootCause ────────────────────────────────────────────────────────

describe('getRootCause', () => {
  it('returns deepest cause', () => {
    const root = makeError({ code: ERRORS.DB.NOT_FOUND });
    const top = makeError({ code: ERRORS.AUTH.INVALID_TOKEN, cause: root });

    const result = getRootCause(top);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.code).toBe(ERRORS.DB.NOT_FOUND);
  });

  it('returns self when no cause', () => {
    const error = makeError();
    const result = getRootCause(error);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.code).toBe(ERRORS.HTTP.SERVER_ERROR);
  });
});

// ── getDomain ───────────────────────────────────────────────────────────

describe('getDomain', () => {
  it('extracts domain from error code', () => {
    const result = getDomain(makeError());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('HTTP');
  });

  it('returns error for code without dot separator', () => {
    const result = getDomain(makeError({ code: 'NODOT' as KnownErrorCode }));
    expect(result.ok).toBe(false);
  });
});

// ── getSeverity ─────────────────────────────────────────────────────────

describe('getSeverity', () => {
  it('returns error severity', () => {
    const result = getSeverity(makeError({ severity: 'warning' }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('warning');
  });

  it('defaults to error when severity not set', () => {
    const result = getSeverity(makeError());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('error');
  });
});

// ── isRetryable ─────────────────────────────────────────────────────────

describe('isRetryable', () => {
  it('returns true when retry field is present', () => {
    const result = isRetryable(makeError({ retry: { retryable: true } }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(true);
  });

  it('returns false when no retry field', () => {
    const result = isRetryable(makeError());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(false);
  });
});
