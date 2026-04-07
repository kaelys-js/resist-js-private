/**
 * Tests for the result schema package.
 *
 * Covers all exported schemas, constructors (`ok`, `okUnchecked`, `err`),
 * the ERRORS registry, ERROR_MESSAGES templates (all conditional branches),
 * and captured-error schemas.
 *
 * @module
 */

import { describe, expect, it, test } from 'vitest';
import * as v from 'valibot';
import {
  AppErrorSchema,
  err,
  ErrorCodeSchema,
  ErrorDomainSchema,
  ErrorHelpLinkSchema,
  ErrorSeveritySchema,
  ErrorSourceSchema,
  ErrorTagsSchema,
  ERRORS,
  ErrOptionsSchema,
  ErrSchema,
  HttpStatusCodeSchema,
  ok,
  OkSchema,
  okUnchecked,
  RetryInfoSchema,
  type AppError,
  type Result,
  ValidationDetailSchema,
} from '@/schemas/result/result';
import {
  BreadcrumbLevelSchema,
  BreadcrumbSchema,
  CapturedErrorSchema,
  CapturedErrorTypeSchema,
  ErrorContextsSchema,
  ErrorFingerprintSchema,
  ErrorUserContextSchema,
} from '@/schemas/result/captured-error';
import { StrSchema, type Str } from '@/schemas/common';

// =============================================================================
// Helpers
// =============================================================================

/** Valid minimal AppError for reuse in tests. */
function makeAppError(overrides: Partial<AppError> = {}): AppError {
  return {
    code: ERRORS.INTERNAL.UNEXPECTED,
    message: 'test error',
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    stack: 'Error: test\n    at test',
    ...overrides,
  };
}

// =============================================================================
// Original tests (preserved)
// =============================================================================

describe('Result system', () => {
  test('ok() creates a success result with validated data', () => {
    const result: Result<Str> = ok(StrSchema, 'hello');
    expect(result.ok).toBeTruthy();
    if (result.ok) {
      expect(result.data).toBe('hello');
    }
  });

  test('okUnchecked() creates a success result without validation', () => {
    const result: Result<Str> = okUnchecked('already validated' as Str);
    expect(result.ok).toBeTruthy();
    if (result.ok) {
      expect(result.data).toBe('already validated');
    }
  });

  test('err() creates a failure result with error details', () => {
    const result: Result<Str> = err(ERRORS.VALIDATION.SCHEMA_FAILED, 'bad input');
    expect(result.ok).toBeFalsy();
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
      expect(result.error.message).toBe('bad input');
      expect(result.error.id).toBeDefined();
      expect(result.error.timestamp).toBeDefined();
    }
  });

  test('ERRORS registry contains all domains', () => {
    expect(ERRORS.VALIDATION).toBeDefined();
    expect(ERRORS.CONFIG).toBeDefined();
    expect(ERRORS.AUTH).toBeDefined();
    expect(ERRORS.DB).toBeDefined();
    expect(ERRORS.IO).toBeDefined();
    expect(ERRORS.HTTP).toBeDefined();
    expect(ERRORS.NETWORK).toBeDefined();
    expect(ERRORS.WORKSPACE).toBeDefined();
    expect(ERRORS.RUNTIME).toBeDefined();
    expect(ERRORS.FUNCTION).toBeDefined();
    expect(ERRORS.LOCALE).toBeDefined();
    expect(ERRORS.TEMPLATE).toBeDefined();
    expect(ERRORS.RESOURCE).toBeDefined();
    expect(ERRORS.ENCODING).toBeDefined();
    expect(ERRORS.SCENE).toBeDefined();
    expect(ERRORS.PLUGIN).toBeDefined();
    expect(ERRORS.PROJECT).toBeDefined();
    expect(ERRORS.ASSET).toBeDefined();
    expect(ERRORS.INTERNAL).toBeDefined();
  });

  test('error propagation pattern works', () => {
    function inner(): Result<Str> {
      return err(ERRORS.IO.READ_FAILED, 'file not found');
    }

    function outer(): Result<Str> {
      const result: Result<Str> = inner();
      if (!result.ok) {
        return result;
      }
      return okUnchecked(result.data);
    }

    const result: Result<Str> = outer();
    expect(result.ok).toBeFalsy();
    if (!result.ok) {
      expect(result.error.code).toBe('IO.READ_FAILED');
    }
  });
});

// =============================================================================
// TASK 1 — Schema definitions
// =============================================================================

describe('ErrorSeveritySchema', () => {
  it.each(['fatal', 'error', 'warning', 'info', 'advice'] as const)('accepts "%s"', (level) => {
    expect(v.safeParse(ErrorSeveritySchema, level).success).toBe(true);
  });

  it('rejects invalid severity', () => {
    expect(v.safeParse(ErrorSeveritySchema, 'invalid').success).toBe(false);
  });
});

describe('HttpStatusCodeSchema', () => {
  it.each([100, 200, 404, 500, 599])('accepts %d', (code) => {
    expect(v.safeParse(HttpStatusCodeSchema, code).success).toBe(true);
  });

  it.each([99, 600, 3.14, -1])('rejects %d', (code) => {
    expect(v.safeParse(HttpStatusCodeSchema, code).success).toBe(false);
  });
});

describe('ErrorTagsSchema', () => {
  it('accepts string record', () => {
    expect(v.safeParse(ErrorTagsSchema, { key: 'value' }).success).toBe(true);
  });

  it('accepts empty object', () => {
    expect(v.safeParse(ErrorTagsSchema, {}).success).toBe(true);
  });
});

describe('RetryInfoSchema', () => {
  it('accepts valid retry info', () => {
    const result = v.safeParse(RetryInfoSchema, {
      retryable: true,
      retryAfterMs: 5000,
      maxRetries: 3,
    });
    expect(result.success).toBe(true);
  });

  it('accepts minimal (retryable only)', () => {
    expect(v.safeParse(RetryInfoSchema, { retryable: false }).success).toBe(true);
  });

  it('rejects missing retryable', () => {
    expect(v.safeParse(RetryInfoSchema, { retryAfterMs: 1000 }).success).toBe(false);
  });

  it('rejects extra fields', () => {
    expect(v.safeParse(RetryInfoSchema, { retryable: true, extra: 1 }).success).toBe(false);
  });
});

