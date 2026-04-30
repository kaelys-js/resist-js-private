/**
 * Tests for signal and global error handling utilities.
 *
 * Covers getAbortSignal, reportError, setupGlobalErrorHandling,
 * registerCleanupHandler, resetSignalHandlers, setupSignalHandlers,
 * wrapAsync, wrapFetchHandler, and captureWebSocketErrors.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Bool, Str, TeardownFn, Void } from '@/schemas/common';
import type { AppError, Result } from '@/schemas/result/result';
import type { CapturedError } from '@/schemas/result/captured-error';
import {
  captureWebSocketErrors,
  getAbortSignal,
  registerCleanupHandler,
  reportError,
  resetSignalHandlers,
  setupGlobalErrorHandling,
  setupSignalHandlers,
  wrapAsync,
  wrapFetchHandler,
  type GlobalErrorHandlerOptions,
} from './signal';

// ── Helpers ─────────────────────────────────────────────────────────────

const makeAppError = (overrides?: Partial<AppError>): AppError =>
  ({
    code: 'TEST.ERROR' as Str,
    message: 'Test error' as Str,
    id: '550e8400-e29b-41d4-a716-446655440000' as Str,
    timestamp: '2026-03-05T12:00:00.000Z' as Str,
    stack: '' as Str,
    ...overrides,
  }) as AppError;

afterEach(() => {
  resetSignalHandlers();
  vi.restoreAllMocks();
});

// ── getAbortSignal ──────────────────────────────────────────────────────

describe('getAbortSignal', () => {
  it('returns an AbortSignal', () => {
    const result: Result<AbortSignal> = getAbortSignal();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeInstanceOf(AbortSignal);
    }
  });

  it('returns same signal on subsequent calls', () => {
    const first: Result<AbortSignal> = getAbortSignal();
    const second: Result<AbortSignal> = getAbortSignal();
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.data).toBe(second.data);
    }
  });

  it('signal is not aborted initially', () => {
    const result = getAbortSignal();

    if (result.ok) {
      expect(result.data.aborted).toBe(false);
    }
  });

  it('returns a fresh signal after resetSignalHandlers', () => {
    const before = getAbortSignal();
    resetSignalHandlers();
    const after = getAbortSignal();

    if (before.ok && after.ok) {
      expect(after.data).not.toBe(before.data);
      expect(after.data.aborted).toBe(false);
    }
  });
});

// ── reportError ─────────────────────────────────────────────────────────

describe('reportError', () => {
  it('creates a CapturedError from AppError', () => {
    const appError = makeAppError();
    const result: Result<CapturedError> = reportError(appError);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.error.code).toBe('TEST.ERROR');
      expect(result.data.error.message).toBe('Test error');
      expect(result.data.id).toBeDefined();
      expect(result.data.timestamp).toBeDefined();
      expect(result.data.environment).toBeDefined();
    }
  });

  it('includes fingerprint from error code', () => {
    const result: Result<CapturedError> = reportError(makeAppError());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.fingerprint).toEqual(['TEST.ERROR']);
    }
  });

  it('sets type to resultError', () => {
    const result: Result<CapturedError> = reportError(makeAppError());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.type).toBe('resultError');
    }
  });

  it('defaults fatal to true', () => {
    const result: Result<CapturedError> = reportError(makeAppError());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.fatal).toBe(true);
    }
  });

  it('respects fatal=false override', () => {
    const result = reportError(makeAppError(), false as Bool);

    if (result.ok) {
      expect(result.data.fatal).toBe(false);
    }
  });

  it('invokes registered onError handler when setup', () => {
    const onError = vi.fn();
    const setup = setupGlobalErrorHandling({ onError, exitTimeoutMs: 0 });
    expect(setup.ok).toBe(true);
    reportError(makeAppError(), false as Bool);
    expect(onError).toHaveBeenCalledTimes(1);
    const captured = onError.mock.calls[0]?.[0];
    expect(captured.error.code).toBe('TEST.ERROR');
  });

  it('preserves AppError directly (no fromUnknownError loss)', () => {
    const input = makeAppError({
      code: 'CUSTOM.CODE' as unknown as AppError['code'],
      message: 'custom message' as Str,
    });
    const result = reportError(input);

    if (result.ok) {
      expect(result.data.error).toBe(input);
      expect(result.data.original).toBe(input);
    }
  });

  it('attaches release/serverName from ambient options', () => {
    const onError = vi.fn();
    setupGlobalErrorHandling({
      onError,
      exitTimeoutMs: 0,
      release: '1.2.3',
      serverName: 'svc-a',
    });
    const result = reportError(makeAppError());

    if (result.ok) {
      expect(result.data.release).toBe('1.2.3');
      expect(result.data.serverName).toBe('svc-a');
    }
  });
});

// ── setupGlobalErrorHandling ────────────────────────────────────────────

describe('setupGlobalErrorHandling', () => {
  it('returns teardown function', () => {
    const onError = vi.fn();
    const result = setupGlobalErrorHandling({ onError, exitTimeoutMs: 0 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeTypeOf('function');
      result.data(); /* teardown */
    }
  });

  it('returns cached teardown on second call (idempotent)', () => {
    const onError = vi.fn();
    const first = setupGlobalErrorHandling({ onError, exitTimeoutMs: 0 });
    const second = setupGlobalErrorHandling({ onError, exitTimeoutMs: 0 });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.data).toBe(second.data);
      first.data(); /* teardown */
    }
  });

  it('rejects invalid options (missing onError)', () => {
    const result = setupGlobalErrorHandling({} as GlobalErrorHandlerOptions);
    expect(result.ok).toBe(false);
  });

  it('routes uncaughtException through onError', () => {
    const onError = vi.fn();
    const setup = setupGlobalErrorHandling({ onError, exitTimeoutMs: 0 });
    expect(setup.ok).toBe(true);
    /* Simulate an uncaught exception by emitting the event directly. */
    process.emit('uncaughtException', new Error('boom') as Error);
    expect(onError).toHaveBeenCalled();
    const captured = onError.mock.calls[0]?.[0];
    expect(captured.type).toBe('uncaughtException');
    expect(captured.fatal).toBe(true);
  });

  it('routes unhandledRejection through onError as non-fatal', () => {
    const onError = vi.fn();
    setupGlobalErrorHandling({ onError, exitTimeoutMs: 0 });
    const dummyPromise = new Promise<void>((resolve) => {
      resolve();
    });
    (process as NodeJS.EventEmitter).emit(
      'unhandledRejection',
      new Error('rejected'),
      dummyPromise,
    );
    expect(onError).toHaveBeenCalled();
    const captured = onError.mock.calls[0]?.[0];
    expect(captured.type).toBe('unhandledRejection');
    expect(captured.fatal).toBe(false);
  });

  it('routes SIGINT through onError with signal meta', () => {
    const onError = vi.fn();
    setupGlobalErrorHandling({ onError, exitTimeoutMs: 0 });
    (process as NodeJS.EventEmitter).emit('SIGINT');
    expect(onError).toHaveBeenCalled();
    const captured = onError.mock.calls[0]?.[0];
    expect(captured.type).toBe('signal');
    expect(captured.meta?.signal).toBe('SIGINT');
  });

  it('routes SIGTERM through onError with signal meta', () => {
    const onError = vi.fn();
    setupGlobalErrorHandling({ onError, exitTimeoutMs: 0 });
    (process as NodeJS.EventEmitter).emit('SIGTERM');
    expect(onError).toHaveBeenCalled();
    const captured = onError.mock.calls[0]?.[0];
    expect(captured.meta?.signal).toBe('SIGTERM');
  });

  it('invokes onFatalExit for fatal events', () => {
    const onError = vi.fn();
    const onFatalExit = vi.fn();
    setupGlobalErrorHandling({ onError, onFatalExit, exitTimeoutMs: 0 });
    (process as NodeJS.EventEmitter).emit('SIGINT');
    expect(onFatalExit).toHaveBeenCalled();
  });

  it('aborts the global AbortSignal on uncaughtException', () => {
    const onError = vi.fn();
    setupGlobalErrorHandling({ onError, exitTimeoutMs: 0 });
    const signalResult = getAbortSignal();
    expect(signalResult.ok).toBe(true);
    if (!signalResult.ok) {
      return;
    }
    process.emit('uncaughtException', new Error('abort me') as Error);
    expect(signalResult.data.aborted).toBe(true);
  });

  it('swallows thrown errors from onError (re-entrancy safe)', () => {
    const onError = vi.fn(() => {
      throw new Error('handler failed');
    });
    setupGlobalErrorHandling({ onError, exitTimeoutMs: 0 });
    /* Must not throw even though handler throws. */
    expect(() => process.emit('uncaughtException', new Error('x') as Error)).not.toThrow();
  });

  it('teardown removes listeners so subsequent emits do not fire handler', () => {
    const onError = vi.fn();
    const setup = setupGlobalErrorHandling({ onError, exitTimeoutMs: 0 });
    expect(setup.ok).toBe(true);
    if (!setup.ok) {
      return;
    }
    setup.data();
    (process as NodeJS.EventEmitter).emit('SIGINT');
    expect(onError).not.toHaveBeenCalled();
  });
});

