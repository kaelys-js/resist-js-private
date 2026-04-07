/**
 * Tests for beaconError — the fire-and-forget error reporting function.
 *
 * @module
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Str, Bool, Void } from '@/schemas/common';
import type { AppError, Result } from '@/schemas/result/result';
import type { CapturedError, CapturedErrorType } from '@/schemas/result/captured-error';
import { beaconError } from './beacon';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeAppError = (): AppError =>
  ({
    code: 'INTERNAL.UNEXPECTED',
    message: 'Something went wrong',
    id: '550e8400-e29b-41d4-a716-446655440000',
    timestamp: '2026-03-05T12:00:00.000Z',
    stack: 'Error: boom\n    at foo.ts:1:1',
    severity: 'error',
    httpStatus: 500,
  }) as AppError; // cast safe: test fixture with all required fields

const makeCaptured = (overrides?: Partial<CapturedError>): CapturedError =>
  ({
    type: 'uncaughtException',
    id: '660e8400-e29b-41d4-a716-446655440000',
    error: makeAppError(),
    original: new Error('boom'),
    environment: 'browser',
    timestamp: '2026-03-05T12:00:00.000Z',
    fatal: false,
    ...overrides,
  }) as CapturedError; // cast safe: test fixture with all required fields

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let sendBeaconSpy: ReturnType<typeof vi.fn>;
let originalDev: unknown;

beforeEach(() => {
  sendBeaconSpy = vi.fn(() => true);
  Object.defineProperty(globalThis, 'navigator', {
    value: { sendBeacon: sendBeaconSpy },
    writable: true,
    configurable: true,
  });
  // Save and override import.meta.env.DEV for production tests
  originalDev = import.meta.env.DEV;
  import.meta.env.DEV = false;
});

afterEach(() => {
  // Restore original DEV value
  import.meta.env.DEV = originalDev as Bool;
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('beaconError', () => {
  it('sends PII-stripped error via navigator.sendBeacon', () => {
    const captured: CapturedError = makeCaptured();
    const result: Result<Void> = beaconError(captured, '/api/errors');

    expect(result.ok).toBe(true);
    expect(sendBeaconSpy).toHaveBeenCalledOnce();

    const [url, blob]: [Str, Blob] = sendBeaconSpy.mock.calls[0] as [Str, Blob];
    expect(url).toBe('/api/errors');
    expect(blob).toBeInstanceOf(Blob);
  });

  it('strips PII from error payload', async () => {
    const captured: CapturedError = makeCaptured();
    beaconError(captured, '/api/errors');

    const blob: Blob = sendBeaconSpy.mock.calls[0]![1] as Blob;
    const text: Str = (await blob.text()) as Str;
    const parsed: Record<Str, unknown> = JSON.parse(text) as Record<Str, unknown>;
    // PII stripped — message replaced with code, stack cleared
    const error: Record<Str, unknown> = parsed.error as Record<Str, unknown>;
    expect(error.message).toBe('INTERNAL.UNEXPECTED');
    expect(error.stack).toBe('');
    expect(error.meta).toBeUndefined();
  });

  it('uses text/plain Blob to avoid CORS preflight', () => {
    const captured: CapturedError = makeCaptured();
    beaconError(captured, '/api/errors');

    expect(sendBeaconSpy).toHaveBeenCalledOnce();
    const blob: Blob = sendBeaconSpy.mock.calls[0]![1] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/plain');
  });

  it('skips beaconing in dev mode', () => {
    import.meta.env.DEV = true;
    const captured: CapturedError = makeCaptured();
    const result: Result<Void> = beaconError(captured, '/api/errors');

    expect(result.ok).toBe(true);
    expect(sendBeaconSpy).not.toHaveBeenCalled();
  });

  it('handles sendBeacon returning false (queue full)', () => {
    sendBeaconSpy.mockReturnValueOnce(false);
    const captured: CapturedError = makeCaptured();
    const result: Result<Void> = beaconError(captured, '/api/errors');

    // Still returns ok — fire-and-forget, queue full is non-critical
    expect(result.ok).toBe(true);
  });

  it('handles missing navigator.sendBeacon gracefully (SSR)', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    });
    const captured: CapturedError = makeCaptured();
    const result: Result<Void> = beaconError(captured, '/api/errors');

    // Returns ok — no beacon available is non-critical
    expect(result.ok).toBe(true);
  });

  it('handles missing navigator entirely (SSR)', () => {
    // biome-ignore lint/performance/noDelete: test requires removing navigator
    delete (globalThis as Record<Str, unknown>).navigator;
    const captured: CapturedError = makeCaptured();
    const result: Result<Void> = beaconError(captured, '/api/errors');

    expect(result.ok).toBe(true);
  });

  it('includes breadcrumbs and tags in payload', async () => {
    const captured: CapturedError = makeCaptured({
      breadcrumbs: [
        {
          type: 'navigation',
          message: '/ → /editor',
          level: 'info',
          timestamp: '2026-03-05T11:59:00.000Z',
        },
      ],
      tags: { service: 'editor-client', side: 'client' },
    });

    beaconError(captured, '/api/errors');

    expect(sendBeaconSpy).toHaveBeenCalledOnce();
    const blob: Blob = sendBeaconSpy.mock.calls[0]![1] as Blob;
    const text: Str = (await blob.text()) as Str;
    const parsed: Record<Str, unknown> = JSON.parse(text) as Record<Str, unknown>;
    expect(parsed.breadcrumbs).toBeDefined();
    expect(parsed.tags).toEqual({ service: 'editor-client', side: 'client' });
  });

  // -------------------------------------------------------------------------
  // New tests — custom endpoint and failure handling
  // -------------------------------------------------------------------------

  it('sends to custom endpoint when provided', () => {
    const captured: CapturedError = makeCaptured();
    const result: Result<Void> = beaconError(captured, '/api/v2/errors');

    expect(result.ok).toBe(true);
    expect(sendBeaconSpy).toHaveBeenCalledOnce();

    const [url]: [Str, Blob] = sendBeaconSpy.mock.calls[0] as [Str, Blob];
    expect(url).toBe('/api/v2/errors');
  });

  it('returns error when endpoint fails validation', () => {
    const captured: CapturedError = makeCaptured();
    const result: Result<Void> = beaconError(captured, 123 as unknown as Str);

    expect(result.ok).toBe(false);
  });

  it('returns error when sendBeacon throws', () => {
    sendBeaconSpy.mockImplementation(() => {
      throw new Error('payload too large');
    });
    const captured: CapturedError = makeCaptured();
    const result: Result<Void> = beaconError(captured, '/api/errors');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NETWORK.PORT_UNAVAILABLE');
  });

  it('returns error when toBeaconPayload fails', () => {
    const captured: CapturedError = makeCaptured({
      error: {
        ...makeAppError(),
        code: '' as Str,
      } as AppError, // cast safe: test fixture with intentionally invalid code
    });
    const result: Result<Void> = beaconError(captured, '/api/errors');

    expect(result.ok).toBe(false);
  });

  it('returns error when CapturedError type is invalid', () => {
    const captured: CapturedError = makeCaptured({
      type: 'not-a-real-type' as CapturedErrorType,
    });
    const result: Result<Void> = beaconError(captured, '/api/errors');

    expect(result.ok).toBe(false);
  });

  it('returns INTERNAL.UNEXPECTED when toBeaconPayload fails (line 69)', async () => {
    const beaconPayloadModule = await import('./beacon-payload');
    const spy = vi.spyOn(beaconPayloadModule, 'toBeaconPayload').mockReturnValueOnce({
      ok: false,
      error: {
        code: 'INTERNAL.UNEXPECTED',
        message: 'payload build failed',
        id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2026-03-05T12:00:00.000Z',
        stack: '',
        severity: 'error',
        httpStatus: 500,
      },
    } as Result<never>);

    const captured: CapturedError = makeCaptured();
    const result: Result<Void> = beaconError(captured, '/api/errors');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INTERNAL.UNEXPECTED');
    }
    spy.mockRestore();
  });

  it('returns error when safeStringify fails', () => {
    const originalStringify: typeof JSON.stringify = JSON.stringify;
    JSON.stringify = (): Str => {
      throw new Error('circular reference');
    };

    const captured: CapturedError = makeCaptured();
    const result: Result<Void> = beaconError(captured, '/api/errors');

    // safeStringify failure returns err, not ok
    expect(result.ok).toBe(false);

    JSON.stringify = originalStringify;
  });
});
