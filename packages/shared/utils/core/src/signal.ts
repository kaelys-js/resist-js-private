/**
 * Signal & Global Error Handling
 *
 * Universal, environment-agnostic error handling infrastructure.
 * Normalizes all uncaught errors into `CapturedError` envelopes
 * containing an `AppError`, with per-environment handler registration,
 * teardown, and re-entrancy protection.
 *
 * Also provides the legacy `setupSignalHandlers` API (which now delegates
 * to `setupGlobalErrorHandling` internally), abort signal management,
 * and cleanup callback registration.
 *
 * Supported environments:
 * - **Node.js (TTY/pipe)**: uncaughtException, unhandledRejection, SIGINT, SIGTERM, SIGPIPE
 * - **Browser**: error, unhandledrejection, securitypolicyviolation, resource errors
 * - **Web Worker / SharedWorker / Service Worker**: error, unhandledrejection
 * - **Cloudflare Worker / edge**: error, unhandledrejection (use `wrapFetchHandler` for fetch errors)
 * - **Deno**: error, unhandledrejection, Deno.addSignalListener
 * - **Bun**: Node-compatible process.on
 * - **Capacitor**: browser handlers (WebView)
 * - **Electron renderer**: browser + Node handlers
 * - **Electron main**: Node handlers
 *
 * All type annotations use Valibot-inferred types from `@/schemas/common`.
 *
 * @module
 */

import * as v from 'valibot';

import {
  AbortSignalSchema,
  BoolSchema,
  CleanupCallbackSchema,
  VoidSchema,
  type Bool,
  type CleanupCallback,
  type EnvironmentConfig,
  type InterruptHandler,
  type LogContext,
  type NullableAbortController,
  type OptionalNodeProcess,
  type RuntimeKind,
  type Num,
  type Str,
  type TeardownFn,
  type Void,
} from '@/schemas/common';
import { functionSchema } from '@/schemas/function/function';
import {
  type Breadcrumb,
  type CapturedError,
  type CapturedErrorType,
  ErrorContextsSchema,
  ErrorUserContextSchema,
} from '@/schemas/result/captured-error';
import {
  ErrorTagsSchema,
  type AppError,
  ok,
  okUnchecked,
  type Result,
} from '@/schemas/result/result';
import { drainBreadcrumbs } from '@/utils/result/breadcrumbs';
import { detectEnvironment, detectRuntime, getProcess } from '@/utils/core/environment';
import { getContext } from '@/utils/core/logger';
import { fromUnknownError, safeParse } from '@/utils/result/safe';

// =============================================================================
// GlobalErrorHandlerOptions Schema
// =============================================================================

/**
 * Schema for global error handler configuration options.
 *
 * Lives in `signal.ts` (not `result.ts`) to avoid a circular dependency:
 * `result.ts` is a leaf package, and `functionSchema()` depends on `result`.
 *
 * @example
 * ```typescript
 * const options: GlobalErrorHandlerOptions = {
 *   onError: (captured: CapturedError): void => {
 *     console.error(`[${captured.type}] ${captured.error.message}`);
 *   },
 *   exitTimeoutMs: 3000,
 * };
 * ```
 */
export const GlobalErrorHandlerOptionsSchema = v.strictObject({
  /** Callback invoked for each captured error. Fire-and-forget context. */
  onError: functionSchema<[CapturedError], void>(),
  /** Callback invoked when handler determines a fatal exit. Fire-and-forget. */
  onFatalExit: v.optional(functionSchema<[CapturedError], void>()),
  /** Timeout in ms before force-exiting on fatal error (Node/Deno/Bun). Default: 5000. 0 disables. */
  exitTimeoutMs: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  /** Whether to capture CSP violations (browser only). Default: true. */
  captureCSP: v.optional(BoolSchema),
  /** Whether to capture resource load errors (browser only). Default: true. */
  captureResourceErrors: v.optional(BoolSchema),
  /** Software release version. Attached to every CapturedError as ambient context. */
  release: v.optional(v.string()),
  /** Server/worker name. Attached to every CapturedError as ambient context. */
  serverName: v.optional(v.string()),
  /** Default tags attached to every CapturedError. */
  tags: v.optional(ErrorTagsSchema),
  /** Default user context attached to every CapturedError. */
  user: v.optional(ErrorUserContextSchema),
  /** Default structured contexts (OS, browser, device, app, custom). */
  contexts: v.optional(ErrorContextsSchema),
});

/** Inferred output type of {@link GlobalErrorHandlerOptionsSchema}. */
export type GlobalErrorHandlerOptions = v.InferOutput<typeof GlobalErrorHandlerOptionsSchema>;

// =============================================================================
// Module-level State
// =============================================================================

/** Whether legacy signal handlers have been set up. */
let signalHandlersSetup: Bool = false;

/** Global AbortController for cancellation. */
let globalAbortController: NullableAbortController = null;

/** Re-entrancy guard for safeInvoke. */
let isHandling: Bool = false;

/** Whether setupGlobalErrorHandling has been called. */
let globalErrorHandlingSetup: Bool = false;

/** Exit timeout handle for fatal error forced termination. */
let exitTimeoutHandle: ReturnType<typeof setTimeout> | null = null;

/** Ambient options stored from setupGlobalErrorHandling for createCapturedError and reportError. */
let _ambientOptions: GlobalErrorHandlerOptions | undefined;