describe('ErrorHelpLinkSchema', () => {
  it('accepts valid link', () => {
    const result = v.safeParse(ErrorHelpLinkSchema, {
      description: 'docs',
      url: 'https://example.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty description', () => {
    expect(
      v.safeParse(ErrorHelpLinkSchema, { description: '', url: 'https://example.com' }).success,
    ).toBe(false);
  });

  it('rejects invalid URL', () => {
    expect(v.safeParse(ErrorHelpLinkSchema, { description: 'x', url: 'not-a-url' }).success).toBe(
      false,
    );
  });
});

describe('ErrorCodeSchema', () => {
  it.each([
    'AUTH.INVALID_TOKEN',
    'DB.NOT_FOUND',
    'IO.READ_FAILED',
    'VALIDATION.SCHEMA_FAILED',
  ])('accepts "%s"', (code) => {
    expect(v.safeParse(ErrorCodeSchema, code).success).toBe(true);
  });

  it('rejects lowercase', () => {
    expect(v.safeParse(ErrorCodeSchema, 'auth.invalid').success).toBe(false);
  });

  it('rejects no dot separator', () => {
    expect(v.safeParse(ErrorCodeSchema, 'NODOT').success).toBe(false);
  });
});

describe('ErrorDomainSchema', () => {
  it.each([
    'VALIDATION',
    'CONFIG',
    'AUTH',
    'DB',
    'IO',
    'HTTP',
    'NETWORK',
    'WORKSPACE',
    'RUNTIME',
    'RESOURCE',
    'ENCODING',
    'FUNCTION',
    'LOCALE',
    'TEMPLATE',
    'SCENE',
    'PLUGIN',
    'PROJECT',
    'ASSET',
    'INTERNAL',
  ])('accepts "%s"', (domain) => {
    expect(v.safeParse(ErrorDomainSchema, domain).success).toBe(true);
  });

  it('rejects invalid domain', () => {
    expect(v.safeParse(ErrorDomainSchema, 'INVALID').success).toBe(false);
  });
});

describe('ValidationDetailSchema', () => {
  it('accepts valid detail', () => {
    expect(v.safeParse(ValidationDetailSchema, { issues: [], flattened: {} }).success).toBe(true);
  });

  it('rejects missing issues', () => {
    expect(v.safeParse(ValidationDetailSchema, { flattened: {} }).success).toBe(false);
  });

  it('rejects missing flattened', () => {
    expect(v.safeParse(ValidationDetailSchema, { issues: [] }).success).toBe(false);
  });
});

// =============================================================================
// TASK 2 — ErrorSourceSchema
// =============================================================================

describe('ErrorSourceSchema', () => {
  it('accepts pointer only', () => {
    expect(v.safeParse(ErrorSourceSchema, { pointer: '/data/name' }).success).toBe(true);
  });

  it('accepts parameter only', () => {
    expect(v.safeParse(ErrorSourceSchema, { parameter: 'id' }).success).toBe(true);
  });

  it('accepts header only', () => {
    expect(v.safeParse(ErrorSourceSchema, { header: 'Authorization' }).success).toBe(true);
  });

  it('accepts all three fields', () => {
    expect(
      v.safeParse(ErrorSourceSchema, {
        pointer: '/data',
        parameter: 'id',
        header: 'Auth',
      }).success,
    ).toBe(true);
  });

  it('rejects empty object (v.check requires at least one field)', () => {
    expect(v.safeParse(ErrorSourceSchema, {}).success).toBe(false);
  });

  it('rejects extra fields', () => {
    expect(v.safeParse(ErrorSourceSchema, { pointer: '/x', extra: 1 }).success).toBe(false);
  });
});

// =============================================================================
// TASK 3 — AppErrorSchema, OkSchema, ErrSchema, ErrOptionsSchema
// =============================================================================

describe('AppErrorSchema', () => {
  it('accepts minimal valid AppError', () => {
    const result = v.safeParse(AppErrorSchema, makeAppError());
    expect(result.success).toBe(true);
  });

  it('accepts AppError with all optional fields', () => {
    const causeError = makeAppError({ code: ERRORS.DB.NOT_FOUND });
    const result = v.safeParse(
      AppErrorSchema,
      makeAppError({
        validation: { issues: [], flattened: {} },
        source: { pointer: '/data' },
        cause: causeError,
        meta: { key: 'value' },
        severity: 'warning',
        httpStatus: 400,
        help: 'Try again',
        links: [{ description: 'docs', url: 'https://example.com' }],
        tags: { service: 'api' },
        retry: { retryable: true, retryAfterMs: 1000, maxRetries: 3 },
        related: [makeAppError({ code: ERRORS.AUTH.EXPIRED })],
      }),
    );
    expect(result.success).toBe(true);
  });

  it('rejects missing code', () => {
    const { code: _, ...noCode } = makeAppError();
    expect(v.safeParse(AppErrorSchema, noCode).success).toBe(false);
  });

  it('rejects invalid UUID', () => {
    expect(v.safeParse(AppErrorSchema, makeAppError({ id: 'not-uuid' })).success).toBe(false);
  });

  it('rejects invalid timestamp', () => {
    expect(v.safeParse(AppErrorSchema, makeAppError({ timestamp: 'not-iso' })).success).toBe(false);
  });
});

describe('OkSchema()', () => {
  const OkNum = OkSchema(v.number());

  it('accepts valid ok result', () => {
    expect(v.safeParse(OkNum, { ok: true, data: 42, error: null }).success).toBe(true);
  });

  it('rejects wrong data type', () => {
    expect(v.safeParse(OkNum, { ok: true, data: 'string', error: null }).success).toBe(false);
  });

  it('rejects ok: false', () => {
    expect(v.safeParse(OkNum, { ok: false, data: null, error: makeAppError() }).success).toBe(
      false,
    );
  });
});

describe('ErrSchema', () => {
  it('accepts valid err result', () => {
    const result = v.safeParse(ErrSchema, { ok: false, data: null, error: makeAppError() });
    expect(result.success).toBe(true);
  });

  it('rejects ok: true', () => {
    expect(v.safeParse(ErrSchema, { ok: true, data: 42, error: null }).success).toBe(false);
  });
});

describe('ErrOptionsSchema', () => {
  it('accepts empty object (all optional)', () => {
    expect(v.safeParse(ErrOptionsSchema, {}).success).toBe(true);
  });

  it('accepts all fields populated', () => {
    const result = v.safeParse(ErrOptionsSchema, {
      validation: { issues: [], flattened: {} },
      source: { pointer: '/data' },
      cause: makeAppError(),
      meta: { key: 'val' },
      severity: 'error',
      httpStatus: 500,
      help: 'Try again',
      links: [{ description: 'docs', url: 'https://example.com' }],
      tags: { svc: 'api' },
      retry: { retryable: true },
      related: [makeAppError()],
    });
    expect(result.success).toBe(true);
  });

  it('rejects extra fields', () => {
    expect(v.safeParse(ErrOptionsSchema, { unknown: true }).success).toBe(false);
  });
});

// =============================================================================
// TASK 4 — _deepFreeze, _okResult, ok(), okUnchecked()
// =============================================================================

describe('_deepFreeze (via ok/err immutability)', () => {
  it('ok() result is frozen', () => {
    const result = ok(v.number(), 42);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('ok() with object data deep-freezes the data', () => {
    const result = ok(v.object({ key: v.string() }), { key: 'val' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.isFrozen(result.data)).toBe(true);
    }
  });

  it('ok() with primitive data returns frozen result', () => {
    const result = ok(v.number(), 42);
    expect(result.ok).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('err() result is frozen', () => {
    const result = err(ERRORS.INTERNAL.UNEXPECTED, 'test');
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('err() error object is frozen', () => {
    const result = err(ERRORS.INTERNAL.UNEXPECTED, 'test');
    if (!result.ok) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });
});

describe('_okResult (object vs primitive)', () => {
  it('okUnchecked with null skips deepFreeze', () => {
    const result = okUnchecked(null);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeNull();
    }
  });

  it('okUnchecked with object applies deepFreeze', () => {
    const result = okUnchecked({ nested: { deep: true } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.isFrozen(result.data)).toBe(true);
    }
  });

  it('okUnchecked with number (primitive)', () => {
    const result = okUnchecked(123);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(123);
    }
  });
});

describe('ok() validation failure', () => {
  it('returns err with OUTPUT_VALIDATION_FAILED when data fails schema', () => {
    // @ts-expect-error -- intentionally passing wrong type to test runtime path
    const result = ok(v.number(), 'not-a-number');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(ERRORS.INTERNAL.OUTPUT_VALIDATION_FAILED);
      expect(result.error.validation).toBeDefined();
      expect(result.error.validation!.issues).toBeDefined();
      expect(result.error.validation!.flattened).toBeDefined();
    }
  });
});

// =============================================================================
// TASK 5 — err() constructor branches
// =============================================================================

describe('err() constructor branches', () => {
  it('uses explicit string message', () => {
    const result = err(ERRORS.IO.READ_FAILED, 'explicit msg');
    if (!result.ok) {
      expect(result.error.message).toBe('explicit msg');
    }
  });

  it('uses ERROR_MESSAGES template when no message provided', () => {
    const result = err(ERRORS.INTERNAL.UNEXPECTED);
    if (!result.ok) {
      expect(result.error.message).toBe('An unexpected error occurred');
    }
  });

  it('uses options as second arg (shorthand)', () => {
    const result = err(ERRORS.IO.READ_FAILED, { meta: { path: '/app/config.ts' } });
    if (!result.ok) {
      expect(result.error.message).toContain('/app/config.ts');
    }
  });

  it('falls back to code string when no template exists and no message', () => {
    // NETWORK.PORT_UNAVAILABLE has no template in ERROR_MESSAGES
    const result = err(ERRORS.NETWORK.PORT_UNAVAILABLE);
    if (!result.ok) {
      expect(result.error.message).toBe('NETWORK.PORT_UNAVAILABLE');
    }
  });

  it('applies ERROR_DEFAULTS severity and httpStatus', () => {
    const result = err(ERRORS.AUTH.UNAUTHORIZED);
    if (!result.ok) {
      expect(result.error.severity).toBe('error');
      expect(result.error.httpStatus).toBe(401);
    }
  });

  it('applies warning severity from defaults', () => {
    const result = err(ERRORS.AUTH.EXPIRED);
    if (!result.ok) {
      expect(result.error.severity).toBe('warning');
    }
  });

  it('applies fatal severity from defaults', () => {
    const result = err(ERRORS.DB.CONNECTION);
    if (!result.ok) {
      expect(result.error.severity).toBe('fatal');
      expect(result.error.httpStatus).toBe(503);
    }
  });

  it('options severity overrides default', () => {
    const result = err(ERRORS.AUTH.UNAUTHORIZED, 'msg', { severity: 'fatal' });
    if (!result.ok) {
      expect(result.error.severity).toBe('fatal');
    }
  });

  it('options httpStatus overrides default', () => {
    const result = err(ERRORS.AUTH.UNAUTHORIZED, 'msg', { httpStatus: 500 });
    if (!result.ok) {
      expect(result.error.httpStatus).toBe(500);
    }
  });

  it('propagates validation field', () => {
    const result = err(ERRORS.VALIDATION.SCHEMA_FAILED, 'msg', {
      validation: { issues: [{ message: 'bad' }], flattened: { root: ['bad'] } },
    });
    if (!result.ok) {
      expect(result.error.validation).toBeDefined();
      expect(result.error.validation!.issues).toHaveLength(1);
    }
  });

  it('propagates source field', () => {
    const result = err(ERRORS.VALIDATION.SCHEMA_FAILED, 'msg', {
      source: { pointer: '/data/name' },
    });
    if (!result.ok) {
      expect(result.error.source!.pointer).toBe('/data/name');
    }
  });

  it('propagates cause field (error chaining)', () => {
    const cause = err(ERRORS.DB.NOT_FOUND, 'not found');
    const result = err(ERRORS.IO.READ_FAILED, 'read failed', {
      cause: !cause.ok ? cause.error : undefined,
    });
    if (!result.ok) {
      expect(result.error.cause).toBeDefined();
      expect(result.error.cause!.code).toBe(ERRORS.DB.NOT_FOUND);
    }
  });

  it('propagates meta field', () => {
    const result = err(ERRORS.IO.READ_FAILED, 'msg', { meta: { path: '/file' } });
    if (!result.ok) {
      expect(result.error.meta!.path).toBe('/file');
    }
  });

  it('propagates help field', () => {
    const result = err(ERRORS.AUTH.EXPIRED, 'msg', { help: 'Refresh your token' });
    if (!result.ok) {
      expect(result.error.help).toBe('Refresh your token');
    }
  });

  it('propagates links field', () => {
    const result = err(ERRORS.AUTH.EXPIRED, 'msg', {
      links: [{ description: 'docs', url: 'https://example.com' }],
    });
    if (!result.ok) {
      expect(result.error.links).toHaveLength(1);
    }
  });

  it('propagates tags field', () => {
    const result = err(ERRORS.IO.READ_FAILED, 'msg', { tags: { service: 'api' } });
    if (!result.ok) {
      expect(result.error.tags!.service).toBe('api');
    }
  });

  it('propagates retry field', () => {
    const result = err(ERRORS.HTTP.SERVER_ERROR, 'msg', {
      retry: { retryable: true, retryAfterMs: 1000, maxRetries: 3 },
    });
    if (!result.ok) {
      expect(result.error.retry!.retryable).toBe(true);
    }
  });

  it('propagates related field', () => {
    const related = err(ERRORS.AUTH.EXPIRED, 'expired');
    const result = err(ERRORS.VALIDATION.SCHEMA_FAILED, 'msg', {
      related: [!related.ok ? related.error : makeAppError()],
    });
    if (!result.ok) {
      expect(result.error.related).toHaveLength(1);
    }
  });

  it('auto-generates valid UUID', () => {
    const result = err(ERRORS.INTERNAL.UNEXPECTED);
    if (!result.ok) {
      expect(result.error.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    }
  });

  it('auto-generates valid ISO timestamp', () => {
    const result = err(ERRORS.INTERNAL.UNEXPECTED);
    if (!result.ok) {
      expect(() => new Date(result.error.timestamp)).not.toThrow();
      expect(new Date(result.error.timestamp).toISOString()).toBe(result.error.timestamp);
    }
  });

  it('auto-generates stack trace', () => {
    const result = err(ERRORS.INTERNAL.UNEXPECTED);
    if (!result.ok) {
      expect(result.error.stack).toBeTruthy();
      expect(typeof result.error.stack).toBe('string');
    }
  });
});

// =============================================================================
// TASK 6 — ERROR_MESSAGES templates (all conditional branches)
// =============================================================================

describe('ERROR_MESSAGES templates', () => {
  // ---- VALIDATION ----
  describe('VALIDATION', () => {
    it('SCHEMA_FAILED without meta', () => {
      const r = err(ERRORS.VALIDATION.SCHEMA_FAILED);
      if (!r.ok) expect(r.error.message).toBe('Schema validation failed');
    });

    it('SCHEMA_FAILED with errors array', () => {
      const r = err(ERRORS.VALIDATION.SCHEMA_FAILED, { meta: { errors: ['e1', 'e2'] } });
      if (!r.ok) expect(r.error.message).toBe('e1; e2');
    });

    it('SCHEMA_FAILED with flag and reason', () => {
      const r = err(ERRORS.VALIDATION.SCHEMA_FAILED, {
        meta: { flag: 'verbose', reason: 'too long' },
      });
      if (!r.ok) expect(r.error.message).toContain("flag 'verbose'");
    });

    it('MISSING_FIELD without meta', () => {
      const r = err(ERRORS.VALIDATION.MISSING_FIELD);
      if (!r.ok) expect(r.error.message).toBe('Required field missing');
    });

    it('MISSING_FIELD with all meta', () => {
      const r = err(ERRORS.VALIDATION.MISSING_FIELD, {
        meta: { field: 'name', locale: 'en', location: 'config.json' },
      });
      if (!r.ok) {
        expect(r.error.message).toContain('name');
        expect(r.error.message).toContain("locale 'en'");
        expect(r.error.message).toContain('config.json');
      }
    });

    it('REQUIRED_FIELD without meta', () => {
      const r = err(ERRORS.VALIDATION.REQUIRED_FIELD);
      if (!r.ok) expect(r.error.message).toBe('Required field is absent');
    });

    it('REQUIRED_FIELD with meta', () => {
      const r = err(ERRORS.VALIDATION.REQUIRED_FIELD, {
        meta: { field: 'email', hint: 'Use a valid email' },
      });
      if (!r.ok) {
        expect(r.error.message).toContain('email');
        expect(r.error.message).toContain('Use a valid email');
      }
    });

    it('INVALID_FORMAT without meta', () => {
      const r = err(ERRORS.VALIDATION.INVALID_FORMAT);
      if (!r.ok) expect(r.error.message).toBe('Format mismatch');
    });

    it('INVALID_FORMAT with all meta', () => {
      const r = err(ERRORS.VALIDATION.INVALID_FORMAT, {
        meta: { field: 'date', reason: 'bad', template: 'tpl', missingVariables: ['v1', 'v2'] },
      });
      if (!r.ok) {
        expect(r.error.message).toContain('date');
        expect(r.error.message).toContain('bad');
        expect(r.error.message).toContain('"tpl"');
        expect(r.error.message).toContain('v1, v2');
      }
    });

    it('INVALID_TYPE without meta', () => {
      const r = err(ERRORS.VALIDATION.INVALID_TYPE);
      if (!r.ok) expect(r.error.message).toBe('Invalid type');
    });

    it('INVALID_TYPE with meta', () => {
      const r = err(ERRORS.VALIDATION.INVALID_TYPE, {
        meta: { field: 'age', expected: 'number', received: 'string' },
      });
      if (!r.ok) {
        expect(r.error.message).toContain('age');
        expect(r.error.message).toContain('number');
        expect(r.error.message).toContain('string');
      }
    });
  });

  // ---- CONFIG ----
  describe('CONFIG', () => {
    it('LOAD_FAILED without meta', () => {
      const r = err(ERRORS.CONFIG.LOAD_FAILED);
      if (!r.ok) expect(r.error.message).toBe('Failed to load config');
    });

    it('LOAD_FAILED with meta', () => {
      const r = err(ERRORS.CONFIG.LOAD_FAILED, { meta: { configPath: '/app/config.ts' } });
      if (!r.ok) expect(r.error.message).toContain('/app/config.ts');
    });

    it('NOT_FOUND without meta', () => {
      const r = err(ERRORS.CONFIG.NOT_FOUND);
      if (!r.ok) expect(r.error.message).toBe('Configuration not found');
    });

    it('NOT_FOUND with meta', () => {
      const r = err(ERRORS.CONFIG.NOT_FOUND, { meta: { path: '/missing' } });
      if (!r.ok) expect(r.error.message).toContain('/missing');
    });

    it('INVALID without meta', () => {
      const r = err(ERRORS.CONFIG.INVALID);
      if (!r.ok) expect(r.error.message).toBe('Invalid configuration');
    });

    it('INVALID with meta', () => {
      const r = err(ERRORS.CONFIG.INVALID, { meta: { path: '/cfg', error: 'bad syntax' } });
      if (!r.ok) {
        expect(r.error.message).toContain('/cfg');
        expect(r.error.message).toContain('bad syntax');
      }
    });
  });

  // ---- AUTH ----
  describe('AUTH', () => {
    it('INVALID_TOKEN', () => {
      const r = err(ERRORS.AUTH.INVALID_TOKEN);
      if (!r.ok) expect(r.error.message).toContain('malformed');
    });

    it('EXPIRED', () => {
      const r = err(ERRORS.AUTH.EXPIRED);
      if (!r.ok) expect(r.error.message).toContain('expired');
    });

    it('UNAUTHORIZED without meta', () => {
      const r = err(ERRORS.AUTH.UNAUTHORIZED);
      if (!r.ok) expect(r.error.message).toContain('missing or invalid');
    });

    it('UNAUTHORIZED with meta', () => {
      const r = err(ERRORS.AUTH.UNAUTHORIZED, { meta: { tool: 'git', reason: 'no token' } });
      if (!r.ok) {
        expect(r.error.message).toContain('git');
        expect(r.error.message).toContain('no token');
      }
    });

    it('FORBIDDEN without meta', () => {
      const r = err(ERRORS.AUTH.FORBIDDEN);
      if (!r.ok) expect(r.error.message).toContain('Insufficient permissions');
    });

    it('FORBIDDEN with meta', () => {
      const r = err(ERRORS.AUTH.FORBIDDEN, { meta: { tool: 'deploy', reason: 'admin only' } });
      if (!r.ok) {
        expect(r.error.message).toContain('deploy');
        expect(r.error.message).toContain('admin only');
      }
    });

    it('DUPLICATE without meta', () => {
      const r = err(ERRORS.AUTH.DUPLICATE);
      if (!r.ok) expect(r.error.message).toContain('already exists');
    });

    it('DUPLICATE with meta', () => {
      const r = err(ERRORS.AUTH.DUPLICATE, { meta: { field: 'email' } });
      if (!r.ok) expect(r.error.message).toContain('email');
    });
  });

  // ---- DB ----
  describe('DB', () => {
    it('NOT_FOUND without meta', () => {
      const r = err(ERRORS.DB.NOT_FOUND);
      if (!r.ok) expect(r.error.message).toBe('Record not found');
    });

    it('NOT_FOUND with meta', () => {
      const r = err(ERRORS.DB.NOT_FOUND, { meta: { id: 'usr-123' } });
      if (!r.ok) expect(r.error.message).toContain('usr-123');
    });

    it('CONSTRAINT without meta', () => {
      const r = err(ERRORS.DB.CONSTRAINT);
      if (!r.ok) expect(r.error.message).toBe('Constraint violation');
    });

    it('CONSTRAINT with meta', () => {
      const r = err(ERRORS.DB.CONSTRAINT, { meta: { constraint: 'unique_email' } });
      if (!r.ok) expect(r.error.message).toContain('unique_email');
    });

    it('CONNECTION', () => {
      const r = err(ERRORS.DB.CONNECTION);
      if (!r.ok) expect(r.error.message).toBe('Database connection failed');
    });
  });

  // ---- IO ----
  describe('IO', () => {
    it('READ_FAILED without meta', () => {
      const r = err(ERRORS.IO.READ_FAILED);
      if (!r.ok) expect(r.error.message).toBe('Cannot read file');
    });

    it('READ_FAILED with meta', () => {
      const r = err(ERRORS.IO.READ_FAILED, { meta: { path: '/x', operation: 'open' } });
      if (!r.ok) {
        expect(r.error.message).toContain('/x');
        expect(r.error.message).toContain('open');
      }
    });

    it('WRITE_FAILED without meta', () => {
      const r = err(ERRORS.IO.WRITE_FAILED);
      if (!r.ok) expect(r.error.message).toBe('Cannot write file');
    });

    it('WRITE_FAILED with meta', () => {
      const r = err(ERRORS.IO.WRITE_FAILED, { meta: { path: '/y' } });
      if (!r.ok) expect(r.error.message).toContain('/y');
    });

    it('TIMEOUT without meta', () => {
      const r = err(ERRORS.IO.TIMEOUT);
      if (!r.ok) expect(r.error.message).toBe('Operation timed out');
    });

    it('TIMEOUT with meta', () => {
      const r = err(ERRORS.IO.TIMEOUT, { meta: { timeoutMs: 3000 } });
      if (!r.ok) expect(r.error.message).toContain('3000ms');
    });

    it('STAT_FAILED without meta', () => {
      const r = err(ERRORS.IO.STAT_FAILED);
      if (!r.ok) expect(r.error.message).toContain('not accessible');
    });

    it('STAT_FAILED with meta', () => {
      const r = err(ERRORS.IO.STAT_FAILED, { meta: { path: '/z', reason: 'permission' } });
      if (!r.ok) {
        expect(r.error.message).toContain('/z');
        expect(r.error.message).toContain('permission');
      }
    });

    it('FETCH_FAILED without meta', () => {
      const r = err(ERRORS.IO.FETCH_FAILED);
      if (!r.ok) expect(r.error.message).toContain('fetch remote');
    });

    it('FETCH_FAILED with meta', () => {
      const r = err(ERRORS.IO.FETCH_FAILED, {
        meta: { url: 'https://api.example.com', reason: 'dns' },
      });
      if (!r.ok) {
        expect(r.error.message).toContain('api.example.com');
        expect(r.error.message).toContain('dns');
      }
    });
  });

  // ---- HTTP ----
  describe('HTTP', () => {
    it('TIMEOUT', () => {
      const r = err(ERRORS.HTTP.TIMEOUT);
      if (!r.ok) expect(r.error.message).toBe('Request timed out');
    });

    it('NOT_FOUND without meta', () => {
      const r = err(ERRORS.HTTP.NOT_FOUND);
      if (!r.ok) expect(r.error.message).toBe('Resource not found');
    });

    it('NOT_FOUND with meta', () => {
      const r = err(ERRORS.HTTP.NOT_FOUND, { meta: { url: '/api/users/999' } });
      if (!r.ok) expect(r.error.message).toContain('/api/users/999');
    });

    it('SERVER_ERROR', () => {
      const r = err(ERRORS.HTTP.SERVER_ERROR);
      if (!r.ok) expect(r.error.message).toBe('Server returned an error');
    });
  });

  // ---- RUNTIME + FUNCTION ----
  describe('RUNTIME + FUNCTION', () => {
    it('UNSUPPORTED without meta (uses ?? fallback)', () => {
      const r = err(ERRORS.RUNTIME.UNSUPPORTED);
      if (!r.ok) expect(r.error.message).toContain('Operation');
    });

    it('UNSUPPORTED with meta', () => {
      const r = err(ERRORS.RUNTIME.UNSUPPORTED, {
        meta: { function: 'WebGPU', requires: 'a modern browser' },
      });
      if (!r.ok) {
        expect(r.error.message).toContain('WebGPU');
        expect(r.error.message).toContain('modern browser');
      }
    });

    it('NOT_CALLABLE', () => {
      const r = err(ERRORS.FUNCTION.NOT_CALLABLE);
      if (!r.ok) expect(r.error.message).toContain('not a callable');
    });

    it('INVALID_ARITY without meta', () => {
      const r = err(ERRORS.FUNCTION.INVALID_ARITY);
      if (!r.ok) expect(r.error.message).toBe('Function arity mismatch');
    });

    it('INVALID_ARITY with meta', () => {
      const r = err(ERRORS.FUNCTION.INVALID_ARITY, {
        meta: { expected: '2', actual: '3' },
      });
      if (!r.ok) expect(r.error.message).toContain('expected 2');
    });

    it('NOT_ASYNC without meta', () => {
      const r = err(ERRORS.FUNCTION.NOT_ASYNC);
      if (!r.ok) expect(r.error.message).toContain('not async');
    });

    it('NOT_ASYNC with meta', () => {
      const r = err(ERRORS.FUNCTION.NOT_ASYNC, { meta: { functionName: 'myFn' } });
      if (!r.ok) expect(r.error.message).toContain('myFn');
    });

    it('PARAM_VALIDATION_FAILED without meta', () => {
      const r = err(ERRORS.FUNCTION.PARAM_VALIDATION_FAILED);
      if (!r.ok) expect(r.error.message).toContain('Parameter validation');
    });

    it('PARAM_VALIDATION_FAILED with meta', () => {
      const r = err(ERRORS.FUNCTION.PARAM_VALIDATION_FAILED, {
        meta: { functionName: 'doStuff' },
      });
      if (!r.ok) expect(r.error.message).toContain('doStuff');
    });

    it('RETURN_VALIDATION_FAILED without meta', () => {
      const r = err(ERRORS.FUNCTION.RETURN_VALIDATION_FAILED);
      if (!r.ok) expect(r.error.message).toContain('Return value');
    });

    it('RETURN_VALIDATION_FAILED with meta', () => {
      const r = err(ERRORS.FUNCTION.RETURN_VALIDATION_FAILED, {
        meta: { functionName: 'getUser' },
      });
      if (!r.ok) expect(r.error.message).toContain('getUser');
    });
  });

  // ---- LOCALE ----
  describe('LOCALE', () => {
    it('LOAD_FAILED without meta', () => {
      const r = err(ERRORS.LOCALE.LOAD_FAILED);
      if (!r.ok) expect(r.error.message).toContain('load locale');
    });

    it('LOAD_FAILED with meta', () => {
      const r = err(ERRORS.LOCALE.LOAD_FAILED, {
        meta: { locale: 'fr', toolId: 'cli', component: 'messages' },
      });
      if (!r.ok) {
        expect(r.error.message).toContain("'fr'");
        expect(r.error.message).toContain("'cli'");
        expect(r.error.message).toContain('messages');
      }
    });

    it('VALIDATION_FAILED without meta', () => {
      const r = err(ERRORS.LOCALE.VALIDATION_FAILED);
      if (!r.ok) expect(r.error.message).toContain('schema validation');
    });

    it('VALIDATION_FAILED with meta', () => {
      const r = err(ERRORS.LOCALE.VALIDATION_FAILED, {
        meta: { locale: 'de', toolId: 'web', component: 'labels' },
      });
      if (!r.ok) {
        expect(r.error.message).toContain("'de'");
        expect(r.error.message).toContain("'web'");
        expect(r.error.message).toContain('labels');
      }
    });

    it('BUILD_FAILED without meta', () => {
      const r = err(ERRORS.LOCALE.BUILD_FAILED);
      if (!r.ok) expect(r.error.message).toContain('build locale');
    });

    it('BUILD_FAILED with meta', () => {
      const r = err(ERRORS.LOCALE.BUILD_FAILED, { meta: { locale: 'ja', component: 'ui' } });
      if (!r.ok) expect(r.error.message).toContain("'ja'");
    });

    it('REGISTRY_MISMATCH without meta', () => {
      const r = err(ERRORS.LOCALE.REGISTRY_MISMATCH);
      if (!r.ok) expect(r.error.message).toContain('registry mismatch');
    });

    it('REGISTRY_MISMATCH with meta', () => {
      const r = err(ERRORS.LOCALE.REGISTRY_MISMATCH, {
        meta: { module: 'core', errors: ['missing key', 'extra key'] },
      });
      if (!r.ok) {
        expect(r.error.message).toContain('core');
        expect(r.error.message).toContain('missing key; extra key');
      }
    });

    it('MISSING_FLAG_DESCRIPTION without meta', () => {
      const r = err(ERRORS.LOCALE.MISSING_FLAG_DESCRIPTION);
      if (!r.ok) expect(r.error.message).toContain('flag description');
    });

    it('MISSING_FLAG_DESCRIPTION with meta', () => {
      const r = err(ERRORS.LOCALE.MISSING_FLAG_DESCRIPTION, {
        meta: { field: 'verbose', locale: 'es', location: 'flags.json' },
      });
      if (!r.ok) {
        expect(r.error.message).toContain("'verbose'");
        expect(r.error.message).toContain("'es'");
        expect(r.error.message).toContain('flags.json');
      }
    });

    it('INVALID_LOCALE without meta', () => {
      const r = err(ERRORS.LOCALE.INVALID_LOCALE);
      if (!r.ok) expect(r.error.message).toContain('Invalid locale');
    });

    it('INVALID_LOCALE with meta', () => {
      const r = err(ERRORS.LOCALE.INVALID_LOCALE, {
        meta: { locale: 'xx', available: ['en', 'fr'] },
      });
      if (!r.ok) {
        expect(r.error.message).toContain("'xx'");
        expect(r.error.message).toContain('en, fr');
      }
    });

    it('INVALID_FALLBACK without meta', () => {
      const r = err(ERRORS.LOCALE.INVALID_FALLBACK);
      if (!r.ok) expect(r.error.message).toContain('Fallback locale');
    });

    it('INVALID_FALLBACK with meta', () => {
      const r = err(ERRORS.LOCALE.INVALID_FALLBACK, {
        meta: { locale: 'zz', available: ['en'] },
      });
      if (!r.ok) {
        expect(r.error.message).toContain("'zz'");
        expect(r.error.message).toContain('en');
      }
    });

    it('REMOVE_DENIED without meta', () => {
      const r = err(ERRORS.LOCALE.REMOVE_DENIED);
      if (!r.ok) expect(r.error.message).toContain('Cannot remove locale');
    });

    it('REMOVE_DENIED with meta', () => {
      const r = err(ERRORS.LOCALE.REMOVE_DENIED, {
        meta: { locale: 'en', reason: 'is default' },
      });
      if (!r.ok) {
        expect(r.error.message).toContain("'en'");
        expect(r.error.message).toContain('is default');
      }
    });

    it('FORMAT_FAILED without meta', () => {
      const r = err(ERRORS.LOCALE.FORMAT_FAILED);
      if (!r.ok) expect(r.error.message).toContain('format');
    });

    it('FORMAT_FAILED with meta', () => {
      const r = err(ERRORS.LOCALE.FORMAT_FAILED, {
        meta: { type: 'date', locale: 'zh', reason: 'invalid pattern' },
      });
      if (!r.ok) {
        expect(r.error.message).toContain('date');
        expect(r.error.message).toContain("'zh'");
        expect(r.error.message).toContain('invalid pattern');
      }
    });
  });

  // ---- TEMPLATE ----
  describe('TEMPLATE', () => {
    it('UNDEFINED_VARIABLES without meta', () => {
      const r = err(ERRORS.TEMPLATE.UNDEFINED_VARIABLES);
      if (!r.ok) expect(r.error.message).toContain('undefined variables');
    });

    it('UNDEFINED_VARIABLES with meta', () => {
      const r = err(ERRORS.TEMPLATE.UNDEFINED_VARIABLES, {
        meta: { template: 'greeting', missingVariables: ['name', 'age'] },
      });
      if (!r.ok) {
        expect(r.error.message).toContain('"greeting"');
        expect(r.error.message).toContain('name, age');
      }
    });

    it('PARAM_VALIDATION_FAILED without meta', () => {
      const r = err(ERRORS.TEMPLATE.PARAM_VALIDATION_FAILED);
      if (!r.ok) expect(r.error.message).toContain('param');
    });

    it('PARAM_VALIDATION_FAILED with meta', () => {
      const r = err(ERRORS.TEMPLATE.PARAM_VALIDATION_FAILED, { meta: { param: 'count' } });
      if (!r.ok) expect(r.error.message).toContain("'count'");
    });
  });

  // ---- SCENE ----
  describe('SCENE', () => {
    it('LOAD_FAILED without meta', () => {
      const r = err(ERRORS.SCENE.LOAD_FAILED);
      if (!r.ok) expect(r.error.message).toContain('load scene');
    });

    it('LOAD_FAILED with meta', () => {
      const r = err(ERRORS.SCENE.LOAD_FAILED, { meta: { scene: 'main', reason: 'corrupt' } });
      if (!r.ok) {
        expect(r.error.message).toContain("'main'");
        expect(r.error.message).toContain('corrupt');
      }
    });

    it('RENDER_FAILED without meta', () => {
      const r = err(ERRORS.SCENE.RENDER_FAILED);
      if (!r.ok) expect(r.error.message).toContain('rendering failed');
    });

    it('RENDER_FAILED with meta', () => {
      const r = err(ERRORS.SCENE.RENDER_FAILED, { meta: { scene: 's1', reason: 'gpu' } });
      if (!r.ok) {
        expect(r.error.message).toContain("'s1'");
        expect(r.error.message).toContain('gpu');
      }
    });

    it('ASSET_MISSING without meta', () => {
      const r = err(ERRORS.SCENE.ASSET_MISSING);
      if (!r.ok) expect(r.error.message).toContain('asset missing');
    });

    it('ASSET_MISSING with meta', () => {
      const r = err(ERRORS.SCENE.ASSET_MISSING, { meta: { asset: 'texture.png', scene: 's2' } });
      if (!r.ok) {
        expect(r.error.message).toContain('texture.png');
        expect(r.error.message).toContain("'s2'");
      }
    });
  });

  // ---- PLUGIN ----
  describe('PLUGIN', () => {
    it('LOAD_FAILED without meta', () => {
      const r = err(ERRORS.PLUGIN.LOAD_FAILED);
      if (!r.ok) expect(r.error.message).toContain('load plugin');
    });

    it('LOAD_FAILED with meta', () => {
      const r = err(ERRORS.PLUGIN.LOAD_FAILED, { meta: { plugin: 'foo', reason: 'missing' } });
      if (!r.ok) {
        expect(r.error.message).toContain("'foo'");
        expect(r.error.message).toContain('missing');
      }
    });

    it('INIT_FAILED without meta', () => {
      const r = err(ERRORS.PLUGIN.INIT_FAILED);
      if (!r.ok) expect(r.error.message).toContain('initialization failed');
    });

    it('INIT_FAILED with meta', () => {
      const r = err(ERRORS.PLUGIN.INIT_FAILED, { meta: { plugin: 'bar', reason: 'timeout' } });
      if (!r.ok) {
        expect(r.error.message).toContain("'bar'");
        expect(r.error.message).toContain('timeout');
      }
    });

    it('API_MISMATCH without meta', () => {
      const r = err(ERRORS.PLUGIN.API_MISMATCH);
      if (!r.ok) expect(r.error.message).toContain('API version');
    });

    it('API_MISMATCH with meta', () => {
      const r = err(ERRORS.PLUGIN.API_MISMATCH, {
        meta: { plugin: 'baz', expected: '2.0', actual: '1.0' },
      });
      if (!r.ok) {
        expect(r.error.message).toContain("'baz'");
        expect(r.error.message).toContain('2.0');
        expect(r.error.message).toContain('1.0');
      }
    });

    it('SANDBOX_VIOLATION without meta', () => {
      const r = err(ERRORS.PLUGIN.SANDBOX_VIOLATION);
      if (!r.ok) expect(r.error.message).toContain('sandbox violation');
    });

    it('SANDBOX_VIOLATION with meta', () => {
      const r = err(ERRORS.PLUGIN.SANDBOX_VIOLATION, {
        meta: { plugin: 'evil', operation: 'fs.write' },
      });
      if (!r.ok) {
        expect(r.error.message).toContain("'evil'");
        expect(r.error.message).toContain('fs.write');
      }
    });
  });

  // ---- PROJECT ----
  describe('PROJECT', () => {
    it('LOAD_FAILED without meta', () => {
      const r = err(ERRORS.PROJECT.LOAD_FAILED);
      if (!r.ok) expect(r.error.message).toContain('load project');
    });

    it('LOAD_FAILED with meta', () => {
      const r = err(ERRORS.PROJECT.LOAD_FAILED, { meta: { path: '/p', reason: 'corrupt' } });
      if (!r.ok) {
        expect(r.error.message).toContain('/p');
        expect(r.error.message).toContain('corrupt');
      }
    });

    it('SAVE_FAILED without meta', () => {
      const r = err(ERRORS.PROJECT.SAVE_FAILED);
      if (!r.ok) expect(r.error.message).toContain('save project');
    });

    it('SAVE_FAILED with meta', () => {
      const r = err(ERRORS.PROJECT.SAVE_FAILED, { meta: { path: '/q', reason: 'disk full' } });
      if (!r.ok) {
        expect(r.error.message).toContain('/q');
        expect(r.error.message).toContain('disk full');
      }
    });

    it('CORRUPT without meta', () => {
      const r = err(ERRORS.PROJECT.CORRUPT);
      if (!r.ok) expect(r.error.message).toContain('corrupt');
    });

    it('CORRUPT with meta', () => {
      const r = err(ERRORS.PROJECT.CORRUPT, { meta: { path: '/r', reason: 'bad json' } });
      if (!r.ok) {
        expect(r.error.message).toContain('/r');
        expect(r.error.message).toContain('bad json');
      }
    });

    it('VERSION_MISMATCH without meta', () => {
      const r = err(ERRORS.PROJECT.VERSION_MISMATCH);
      if (!r.ok) expect(r.error.message).toContain('version mismatch');
    });

    it('VERSION_MISMATCH with meta', () => {
      const r = err(ERRORS.PROJECT.VERSION_MISMATCH, {
        meta: { path: '/s', expected: '2.0', actual: '1.0' },
      });
      if (!r.ok) {
        expect(r.error.message).toContain('/s');
        expect(r.error.message).toContain('2.0');
        expect(r.error.message).toContain('1.0');
      }
    });
  });

  // ---- ASSET ----
  describe('ASSET', () => {
    it('IMPORT_FAILED without meta', () => {
      const r = err(ERRORS.ASSET.IMPORT_FAILED);
      if (!r.ok) expect(r.error.message).toContain('import asset');
    });

    it('IMPORT_FAILED with meta', () => {
      const r = err(ERRORS.ASSET.IMPORT_FAILED, { meta: { asset: 'model.glb', reason: 'bad' } });
      if (!r.ok) {
        expect(r.error.message).toContain('model.glb');
        expect(r.error.message).toContain('bad');
      }
    });

    it('FORMAT_UNSUPPORTED without meta', () => {
      const r = err(ERRORS.ASSET.FORMAT_UNSUPPORTED);
      if (!r.ok) expect(r.error.message).toContain('Unsupported');
    });

    it('FORMAT_UNSUPPORTED with meta', () => {
      const r = err(ERRORS.ASSET.FORMAT_UNSUPPORTED, {
        meta: { format: '.abc', asset: 'file.abc' },
      });
      if (!r.ok) {
        expect(r.error.message).toContain('.abc');
        expect(r.error.message).toContain('file.abc');
      }
    });

    it('TOO_LARGE without meta', () => {
      const r = err(ERRORS.ASSET.TOO_LARGE);
      if (!r.ok) expect(r.error.message).toContain('size limit');
    });

    it('TOO_LARGE with meta', () => {
      const r = err(ERRORS.ASSET.TOO_LARGE, {
        meta: { asset: 'big.png', size: '50MB', limit: '10MB' },
      });
      if (!r.ok) {
        expect(r.error.message).toContain('big.png');
        expect(r.error.message).toContain('50MB');
        expect(r.error.message).toContain('10MB');
      }
    });
  });

  // ---- RESOURCE ----
  describe('RESOURCE', () => {
    it('ALREADY_EXISTS without meta', () => {
      const r = err(ERRORS.RESOURCE.ALREADY_EXISTS);
      if (!r.ok) expect(r.error.message).toContain('already exists');
    });

    it('ALREADY_EXISTS with meta', () => {
      const r = err(ERRORS.RESOURCE.ALREADY_EXISTS, {
        meta: { resource: 'user', id: 'usr-1' },
      });
      if (!r.ok) {
        expect(r.error.message).toContain('user');
        expect(r.error.message).toContain('usr-1');
      }
    });

    it('PRECONDITION_FAILED without meta', () => {
      const r = err(ERRORS.RESOURCE.PRECONDITION_FAILED);
      if (!r.ok) expect(r.error.message).toContain('Precondition failed');
    });

    it('PRECONDITION_FAILED with meta', () => {
      const r = err(ERRORS.RESOURCE.PRECONDITION_FAILED, {
        meta: { condition: 'etag-match' },
      });
      if (!r.ok) expect(r.error.message).toContain('etag-match');
    });

    it('GONE without meta', () => {
      const r = err(ERRORS.RESOURCE.GONE);
      if (!r.ok) expect(r.error.message).toContain('no longer available');
    });

    it('GONE with meta', () => {
      const r = err(ERRORS.RESOURCE.GONE, { meta: { resource: 'file' } });
      if (!r.ok) expect(r.error.message).toContain('file');
    });

    it('CONFLICT without meta', () => {
      const r = err(ERRORS.RESOURCE.CONFLICT);
      if (!r.ok) expect(r.error.message).toContain('Version conflict');
    });

    it('CONFLICT with meta', () => {
      const r = err(ERRORS.RESOURCE.CONFLICT, {
        meta: { resource: 'doc', expected: 'v2', actual: 'v1' },
      });
      if (!r.ok) {
        expect(r.error.message).toContain('doc');
        expect(r.error.message).toContain('v2');
        expect(r.error.message).toContain('v1');
      }
    });

    it('QUOTA_EXCEEDED without meta', () => {
      const r = err(ERRORS.RESOURCE.QUOTA_EXCEEDED);
      if (!r.ok) expect(r.error.message).toContain('Quota exceeded');
    });

    it('QUOTA_EXCEEDED with meta', () => {
      const r = err(ERRORS.RESOURCE.QUOTA_EXCEEDED, {
        meta: { quota: 'api-calls', limit: '1000/hr' },
      });
      if (!r.ok) {
        expect(r.error.message).toContain('api-calls');
        expect(r.error.message).toContain('1000/hr');
      }
    });
  });

  // ---- ENCODING ----
  describe('ENCODING', () => {
    it('JSON_FAILED without meta (uses ?? fallback)', () => {
      const r = err(ERRORS.ENCODING.JSON_FAILED);
      if (!r.ok) expect(r.error.message).toContain('JSON operation failed');
    });

    it('JSON_FAILED with meta', () => {
      const r = err(ERRORS.ENCODING.JSON_FAILED, {
        meta: { operation: 'parse', reason: 'unexpected token' },
      });
      if (!r.ok) {
        expect(r.error.message).toContain('parse');
        expect(r.error.message).toContain('unexpected token');
      }
    });

    it('BASE64_FAILED without meta', () => {
      const r = err(ERRORS.ENCODING.BASE64_FAILED);
      if (!r.ok) expect(r.error.message).toContain('Base64 operation');
    });

    it('BASE64_FAILED with meta', () => {
      const r = err(ERRORS.ENCODING.BASE64_FAILED, {
        meta: { operation: 'decode', reason: 'invalid chars' },
      });
      if (!r.ok) {
        expect(r.error.message).toContain('decode');
        expect(r.error.message).toContain('invalid chars');
      }
    });

    it('URL_FAILED without meta', () => {
      const r = err(ERRORS.ENCODING.URL_FAILED);
      if (!r.ok) expect(r.error.message).toContain('URL operation');
    });

    it('URL_FAILED with meta', () => {
      const r = err(ERRORS.ENCODING.URL_FAILED, {
        meta: { operation: 'encode', reason: 'malformed' },
      });
      if (!r.ok) {
        expect(r.error.message).toContain('encode');
        expect(r.error.message).toContain('malformed');
      }
    });
  });

  // ---- INTERNAL ----
  describe('INTERNAL', () => {
    it('UNEXPECTED', () => {
      const r = err(ERRORS.INTERNAL.UNEXPECTED);
      if (!r.ok) expect(r.error.message).toBe('An unexpected error occurred');
    });

    it('OUTPUT_VALIDATION_FAILED', () => {
      const r = err(ERRORS.INTERNAL.OUTPUT_VALIDATION_FAILED);
      if (!r.ok) expect(r.error.message).toBe('Output validation failed');
    });

    it('SAFE_PARSE_THREW', () => {
      const r = err(ERRORS.INTERNAL.SAFE_PARSE_THREW);
      if (!r.ok) expect(r.error.message).toContain('safeParse');
    });

    it('INVARIANT_VIOLATED without meta', () => {
      const r = err(ERRORS.INTERNAL.INVARIANT_VIOLATED);
      if (!r.ok) expect(r.error.message).toContain('invariant violated');
    });

    it('INVARIANT_VIOLATED with meta', () => {
      const r = err(ERRORS.INTERNAL.INVARIANT_VIOLATED, {
        meta: { reason: 'null ptr', function: 'init' },
      });
      if (!r.ok) {
        expect(r.error.message).toContain('null ptr');
        expect(r.error.message).toContain('init');
      }
    });
  });
});

// =============================================================================
// TASK 7 — captured-error.ts schemas
// =============================================================================

describe('BreadcrumbLevelSchema', () => {
  it.each(['fatal', 'error', 'warning', 'info', 'debug'] as const)('accepts "%s"', (level) => {
    expect(v.safeParse(BreadcrumbLevelSchema, level).success).toBe(true);
  });

  it('rejects invalid level', () => {
    expect(v.safeParse(BreadcrumbLevelSchema, 'invalid').success).toBe(false);
  });
});

describe('BreadcrumbSchema', () => {
  it('accepts valid breadcrumb with all fields', () => {
    const result = v.safeParse(BreadcrumbSchema, {
      type: 'http',
      category: 'fetch',
      message: 'GET /api/users',
      level: 'info',
      timestamp: '2026-02-22T12:00:00.000Z',
      data: { url: '/api/users', status_code: 200 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts minimal breadcrumb (timestamp only required)', () => {
    expect(v.safeParse(BreadcrumbSchema, { timestamp: '2026-01-01T00:00:00.000Z' }).success).toBe(
      true,
    );
  });

  it('rejects missing timestamp', () => {
    expect(v.safeParse(BreadcrumbSchema, { type: 'http', message: 'test' }).success).toBe(false);
  });

  it('rejects invalid timestamp format', () => {
    expect(v.safeParse(BreadcrumbSchema, { timestamp: 'not-iso' }).success).toBe(false);
  });

  it('rejects extra fields', () => {
    expect(
      v.safeParse(BreadcrumbSchema, { timestamp: '2026-01-01T00:00:00.000Z', extra: 1 }).success,
    ).toBe(false);
  });
});

describe('ErrorUserContextSchema', () => {
  it('accepts valid user context', () => {
    const result = v.safeParse(ErrorUserContextSchema, {
      id: 'user-123',
      email: 'user@example.com',
      username: 'jdoe',
      ipAddress: '192.168.1.1',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (all optional)', () => {
    expect(v.safeParse(ErrorUserContextSchema, {}).success).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(v.safeParse(ErrorUserContextSchema, { email: 'not-an-email' }).success).toBe(false);
  });
});

describe('ErrorContextsSchema', () => {
  it('accepts nested record', () => {
    expect(
      v.safeParse(ErrorContextsSchema, { os: { name: 'macOS', version: '15.2' } }).success,
    ).toBe(true);
  });

  it('accepts empty object', () => {
    expect(v.safeParse(ErrorContextsSchema, {}).success).toBe(true);
  });
});

describe('ErrorFingerprintSchema', () => {
  it('accepts string array', () => {
    expect(v.safeParse(ErrorFingerprintSchema, ['hash1', 'hash2']).success).toBe(true);
  });

  it('accepts empty array', () => {
    expect(v.safeParse(ErrorFingerprintSchema, []).success).toBe(true);
  });
});

describe('CapturedErrorTypeSchema', () => {
  it.each([
    'uncaughtException',
    'unhandledRejection',
    'resourceError',
    'cspViolation',
    'webSocketError',
    'signal',
    'resultError',
  ] as const)('accepts "%s"', (type) => {
    expect(v.safeParse(CapturedErrorTypeSchema, type).success).toBe(true);
  });

  it('rejects invalid type', () => {
    expect(v.safeParse(CapturedErrorTypeSchema, 'invalid').success).toBe(false);
  });
});

describe('CapturedErrorSchema', () => {
  it('accepts valid captured error with all fields', () => {
    const result = v.safeParse(CapturedErrorSchema, {
      type: 'uncaughtException',
      id: crypto.randomUUID(),
      error: makeAppError(),
      original: new Error('test'),
      environment: 'node-tty',
      timestamp: new Date().toISOString(),
      fatal: true,
      meta: { signal: 'SIGINT' },
      breadcrumbs: [{ timestamp: '2026-01-01T00:00:00.000Z', message: 'init' }],
      user: { id: 'u1', email: 'u@example.com' },
      contexts: { os: { name: 'macOS' } },
      fingerprint: ['{{ default }}'],
      tags: { env: 'prod' },
      release: '1.0.0',
      serverName: 'api-1',
    });
    expect(result.success).toBe(true);
  });

  it('accepts minimal captured error', () => {
    const result = v.safeParse(CapturedErrorSchema, {
      type: 'resultError',
      id: crypto.randomUUID(),
      error: makeAppError(),
      original: null,
      environment: 'browser',
      timestamp: new Date().toISOString(),
      fatal: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing type', () => {
    const { type: _, ...noType } = {
      type: 'resultError',
      id: crypto.randomUUID(),
      error: makeAppError(),
      original: null,
      environment: 'browser',
      timestamp: new Date().toISOString(),
      fatal: false,
    };
    expect(v.safeParse(CapturedErrorSchema, noType).success).toBe(false);
  });

  it('rejects invalid UUID', () => {
    expect(
      v.safeParse(CapturedErrorSchema, {
        type: 'resultError',
        id: 'not-uuid',
        error: makeAppError(),
        original: null,
        environment: 'browser',
        timestamp: new Date().toISOString(),
        fatal: false,
      }).success,
    ).toBe(false);
  });
});