// ── setupSignalHandlers (legacy) ────────────────────────────────────────

describe('setupSignalHandlers (legacy)', () => {
  it('translates CapturedError to signal label string', () => {
    const onInterrupt = vi.fn();
    const result = setupSignalHandlers(onInterrupt);
    expect(result.ok).toBe(true);
    (process as NodeJS.EventEmitter).emit('SIGINT');
    expect(onInterrupt).toHaveBeenCalledWith('SIGINT');
  });

  it('idempotent: second call is a no-op', () => {
    const first = vi.fn();
    const second = vi.fn();
    setupSignalHandlers(first);
    const r = setupSignalHandlers(second);
    expect(r.ok).toBe(true);
    (process as NodeJS.EventEmitter).emit('SIGTERM');
    /* First registered handler receives the signal; second is never wired up. */
    expect(first).toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
  });

  it('translates uncaughtException label', () => {
    const onInterrupt = vi.fn();
    setupSignalHandlers(onInterrupt);
    process.emit('uncaughtException', new Error('the cause') as Error);
    expect(onInterrupt).toHaveBeenCalledWith(expect.stringContaining('uncaughtException:'));
  });
});

// ── registerCleanupHandler ──────────────────────────────────────────────

describe('registerCleanupHandler', () => {
  it('accepts a cleanup callback', () => {
    const callback = vi.fn();
    const result: Result<Void> = registerCleanupHandler(callback);
    expect(result.ok).toBe(true);
  });

  it('fires on SIGINT', () => {
    const callback = vi.fn();
    registerCleanupHandler(callback);
    (process as NodeJS.EventEmitter).emit('SIGINT');
    expect(callback).toHaveBeenCalled();
    /* Clean up the listener we just registered — resetSignalHandlers only
     * clears the tracked registeredListeners, not handlers added via this API. */
    process.off('SIGINT', callback);
    process.off('SIGTERM', callback);
  });

  it('fires on SIGTERM', () => {
    const callback = vi.fn();
    registerCleanupHandler(callback);
    (process as NodeJS.EventEmitter).emit('SIGTERM');
    expect(callback).toHaveBeenCalled();
    process.off('SIGINT', callback);
    process.off('SIGTERM', callback);
  });

  it('rejects invalid callback (non-function)', () => {
    const result = registerCleanupHandler('not-a-fn' as unknown as () => undefined);
    expect(result.ok).toBe(false);
  });
});