/**
 * Registered listeners for teardown. Named references enable removeEventListener/process.off.
 *
 * @internal
 */
let registeredListeners: Array<{
  readonly target: EventTarget | NodeJS.Process;
  readonly event: Str;
  readonly listener: (...args: unknown[]) => void;
  readonly capture?: Bool;
  /** Whether this is a Deno signal listener (needs Deno.removeSignalListener for teardown). */
  readonly denoSignal?: Bool;
}> = [];

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Registers an event listener and stores the reference for teardown.
 *
 * @param target - The event target (window, self, process).
 * @param event - The event name.
 * @param listener - The handler function (must be a named reference).
 * @param capture - Whether to use capture phase (browser resource errors).
 * @returns Void — fire-and-forget internal helper.
 */
function addListener(
  target: EventTarget | NodeJS.Process,
  event: Str,
  listener: (...args: unknown[]) => void,
  capture?: Bool,
): Void {
  if ('addEventListener' in target) {
    (target as EventTarget).addEventListener(
      event,
      listener as EventListener,
      capture === undefined ? undefined : { capture },
    );
  } else if ('on' in target) {
    (target as NodeJS.Process).on(event, listener);
  }
  registeredListeners.push({ target, event, listener, capture });
}

/**
 * Creates a CapturedError from an unknown thrown value.
 *
 * Automatically merges the global log context (from `getContext()`) into
 * the `meta` field, providing correlation IDs, operation name, and runtime
 * info on every captured error without explicit caller effort.
 *
 * Handler-specific meta (e.g., `{ signal: 'SIGINT' }`) overwrites
 * any conflicting keys from the global context.
 *
 * @param type - The type of captured error.
 * @param original - The raw thrown/rejected value.
 * @param fatal - Whether this error will cause process termination.
 * @param environment - The detected runtime kind.
 * @param meta - Optional context (signal name, URL, etc.). Merged with global log context.
 * @returns CapturedError — frozen envelope.
 */
function createCapturedError(
  type: CapturedErrorType,
  original: unknown,
  fatal: Bool,
  environment: RuntimeKind,
  meta?: Record<Str, unknown>,
): CapturedError {
  const appError: AppError = fromUnknownError(original);

  // Merge global log context into meta for automatic correlation
  const ctxResult: Result<LogContext> = getContext();
  const contextFields: Record<Str, unknown> =
    ctxResult.ok && Object.keys(ctxResult.data).length > 0 ? { ...ctxResult.data } : {};
  const mergedMeta: Record<Str, unknown> | undefined =
    Object.keys(contextFields).length > 0 || meta !== undefined
      ? { ...contextFields, ...meta }
      : undefined;

  // Auto-drain breadcrumbs
  const crumbs: Result<readonly Breadcrumb[]> = drainBreadcrumbs();
  const breadcrumbs: ReadonlyArray<Breadcrumb> | undefined =
    crumbs.ok && crumbs.data.length > 0 ? crumbs.data : undefined;

  // Auto-generate fingerprint from error code
  const fingerprint: readonly Str[] = [appError.code];

  return Object.freeze({
    type,
    id: crypto.randomUUID(),
    error: appError,
    original,
    environment,
    timestamp: new Date().toISOString(),
    fatal,
    ...(mergedMeta !== undefined && { meta: mergedMeta }),
    ...(breadcrumbs !== undefined && { breadcrumbs }),
    fingerprint,
    ...(_ambientOptions?.release !== undefined && { release: _ambientOptions.release }),
    ...(_ambientOptions?.serverName !== undefined && { serverName: _ambientOptions.serverName }),
    ...(_ambientOptions?.tags !== undefined && { tags: _ambientOptions.tags }),
    ...(_ambientOptions?.user !== undefined && { user: _ambientOptions.user }),
    ...(_ambientOptions?.contexts !== undefined && { contexts: _ambientOptions.contexts }),
  }) as CapturedError;
}

/**
 * Invokes a callback with re-entrancy protection.
 *
 * If the callback is already executing (re-entrant call), the invocation
 * is silently dropped. If the callback throws, the error is swallowed
 * (the handler must not crash the process).
 *
 * @param fn - The onError or onFatalExit callback.
 * @param captured - The captured error event.
 * @returns Void — fire-and-forget context.
 */
function safeInvoke(fn: (captured: CapturedError) => void, captured: CapturedError): Void {
  if (isHandling) {
    return;
  }
  isHandling = true;
  try {
    fn(captured);
  } catch {
    // Intentionally swallowed — handler must not crash the process
  } finally {
    isHandling = false;
  }
}

/**
 * Removes all registered global error listeners.
 *
 * Handles three listener types:
 * - EventTarget (browser, worker, Deno globalThis): `removeEventListener`
 * - NodeJS.Process: `process.off`
 * - Deno signal listeners: `Deno.removeSignalListener` (for SIGINT/SIGTERM
 *   registered via `Deno.addSignalListener`, stored with `denoSignal: true`)
 *
 * @returns Void — fire-and-forget (called from teardown and reset).
 */
