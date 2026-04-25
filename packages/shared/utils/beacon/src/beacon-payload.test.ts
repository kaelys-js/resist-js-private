/**
 * Tests for beacon payload schema and conversion.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest';
import type { Str, Bool } from '@/schemas/common';
import type { AppError, ErrorTags, KnownErrorCode, Result } from '@/schemas/result/result';
import type { Breadcrumb, CapturedError, CapturedErrorType } from '@/schemas/result/captured-error';
import { safeParse } from '@/utils/result/safe';
import { BeaconPayloadSchema, toBeaconPayload, type BeaconPayload } from './beacon-payload';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeAppError = (overrides?: Partial<AppError>): AppError =>
  ({
    code: 'INTERNAL.UNEXPECTED' as Str,
    message: 'INTERNAL.UNEXPECTED' as Str,
    id: '550e8400-e29b-41d4-a716-446655440000' as Str,
    timestamp: '2026-03-05T12:00:00.000Z' as Str,
    stack: '' as Str,
    ...overrides,
  }) as AppError;

const makeCaptured = (overrides?: Partial<CapturedError>): CapturedError =>
  ({
    type: 'uncaughtException' as CapturedErrorType,
    id: '550e8400-e29b-41d4-a716-446655440000' as Str,
    error: makeAppError(),
    original: new Error('boom'),
    environment: 'browser' as const,
    timestamp: '2026-03-05T12:00:00.000Z' as Str,
    fatal: false as Bool,
    ...overrides,
  }) as CapturedError;

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

describe('BeaconPayloadSchema', () => {
  it('validates a minimal payload', () => {
    const payload: unknown = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'uncaughtException',
      error: makeAppError(),
      environment: 'browser',
      timestamp: '2026-03-05T12:00:00.000Z',
      fatal: false,
    };
    const result: Result<BeaconPayload> = safeParse(BeaconPayloadSchema, payload);
    expect(result.ok).toBe(true);
  });

  it('validates a full payload with all optional fields', () => {
    const payload: unknown = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'uncaughtException',
      error: makeAppError(),
      environment: 'browser',
      timestamp: '2026-03-05T12:00:00.000Z',
      fatal: true,
      breadcrumbs: [
        {
          type: 'navigation',
          category: 'route',
          message: '/ → /editor',
          level: 'info',
          timestamp: '2026-03-05T11:59:59.000Z',
        },
      ],
      tags: { service: 'editor-client', side: 'client' },
      release: '1.0.0',
      fingerprint: ['INTERNAL.UNEXPECTED'],
    };
    const result: Result<BeaconPayload> = safeParse(BeaconPayloadSchema, payload);
    expect(result.ok).toBe(true);
  });

  it('rejects payloads with PII fields (user)', () => {
    const payload: unknown = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'uncaughtException',
      error: makeAppError(),
      environment: 'browser',
      timestamp: '2026-03-05T12:00:00.000Z',
      fatal: false,
      user: { id: 'user-123', email: 'test@example.com' },
    };
    const result: Result<BeaconPayload> = safeParse(BeaconPayloadSchema, payload);
    expect(result.ok).toBe(false);
  });

  it('rejects payloads with PII fields (contexts)', () => {
    const payload: unknown = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'uncaughtException',
      error: makeAppError(),
      environment: 'browser',
      timestamp: '2026-03-05T12:00:00.000Z',
      fatal: false,
      contexts: { os: { name: 'macOS' } },
    };
    const result: Result<BeaconPayload> = safeParse(BeaconPayloadSchema, payload);
    expect(result.ok).toBe(false);
  });

  it('rejects payloads with PII fields (serverName)', () => {
    const payload: unknown = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'uncaughtException',
      error: makeAppError(),
      environment: 'browser',
      timestamp: '2026-03-05T12:00:00.000Z',
      fatal: false,
      serverName: 'prod-worker-1',
    };
    const result: Result<BeaconPayload> = safeParse(BeaconPayloadSchema, payload);
    expect(result.ok).toBe(false);
  });

  it('rejects payloads with missing required fields', () => {
    const payload: unknown = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      // missing type, error, environment, timestamp, fatal
    };
    const result: Result<BeaconPayload> = safeParse(BeaconPayloadSchema, payload);
    expect(result.ok).toBe(false);
  });

  it('rejects invalid CapturedError type values', () => {
    const payload: unknown = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'invalidType',
      error: makeAppError(),
      environment: 'browser',
      timestamp: '2026-03-05T12:00:00.000Z',
      fatal: false,
    };
    const result: Result<BeaconPayload> = safeParse(BeaconPayloadSchema, payload);
    expect(result.ok).toBe(false);
  });

  it('validates all runtime kind values', () => {
    const runtimeKinds: string[] = [
      'node-tty',
      'node-pipe',
      'worker',
      'browser',
      'web-worker',
      'shared-worker',
      'service-worker',
    ];

    for (const kind of runtimeKinds) {
      const payload: unknown = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'uncaughtException',
        error: makeAppError(),
        environment: kind,
        timestamp: '2026-03-05T12:00:00.000Z',
        fatal: false,
      };
      const result: Result<BeaconPayload> = safeParse(BeaconPayloadSchema, payload);
      expect(result.ok, `runtime kind '${kind}' should validate`).toBe(true);
    }
  });

  it('rejects invalid runtime kind values', () => {
    const payload: unknown = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'uncaughtException',
      error: makeAppError(),
      environment: 'deno',
      timestamp: '2026-03-05T12:00:00.000Z',
      fatal: false,
    };
    const result: Result<BeaconPayload> = safeParse(BeaconPayloadSchema, payload);
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// toBeaconPayload
// ---------------------------------------------------------------------------

describe('toBeaconPayload', () => {
  it('converts CapturedError to beacon payload stripping PII', () => {
    const captured: CapturedError = makeCaptured({
      error: makeAppError({
        message: 'User-visible secret message' as Str,
        stack: 'Error: secret\n    at /home/user/project/src/foo.ts:12:5' as Str,
        meta: { userId: 'user-123' } as Record<Str, unknown>,
      }),
      user: { id: 'user-123', email: 'test@example.com' },
      contexts: { browser: { name: 'Chrome' } },
      serverName: 'prod-1' as Str,
      meta: { route: '/editor' },
    });

    const result: Result<BeaconPayload> = toBeaconPayload(captured);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    // PII stripped from error
    expect(result.data.error.message).toBe('INTERNAL.UNEXPECTED');
    expect(result.data.error.stack).toBe('');
    expect(result.data.error.meta).toBeUndefined();

    // PII fields excluded from payload
    expect(result.data).not.toHaveProperty('user');
    expect(result.data).not.toHaveProperty('contexts');
    expect(result.data).not.toHaveProperty('serverName');
    expect(result.data).not.toHaveProperty('meta');
    expect(result.data).not.toHaveProperty('original');
  });

  it('preserves breadcrumbs, tags, release, fingerprint', () => {
    const breadcrumbs: Breadcrumb[] = [
      {
        type: 'navigation',
        category: 'route',
        message: '/ → /editor',
        level: 'info',
        timestamp: '2026-03-05T11:59:59.000Z',
      } as Breadcrumb,
    ];
    const tags: ErrorTags = { service: 'editor-client' } as ErrorTags;
    const captured: CapturedError = makeCaptured({
      breadcrumbs,
      tags,
      release: '1.0.0' as Str,
      fingerprint: ['INTERNAL.UNEXPECTED'],
    });

    const result: Result<BeaconPayload> = toBeaconPayload(captured);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data.breadcrumbs).toEqual(breadcrumbs);
    expect(result.data.tags).toEqual(tags);
    expect(result.data.release).toBe('1.0.0');
    expect(result.data.fingerprint).toEqual(['INTERNAL.UNEXPECTED']);
  });

  it('preserves safe error fields (code, severity, httpStatus, tags, retry)', () => {
    const captured: CapturedError = makeCaptured({
      error: makeAppError({
        severity: 'error',
        httpStatus: 500,
        tags: { route: '/api/foo' },
      }),
    });

    const result: Result<BeaconPayload> = toBeaconPayload(captured);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data.error.code).toBe('INTERNAL.UNEXPECTED');
    expect(result.data.error.severity).toBe('error');
    expect(result.data.error.httpStatus).toBe(500);
    expect(result.data.error.tags).toEqual({ route: '/api/foo' });
  });

  it('validates output against BeaconPayloadSchema', () => {
    const captured: CapturedError = makeCaptured();
    const result: Result<BeaconPayload> = toBeaconPayload(captured);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const validated: Result<BeaconPayload> = safeParse(BeaconPayloadSchema, result.data);
    expect(validated.ok).toBe(true);
  });

  it('produces valid output with minimal CapturedError (no optional fields)', () => {
    const captured: CapturedError = makeCaptured();
    const result: Result<BeaconPayload> = toBeaconPayload(captured);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    // Should have all required fields
    expect(result.data.id).toBeDefined();
    expect(result.data.type).toBeDefined();
    expect(result.data.error).toBeDefined();
    expect(result.data.environment).toBeDefined();
    expect(result.data.timestamp).toBeDefined();
    expect(typeof result.data.fatal).toBe('boolean');

    // Optional fields should be absent
    expect(result.data.breadcrumbs).toBeUndefined();
    expect(result.data.tags).toBeUndefined();
    expect(result.data.release).toBeUndefined();
    expect(result.data.fingerprint).toBeUndefined();

    // Must validate against schema
    const validated: Result<BeaconPayload> = safeParse(BeaconPayloadSchema, result.data);
    expect(validated.ok).toBe(true);
  });

  it('returns error when formatErrorSafe fails', async () => {
    const formatModule = await import('@/utils/result/format');
    const spy = vi.spyOn(formatModule, 'formatErrorSafe').mockReturnValueOnce({
      ok: false,
      error: makeAppError({ code: 'INTERNAL.UNEXPECTED' as KnownErrorCode }),
    } as Result<AppError>);

    const captured: CapturedError = makeCaptured();
    const result: Result<BeaconPayload> = toBeaconPayload(captured);

    expect(result.ok).toBe(false);
    spy.mockRestore();
  });

  it('returns error result when error has invalid code field', () => {
    // With safeParse validation at entry, invalid CapturedError data is rejected
    const captured: CapturedError = makeCaptured({
      error: makeAppError({ code: '' as KnownErrorCode }),
    });
    const result: Result<BeaconPayload> = toBeaconPayload(captured);

    expect(result.ok).toBe(false);
  });
});
