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
    code: 'INTERNAL.UNEXPECTED' as Str,
    message: 'Something went wrong' as Str,
    id: '550e8400-e29b-41d4-a716-446655440000' as Str,
    timestamp: '2026-03-05T12:00:00.000Z' as Str,
    stack: 'Error: boom\n    at foo.ts:1:1' as Str,
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
    const result: Result<Void> = beaconError(captured);

    expect(result.ok).toBe(true);
    expect(sendBeaconSpy).toHaveBeenCalledOnce();

    const [url, blob]: [Str, Blob] = sendBeaconSpy.mock.calls[0] as [Str, Blob];
    expect(url).toBe('/api/errors');
    expect(blob).toBeInstanceOf(Blob);
  });

  it('strips PII from error payload', async () => {
    const captured: CapturedError = makeCaptured();
    beaconError(captured);

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
    beaconError(captured);

    expect(sendBeaconSpy).toHaveBeenCalledOnce();
    const blob: Blob = sendBeaconSpy.mock.calls[0]![1] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/plain');
  });

  it('skips beaconing in dev mode', () => {
    import.meta.env.DEV = true;
    const captured: CapturedError = makeCaptured();
    const result: Result<Void> = beaconError(captured);

    expect(result.ok).toBe(true);
    expect(sendBeaconSpy).not.toHaveBeenCalled();
  });

  it('handles sendBeacon returning false (queue full)', () => {
    sendBeaconSpy.mockReturnValueOnce(false);
    const captured: CapturedError = makeCaptured();
    const result: Result<Void> = beaconError(captured);

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
    const result: Result<Void> = beaconError(captured);

    // Returns ok — no beacon available is non-critical
    expect(result.ok).toBe(true);
  });

  it('handles missing navigator entirely (SSR)', () => {
    // biome-ignore lint/performance/noDelete: test requires removing navigator
    delete (globalThis as Record<Str, unknown>).navigator;
    const captured: CapturedError = makeCaptured();
    const result: Result<Void> = beaconError(captured);

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

    beaconError(captured);

    expect(sendBeaconSpy).toHaveBeenCalledOnce();
    const blob: Blob = sendBeaconSpy.mock.calls[0]![1] as Blob;
    const text: Str = (await blob.text()) as Str;
    const parsed: Record<Str, unknown> = JSON.parse(text) as Record<Str, unknown>;
    expect(parsed.breadcrumbs).toBeDefined();
    expect(parsed.tags).toEqual({ service: 'editor-client', side: 'client' });
  });
});