function removeAllListeners(): Void {
  for (let i: number = registeredListeners.length - 1; i >= 0; i--) {
    const entry = registeredListeners[i];
    if (!entry) {
      continue;
    }
    const { target, event, listener, capture, denoSignal } = entry;
    if (denoSignal) {
      // Deno signal listeners must use Deno.removeSignalListener
      const denoGlobal: Record<Str, unknown> = globalThis as Record<Str, unknown>;
      const Deno: Record<Str, unknown> | undefined = denoGlobal.Deno as
        | Record<Str, unknown>
        | undefined;
      if (Deno && typeof Deno.removeSignalListener === 'function') {
        (Deno.removeSignalListener as (signal: Str, handler: () => void) => void)(
          event,
          listener as () => void,
        );
      }
    } else if ('removeEventListener' in target) {
      (target as EventTarget).removeEventListener(
        event,
        listener as EventListener,
        capture === undefined ? undefined : { capture },
      );
    } else if ('off' in target) {
      (target as NodeJS.Process).off(event, listener);
    }
  }
  registeredListeners = [];
}

/**
 * Teardown function — removes all listeners and resets global error handling state.
 *
 * Returned by `setupGlobalErrorHandling`. Also used internally by `resetSignalHandlers`.
 *
 * @returns Void — fire-and-forget.
 */
function teardown(): Void {
  removeAllListeners();
  globalErrorHandlingSetup = false;
  isHandling = false;
  _ambientOptions = undefined;
  if (exitTimeoutHandle !== null) {
    clearTimeout(exitTimeoutHandle);
    exitTimeoutHandle = null;
  }
}

// =============================================================================
// Per-Environment Handler Registration
// =============================================================================

/**
 * Registers Node.js-specific error and signal handlers.
 *
 * @param options - Validated handler options.
 * @param runtime - Detected runtime kind.
 * @returns Void — fire-and-forget.
 */
function registerNodeHandlers(options: GlobalErrorHandlerOptions, runtime: RuntimeKind): Void {
  const proc: OptionalNodeProcess = getProcess();
  if (!proc || typeof proc.on !== 'function') {
    return;
  }

  if (!globalAbortController) {
    globalAbortController = new AbortController();
  }

  // uncaughtException — fatal
  addListener(proc, 'uncaughtException', (thrown: unknown): Void => {
    const captured: CapturedError = createCapturedError('uncaughtException', thrown, true, runtime);
    safeInvoke(options.onError, captured);

    if (globalAbortController) {
      globalAbortController.abort();
    }

    if (options.onFatalExit) {
      safeInvoke(options.onFatalExit, captured);
    }

    // Schedule force exit
    const timeoutMs: number = options.exitTimeoutMs ?? 5000;
    if (timeoutMs > 0 && proc.exit) {
      exitTimeoutHandle = setTimeout(() => {
        proc.exit(1);
      }, timeoutMs);
      // Unref so timer doesn't keep process alive
      if (
        typeof exitTimeoutHandle === 'object' &&
        exitTimeoutHandle !== null &&
        'unref' in exitTimeoutHandle
      ) {
        (exitTimeoutHandle as NodeJS.Timeout).unref();
      }
    }
  });

  // unhandledRejection — non-fatal
  addListener(proc, 'unhandledRejection', (reason: unknown): Void => {
    const captured: CapturedError = createCapturedError(
      'unhandledRejection',
      reason,
      false,
      runtime,
    );
    safeInvoke(options.onError, captured);
  });

  // SIGINT — fatal signal
  addListener(proc, 'SIGINT', (): Void => {
    if (globalAbortController) {
      globalAbortController.abort();
    }
    const captured: CapturedError = createCapturedError(
      'signal',
      new Error('SIGINT'),
      true,
      runtime,
      { signal: 'SIGINT' },
    );
    safeInvoke(options.onError, captured);
    if (options.onFatalExit) {
      safeInvoke(options.onFatalExit, captured);
    }
  });

  // SIGTERM — fatal signal
  addListener(proc, 'SIGTERM', (): Void => {
    if (globalAbortController) {
      globalAbortController.abort();
    }
    const captured: CapturedError = createCapturedError(
      'signal',
      new Error('SIGTERM'),
      true,
      runtime,
      { signal: 'SIGTERM' },
    );
    safeInvoke(options.onError, captured);
    if (options.onFatalExit) {
      safeInvoke(options.onFatalExit, captured);
    }
  });

  // SIGPIPE — silent ignore (existing behavior)
  addListener(proc, 'SIGPIPE', (): Void => {
    // Ignore SIGPIPE to prevent crash when piped to head
  });
}

/**
 * Registers browser-specific error handlers.
 *
 * @param options - Validated handler options.
 * @param runtime - Detected runtime kind.
 * @returns Void — fire-and-forget.
 */