// ── resetSignalHandlers ─────────────────────────────────────────────────

describe('resetSignalHandlers', () => {
  it('resets state and returns ok', () => {
    const result: Result<Void> = resetSignalHandlers();
    expect(result.ok).toBe(true);
  });

  it('allows re-registration after reset', () => {
    const handler1 = vi.fn();
    setupGlobalErrorHandling({ onError: handler1, exitTimeoutMs: 0 });
    resetSignalHandlers();

    const handler2 = vi.fn();
    const setup = setupGlobalErrorHandling({ onError: handler2, exitTimeoutMs: 0 });
    expect(setup.ok).toBe(true);
    (process as NodeJS.EventEmitter).emit('SIGINT');
    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });

  it('clears exit timeout handle', () => {
    /* No assertions, just ensure no errors after reset with a pending timeout. */
    const onError = vi.fn();
    setupGlobalErrorHandling({ onError, exitTimeoutMs: 1000 });
    const r = resetSignalHandlers();
    expect(r.ok).toBe(true);
  });
});

// ── wrapAsync ──────────────────────────────────────────────────────────

/* Hoisted helpers for wrapAsync — keeps consistent-function-scoping rule happy.
 * Not marked async so `require-await` does not flag them — wrapAsync expects
 * a function returning Promise<T>, which is satisfied by Promise.resolve/reject. */
