/**
 * Integration tests for the error reporting pipeline.
 *
 * Tests the full flow: CapturedError → toBeaconPayload → JSON serialize →
 * BeaconPayloadSchema validation (simulating server-side receive).
 *
 * Also tests that the breadcrumb + beacon modules work together correctly.
 */

// oxlint-disable require-await -- async mocks return Response directly (no await needed)
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Str, Bool, Void } from '@/schemas/common';
import type { AppError, Result } from '@/schemas/result/result';
import type { Breadcrumb, CapturedError, CapturedErrorType } from '@/schemas/result/captured-error';
import { safeParse } from '@/utils/result/safe';
import { clearBreadcrumbs, getBreadcrumbs, addBreadcrumb } from '@/utils/result/breadcrumbs';
import { BeaconPayloadSchema, toBeaconPayload, type BeaconPayload } from './beacon-payload';
import { beaconError } from './beacon';
import {
  addNavigationBreadcrumb,
  initFetchBreadcrumbs,
  teardownFetchBreadcrumbs,
} from './breadcrumbs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeAppError = (overrides?: Partial<AppError>): AppError =>
  ({
    code: 'HTTP.REQUEST_FAILED' as Str,
    message: 'Request to /api/data failed with status 500' as Str,
    id: '11111111-2222-3333-4444-555555555555' as Str,
    timestamp: '2026-03-05T12:00:00.000Z' as Str,
    stack: 'Error: Request failed\n    at fetchData (src/lib/api.ts:42:10)' as Str,
    severity: 'error',
    httpStatus: 500,
    tags: { route: '/api/data' },
    meta: { userId: 'user-123', requestBody: '{"secret": "token"}' },
    ...overrides,
  }) as AppError;

const makeCaptured = (overrides?: Partial<CapturedError>): CapturedError =>
  ({
    type: 'uncaughtException' as CapturedErrorType,
    id: '11111111-2222-3333-4444-555555555555' as Str,
    error: makeAppError(),
    original: new Error('Request failed'),
    environment: 'browser' as const,
    timestamp: '2026-03-05T12:00:00.000Z' as Str,
    fatal: false as Bool,
    user: { id: 'user-123', email: 'john@example.com' },
    contexts: { browser: { name: 'Chrome', version: '120' } },
    serverName: 'prod-worker-3' as Str,
    ...overrides,
  }) as CapturedError;

let originalDev: unknown;

beforeEach(() => {
  clearBreadcrumbs();
  originalDev = import.meta.env.DEV;
});

