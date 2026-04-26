import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Str, Bool } from '@/schemas/common';
import type { AppError } from '@/schemas/result/result';
import type { BeaconPayload } from '@/utils/beacon/beacon-payload';

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeAppError = (): AppError =>
  ({
    code: 'INTERNAL.UNEXPECTED' as Str,
    message: 'INTERNAL.UNEXPECTED' as Str,
    id: '550e8400-e29b-41d4-a716-446655440000' as Str,
    timestamp: '2026-03-05T12:00:00.000Z' as Str,
    stack: '' as Str,
  }) as AppError;

const makeValidPayload = (overrides?: Partial<BeaconPayload>): BeaconPayload =>
  ({
    id: '550e8400-e29b-41d4-a716-446655440000' as Str,
    type: 'uncaughtException',
    error: makeAppError(),
    environment: 'browser',
    timestamp: '2026-03-05T12:00:00.000Z' as Str,
    fatal: false as Bool,
    ...overrides,
  }) as BeaconPayload;

const makeRequest = (body: unknown, contentType: Str = 'text/plain' as Str): Request =>
  new Request('http://localhost/api/errors', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/errors', () => {
  it('returns 204 for valid beacon payload', async () => {
    const payload: BeaconPayload = makeValidPayload();
    const response: Response = await POST({ request: makeRequest(payload) } as never);

    expect(response.status).toBe(204);
  });

  it('logs the error via log.error with source tag', async () => {
    const payload: BeaconPayload = makeValidPayload();
    await POST({ request: makeRequest(payload) } as never);

    expect(log.error).toHaveBeenCalledOnce();
    const logMessage: Str = (log.error as ReturnType<typeof vi.fn>).mock.calls[0]![0] as Str;
    expect(logMessage).toContain('client-beacon');
    expect(logMessage).toContain('INTERNAL.UNEXPECTED');
  });

  it('returns 400 for invalid JSON', async () => {
    const response: Response = await POST({
      request: makeRequest('not json{{{'),
    } as never);

    expect(response.status).toBe(400);
  });

  it('returns 400 for payload with PII fields (user)', async () => {
    const payload: Record<Str, unknown> = {
      ...makeValidPayload(),
      user: { id: 'user-123' },
    };
    const response: Response = await POST({
      request: makeRequest(payload),
    } as never);

    expect(response.status).toBe(400);
  });

  it('returns 400 for payload with missing required fields', async () => {
    const response: Response = await POST({
      request: makeRequest({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    } as never);

    expect(response.status).toBe(400);
  });

  it('returns 413 for payloads exceeding size limit', async () => {
    const payload: BeaconPayload = makeValidPayload();
    const json: Str = JSON.stringify(payload) as Str;
    // Create a body that exceeds 64KB
    const oversized: Str = `${json}${'x'.repeat(65_536)}` as Str;

    const response: Response = await POST({
      request: makeRequest(oversized),
    } as never);

    expect(response.status).toBe(413);
  });

  it('includes error id in log message', async () => {
    const payload: BeaconPayload = makeValidPayload({
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' as never,
    });
    await POST({ request: makeRequest(payload) } as never);

    const logMessage: Str = (log.error as ReturnType<typeof vi.fn>).mock.calls[0]![0] as Str;
    expect(logMessage).toContain('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  });

  it('handles empty body gracefully', async () => {
    const response: Response = await POST({
      request: makeRequest(''),
    } as never);

    expect(response.status).toBe(400);
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
});