function doubleNumber(x: number): Promise<number> {
  return Promise.resolve(x * 2);
}
function incrementNumber(x: number): Promise<number> {
  return Promise.resolve(x + 1);
}
function throwKaboom(): Promise<never> {
  return Promise.reject(new Error('kaboom'));
}
function throwSpecific(): Promise<never> {
  return Promise.reject(new Error('specific error'));
}
function sumTwoNumbers(a: number, b: number): Promise<number> {
  return Promise.resolve(a + b);
}

describe('wrapAsync', () => {
  it('returns ok with wrapped async function', () => {
    const onError = vi.fn();
    const result = wrapAsync(doubleNumber, onError);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.data).toBe('function');
    }
  });

  it('resolves with value on success', async () => {
    const onError = vi.fn();
    const result = wrapAsync(incrementNumber, onError);

    if (!result.ok) {
      throw new Error('wrapAsync failed');
    }

    const value = await result.data(41);
    expect(value).toBe(42);
    expect(onError).not.toHaveBeenCalled();
  });

  it('routes error through onError and re-throws', async () => {
    const onError = vi.fn();
    const result = wrapAsync(throwKaboom, onError);

    if (!result.ok) {
      throw new Error('wrapAsync failed');
    }
    await expect(result.data()).rejects.toThrow('kaboom');
    expect(onError).toHaveBeenCalled();
    const captured = onError.mock.calls[0]?.[0] as CapturedError;
    expect(captured.type).toBe('uncaughtException');
    expect(captured.fatal).toBe(false);
  });

  it('captured has correct error message', async () => {
    const onError = vi.fn();
    const result = wrapAsync(throwSpecific, onError);

    if (!result.ok) {
      throw new Error('wrapAsync failed');
    }
    try {
      await result.data();
    } catch {
      /* expected */
    }

    const captured = onError.mock.calls[0]?.[0] as CapturedError;
    expect(captured.error.message).toContain('specific error');
  });

  it('preserves args to wrapped function', async () => {
    const spy = vi.fn(sumTwoNumbers);
    const onError = vi.fn();
    const result = wrapAsync(spy, onError);

    if (!result.ok) {
      throw new Error('wrapAsync failed');
    }
    await result.data(2, 3);
    expect(spy).toHaveBeenCalledWith(2, 3);
  });
});

// ── wrapFetchHandler ───────────────────────────────────────────────────

/* Hoisted handlers for wrapFetchHandler — keeps consistent-function-scoping rule happy.
 * Not marked async so `require-await` does not flag them — wrapFetchHandler expects
 * a function returning Promise<Response>, satisfied by Promise.resolve/reject. */