function registerBrowserHandlers(options: GlobalErrorHandlerOptions, runtime: RuntimeKind): Void {
  if (globalThis.window === undefined) {
    return;
  }

  const win: Window = globalThis.window;

  // window.error — JS errors (ErrorEvent) — non-fatal in browser
  addListener(win, 'error', (event: unknown): Void => {
    // Distinguish JS errors from resource errors
    if (!(event instanceof ErrorEvent)) {
      return;
    }

    const errorMeta: Record<Str, unknown> = {};
    if (event.filename) {
      errorMeta.filename = event.filename;
    }
    if (event.lineno) {
      errorMeta.lineno = event.lineno;
    }
    if (event.colno) {
      errorMeta.colno = event.colno;
    }
    // Detect CORS "Script error." cross-origin blocking
    if (event.message === 'Script error.' && !event.filename) {
      errorMeta.crossOriginBlocked = true;
    }

    const captured: CapturedError = createCapturedError(
      'uncaughtException',
      event.error ?? event.message,
      false,
      runtime,
      errorMeta,
    );
    safeInvoke(options.onError, captured);
  });

  // window.unhandledrejection — non-fatal
  addListener(win, 'unhandledrejection', (event: unknown): Void => {
    const reason: unknown = (event as PromiseRejectionEvent)?.reason;
    const captured: CapturedError = createCapturedError(
      'unhandledRejection',
      reason,
      false,
      runtime,
    );
    safeInvoke(options.onError, captured);
  });

  // CSP violations — rate-limited to prevent console floods.
  // Identical violations (same directive + blockedURI) are coalesced:
  // the first CSP_RATE_LIMIT_MAX fires per key within CSP_RATE_LIMIT_WINDOW_MS
  // are reported normally; subsequent ones are suppressed and counted.
  // After the window expires the counter resets.
  if (options.captureCSP !== false && globalThis.document !== undefined) {
    /** Max CSP violations per unique key before suppressing. */
    const CSP_RATE_LIMIT_MAX: Num = 5;
    /** Window (ms) after which the rate-limit counter resets. */
    const CSP_RATE_LIMIT_WINDOW_MS: Num = 10_000;

    const cspCounts: Map<Str, { count: Num; firstSeen: Num }> = new Map();

    addListener(globalThis.document, 'securitypolicyviolation', (event: unknown): Void => {
      // SecurityPolicyViolationEvent — cast required because the
      // generic event listener signature doesn't know the event subtype.
      const cspEvent: SecurityPolicyViolationEvent = event as SecurityPolicyViolationEvent;
      const rateKey: Str = `${cspEvent.violatedDirective}|${cspEvent.blockedURI}`;
      const now: Num = Date.now();
      let entry = cspCounts.get(rateKey);

      if (!entry || now - entry.firstSeen > CSP_RATE_LIMIT_WINDOW_MS) {
        // First occurrence or window expired — reset counter.
        entry = { count: 0, firstSeen: now };
        cspCounts.set(rateKey, entry);
      }

      entry.count++;

      if (entry.count > CSP_RATE_LIMIT_MAX) {
        // Suppress — already logged enough for this window.
        return;
      }

      const captured: CapturedError = createCapturedError(
        'cspViolation',
        new Error(`CSP violation: ${cspEvent.violatedDirective}`),
        false,
        runtime,
        {
          violatedDirective: cspEvent.violatedDirective,
          blockedURI: cspEvent.blockedURI,
          originalPolicy: cspEvent.originalPolicy,
          disposition: cspEvent.disposition,
        },
      );
      safeInvoke(options.onError, captured);
    });
  }

  // Resource load errors (capture phase to catch <img>, <script>, etc.)
  if (options.captureResourceErrors !== false) {
    addListener(
      win,
      'error',
      (event: unknown): Void => {
        // Only fires for HTMLElement targets (not ErrorEvent JS errors)
        if (event instanceof ErrorEvent) {
          return;
        }
        const target: unknown = (event as Event)?.target;
        if (!target || !(target instanceof HTMLElement)) {
          return;
        }
        // Use getAttribute to get the raw attribute value, not the resolved URL.
        // .src/.href properties resolve relative/empty values to the page URL,
        // producing misleading "Resource load error: <IMG> http://current-page" messages.
        const rawSrc: Str =
          (target as HTMLElement).getAttribute('src') ??
          (target as HTMLElement).getAttribute('href') ??
          '';
        if (!rawSrc) {
          return; // Skip elements with no actual src/href attribute
        }
        const { tagName } = target;
        const captured: CapturedError = createCapturedError(
          'resourceError',
          new Error(`Resource load error: <${tagName}> ${rawSrc}`),
          false,
          runtime,
          { tagName, src: rawSrc },
        );
        safeInvoke(options.onError, captured);
      },
      true,
    ); // capture phase
  }
}

/**
 * Registers worker-specific error handlers.
 *
 * Covers: `'web-worker'`, `'shared-worker'`, `'service-worker'`, `'worker'` (CF/edge).
 *
 * @remarks SharedWorker limitation: errors from individual ports are caught by
 * the port's own `onerror`, not by the global handler. Only errors in the
 * SharedWorker's initialization code or top-level scope are caught here.
 *
 * @param options - Validated handler options.
 * @param runtime - Detected runtime kind.
 * @returns Void — fire-and-forget.
 */
function registerWorkerHandlers(options: GlobalErrorHandlerOptions, runtime: RuntimeKind): Void {
  if (globalThis.self === undefined) {
    return;
  }

  const selfRef: typeof globalThis.self = globalThis.self;

  addListener(selfRef, 'error', (event: unknown): Void => {
    const errorEvent: ErrorEvent = event as ErrorEvent;
    const captured: CapturedError = createCapturedError(
      'uncaughtException',
      errorEvent.error ?? errorEvent.message,
      false,
      runtime,
    );
    safeInvoke(options.onError, captured);
  });

  addListener(selfRef, 'unhandledrejection', (event: unknown): Void => {
    const reason: unknown = (event as PromiseRejectionEvent)?.reason;
    const captured: CapturedError = createCapturedError(
      'unhandledRejection',
      reason,
      false,
      runtime,
    );
    safeInvoke(options.onError, captured);
  });
}

