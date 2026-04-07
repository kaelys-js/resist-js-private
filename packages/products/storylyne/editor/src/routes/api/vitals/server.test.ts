/**
 * Tests for the vitals beacon receiver endpoint.
 *
 * Verifies payload validation, size limits, structured logging,
 * empty-body handling, and HTTP method rejection.
 *
 * @module
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Str } from '@/schemas/common';
import type {
  VitalsBeaconPayload,
  VitalsMetric,
  VitalsDevice,
} from '@/utils/web-vitals/vitals-payload';

// Mock logger before importing the handler
vi.mock('@/utils/core/logger', () => ({
  log: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
  setupLogging: vi.fn(),
}));

// Must import after mocks are set up
const { POST } = await import('./+server');
const { log } = await import('@/utils/core/logger');

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Creates a valid VitalsMetric fixture.
 *
 * @param overrides - Partial overrides for metric properties
 * @returns A complete VitalsMetric
 */
function createMetric(overrides: Partial<VitalsMetric> = {}): VitalsMetric {
  return {
    name: 'LCP',
    value: 2450,
    rating: 'needsImprovement',
    navigationType: 'navigate',
    ...overrides,
  } as VitalsMetric;
}

/**
 * Creates a valid VitalsDevice fixture.
 *
 * @returns A complete VitalsDevice
 */
function createDevice(): VitalsDevice {
  return {
    isLowEndDevice: false,
    isLowEndExperience: false,
    deviceMemory: 8,
    hardwareConcurrency: 8,
    effectiveType: '4g',
    saveData: false,
  };
}

/**
 * Creates a valid VitalsBeaconPayload fixture.
 *
 * @param overrides - Partial overrides for payload properties
 * @returns A complete VitalsBeaconPayload
 */
function createPayload(overrides: Partial<VitalsBeaconPayload> = {}): VitalsBeaconPayload {
  return {
    sessionId: '550e8400-e29b-41d4-a716-446655440000',
    url: '/scenes/1',
    timestamp: '2026-03-06T09:00:00.000Z',
    metrics: [createMetric()],
    device: createDevice(),
    ...overrides,
  } as VitalsBeaconPayload;
}

/**
 * Creates a mock POST Request.
 *
 * @param body - Request body (object will be JSON.stringify'd, string used as-is)
 * @returns A Request suitable for passing to the POST handler
 */
function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/vitals', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/vitals', () => {
  it('returns 204 for valid beacon payload', async () => {
    const payload: VitalsBeaconPayload = createPayload();
    const response: Response = await POST({ request: makeRequest(payload) } as never);

    expect(response.status).toBe(204);
  });

  it('logs metrics via log.info with vitals tag', async () => {
    const payload: VitalsBeaconPayload = createPayload();
    await POST({ request: makeRequest(payload) } as never);

    expect(log.info).toHaveBeenCalledOnce();
    const logMessage: Str = (log.info as ReturnType<typeof vi.fn>).mock.calls[0]![0] as Str;
    expect(logMessage).toContain('[vitals]');
    expect(logMessage).toContain('LCP');
    expect(logMessage).toContain('2450');
  });

  it('returns 400 for invalid JSON', async () => {
    const response: Response = await POST({
      request: makeRequest('not json{{{'),
    } as never);

    expect(response.status).toBe(400);
  });

  it('returns 400 for oversized body', async () => {
    const payload: VitalsBeaconPayload = createPayload();
    const json: Str = JSON.stringify(payload) as Str;
    const oversized: Str = `${json}${'x'.repeat(65_536)}` as Str;

    const response: Response = await POST({
      request: makeRequest(oversized),
    } as never);

    expect(response.status).toBe(400);
  });

  it('returns 400 for schema validation failure', async () => {
    const response: Response = await POST({
      request: makeRequest({ sessionId: 'not-a-uuid', url: '/test' }),
    } as never);

    expect(response.status).toBe(400);
  });

  it('returns 400 for extra unknown fields (strict schema)', async () => {
    const payload: Record<Str, unknown> = {
      ...createPayload(),
      user: { email: 'pii@example.com' },
    };
    const response: Response = await POST({
      request: makeRequest(payload),
    } as never);

    expect(response.status).toBe(400);
  });

  it('returns 204 for empty metrics array', async () => {
    const payload: VitalsBeaconPayload = createPayload({ metrics: [] });
    const response: Response = await POST({ request: makeRequest(payload) } as never);

    expect(response.status).toBe(204);
  });

  it('returns 400 for empty body', async () => {
    const response: Response = await POST({
      request: makeRequest(''),
    } as never);

    expect(response.status).toBe(400);
  });

  it('logs device type in message', async () => {
    const payload: VitalsBeaconPayload = createPayload({
      device: { ...createDevice(), isLowEndDevice: true },
    });
    await POST({ request: makeRequest(payload) } as never);

    const logMessage: Str = (log.info as ReturnType<typeof vi.fn>).mock.calls[0]![0] as Str;
    expect(logMessage).toContain('lowEnd');
  });

  it('includes url in log message', async () => {
    const payload: VitalsBeaconPayload = createPayload({ url: '/editor/scenes/42' });
    await POST({ request: makeRequest(payload) } as never);

    const logMessage: Str = (log.info as ReturnType<typeof vi.fn>).mock.calls[0]![0] as Str;
    expect(logMessage).toContain('/editor/scenes/42');
  });

  it('returns 400 when request.text() throws', async () => {
    const brokenRequest = {
      text: async () => {
        await Promise.resolve();
        throw new Error('client disconnected');
      },
    };
    const response: Response = await POST({ request: brokenRequest } as never);
    expect(response.status).toBe(400);
  });

  it('formats non-timing metrics without ms suffix', async () => {
    const payload: VitalsBeaconPayload = createPayload({
      metrics: [createMetric({ name: 'CLS', value: 0.15 })],
    });
    await POST({ request: makeRequest(payload) } as never);

    const logMessage: Str = (log.info as ReturnType<typeof vi.fn>).mock.calls[0]![0] as Str;
    expect(logMessage).toContain('CLS=0');
    expect(logMessage).not.toContain('CLS=0ms');
  });
});
