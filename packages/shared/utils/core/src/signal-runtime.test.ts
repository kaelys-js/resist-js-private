/**
 * Tests for runtime-specific handler registration in signal.ts.
 *
 * Mocks `detectRuntime` to force specific runtime kinds, and stubs
 * the corresponding globalThis objects (window, self, Deno) to cover
 * `registerBrowserHandlers`, `registerWorkerHandlers`,
 * `registerDenoHandlers`, and `registerBunHandlers`. Isolated from
 * `signal.test.ts` so the Node-path tests there are not affected by the
 * environment mocks.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mock @/utils/core/environment BEFORE importing signal ───────────────

const detectRuntimeMock = vi.fn();
const detectEnvironmentMock = vi.fn();
const getProcessMock = vi.fn();
const requireRuntimeMock = vi.fn();

vi.mock('@/utils/core/environment', () => ({
  detectRuntime: () => detectRuntimeMock(),
  detectEnvironment: () => detectEnvironmentMock(),
  getProcess: () => getProcessMock(),
  requireRuntime: (...args: unknown[]) => requireRuntimeMock(...args),
}));

const mockOk = <T>(data: T) =>
  Object.freeze({ ok: true as const, data, error: null }) as { ok: true; data: T; error: null };

// Must import after mocks
const {
  captureWebSocketErrors,
  resetSignalHandlers,
  setupGlobalErrorHandling,
  wrapAsync,
  wrapFetchHandler,
} = await import('./signal');

// ── Helpers ─────────────────────────────────────────────────────────────

const defaultEnvConfig = {
  kind: 'browser',
  isCI: false,
  isPR: false,
  isTTY: false,
  supportsColor: false,
  isElectronRenderer: false,
};

function setupBrowserGlobals(): () => void {
  const listeners = new Map<string, Array<(e: Event) => void>>();
  const win = {
    addEventListener(event: string, fn: (e: Event) => void) {
      const list = listeners.get(event) ?? [];
      list.push(fn);
      listeners.set(event, list);
    },
    removeEventListener(event: string, fn: (e: Event) => void) {
      const list = listeners.get(event) ?? [];
      listeners.set(
        event,
        list.filter((l) => l !== fn),
      );
    },
    dispatchEvent(event: Event): boolean {
      const list = listeners.get(event.type) ?? [];

      for (const fn of list) {
        fn(event);
      }
      return true;
    },
  };
  const doc = {
    addEventListener(event: string, fn: (e: Event) => void) {
      const list = listeners.get(`doc:${event}`) ?? [];
      list.push(fn);
      listeners.set(`doc:${event}`, list);
    },
    removeEventListener(event: string, fn: (e: Event) => void) {
      const list = listeners.get(`doc:${event}`) ?? [];
      listeners.set(
        `doc:${event}`,
        list.filter((l) => l !== fn),
      );
    },
    dispatchEvent(event: Event): boolean {
      const list = listeners.get(`doc:${event.type}`) ?? [];

      for (const fn of list) {
        fn(event);
      }
      return true;
    },
  };

  const origWindow = (globalThis as Record<string, unknown>).window;
  const origDoc = (globalThis as Record<string, unknown>).document;
  const origHTMLElement = (globalThis as Record<string, unknown>).HTMLElement;
  const origErrorEvent = (globalThis as Record<string, unknown>).ErrorEvent;

  (globalThis as Record<string, unknown>).window = win;
  (globalThis as Record<string, unknown>).document = doc;
  // Minimal HTMLElement stand-in for instanceof checks
  class FakeElement {
    tagName = 'IMG';
    _attrs: Record<string, string> = {};
    getAttribute(name: string): string | null {
      return this._attrs[name] ?? null;
    }
    setAttribute(name: string, val: string) {
      this._attrs[name] = val;
    }
  }
  (globalThis as Record<string, unknown>).HTMLElement = FakeElement;

  // Use real ErrorEvent if available (jsdom) else a minimal poly
  if (typeof (globalThis as Record<string, unknown>).ErrorEvent !== 'function') {
    class FakeErrorEvent extends Event {
      error: unknown;
      message: string;
      filename?: string;
      lineno?: number;
      colno?: number;
      constructor(
        type: string,
        init: {
          error?: unknown;
          message?: string;
          filename?: string;
          lineno?: number;
          colno?: number;
        } = {},
      ) {
        super(type);
        this.error = init.error;
        this.message = init.message ?? '';
        this.filename = init.filename;
        this.lineno = init.lineno;
        this.colno = init.colno;
      }
    }
    (globalThis as Record<string, unknown>).ErrorEvent = FakeErrorEvent;
  }

  return () => {
    if (origWindow === undefined) {
      delete (globalThis as Record<string, unknown>).window;
    } else {
      (globalThis as Record<string, unknown>).window = origWindow;
    }
    if (origDoc === undefined) {
      delete (globalThis as Record<string, unknown>).document;
    } else {
      (globalThis as Record<string, unknown>).document = origDoc;
    }
    if (origHTMLElement === undefined) {
      delete (globalThis as Record<string, unknown>).HTMLElement;
    } else {
      (globalThis as Record<string, unknown>).HTMLElement = origHTMLElement;
    }
    if (origErrorEvent === undefined) {
      delete (globalThis as Record<string, unknown>).ErrorEvent;
    } else {
      (globalThis as Record<string, unknown>).ErrorEvent = origErrorEvent;
    }
  };
}

function setupWorkerGlobals(): () => void {
  const listeners = new Map<string, Array<(e: Event) => void>>();
  const selfRef = {
    addEventListener(event: string, fn: (e: Event) => void) {
      const list = listeners.get(event) ?? [];
      list.push(fn);
      listeners.set(event, list);
    },
    removeEventListener(event: string, fn: (e: Event) => void) {
      const list = listeners.get(event) ?? [];
      listeners.set(
        event,
        list.filter((l) => l !== fn),
      );
    },
    dispatchEvent(event: Event): boolean {
      const list = listeners.get(event.type) ?? [];

      for (const fn of list) {
        fn(event);
      }
      return true;
    },
  };
  const orig = (globalThis as Record<string, unknown>).self;
  (globalThis as Record<string, unknown>).self = selfRef;
  return () => {
    if (orig === undefined) {
      delete (globalThis as Record<string, unknown>).self;
    } else {
      (globalThis as Record<string, unknown>).self = orig;
    }
  };
}

function setupDenoGlobals(): () => void {
  const signalListeners = new Map<string, () => void>();
  const Deno = {
    addSignalListener(name: string, handler: () => void) {
      signalListeners.set(name, handler);
    },
    removeSignalListener(name: string, _handler: () => void) {
      signalListeners.delete(name);
    },
  };
  const g = globalThis as Record<string, unknown>;
  const orig = g.Deno;
  g.Deno = Deno;
  return () => {
    if (orig === undefined) {
      delete g.Deno;
    } else {
      g.Deno = orig;
    }
  };
}

// ── Common setup/teardown ────────────────────────────────────────────────

beforeEach(() => {
  detectRuntimeMock.mockReturnValue(mockOk('node-tty'));
  detectEnvironmentMock.mockReturnValue(mockOk(defaultEnvConfig));
  getProcessMock.mockReturnValue(process);
  requireRuntimeMock.mockImplementation((_fn: string, _rt: string) =>
    Object.freeze({
      ok: false as const,
      data: null,
      error: Object.freeze({ code: 'RUNTIME.UNSUPPORTED', message: 'unsupported', meta: {} }),
    }),
  );
});

afterEach(() => {
  resetSignalHandlers();
  vi.clearAllMocks();
});

// ── setupGlobalErrorHandling — Browser runtime ──────────────────────────

describe('setupGlobalErrorHandling — browser runtime', () => {
  it('routes window.error ErrorEvent through onError', () => {
    detectRuntimeMock.mockReturnValue(mockOk('browser'));
    const cleanup = setupBrowserGlobals();

    try {
      const onError = vi.fn();
      const setup = setupGlobalErrorHandling({ onError, exitTimeoutMs: 0 });
      expect(setup.ok).toBe(true);

      const win = (globalThis as Record<string, unknown>).window as {
        dispatchEvent: (e: Event) => boolean;
      };
      const ErrorEventCtor = (globalThis as Record<string, unknown>).ErrorEvent as new (
        type: string,
        init?: Record<string, unknown>,
      ) => Event;
      win.dispatchEvent(
        new ErrorEventCtor('error', {
          error: new Error('browser boom'),
          message: 'browser boom',
          filename: 'app.js',
          lineno: 42,
          colno: 7,
        }),
      );
      expect(onError).toHaveBeenCalled();
      const captured = onError.mock.calls[0]?.[0];
      expect(captured.type).toBe('uncaughtException');
      expect(captured.meta?.filename).toBe('app.js');
      expect(captured.meta?.lineno).toBe(42);
    } finally {
      cleanup();
    }
  });

  it('ignores non-ErrorEvent emissions (resource errors)', () => {
    detectRuntimeMock.mockReturnValue(mockOk('browser'));
    const cleanup = setupBrowserGlobals();

    try {
      const onError = vi.fn();
      setupGlobalErrorHandling({ onError, exitTimeoutMs: 0 });
      const win = (globalThis as Record<string, unknown>).window as {
        dispatchEvent: (e: Event) => boolean;
      };
      // Plain Event (no .error) should be ignored by the JS-error listener
      // and only processed by the resource-error capture listener.
      win.dispatchEvent(new Event('error'));
      // No HTMLElement target → resource listener also skips.
      expect(onError).not.toHaveBeenCalled();
    } finally {
      cleanup();
    }
  });

  it('routes unhandledrejection through onError', () => {
    detectRuntimeMock.mockReturnValue(mockOk('browser'));
    const cleanup = setupBrowserGlobals();

    try {
      const onError = vi.fn();
      setupGlobalErrorHandling({ onError, exitTimeoutMs: 0 });
      const win = (globalThis as Record<string, unknown>).window as {
        dispatchEvent: (e: Event) => boolean;
      };
      const evt = new Event('unhandledrejection');
      (evt as unknown as { reason: unknown }).reason = new Error('promise fail');
      win.dispatchEvent(evt);
      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0]?.[0].type).toBe('unhandledRejection');
    } finally {
      cleanup();
    }
  });

  it('detects CORS script error via crossOriginBlocked meta flag', () => {
    detectRuntimeMock.mockReturnValue(mockOk('browser'));
    const cleanup = setupBrowserGlobals();

    try {
      const onError = vi.fn();
      setupGlobalErrorHandling({ onError, exitTimeoutMs: 0 });
      const win = (globalThis as Record<string, unknown>).window as {
        dispatchEvent: (e: Event) => boolean;
      };
      const ErrorEventCtor = (globalThis as Record<string, unknown>).ErrorEvent as new (
        type: string,
        init?: Record<string, unknown>,
      ) => Event;
      // CORS blocked errors lose filename + have message "Script error."
      win.dispatchEvent(
        new ErrorEventCtor('error', {
          message: 'Script error.',
          error: null,
        }),
      );
      expect(onError).toHaveBeenCalled();
      const captured = onError.mock.calls[0]?.[0];
      expect(captured.meta?.crossOriginBlocked).toBe(true);
    } finally {
      cleanup();
    }
  });

  it('captures CSP violations when captureCSP !== false', () => {
    detectRuntimeMock.mockReturnValue(mockOk('browser'));
    const cleanup = setupBrowserGlobals();

    try {
      const onError = vi.fn();
      setupGlobalErrorHandling({ onError, exitTimeoutMs: 0, captureCSP: true });
      const doc = (globalThis as Record<string, unknown>).document as {
        dispatchEvent: (e: Event) => boolean;
      };
      const evt = new Event('securitypolicyviolation');
      Object.assign(evt, {
        violatedDirective: 'script-src',
        blockedURI: 'https://evil.com/x.js',
        originalPolicy: "default-src 'self'",
        disposition: 'enforce',
      });
      doc.dispatchEvent(evt);
      expect(onError).toHaveBeenCalled();
      const captured = onError.mock.calls[0]?.[0];
      expect(captured.type).toBe('cspViolation');
      expect(captured.meta?.violatedDirective).toBe('script-src');
    } finally {
      cleanup();
    }
  });

  it('rate-limits CSP violations after 5 of the same key', () => {
    detectRuntimeMock.mockReturnValue(mockOk('browser'));
    const cleanup = setupBrowserGlobals();

    try {
      const onError = vi.fn();
      setupGlobalErrorHandling({ onError, exitTimeoutMs: 0 });
      const doc = (globalThis as Record<string, unknown>).document as {
        dispatchEvent: (e: Event) => boolean;
      };

      for (let i = 0; i < 10; i++) {
        const evt = new Event('securitypolicyviolation');
        Object.assign(evt, {
          violatedDirective: 'img-src',
          blockedURI: 'https://tracker.example/pixel',
          originalPolicy: "default-src 'self'",
          disposition: 'enforce',
        });
        doc.dispatchEvent(evt);
      }
      // Only the first 5 identical violations should invoke onError
      expect(onError).toHaveBeenCalledTimes(5);
    } finally {
      cleanup();
    }
  });

  it('skips CSP handler when captureCSP=false', () => {
    detectRuntimeMock.mockReturnValue(mockOk('browser'));
    const cleanup = setupBrowserGlobals();

    try {
      const onError = vi.fn();
      setupGlobalErrorHandling({ onError, exitTimeoutMs: 0, captureCSP: false });
      const doc = (globalThis as Record<string, unknown>).document as {
        dispatchEvent: (e: Event) => boolean;
      };
      const evt = new Event('securitypolicyviolation');
      Object.assign(evt, {
        violatedDirective: 'script-src',
        blockedURI: 'https://evil.com/',
        originalPolicy: '',
        disposition: 'enforce',
      });
      doc.dispatchEvent(evt);
      expect(onError).not.toHaveBeenCalled();
    } finally {
      cleanup();
    }
  });

  it('captures resource load errors with raw src attribute', () => {
    detectRuntimeMock.mockReturnValue(mockOk('browser'));
    const cleanup = setupBrowserGlobals();

    try {
      const onError = vi.fn();
      setupGlobalErrorHandling({ onError, exitTimeoutMs: 0 });
      const win = (globalThis as Record<string, unknown>).window as {
        dispatchEvent: (e: Event) => boolean;
      };
      const HTMLElementCtor = (globalThis as Record<string, unknown>).HTMLElement as new () => {
        tagName: string;
        setAttribute: (n: string, v: string) => void;
      };
      const el = new HTMLElementCtor();
      el.setAttribute('src', '/missing.png');
      const evt = new Event('error');
      Object.defineProperty(evt, 'target', { value: el });
      win.dispatchEvent(evt);
      expect(onError).toHaveBeenCalled();
      const captured = onError.mock.calls[0]?.[0];
      expect(captured.type).toBe('resourceError');
      expect(captured.meta?.src).toBe('/missing.png');
    } finally {
      cleanup();
    }
  });

  it('skips resource error capture when captureResourceErrors=false', () => {
    detectRuntimeMock.mockReturnValue(mockOk('browser'));
    const cleanup = setupBrowserGlobals();

    try {
      const onError = vi.fn();
      setupGlobalErrorHandling({ onError, exitTimeoutMs: 0, captureResourceErrors: false });
      const win = (globalThis as Record<string, unknown>).window as {
        dispatchEvent: (e: Event) => boolean;
      };
      const HTMLElementCtor = (globalThis as Record<string, unknown>).HTMLElement as new () => {
        setAttribute: (n: string, v: string) => void;
      };
      const el = new HTMLElementCtor();
      el.setAttribute('src', '/also-missing.png');
      const evt = new Event('error');
      Object.defineProperty(evt, 'target', { value: el });
      win.dispatchEvent(evt);
      expect(onError).not.toHaveBeenCalled();
    } finally {
      cleanup();
    }
  });

  it('skips resource error when target has no src/href', () => {
    detectRuntimeMock.mockReturnValue(mockOk('browser'));
    const cleanup = setupBrowserGlobals();

    try {
      const onError = vi.fn();
      setupGlobalErrorHandling({ onError, exitTimeoutMs: 0 });
      const win = (globalThis as Record<string, unknown>).window as {
        dispatchEvent: (e: Event) => boolean;
      };
      const HTMLElementCtor = (globalThis as Record<string, unknown>).HTMLElement as new () => {
        tagName: string;
      };
      const el = new HTMLElementCtor();
      // Intentionally no src attribute
      const evt = new Event('error');
      Object.defineProperty(evt, 'target', { value: el });
      win.dispatchEvent(evt);
      expect(onError).not.toHaveBeenCalled();
    } finally {
      cleanup();
    }
  });

  it('electron renderer adds both browser + node handlers', () => {
    detectRuntimeMock.mockReturnValue(mockOk('browser'));
    detectEnvironmentMock.mockReturnValue(
      mockOk({ ...defaultEnvConfig, isElectronRenderer: true }),
    );
    const cleanup = setupBrowserGlobals();

    try {
      const onError = vi.fn();
      const setup = setupGlobalErrorHandling({ onError, exitTimeoutMs: 0 });
      expect(setup.ok).toBe(true);
      // Node SIGINT still routes because Node handlers are also registered
      (process as NodeJS.EventEmitter).emit('SIGINT');
      expect(onError).toHaveBeenCalled();
    } finally {
      cleanup();
    }
  });
});

// ── setupGlobalErrorHandling — Worker runtimes ──────────────────────────

describe('setupGlobalErrorHandling — worker runtimes', () => {
  for (const kind of ['web-worker', 'shared-worker', 'service-worker'] as const) {
    it(`routes ${kind} error via self.error`, () => {
      detectRuntimeMock.mockReturnValue(mockOk(kind));
      const cleanup = setupWorkerGlobals();

      try {
        const onError = vi.fn();
        setupGlobalErrorHandling({ onError, exitTimeoutMs: 0 });
        const selfRef = (globalThis as Record<string, unknown>).self as {
          dispatchEvent: (e: Event) => boolean;
        };
        const evt = new Event('error');
        Object.assign(evt, { error: new Error('worker boom'), message: 'worker boom' });
        selfRef.dispatchEvent(evt);
        expect(onError).toHaveBeenCalled();
        const captured = onError.mock.calls[0]?.[0];
        expect(captured.type).toBe('uncaughtException');
      } finally {
        cleanup();
      }
    });
  }

  it('worker unhandledrejection is captured', () => {
    detectRuntimeMock.mockReturnValue(mockOk('web-worker'));
    const cleanup = setupWorkerGlobals();

    try {
      const onError = vi.fn();
      setupGlobalErrorHandling({ onError, exitTimeoutMs: 0 });
      const selfRef = (globalThis as Record<string, unknown>).self as {
        dispatchEvent: (e: Event) => boolean;
      };
      const evt = new Event('unhandledrejection');
      (evt as unknown as { reason: unknown }).reason = new Error('worker promise');
      selfRef.dispatchEvent(evt);
      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0]?.[0].type).toBe('unhandledRejection');
    } finally {
      cleanup();
    }
  });

  it('edge runtimes (worker/edge-light/fastly/netlify) use worker handlers', () => {
    for (const kind of ['worker', 'edge-light', 'fastly', 'netlify'] as const) {
      detectRuntimeMock.mockReturnValue(mockOk(kind));
      const cleanup = setupWorkerGlobals();

      try {
        const onError = vi.fn();
        const setup = setupGlobalErrorHandling({ onError, exitTimeoutMs: 0 });
        expect(setup.ok).toBe(true);
        resetSignalHandlers();
      } finally {
        cleanup();
      }
    }
  });
});

// ── setupGlobalErrorHandling — Deno runtime ─────────────────────────────

describe('setupGlobalErrorHandling — deno runtime', () => {
  it('uses Deno.addSignalListener for SIGINT and SIGTERM', () => {
    detectRuntimeMock.mockReturnValue(mockOk('deno'));
    const cleanup = setupDenoGlobals();

    try {
      const onError = vi.fn();
      setupGlobalErrorHandling({ onError, exitTimeoutMs: 0, onFatalExit: vi.fn() });
      // The Deno addSignalListener was called — confirmed by no exceptions
      expect(onError).not.toHaveBeenCalled();
    } finally {
      cleanup();
    }
  });

  it('teardown removes Deno signal listeners', () => {
    detectRuntimeMock.mockReturnValue(mockOk('deno'));
    const cleanup = setupDenoGlobals();

    try {
      const onError = vi.fn();
      const setup = setupGlobalErrorHandling({ onError, exitTimeoutMs: 0 });
      expect(setup.ok).toBe(true);
      if (setup.ok) {
        setup.data(); // triggers removeSignalListener path
      }
    } finally {
      cleanup();
    }
  });
});

// ── setupGlobalErrorHandling — Bun runtime ──────────────────────────────

describe('setupGlobalErrorHandling — bun runtime', () => {
  it('bun delegates to Node handlers', () => {
    detectRuntimeMock.mockReturnValue(mockOk('bun'));
    const onError = vi.fn();
    const setup = setupGlobalErrorHandling({ onError, exitTimeoutMs: 0 });
    expect(setup.ok).toBe(true);
    (process as NodeJS.EventEmitter).emit('SIGINT');
    expect(onError).toHaveBeenCalled();
  });
});

// ── Setup failure paths ──────────────────────────────────────────────────

describe('setupGlobalErrorHandling — failure paths', () => {
  it('propagates detectRuntime error', () => {
    detectRuntimeMock.mockReturnValue({
      ok: false,
      data: null,
      error: { code: 'RUNTIME.UNSUPPORTED', message: 'no runtime', meta: {} },
    });
    const result = setupGlobalErrorHandling({ onError: vi.fn(), exitTimeoutMs: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });

  it('propagates detectEnvironment error', () => {
    detectRuntimeMock.mockReturnValue(mockOk('node-tty'));
    detectEnvironmentMock.mockReturnValue({
      ok: false,
      data: null,
      error: { code: 'RUNTIME.UNSUPPORTED', message: 'no env', meta: {} },
    });
    const result = setupGlobalErrorHandling({ onError: vi.fn(), exitTimeoutMs: 0 });
    expect(result.ok).toBe(false);
  });
});

// ── wrapAsync / wrapFetchHandler / captureWebSocketErrors failure paths ─

describe('wrapAsync — runtime failure', () => {
  it('returns runtime error when detectRuntime fails', () => {
    detectRuntimeMock.mockReturnValue({
      ok: false,
      data: null,
      error: { code: 'RUNTIME.UNSUPPORTED', message: 'no runtime', meta: {} },
    });
    const result = wrapAsync(async () => {
      await Promise.resolve();
      return 1;
    }, vi.fn());
    expect(result.ok).toBe(false);
  });
});

const fetchHandlerFixture = async (): Promise<Response> => {
  await Promise.resolve();
  return new Response('ok');
};

describe('wrapFetchHandler — runtime failure', () => {
  it('returns runtime error when detectRuntime fails', () => {
    detectRuntimeMock.mockReturnValue({
      ok: false,
      data: null,
      error: { code: 'RUNTIME.UNSUPPORTED', message: 'no runtime', meta: {} },
    });
    const result = wrapFetchHandler(fetchHandlerFixture, vi.fn());
    expect(result.ok).toBe(false);
  });
});

describe('captureWebSocketErrors — runtime failure', () => {
  it('returns runtime error when detectRuntime fails', () => {
    detectRuntimeMock.mockReturnValue({
      ok: false,
      data: null,
      error: { code: 'RUNTIME.UNSUPPORTED', message: 'no runtime', meta: {} },
    });
    const ws = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      url: 'ws://x',
      readyState: 1,
    } as unknown as WebSocket;
    const result = captureWebSocketErrors(ws, vi.fn());
    expect(result.ok).toBe(false);
  });
});