/**
 * Registers Deno-specific error and signal handlers.
 *
 * @param options - Validated handler options.
 * @param runtime - Detected runtime kind.
 * @returns Void — fire-and-forget.
 */
function registerDenoHandlers(options: GlobalErrorHandlerOptions, runtime: RuntimeKind): Void {
  const denoGlobal: Record<Str, unknown> = globalThis as Record<Str, unknown>;
  const Deno: Record<Str, unknown> | undefined = denoGlobal.Deno as
    | Record<Str, unknown>
    | undefined;
  if (!Deno) {
    return;
  }

  // Deno error events go through globalThis
  addListener(globalThis as unknown as EventTarget, 'error', (event: unknown): Void => {
    const errorEvent: ErrorEvent = event as ErrorEvent;
    const captured: CapturedError = createCapturedError(
      'uncaughtException',
      errorEvent.error ?? errorEvent.message,
      false,
      runtime,
    );
    safeInvoke(options.onError, captured);
  });

  addListener(
    globalThis as unknown as EventTarget,
    'unhandledrejection',
    (event: unknown): Void => {
      const reason: unknown = (event as PromiseRejectionEvent)?.reason;
      const captured: CapturedError = createCapturedError(
        'unhandledRejection',
        reason,
        false,
        runtime,
      );
      safeInvoke(options.onError, captured);
    },
  );

  // Deno signal listeners
  const { addSignalListener } = Deno;
  if (typeof addSignalListener === 'function') {
    const sigintHandler = (): Void => {
      const captured: CapturedError = createCapturedError(
        'signal',
        new Error('SIGINT'),
        true,
        runtime,
        { signal: 'SIGINT' },
      );
      safeInvoke(options.onError, captured);
      if (options.onFatalExit) {
        safeInvoke(options.onFatalExit, captured);
      }
    };
    const sigtermHandler = (): Void => {
      const captured: CapturedError = createCapturedError(
        'signal',
        new Error('SIGTERM'),
        true,
        runtime,
        { signal: 'SIGTERM' },
      );
      safeInvoke(options.onError, captured);
      if (options.onFatalExit) {
        safeInvoke(options.onFatalExit, captured);
      }
    };

    (addSignalListener as (signal: Str, handler: () => void) => void)('SIGINT', sigintHandler);
    (addSignalListener as (signal: Str, handler: () => void) => void)('SIGTERM', sigtermHandler);

    // Store for teardown (Deno uses removeSignalListener, not removeEventListener)
    registeredListeners.push(
      {
        target: globalThis as unknown as EventTarget,
        event: 'SIGINT',
        listener: sigintHandler,
        denoSignal: true,
      },
      {
        target: globalThis as unknown as EventTarget,
        event: 'SIGTERM',
        listener: sigtermHandler,
        denoSignal: true,
      },
    );
  }
}

/**
 * Registers Bun-specific error handlers.
 *
 * Bun implements the Node-compatible `process.on` API, so this
 * delegates to `registerNodeHandlers`.
 *
 * @param options - Validated handler options.
 * @param runtime - Detected runtime kind.
 * @returns Void — fire-and-forget.
 */
function registerBunHandlers(options: GlobalErrorHandlerOptions, runtime: RuntimeKind): Void {
  // Bun implements Node-compatible process.on
  registerNodeHandlers(options, runtime);
}

// =============================================================================
// Abort Signal
// =============================================================================

/**
 * Gets the global AbortSignal for task cancellation.
 * Creates a new AbortController if one doesn't exist.
 *
 * @returns `Result<AbortSignal>` — global AbortSignal for cooperative cancellation, or a validation error.
 *
 * @example
 * ```typescript
 * const signal = getAbortSignal();
 * if (!signal.ok) return signal;
 * fetch(url, { signal: signal.data });
 * ```
 */
export function getAbortSignal(): Result<AbortSignal> {
  if (!globalAbortController) {
    globalAbortController = new AbortController();
  }
  /*
   * AbortSignal must NOT be deep-frozen — Node.js mutates `Symbol(kAborted)`
   * on `controller.abort()`, which throws `TypeError: Cannot assign to read
   * only property` if the signal was frozen. Validate via Valibot directly
   * (skipping the `_okResult → _deepFreeze` path used by `ok()`/`safeParse()`)
   * and construct the Result manually so the stateful signal is not frozen.
   */
  const parsed = v.safeParse(AbortSignalSchema, globalAbortController.signal);
  if (!parsed.success) {
    return safeParse(AbortSignalSchema, globalAbortController.signal) as Result<AbortSignal>;
  }
  return Object.freeze({
    ok: true as const,
    data: globalAbortController.signal,
    error: null,
  }) as Result<AbortSignal>;
}

// =============================================================================
// Global Error Handling (primary API)
// =============================================================================