afterEach(() => {
  import.meta.env.DEV = originalDev as Bool;
  teardownFetchBreadcrumbs();
  clearBreadcrumbs();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// End-to-end pipeline: CapturedError → beacon payload → server validation
// ---------------------------------------------------------------------------

describe('error reporting pipeline', () => {
  it('converts a CapturedError with PII into a safe payload that passes server validation', () => {
    const captured: CapturedError = makeCaptured();

    // Step 1: Convert to beacon payload (strips PII)
    const payloadResult: Result<BeaconPayload> = toBeaconPayload(captured);
    expect(payloadResult.ok).toBe(true);
    if (!payloadResult.ok) return;

    const payload: BeaconPayload = payloadResult.data as BeaconPayload;

    // Step 2: Verify PII was stripped
    expect(payload.error.message).toBe('HTTP.REQUEST_FAILED'); // code, not original message
    expect(payload.error.stack).toBe(''); // no file paths
    expect(payload.error.meta).toBeUndefined(); // no userId, requestBody
    expect(payload).not.toHaveProperty('user'); // no user PII
    expect(payload).not.toHaveProperty('contexts'); // no browser fingerprint
    expect(payload).not.toHaveProperty('serverName'); // no infrastructure info
    expect(payload).not.toHaveProperty('original'); // no raw error

    // Step 3: Safe fields preserved
    expect(payload.error.code).toBe('HTTP.REQUEST_FAILED');
    expect(payload.error.severity).toBe('error');
    expect(payload.error.httpStatus).toBe(500);
    expect(payload.error.tags).toEqual({ route: '/api/data' });

    // Step 4: Simulate JSON serialization (sendBeacon does this)
    const json: Str = JSON.stringify(payload) as Str;
    const deserialized: unknown = JSON.parse(json);

    // Step 5: Server-side validation against BeaconPayloadSchema
    const serverResult: Result<BeaconPayload> = safeParse(BeaconPayloadSchema, deserialized);
    expect(serverResult.ok).toBe(true);
  });

  it('includes breadcrumbs in the pipeline', () => {
    // Add breadcrumbs before the error
    addNavigationBreadcrumb(null, '/' as Str);
    addNavigationBreadcrumb('/' as Str, '/editor' as Str);
    addBreadcrumb({
      type: 'http',
      category: 'fetch',
      message: 'GET /api/project → 200',
      level: 'info',
    });

    // Drain breadcrumbs into CapturedError (simulates what setupGlobalErrorHandling does)
    const crumbs: Result<readonly Breadcrumb[]> = getBreadcrumbs();
    expect(crumbs.ok).toBe(true);
    if (!crumbs.ok) return;

    const captured: CapturedError = makeCaptured({
      breadcrumbs: crumbs.data as Breadcrumb[],
    });

    // Convert and validate
    const payloadResult: Result<BeaconPayload> = toBeaconPayload(captured);
    expect(payloadResult.ok).toBe(true);
    if (!payloadResult.ok) return;

    // Breadcrumbs should be included
    expect(payloadResult.data.breadcrumbs).toHaveLength(3);
    expect(payloadResult.data.breadcrumbs![0]!.type).toBe('navigation');
    expect(payloadResult.data.breadcrumbs![2]!.type).toBe('http');

    // Server validation should still pass
    const json: Str = JSON.stringify(payloadResult.data) as Str;
    const serverResult: Result<BeaconPayload> = safeParse(BeaconPayloadSchema, JSON.parse(json));
    expect(serverResult.ok).toBe(true);
  });

  it('beaconError sends the correct payload via sendBeacon', async () => {
    import.meta.env.DEV = false;

    const sendBeaconSpy: ReturnType<typeof vi.fn> = vi.fn(() => true);
    Object.defineProperty(globalThis, 'navigator', {
      value: { sendBeacon: sendBeaconSpy },
      writable: true,
      configurable: true,
    });

    // Add a breadcrumb, then create a captured error with it
    addNavigationBreadcrumb('/' as Str, '/editor' as Str);
    const crumbs: Result<readonly Breadcrumb[]> = getBreadcrumbs();
    expect(crumbs.ok).toBe(true);
    if (!crumbs.ok) return;

    const captured: CapturedError = makeCaptured({
      breadcrumbs: crumbs.data as Breadcrumb[],
      tags: { service: 'editor-client', side: 'client' },
      release: '1.0.0' as Str,
    });

    // Call beaconError
    const result: Result<Void> = beaconError(captured);
    expect(result.ok).toBe(true);
    expect(sendBeaconSpy).toHaveBeenCalledOnce();

    // Verify the sent payload
    const blob: Blob = sendBeaconSpy.mock.calls[0]![1] as Blob;
    const text: Str = (await blob.text()) as Str;
    const sent: Record<Str, unknown> = JSON.parse(text) as Record<Str, unknown>;

    // Validate against server schema
    const serverResult: Result<BeaconPayload> = safeParse(BeaconPayloadSchema, sent);
    expect(serverResult.ok).toBe(true);

    // Verify content
    expect(sent.tags).toEqual({ service: 'editor-client', side: 'client' });
    expect(sent.release).toBe('1.0.0');
    expect((sent.breadcrumbs as Breadcrumb[]).length).toBeGreaterThan(0);
  });

  it('fetch breadcrumbs are captured and included in error reports', async () => {
    const originalFetch: typeof fetch = globalThis.fetch;
    const mockFetch: typeof fetch = vi.fn(
      async () => new Response('not found', { status: 404 }),
    ) as typeof fetch;
    globalThis.fetch = mockFetch;

    initFetchBreadcrumbs();

    // Make a request that generates a breadcrumb
    await globalThis.fetch('/api/project');

    // Check breadcrumbs contain the fetch
    const crumbs: Result<readonly Breadcrumb[]> = getBreadcrumbs();
    expect(crumbs.ok).toBe(true);
    if (!crumbs.ok) return;

    expect(crumbs.data).toHaveLength(1);
    expect(crumbs.data[0]!.type).toBe('http');
    expect(crumbs.data[0]!.message).toContain('404');

    // Create captured error with these breadcrumbs
    const captured: CapturedError = makeCaptured({
      breadcrumbs: crumbs.data as Breadcrumb[],
    });

    // Pipeline produces valid payload
    const payloadResult: Result<BeaconPayload> = toBeaconPayload(captured);
    expect(payloadResult.ok).toBe(true);

    teardownFetchBreadcrumbs();
    globalThis.fetch = originalFetch;
  });
});