function okHandler(): Promise<Response> {
  return Promise.resolve(new Response('ok'));
}
function throwingHandlerBoom(): Promise<Response> {
  return Promise.reject(new Error('handler boom'));
}
function throwingHandlerX(): Promise<Response> {
  return Promise.reject(new Error('x'));
}

describe('wrapFetchHandler', () => {
  it('passes through successful responses', async () => {
    const onError = vi.fn();
    const wrapped = wrapFetchHandler(okHandler, onError);

    if (!wrapped.ok) {
      throw new Error('wrapFetchHandler failed');
    }

    const req = new Request('https://example.com/');
    const res = await wrapped.data(req, {}, {});
    expect(res.status).toBe(200);
    expect(onError).not.toHaveBeenCalled();
  });

  it('returns 500 Response and invokes onError on throw', async () => {
    const onError = vi.fn();
    const wrapped = wrapFetchHandler(throwingHandlerBoom, onError);

    if (!wrapped.ok) {
      throw new Error('wrapFetchHandler failed');
    }

    const req = new Request('https://example.com/api');
    const res = await wrapped.data(req, {}, {});
    expect(res.status).toBe(500);
    expect(await res.text()).toBe('Internal Server Error');
    expect(onError).toHaveBeenCalled();
  });

  it('captured error includes request meta', async () => {
    const onError = vi.fn();
    const wrapped = wrapFetchHandler(throwingHandlerX, onError);

    if (!wrapped.ok) {
      throw new Error('wrapFetchHandler failed');
    }

    const req = new Request('https://example.com/users', { method: 'POST' });
    await wrapped.data(req, {}, {});
    const captured = onError.mock.calls[0]?.[0] as CapturedError;
    expect(captured.meta?.request).toMatchObject({
      url: 'https://example.com/users',
      method: 'POST',
    });
  });
});

// ── captureWebSocketErrors ─────────────────────────────────────────────

/* Hoisted helper for captureWebSocketErrors — keeps consistent-function-scoping rule happy. */
function makeMockWs(url = 'ws://localhost/'): WebSocket {
  const listeners = new Map<string, Array<(e: Event) => void>>();
  const ws = {
    url,
    readyState: 1,
    addEventListener: (event: string, fn: (e: Event) => void): void => {
      const list = listeners.get(event) ?? [];
      list.push(fn);
      listeners.set(event, list);
    },
    removeEventListener: (event: string, fn: (e: Event) => void): void => {
      const list = listeners.get(event) ?? [];
      listeners.set(
        event,
        list.filter((x) => x !== fn),
      );
    },
    dispatchEvent: (event: Event): boolean => {
      const list = listeners.get(event.type) ?? [];

      for (const fn of list) {
        fn(event);
      }
      return true;
    },
  } as unknown as WebSocket;

  return ws;
}

describe('captureWebSocketErrors', () => {
  it('returns teardown fn', () => {
    const ws = makeMockWs();
    const onError = vi.fn();
    const result: Result<TeardownFn> = captureWebSocketErrors(ws, onError);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.data).toBe('function');
    }
  });

  it('routes WebSocket error through onError', () => {
    const ws = makeMockWs();
    const onError = vi.fn();
    const setup = captureWebSocketErrors(ws, onError);
    expect(setup.ok).toBe(true);
    ws.dispatchEvent(new Event('error'));
    expect(onError).toHaveBeenCalled();
    const captured = onError.mock.calls[0]?.[0] as CapturedError;
    expect(captured.type).toBe('webSocketError');
    expect(captured.meta?.url).toBe('ws://localhost/');
  });

  it('teardown removes the error listener', () => {
    const ws = makeMockWs();
    const onError = vi.fn();
    const setup = captureWebSocketErrors(ws, onError);

    if (!setup.ok) {
      throw new Error('setup failed');
    }
    setup.data();
    ws.dispatchEvent(new Event('error'));
    expect(onError).not.toHaveBeenCalled();
  });
});