/**
 * Sets up universal global error handling for the current environment.
 *
 * Auto-detects the runtime and registers appropriate listeners:
 * - **Node.js (TTY/pipe)**: uncaughtException, unhandledRejection, SIGINT, SIGTERM, SIGPIPE
 * - **Browser**: error, unhandledrejection, securitypolicyviolation, resource errors
 * - **Web Worker / SharedWorker / Service Worker**: error, unhandledrejection
 * - **Cloudflare Worker**: error, unhandledrejection (use {@link wrapFetchHandler} for fetch errors)
 * - **Deno**: error, unhandledrejection, Deno.addSignalListener
 * - **Bun**: Node-compatible process.on
 * - **Capacitor**: browser handlers (WebView)
 * - **Electron renderer**: both browser + Node handlers
 * - **Electron main**: Node handlers
 *
 * All errors are normalized into {@link CapturedError} objects and routed
 * through the `onError` callback. Returns a teardown function.
 *
 * @param options - Handler configuration validated against {@link GlobalErrorHandlerOptionsSchema}.
 * @returns `Result<TeardownFn>` — teardown function that removes all listeners, or setup error.
 *
 * @example
 * ```typescript
 * const setupResult: Result<TeardownFn> = setupGlobalErrorHandling({
 *   onError: (captured: CapturedError): void => {
 *     console.error(`[${captured.type}] ${captured.error.message}`);
 *   },
 *   exitTimeoutMs: 3000,
 * });
 * if (!setupResult.ok) return setupResult;
 * const teardownFn: TeardownFn = setupResult.data;
 *
 * // Later:
 * teardownFn();
 * ```
 */
export function setupGlobalErrorHandling(options: GlobalErrorHandlerOptions): Result<TeardownFn> {
  if (globalErrorHandlingSetup) {
    return okUnchecked<TeardownFn>(teardown);
  }

  const optionsResult: Result<GlobalErrorHandlerOptions> = safeParse(
    GlobalErrorHandlerOptionsSchema,
    options,
  );
  if (!optionsResult.ok) {
    return optionsResult;
  }

  // Store ambient options for createCapturedError and reportError
  const validatedOptions: GlobalErrorHandlerOptions =
    optionsResult.data as GlobalErrorHandlerOptions;
  _ambientOptions = validatedOptions;

  const runtimeResult: Result<RuntimeKind> = detectRuntime();
  if (!runtimeResult.ok) {
    return runtimeResult;
  }
  const runtime: RuntimeKind = runtimeResult.data;

  const envResult: Result<EnvironmentConfig> = detectEnvironment();
  if (!envResult.ok) {
    return envResult;
  }
  const env: EnvironmentConfig = envResult.data;

  if (!globalAbortController) {
    globalAbortController = new AbortController();
  }

  // Dispatch per-environment
  switch (runtime) {
    case 'node-tty':
    case 'node-pipe': {
      registerNodeHandlers(validatedOptions, runtime);
      break;
    }
    case 'bun': {
      registerBunHandlers(validatedOptions, runtime);
      break;
    }
    case 'deno': {
      registerDenoHandlers(validatedOptions, runtime);
      break;
    }
    case 'browser': {
      registerBrowserHandlers(validatedOptions, runtime);
      // Electron renderer: also register Node handlers
      if (env.isElectronRenderer) {
        registerNodeHandlers(validatedOptions, runtime);
      }
      break;
    }
    case 'web-worker':
    case 'shared-worker':
    case 'service-worker': {
      registerWorkerHandlers(validatedOptions, runtime);
      break;
    }
    case 'worker':
    case 'edge-light':
    case 'fastly':
    case 'netlify': {
      // Cloudflare Worker / edge runtimes
      registerWorkerHandlers(validatedOptions, runtime);
      break;
    }
  }

  globalErrorHandlingSetup = true;
  return okUnchecked<TeardownFn>(teardown);
}

// =============================================================================
// Report Error (Result errors → CapturedError)
// =============================================================================

/**
 * Reports an AppError as a CapturedError through the global error handler.
 *
 * Unlike `createCapturedError()` (which calls `fromUnknownError()` on an unknown
 * thrown value), this function wraps an **already-structured** `AppError` that
 * propagated through the `Result<T>` system without being caught. The `AppError`
 * is used directly — no information is lost.
 *
 * Call this from `dispatchTool()` (or any top-level entry point) when a tool's
 * `run()` returns `{ ok: false, error: AppError }` to ensure the full error
 * context (severity, httpStatus, help, tags, retry, links, related, cause chain,
 * validation details) flows through to logging/telemetry.
 *
 * If no global error handler is registered (e.g., `setupGlobalErrorHandling()`
 * was never called), the CapturedError is returned but no callback is invoked.
 *
 * @param appError - The structured AppError from a failed Result.
 * @param fatal - Whether this error will cause process termination. Default: `true`.
 * @returns `Result<CapturedError>` — the constructed CapturedError envelope.
 *
 * @example
 * ```typescript
 * import { reportError } from '@/utils/core/signal';
 *
 * const runResult: Result<ExitCode> = await executable.run();
 * if (!runResult.ok) {
 *   const captured: Result<CapturedError> = reportError(runResult.error);
 *   // CapturedError is now logged via onError callback
 *   exit(exitCode);
 * }
 * ```
 */
