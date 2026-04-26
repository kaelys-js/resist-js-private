/**
 * Tests for error formatting utilities.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import type { Str } from '@/schemas/common';
import { type AppError, type Result, ERRORS } from '@/schemas/result/result';
import {
  formatErrorDisplay,
  formatErrorDebug,
  formatErrorJson,
  toRfc9457,
  toHttpResponse,
  formatErrorSafe,
  type ProblemDetails,
} from './format';

// ── Helpers ─────────────────────────────────────────────────────────────

const makeError = (overrides?: Partial<AppError>): AppError =>
  ({
    code: 'HTTP.REQUEST_FAILED' as Str,
    message: 'Request failed with status 500' as Str,
    id: '550e8400-e29b-41d4-a716-446655440000' as Str,
    timestamp: '2026-03-05T12:00:00.000Z' as Str,
    stack: 'Error: boom\n    at foo.ts:1:1' as Str,
    ...overrides,
  }) as AppError;

// ── formatErrorDisplay ──────────────────────────────────────────────────

describe('formatErrorDisplay', () => {
  it('formats error with code and message', () => {
    const result: Result<Str> = formatErrorDisplay(makeError());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('HTTP.REQUEST_FAILED');
      expect(result.data).toContain('Request failed');
    }
  });

  it('includes help text when present', () => {
    const result: Result<Str> = formatErrorDisplay(makeError({ help: 'Try again later' as Str }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('Tip:');
      expect(result.data).toContain('Try again later');
    }
  });
});

// ── formatErrorDebug ────────────────────────────────────────────────────

describe('formatErrorDebug', () => {
  it('includes all optional fields when present', () => {
    const error = makeError({
      severity: 'error',
      httpStatus: 500,
      help: 'Retry the request' as Str,
      tags: { route: '/api/data' },
      meta: { userId: 'user-123' },
      retry: { retryable: true, retryAfterMs: 1000, maxRetries: 3 },
    });
    const result: Result<Str> = formatErrorDebug(error);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('HTTP.REQUEST_FAILED');
      expect(result.data).toContain('500');
      expect(result.data).toContain('Retry the request');
      expect(result.data).toContain('route');
    }
  });

  it('formats minimal error', () => {
    const result: Result<Str> = formatErrorDebug(makeError());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('HTTP.REQUEST_FAILED');
      expect(result.data).toContain('Request failed');
    }
  });

  it('includes cause chain', () => {
    const root = makeError({ code: ERRORS.DB.CONNECTION, message: 'Connection refused' as Str });
    const error = makeError({ cause: root });
    const result: Result<Str> = formatErrorDebug(error);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('caused by');
      expect(result.data).toContain('DB.CONNECTION');
    }
  });

  it('includes validation issues', () => {
    const error = makeError({
      validation: {
        issues: [
          {
            kind: 'validation' as const,
            type: 'string' as const,
            input: '',
            expected: 'string',
            received: 'undefined',
            message: 'Invalid email',
            path: [
              {
                type: 'object' as const,
                origin: 'value' as const,
                input: {},
                key: 'email',
                value: undefined,
              },
            ],
          },
        ],
        flattened: { nested: { email: ['Invalid email'] } },
      },
    });
    const result: Result<Str> = formatErrorDebug(error);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('validation');
      expect(result.data).toContain('email');
    }
  });

  it('includes links when present', () => {
    const error = makeError({
      links: [{ description: 'Error docs', url: 'https://docs.example.com/errors/500' }],
    });
    const result: Result<Str> = formatErrorDebug(error);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('https://docs.example.com');
      expect(result.data).toContain('Error docs');
    }
  });

  it('includes source pointer, parameter, and header', () => {
    const error = makeError({
      source: { pointer: '/data/name', parameter: 'id', header: 'Authorization' },
    });
    const result: Result<Str> = formatErrorDebug(error);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('/data/name');
      expect(result.data).toContain('id');
      expect(result.data).toContain('Authorization');
    }
  });

  it('includes related errors', () => {
    const related = makeError({ code: ERRORS.DB.NOT_FOUND, message: 'Record missing' as Str });
    const error = makeError({ related: [related] });
    const result: Result<Str> = formatErrorDebug(error);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('DB.NOT_FOUND');
    }
  });

  it('formats retry with no retryAfterMs or maxRetries', () => {
    const error = makeError({ retry: { retryable: true } });
    const result: Result<Str> = formatErrorDebug(error);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('retryable=true');
      expect(result.data).not.toContain('after=');
      expect(result.data).not.toContain('max=');
    }
  });

  it('formats source with only parameter (no pointer, no header)', () => {
    const error = makeError({ source: { parameter: 'userId' } });
    const result: Result<Str> = formatErrorDebug(error);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('parameter=userId');
      expect(result.data).not.toContain('pointer=');
      expect(result.data).not.toContain('header=');
    }
  });

  it('formats source with only pointer (no parameter, no header)', () => {
    const error = makeError({ source: { pointer: '/data/name' } });
    const result: Result<Str> = formatErrorDebug(error);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('pointer=/data/name');
      expect(result.data).not.toContain('parameter=');
      expect(result.data).not.toContain('header=');
    }
  });

  it('falls back to "root" when validation issue has no path', () => {
    const error = makeError({
      validation: {
        issues: [
          {
            kind: 'validation' as const,
            type: 'string' as const,
            input: '',
            expected: 'string',
            received: 'undefined',
            message: 'Invalid value',
          },
        ],
        flattened: { nested: {} },
      },
    });
    const result: Result<Str> = formatErrorDebug(error);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('root: Invalid value');
    }
  });

  it('omits stack section when stack is empty', () => {
    const error = makeError({ stack: '' as Str });
    const result: Result<Str> = formatErrorDebug(error);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).not.toContain('stack:');
    }
  });
});

// ── formatErrorJson ─────────────────────────────────────────────────────

describe('formatErrorJson', () => {
  it('produces valid JSON string', () => {
    const result: Result<Str> = formatErrorJson(makeError());
    expect(result.ok).toBe(true);
    if (result.ok) {
      const parsed = JSON.parse(result.data);
      expect(parsed.code).toBe('HTTP.REQUEST_FAILED');
      expect(parsed.message).toBe('Request failed with status 500');
    }
  });
});

// ── toRfc9457 ───────────────────────────────────────────────────────────

describe('toRfc9457', () => {
  it('converts error to RFC 9457 Problem Details', () => {
    const result: Result<ProblemDetails> = toRfc9457(
      makeError({ httpStatus: 500 }),
      'https://example.com/errors',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.type).toContain('HTTP.REQUEST_FAILED');
      expect(result.data.status).toBe(500);
      expect(result.data.title).toBe('HTTP.REQUEST_FAILED');
      expect(result.data.detail).toContain('Request failed');
      expect(result.data.instance).toBeDefined();
    }
  });

  it('includes validation errors when present', () => {
    const error = makeError({
      httpStatus: 400,
      validation: {
        issues: [
          {
            kind: 'validation' as const,
            type: 'string' as const,
            input: '',
            expected: 'string',
            received: 'undefined',
            message: 'Required field',
            path: [
              {
                type: 'object' as const,
                origin: 'value' as const,
                input: {},
                key: 'name',
                value: undefined,
              },
            ],
          },
        ],
        flattened: { nested: { name: ['Required field'] } },
      },
    });
    const result: Result<ProblemDetails> = toRfc9457(error, 'https://example.com/errors');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.errors).toBeDefined();
      expect(result.data.errors!.length).toBeGreaterThan(0);
    }
  });

  it('falls back to "root" when validation issue has no path', () => {
    const error = makeError({
      httpStatus: 422,
      validation: {
        issues: [
          {
            kind: 'validation' as const,
            type: 'string' as const,
            input: '',
            expected: 'string',
            received: 'undefined',
            message: 'Bad value',
          },
        ],
        flattened: { nested: {} },
      },
    });
    const result: Result<ProblemDetails> = toRfc9457(error, 'https://example.com/errors');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.errors).toBeDefined();
      expect(result.data.errors![0]!.field).toBe('root');
    }
  });
});

// ── toHttpResponse ──────────────────────────────────────────────────────

describe('toHttpResponse', () => {
  it('returns Response with correct status and JSON body', async () => {
    const result: Result<Response> = toHttpResponse(
      makeError({ httpStatus: 500 }),
      'https://example.com/errors',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe(500);
      expect(result.data.headers.get('Content-Type')).toBe('application/problem+json');
      const body = await result.data.json();
      expect(body.type).toContain('HTTP.REQUEST_FAILED');
    }
  });

  it('defaults to 500 when httpStatus not set', () => {
    const result: Result<Response> = toHttpResponse(makeError(), 'https://example.com/errors');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe(500);
    }
  });
});

// ── formatErrorSafe ─────────────────────────────────────────────────────

describe('formatErrorSafe', () => {
  it('strips PII — message replaced with code, stack emptied, meta removed', () => {
    const error = makeError({
      message: 'User john@example.com failed auth' as Str,
      stack: 'Error: auth\n    at /home/john/project/src/auth.ts:42:5' as Str,
      meta: { userId: 'user-123', secret: 'password' },
    });
    const result: Result<AppError> = formatErrorSafe(error);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.message).toBe('HTTP.REQUEST_FAILED');
      expect(result.data.stack).toBe('');
      expect(result.data.meta).toBeUndefined();
    }
  });

  it('preserves safe fields — severity, httpStatus, tags, retry', () => {
    const error = makeError({
      severity: 'error',
      httpStatus: 500,
      tags: { route: '/api/data' },
      retry: { retryable: true },
    });
    const result: Result<AppError> = formatErrorSafe(error);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.severity).toBe('error');
      expect(result.data.httpStatus).toBe(500);
      expect(result.data.tags).toEqual({ route: '/api/data' });
      expect(result.data.retry).toEqual({ retryable: true });
    }
  });

  it('recursively strips cause chain', () => {
    const root = makeError({
      code: ERRORS.DB.CONSTRAINT,
      message: 'SELECT * FROM users WHERE id=123' as Str,
      meta: { query: 'sensitive' },
    });
    const error = makeError({ cause: root });
    const result: Result<AppError> = formatErrorSafe(error);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.cause).toBeDefined();
      expect(result.data.cause!.message).toBe(ERRORS.DB.CONSTRAINT);
      expect(result.data.cause!.stack).toBe('');
      expect(result.data.cause!.meta).toBeUndefined();
    }
  });

  it('recursively strips related errors', () => {
    const related = makeError({
      code: ERRORS.IO.READ_FAILED,
      message: 'Cache key user:john not found' as Str,
    });
    const error = makeError({ related: [related] });
    const result: Result<AppError> = formatErrorSafe(error);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.related).toBeDefined();
      expect(result.data.related!).toHaveLength(1);
      expect(result.data.related![0]!.message).toBe(ERRORS.IO.READ_FAILED);
      expect(result.data.related![0]!.stack).toBe('');
    }
  });
});