export function reportError(appError: AppError, fatal: Bool = true as Bool): Result<CapturedError> {
  // Detect runtime
  const runtimeResult: Result<RuntimeKind> = detectRuntime();
  const environment: RuntimeKind = runtimeResult.ok
    ? runtimeResult.data
    : ('node-tty' as RuntimeKind);

  // Merge global log context into meta
  const ctxResult: Result<LogContext> = getContext();
  const contextFields: Record<Str, unknown> =
    ctxResult.ok && Object.keys(ctxResult.data).length > 0 ? { ...ctxResult.data } : {};
  const mergedMeta: Record<Str, unknown> | undefined =
    Object.keys(contextFields).length > 0 ? { ...contextFields } : undefined;

  // Auto-drain breadcrumbs
  const crumbs: Result<readonly Breadcrumb[]> = drainBreadcrumbs();
  const breadcrumbs: ReadonlyArray<Breadcrumb> | undefined =
    crumbs.ok && crumbs.data.length > 0 ? crumbs.data : undefined;

  // Auto-generate fingerprint from error code
  const fingerprint: readonly Str[] = [appError.code];

  const captured: CapturedError = Object.freeze({
    type: 'resultError' as CapturedErrorType,
    id: crypto.randomUUID(),
    error: appError, // Use the AppError directly — no fromUnknownError() loss
    original: appError, // The AppError IS the original
    environment,
    timestamp: new Date().toISOString(),
    fatal,
    ...(mergedMeta !== undefined && { meta: mergedMeta }),
    ...(breadcrumbs !== undefined && { breadcrumbs }),
    fingerprint,
    ...(_ambientOptions?.release !== undefined && { release: _ambientOptions.release }),
    ...(_ambientOptions?.serverName !== undefined && { serverName: _ambientOptions.serverName }),
    ...(_ambientOptions?.tags !== undefined && { tags: _ambientOptions.tags }),
    ...(_ambientOptions?.user !== undefined && { user: _ambientOptions.user }),
    ...(_ambientOptions?.contexts !== undefined && { contexts: _ambientOptions.contexts }),
  }) as CapturedError;

  // Invoke the registered onError handler (if any)
  if (_ambientOptions) {
    safeInvoke(_ambientOptions.onError, captured);
  }

  return okUnchecked<CapturedError>(captured);
}

// =============================================================================
// Legacy Signal Handlers (delegates to setupGlobalErrorHandling)
// =============================================================================

/**
 * Sets up signal handlers for graceful shutdown.
 *
 * Delegates to {@link setupGlobalErrorHandling} internally, translating
 * each {@link CapturedError} into a call to the provided `onInterrupt`
 * callback with the signal/error name string.
 *
 * @param onInterrupt - Callback invoked with the signal/error name.
 *   Fire-and-forget (event handler context) — cannot return Result.
 * @returns `Result<Void>` — success, or a validation error.
 *
 * @example
 * ```typescript
 * const setup: Result<Void> = setupSignalHandlers((signal: Str): void => {
 *   process.exit(130);
 * });
 * if (!setup.ok) return setup;
 * ```
 */
export function setupSignalHandlers(onInterrupt: InterruptHandler): Result<Void> {
  if (signalHandlersSetup) {
    return ok(VoidSchema, undefined);
  }
  signalHandlersSetup = true;

  const globalResult: Result<TeardownFn> = setupGlobalErrorHandling({
    onError: (captured: CapturedError): Void => {
      // Translate CapturedError into the legacy string-based callback
      let label: Str;
      if (captured.type === 'signal') {
        label = (captured.meta?.signal as Str) ?? 'UNKNOWN';
      } else if (captured.type === 'uncaughtException') {
        label = `uncaughtException: ${captured.error.message}`;
      } else if (captured.type === 'unhandledRejection') {
        label = `unhandledRejection: ${captured.error.message}`;
      } else {
        label = captured.error.message;
      }
      onInterrupt(label);
    },
    exitTimeoutMs: 0, // Disable auto-exit — legacy callers handle exit themselves
  });

  if (!globalResult.ok) {
    return globalResult;
  }
  return ok(VoidSchema, undefined);
}

// =============================================================================
// Cleanup Handler
// =============================================================================

/**
 * Registers a cleanup callback for SIGINT and SIGTERM signals.
 *
 * Centralizes process cleanup registration — no file outside `utils/core/src/`
 * should access `globalThis.process.on` directly. The callback is fire-and-forget
 * (event handler context) and cannot return Result.
 *
 * No-ops in non-Node environments.
 *
 * @param callback - Cleanup function to run on SIGINT/SIGTERM. Validated via `CleanupCallbackSchema`.
 * @returns `Result<Void>` — success, or a validation error.
 *
 * @example
 * ```typescript
 * const reg = registerCleanupHandler(() => {
 *   watcher.close();
 *   stopServer();
 * });
 * if (!reg.ok) return reg;
 * ```
 */
export function registerCleanupHandler(callback: CleanupCallback): Result<Void> {
  const callbackResult: Result<CleanupCallback> = safeParse(CleanupCallbackSchema, callback);
  if (!callbackResult.ok) {
    return callbackResult;
  }
  const proc: OptionalNodeProcess = getProcess();
  if (!proc || typeof proc.on !== 'function') {
    return ok(VoidSchema, undefined);
  }
  proc.on('SIGINT', callbackResult.data as NodeJS.SignalsListener);
  proc.on('SIGTERM', callbackResult.data as NodeJS.SignalsListener);
  return ok(VoidSchema, undefined);
}

// =============================================================================
// Reset (testing)
// =============================================================================

/**
 * Resets all signal/error handler state (for testing).
 *
 * Clears the global AbortController, teardown listeners, re-entrancy
 * guard, and exit timeout. Allows re-registration after reset.
 *
 * @returns `Result<Void>` — success.
 *
 * @example
 * ```typescript
 * const result: Result<Void> = resetSignalHandlers();
 * if (!result.ok) return result;
 * ```
 */
export function resetSignalHandlers(): Result<Void> {
  // Run teardown to remove all listeners
  teardown();
  signalHandlersSetup = false;
  globalErrorHandlingSetup = false;
  globalAbortController = null;
  isHandling = false;
  _ambientOptions = undefined;
  registeredListeners = [];
  if (exitTimeoutHandle !== null) {
    clearTimeout(exitTimeoutHandle);
    exitTimeoutHandle = null;
  }
  return ok(VoidSchema, undefined);
}

// =============================================================================
// Exported Helpers
// =============================================================================

/**
 * Wraps an async function to catch errors and route through a handler.
 *
 * The original error is re-thrown after handling so the caller's
 * error handling is not disrupted.
 *
 * @param fn - Async function to wrap.
 * @param onError - Error handler callback.
 * @returns `Result<(...args: TArgs) => Promise<TReturn>>` — wrapped function, or validation error.
 *
 * @example
 * ```typescript
 * const wrappedResult: Result<typeof fetchData> = wrapAsync(fetchData, handler);
 * if (!wrappedResult.ok) return wrappedResult;
 * await wrappedResult.data('/api/users');
 * ```
 */
export function wrapAsync<TArgs extends Array<unknown>, TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  onError: (captured: CapturedError) => void,
): Result<(...args: TArgs) => Promise<TReturn>> {
  const runtimeResult: Result<RuntimeKind> = detectRuntime();
  if (!runtimeResult.ok) {
    return runtimeResult;
  }

  const wrapped = async (...args: TArgs): Promise<TReturn> => {
    try {
      return await fn(...args);
    } catch (error: unknown) {
      const captured: CapturedError = createCapturedError(
        'uncaughtException',
        error,
        false,
        runtimeResult.data,
      );
      safeInvoke(onError, captured);
      throw error;
    }
  };

  return okUnchecked(wrapped);
}

/**
 * Wraps a Cloudflare Worker / Service Worker fetch handler.
 *
 * Catches errors inside the fetch handler and routes them through
 * the error handler. Returns a 500 Response on unhandled error.
 *
 * @param handler - The fetch handler function.
 * @param onError - Error handler callback.
 * @returns `Result<(request: Request, env: unknown, ctx: unknown) => Promise<Response>>` —
 *   wrapped handler, or validation error.
 *
 * @example
 * ```typescript
 * const wrappedResult = wrapFetchHandler(myHandler, errorCallback);
 * if (!wrappedResult.ok) return wrappedResult;
 * export default { fetch: wrappedResult.data };
 * ```
 */
export function wrapFetchHandler(
  handler: (request: Request, env: unknown, ctx: unknown) => Promise<Response>,
  onError: (captured: CapturedError) => void,
): Result<(request: Request, env: unknown, ctx: unknown) => Promise<Response>> {
  const runtimeResult: Result<RuntimeKind> = detectRuntime();
  if (!runtimeResult.ok) {
    return runtimeResult;
  }

  const wrapped = async (request: Request, env: unknown, ctx: unknown): Promise<Response> => {
    try {
      return await handler(request, env, ctx);
    } catch (error: unknown) {
      const captured: CapturedError = createCapturedError(
        'uncaughtException',
        error,
        false,
        runtimeResult.data,
        { request: { url: request.url, method: request.method } },
      );
      safeInvoke(onError, captured);
      return new Response('Internal Server Error', { status: 500 });
    }
  };

  return okUnchecked(wrapped);
}

/**
 * Attaches an error listener to a WebSocket.
 *
 * Routes WebSocket error events through the handler. Returns a
 * teardown function to remove the listener.
 *
 * @param ws - WebSocket instance.
 * @param onError - Error handler callback.
 * @returns `Result<TeardownFn>` — teardown function, or validation error.
 *
 * @example
 * ```typescript
 * const wsResult: Result<TeardownFn> = captureWebSocketErrors(ws, handler);
 * if (!wsResult.ok) return wsResult;
 * // Later: wsResult.data();
 * ```
 */
export function captureWebSocketErrors(
  ws: WebSocket,
  onError: (captured: CapturedError) => void,
): Result<TeardownFn> {
  const runtimeResult: Result<RuntimeKind> = detectRuntime();
  if (!runtimeResult.ok) {
    return runtimeResult;
  }

  const onWsError = (_event: Event): Void => {
    const captured: CapturedError = createCapturedError(
      'webSocketError',
      new Error('WebSocket error'),
      false,
      runtimeResult.data,
      { url: (ws as unknown as { url?: Str }).url, readyState: ws.readyState },
    );
    safeInvoke(onError, captured);
  };

  ws.addEventListener('error', onWsError);

  const wsTeardown: TeardownFn = (): undefined => {
    ws.removeEventListener('error', onWsError);
    return undefined;
  };

  return okUnchecked<TeardownFn>(wsTeardown);
}
