/**
 * Logger
 *
 * Global logger usable anywhere in the monorepo (CLI, API workers, browser,
 * mobile). Owns log level state, operational context, and provides a log
 * object with level filtering and structured output.
 *
 * In `pretty` mode, output is plain text (no ANSI — terminal layers add styling).
 * In `json` mode, output is structured {@link LogEntry} objects with timestamp
 * and {@link LogContext}.
 *
 * Terminal-aware layers (e.g., `@/utils/core/terminal`) extend this with
 * styled output in pretty mode.
 *
 * Context state:
 * - `setContext()` — replace the global operational context
 * - `getContext()` — read the current context
 * - `mergeContext()` — add/overwrite fields in the existing context
 * - Context is auto-attached to structured log entries and `CapturedError.meta`
 *
 * All type annotations use Valibot-inferred types from `@/schemas/common`.
 *
 * @module
 */

import * as v from 'valibot';
import {
  BoolSchema,
  DEFAULT_JSON_INDENT,
  DEFAULT_LOG_LEVEL,
  EnvRecordWithUndefinedSchema,
  type LogContext,
  LogContextSchema,
  type LogEntry,
  LogEntrySchema,
  LogLevelSchema,
  OutputFormatSchema,
  StrSchema,
  VoidSchema,
  type Bool,
  type EnvRecordWithUndefined,
  type JsonData,
  type LogLevel,
  type NonNegativeInteger,
  type OptionalNodeProcess,
  type OutputFormat,
  type Str,
  type TeardownFn,
  type Void,
} from '@/schemas/common';
import { ERRORS, err, ok, okUnchecked, type AppError, type Result } from '@/schemas/result/result';
import { functionSchema } from '@/schemas/function/function';
import { args } from '@/schemas/function/args';
import { safeStringify } from '@/utils/core/object';
import { getOutputFormat, setOutputFormat } from '@/utils/core/output-context';
import { fromUnknownError, safeParse } from '@/utils/result/safe';

import type { AsyncLocalStorage as AsyncLocalStorageType } from 'node:async_hooks';
import type * as _nodeAsyncHooks from 'node:async_hooks';

/** Preloaded `node:async_hooks` module, or `undefined` in non-Node runtimes. */
let _asyncHooksModule: typeof _nodeAsyncHooks | undefined;
try {
  if (globalThis.process) {
    _asyncHooksModule = await import('node:async_hooks');
  }
} catch {
  /* non-Node */
}

// =============================================================================
// Log Level State
// =============================================================================

/** Ordered log levels for index-based comparison. */
const LOG_LEVEL_ORDER: readonly LogLevel[] = [
  'silent',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
] as const;

/** Current log level for output filtering. */
let currentLogLevel: LogLevel = DEFAULT_LOG_LEVEL;

/**
 * Set the current log level.
 *
 * Validates input against `LogLevelSchema`. If invalid, the level is
 * unchanged (no-op).
 *
 * @param {LogLevel} level - Log level to set.
 * @returns {Result<Void>} `Result<Void>` — success, or a validation error if `level` is invalid.
 *
 * @example
 * ```typescript
 * setLogLevel('debug'); // enable all output
 * setLogLevel('silent'); // suppress all output
 * ```
 */
export function setLogLevel(level: LogLevel): Result<Void> {
  const input: Result<LogLevel> = safeParse(LogLevelSchema, level);
  if (!input.ok) {
    return input;
  }
  currentLogLevel = input.data;
  return ok(VoidSchema, undefined);
}

/**
 * Get the current log level.
 *
 * @returns {Result<LogLevel>} `Result<LogLevel>` — the current log level.
 *
 * @example
 * ```typescript
 * const levelResult = getLogLevel();
 * if (!levelResult.ok) return levelResult;
 * const level: LogLevel = levelResult.data; // 'info'
 * ```
 */
export function getLogLevel(): Result<LogLevel> {
  return ok(LogLevelSchema, currentLogLevel);
}

/**
 * Check if a message at the given level should be logged.
 *
 * Messages are logged when their level index is less than or equal to
 * the current log level index. The `'silent'` level is never logged.
 *
 * @param {LogLevel} level - Level of the message to check.
 * @returns {Result<Bool>} `Result<Bool>` — `true` if the message should be logged,
 *          or a validation error if `level` is invalid.
 *
 * @example
 * ```typescript
 * setLogLevel('warn');
 * const result = shouldLog('error');
 * if (result.ok && result.data) { // should log }
 * ```
 */
export function shouldLog(level: LogLevel): Result<Bool> {
  const input: Result<LogLevel> = safeParse(LogLevelSchema, level);
  if (!input.ok) {
    return input;
  }

  const currentIndex: number = LOG_LEVEL_ORDER.indexOf(currentLogLevel);
  const messageIndex: number = LOG_LEVEL_ORDER.indexOf(input.data);
  return ok(BoolSchema, messageIndex <= currentIndex && input.data !== 'silent');
}

// =============================================================================
// Log Context State
// =============================================================================

/** Current operational context for log entries. */
let currentContext: LogContext = {};

/**
 * Set the global log context, replacing any existing context.
 *
 * Context fields are attached to every structured log entry (JSON mode)
 * and merged into `CapturedError.meta` on every captured error.
 *
 * Works in all runtimes: CLI, API workers, browser, mobile.
 *
 * @param {LogContext} context - Operational context to set.
 * @returns {Result<Void>} `Result<Void>` — success, or a validation error.
 *
 * @example
 * ```typescript
 * import { setContext } from '@/utils/core/logger';
 *
 * // CLI
 * setContext({ runtime: 'node-tty', operation: 'sync', correlationId: crypto.randomUUID() });
 *
 * // API worker
 * setContext({ runtime: 'worker', operation: 'users', requestId: 'req-abc' });
 *
 * // Browser
 * setContext({ runtime: 'browser', sessionId: 'sess-xyz' });
 * ```
 */
export function setContext(context: LogContext): Result<Void> {
  const input: Result<LogContext> = safeParse(LogContextSchema, context);
  if (!input.ok) {
    return input;
  }
  currentContext = input.data;
  return ok(VoidSchema, undefined);
}

/**
 * Get the current global log context.
 *
 * @returns {Result<LogContext>} `Result<LogContext>` — the current context.
 *
 * @example
 * ```typescript
 * const ctxResult = getContext();
 * if (ctxResult.ok) ctxResult.data.operation; // 'sync'
 * ```
 */
export function getContext(): Result<LogContext> {
  // Check async-scoped context first (request-scoped)
  if (_asyncLocalStorage) {
    const asyncCtx: LogContext | undefined = _asyncLocalStorage.getStore();
    if (asyncCtx) {
      return ok(LogContextSchema, asyncCtx);
    }
  }
  // Fall back to global context
  return ok(LogContextSchema, currentContext);
}

/**
 * Merge additional fields into the global log context.
 *
 * Existing fields are preserved. New fields are added or overwrite
 * existing ones with the same key.
 *
 * @param {LogContext} partial - Context fields to merge.
 * @returns {Result<Void>} `Result<Void>` — success, or a validation error.
 *
 * @example
 * ```typescript
 * mergeContext({ operation: 'format', action: 'check' });
 * ```
 */
export function mergeContext(partial: LogContext): Result<Void> {
  const input: Result<LogContext> = safeParse(LogContextSchema, partial);
  if (!input.ok) {
    return input;
  }
  const merged: LogContext = { ...currentContext, ...input.data };
  const mergedResult: Result<LogContext> = safeParse(LogContextSchema, merged);
  if (!mergedResult.ok) {
    return mergedResult;
  }
  currentContext = mergedResult.data;
  return ok(VoidSchema, undefined);
}

// =============================================================================
// Async Context (Request-Scoped)
// =============================================================================

/** Lazy-loaded AsyncLocalStorage for request-scoped context. */
let _asyncLocalStorage: AsyncLocalStorageType<LogContext> | undefined;

// =============================================================================
// Log Transports
// =============================================================================

/**
 * A transport receives a finalized {@link LogEntry} and writes it to
 * its destination (console, file, HTTP, Cloudflare Logpush, etc.).
 * Transports are fire-and-forget — they must not throw.
 */
export type LogTransport = (entry: LogEntry) => void;

/**
 * Schema for transport configuration.
 */
export const TransportConfigSchema = v.strictObject({
  /** Human-readable name for this transport (for debugging). */
  name: v.pipe(v.string(), v.minLength(1)),
  /** The transport function that receives log entries. */
  transport: v.custom<LogTransport>((value) => typeof value === 'function'),
  /** Minimum log level for this transport. Entries below this level are skipped. */
  level: v.optional(LogLevelSchema),
});

/** Inferred output type of {@link TransportConfigSchema}. */
export type TransportConfig = v.InferOutput<typeof TransportConfigSchema>;

/** Registered transports. */
let _transports: TransportConfig[] = [];

/**
 * Registers a log transport.
 *
 * Transports receive every {@link LogEntry} that passes level filtering.
 * Multiple transports can be registered (fan-out). Each transport can have
 * its own minimum log level.
 *
 * @param {TransportConfig} config - Transport configuration.
 * @returns {Result<Void>} `Result<Void>` — success or validation error.
 *
 * @example
 * ```typescript
 * addTransport({
 *   name: 'sentry',
 *   transport: (entry) => {
 *     if (entry.level === 'error') Sentry.captureMessage(entry.message);
 *   },
 *   level: 'error',
 * });
 * ```
 */
export function addTransport(config: TransportConfig): Result<Void> {
  const input: Result<TransportConfig> = safeParse(TransportConfigSchema, config);
  if (!input.ok) {
    return input;
  }
  _transports.push(input.data as TransportConfig);
  return ok(VoidSchema, undefined);
}

/**
 * Removes a transport by name.
 *
 * @param {Str} name - Name of the transport to remove.
 * @returns {Result<Bool>} `Result<Bool>` — `true` if a transport was removed.
 */
export function removeTransport(name: Str): Result<Bool> {
  const input: Result<Str> = safeParse(StrSchema, name);
  if (!input.ok) {
    return input;
  }
  const before: number = _transports.length;
  _transports = _transports.filter((t) => t.name !== input.data);
  return ok(BoolSchema, _transports.length < before);
}

/**
 * Removes all transports.
 *
 * @returns {Result<Void>} `Result<Void>`
 */
export function clearTransports(): Result<Void> {
  _transports = [];
  return ok(VoidSchema, undefined);
}

/**
 * Dispatches a log entry to all registered transports.
 *
 * @param entry - The log entry to dispatch.
 */
function dispatchToTransports(entry: LogEntry): void {
  for (const config of _transports) {
    if (config.level !== undefined) {
      const configIndex: number = LOG_LEVEL_ORDER.indexOf(config.level);
      const entryIndex: number = LOG_LEVEL_ORDER.indexOf(entry.level);
      if (entryIndex > configIndex) {
        continue;
      }
    }
    try {
      config.transport(entry);
    } catch {
      // Fire-and-forget — transports must not break the logging pipeline
    }
  }
}

// =============================================================================
// Redaction
// =============================================================================

/**
 * Schema for redaction configuration.
 */
export const RedactionConfigSchema = v.strictObject({
  /** Field paths to redact. Supports dot notation (e.g., `'user.password'`). */
  paths: v.array(v.pipe(v.string(), v.minLength(1))),
  /** Replacement string for redacted values. Defaults to `'[REDACTED]'`. */
  censor: v.optional(v.string()),
});

/** Inferred output type of {@link RedactionConfigSchema}. */
export type RedactionConfig = v.InferOutput<typeof RedactionConfigSchema>;

/** Default redacted field paths. */
const DEFAULT_REDACT_PATHS: readonly Str[] = [
  'password',
  'secret',
  'token',
  'authorization',
  'cookie',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'creditCard',
  'credit_card',
  'ssn',
  'privateKey',
  'private_key',
] as const;

/** Current redaction config. */
let _redactionConfig: RedactionConfig = {
  paths: [...DEFAULT_REDACT_PATHS],
  censor: '[REDACTED]',
};

/**
 * Configures log field redaction.
 *
 * Fields matching the configured paths are replaced with the censor string
 * in all structured log output.
 *
 * @param {RedactionConfig} config - Redaction configuration.
 * @returns {Result<Void>} `Result<Void>` — success or validation error.
 *
 * @example
 * ```typescript
 * setRedaction({
 *   paths: ['password', 'headers.authorization'],
 *   censor: '***',
 * });
 * ```
 */
export function setRedaction(config: RedactionConfig): Result<Void> {
  const input: Result<RedactionConfig> = safeParse(RedactionConfigSchema, config);
  if (!input.ok) {
    return input;
  }
  _redactionConfig = input.data as RedactionConfig;
  return ok(VoidSchema, undefined);
}

/**
 * Redacts sensitive fields from an object recursively.
 *
 * @param obj - Object to redact.
 * @returns Redacted copy (original is not mutated).
 */
function redactObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(redactObject);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const shouldRedact: boolean = _redactionConfig.paths.some((path) => {
      const pathParts: string[] = path.split('.');
      return pathParts.at(-1) === key;
    });
    if (shouldRedact && (typeof value === 'string' || typeof value === 'number')) {
      result[key] = _redactionConfig.censor ?? '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactObject(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// =============================================================================
// Sampling
// =============================================================================

/**
 * Schema for log sampling configuration.
 */
export const SamplingConfigSchema = v.strictObject({
  /** Sample rate: 0.0 (drop all) to 1.0 (keep all). Default: 1.0. */
  rate: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  /** Always sample these log levels regardless of rate. Default: `['error']`. */
  alwaysSample: v.optional(v.array(LogLevelSchema)),
});

/** Inferred output type of {@link SamplingConfigSchema}. */
export type SamplingConfig = v.InferOutput<typeof SamplingConfigSchema>;

/** Current sampling config. */
let _samplingConfig: SamplingConfig | undefined;

/**
 * Configures log sampling.
 *
 * When enabled, only a fraction of log entries are emitted.
 * Error logs are always sampled (never dropped) unless overridden.
 *
 * @param {SamplingConfig} config - Sampling configuration.
 * @returns {Result<Void>} `Result<Void>` — success or validation error.
 *
 * @example
 * ```typescript
 * setSampling({ rate: 0.1 }); // Keep 10% of logs, always keep errors
 * ```
 */
export function setSampling(config: SamplingConfig): Result<Void> {
  const input: Result<SamplingConfig> = safeParse(SamplingConfigSchema, config);
  if (!input.ok) {
    return input;
  }
  _samplingConfig = input.data as SamplingConfig;
  return ok(VoidSchema, undefined);
}

/**
 * Clears sampling configuration (all logs emitted).
 *
 * @returns {Result<Void>} `Result<Void>`
 */
export function clearSampling(): Result<Void> {
  _samplingConfig = undefined;
  return ok(VoidSchema, undefined);
}

/**
 * Checks whether a log entry should be sampled (emitted).
 *
 * @param level - Log level of the entry.
 * @returns `true` if the entry should be emitted.
 */
function shouldSample(level: LogLevel): boolean {
  if (!_samplingConfig) {
    return true;
  }
  const alwaysSample: LogLevel[] = _samplingConfig.alwaysSample ?? ['error'];
  if (alwaysSample.includes(level)) {
    return true;
  }
  return Math.random() < _samplingConfig.rate;
}

// =============================================================================
// Buffering
// =============================================================================

/**
 * Schema for buffer configuration.
 */
export const BufferConfigSchema = v.strictObject({
  /** Maximum number of entries to buffer before flushing. Default: 100. */
  maxSize: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  /** Maximum time in ms before auto-flushing. Default: 5000. 0 disables. */
  flushIntervalMs: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  /** Callback invoked with buffered entries on flush. */
  onFlush: v.pipe(functionSchema(), args(v.tuple([v.array(LogEntrySchema)]))),
});

/** Inferred output type of {@link BufferConfigSchema}. */
export type BufferConfig = v.InferOutput<typeof BufferConfigSchema>;

/** Buffered log entries. */
let _buffer: LogEntry[] = [];
let _bufferConfig: BufferConfig | undefined;
let _flushInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Enables log buffering/batching.
 *
 * @param {BufferConfig} config - Buffer configuration.
 * @returns {Result<Void>} `Result<Void>` — success or validation error.
 *
 * @example
 * ```typescript
 * enableBuffer({
 *   maxSize: 50,
 *   flushIntervalMs: 5000,
 *   onFlush: (entries) => fetch('/logs', { method: 'POST', body: JSON.stringify(entries) }),
 * });
 * ```
 */
export function enableBuffer(config: BufferConfig): Result<Void> {
  const input: Result<BufferConfig> = safeParse(BufferConfigSchema, config);
  if (!input.ok) {
    return input;
  }
  _bufferConfig = input.data as BufferConfig;

  const interval: number = input.data.flushIntervalMs ?? 5000;
  if (interval > 0) {
    _flushInterval = setInterval(() => {
      flushBuffer();
    }, interval);
  }

  return ok(VoidSchema, undefined);
}

/**
 * Flushes all buffered log entries.
 *
 * @returns {Result<Void>} `Result<Void>`
 */
export function flushBuffer(): Result<Void> {
  if (!_bufferConfig || _buffer.length === 0) {
    return ok(VoidSchema, undefined);
  }

  const entries: readonly LogEntry[] = [..._buffer];
  _buffer = [];

  try {
    _bufferConfig.onFlush([...entries]);
  } catch {
    // Fire-and-forget — buffer flush must not break the logging pipeline
  }

  return ok(VoidSchema, undefined);
}

/**
 * Disables log buffering and flushes remaining entries.
 *
 * @returns {Result<Void>} `Result<Void>`
 */
export function disableBuffer(): Result<Void> {
  flushBuffer();
  if (_flushInterval) {
    clearInterval(_flushInterval);
    _flushInterval = null;
  }
  _bufferConfig = undefined;
  return ok(VoidSchema, undefined);
}

/**
 * Adds an entry to the buffer, flushing if maxSize is reached.
 *
 * @param entry - Log entry to buffer.
 */
function bufferEntry(entry: LogEntry): void {
  if (!_bufferConfig) {
    return;
  }
  _buffer.push(entry);
  const maxSize: number = _bufferConfig.maxSize ?? 100;
  if (_buffer.length >= maxSize) {
    flushBuffer();
  }
}

// =============================================================================
// Structured Output Helper
// =============================================================================

/**
 * Check if the current output format is JSON (structured log mode).
 *
 * @returns `Bool` — `true` if output format is `'json'`.
 */
function isJsonOutput(): Bool {
  const formatResult: Result<OutputFormat> = getOutputFormat();
  if (!formatResult.ok) {
    return false;
  }
  return formatResult.data === 'json';
}

/**
 * Emit a structured log entry as JSON to the appropriate stream.
 *
 * Applies redaction, dispatches to transports, and optionally buffers.
 *
 * @param level - Log level of this entry.
 * @param message - Log message.
 * @param stream - Output stream (`'stdout'` or `'stderr'`).
 * @param data - Optional structured data payload.
 * @returns `Result<Void>` — success, or a serialization error.
 */
function emitStructured(
  level: LogLevel,
  message: Str,
  stream: 'stdout' | 'stderr',
  data?: unknown,
): Result<Void> {
  const ctx: LogContext = getResolvedContext();
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(Object.keys(ctx).length > 0 && { context: ctx }),
    ...(data !== undefined && { data }),
  };

  // Apply redaction before serialization
  const redactedEntry: LogEntry = {
    ...entry,
    ...(entry.data !== undefined && { data: redactObject(entry.data) }),
    ...(entry.context?.extra !== undefined && {
      context: {
        ...entry.context,
        extra: redactObject(entry.context.extra) as Record<string, unknown>,
      },
    }),
  };

  // Dispatch to registered transports
  if (_transports.length > 0) {
    dispatchToTransports(redactedEntry);
  }

  // Buffer if enabled
  if (_bufferConfig) {
    bufferEntry(redactedEntry);
  }

  const jsonResult: Result<Str> = safeStringify(redactedEntry);
  if (!jsonResult.ok) {
    return jsonResult;
  }
  if (stream === 'stderr') {
    console.error(jsonResult.data);
  } else {
    console.log(jsonResult.data);
  }
  return ok(VoidSchema, undefined);
}

/**
 * Resolves the current context, checking async-scoped context first.
 *
 * @returns The resolved log context.
 */
function getResolvedContext(): LogContext {
  if (_asyncLocalStorage) {
    const asyncCtx: LogContext | undefined = _asyncLocalStorage.getStore();
    if (asyncCtx) {
      return asyncCtx;
    }
  }
  return currentContext;
}

/**
 * Dispatches a log entry to transports when not in JSON mode.
 *
 * Constructs a {@link LogEntry} from the message and dispatches it
 * to all registered transports. In JSON mode, `emitStructured()` handles this.
 *
 * @param level - Log level of this entry.
 * @param message - Log message.
 * @param data - Optional data payload.
 */
function dispatchNonJson(level: LogLevel, message: Str, data?: unknown): void {
  if (_transports.length === 0) {
    return;
  }
  const ctx: LogContext = getResolvedContext();
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(Object.keys(ctx).length > 0 && { context: ctx }),
    ...(data !== undefined && { data: redactObject(data) }),
  };
  dispatchToTransports(entry);
  if (_bufferConfig) {
    bufferEntry(entry);
  }
}

// =============================================================================
// Base Log Object
// =============================================================================

/**
 * Base structured logger with level filtering.
 *
 * In `pretty` mode: plain text output — no colors, no symbols, no ANSI.
 * In `json` mode: structured {@link LogEntry} objects with timestamp and context.
 *
 * Standard methods available everywhere:
 * - `log.info()` — General information (stdout)
 * - `log.debug()` — Debug output with optional data (stderr)
 * - `log.error()` — Error messages (stderr)
 * - `log.warn()` — Warning messages (stdout)
 * - `log.success()` — Success messages (stdout)
 * - `log.json()` — Formatted JSON output (stdout, always prints)
 *
 * @example
 * ```typescript
 * import { log } from '@/utils/core/logger';
 *
 * log.info('Processing files...');
 * log.success('Done!');
 * log.warn('Something might be wrong');
 * log.error('Something went wrong');
 * log.debug('Internal state', { value: 42 });
 * log.json({ key: 'value' });
 * ```
 */
export const log = {
  /**
   * Print an info message to stdout with optional data. Respects log level (info).
   * In JSON mode, emits a structured {@link LogEntry} with the data payload.
   *
   * @param message - Message to print.
   * @param data - Optional serializable data to include.
   * @returns `Result<Void>` — success, or a log-level/validation error.
   */
  info: (message: Str, data?: JsonData): Result<Void> => {
    const input: Result<Str> = safeParse(StrSchema, message);
    if (!input.ok) {
      return input;
    }
    const allowed: Result<Bool> = shouldLog('info');
    if (!allowed.ok) {
      return allowed;
    }
    if (allowed.data) {
      if (!shouldSample('info')) {
        return ok(VoidSchema, undefined);
      }
      if (isJsonOutput()) {
        return emitStructured('info', input.data, 'stdout', data);
      }
      dispatchNonJson('info', input.data, data);
      if (data === undefined) {
        console.log(input.data);
      } else {
        console.log(input.data, data);
      }
    }
    return ok(VoidSchema, undefined);
  },

  /**
   * Print a debug message to stderr with optional data. Only at debug level.
   * In JSON mode, emits a structured {@link LogEntry} with the data payload.
   *
   * @param message - Message to print.
   * @param data - Optional serializable data to include.
   * @returns `Result<Void>` — success, or a log-level/validation error.
   */
  debug: (message: Str, data?: JsonData): Result<Void> => {
    const input: Result<Str> = safeParse(StrSchema, message);
    if (!input.ok) {
      return input;
    }
    const allowed: Result<Bool> = shouldLog('debug');
    if (!allowed.ok) {
      return allowed;
    }
    if (allowed.data) {
      if (!shouldSample('debug')) {
        return ok(VoidSchema, undefined);
      }
      if (isJsonOutput()) {
        return emitStructured('debug', input.data, 'stderr', data);
      }
      dispatchNonJson('debug', input.data, data);
      if (data === undefined) {
        console.error(`[DEBUG] ${input.data}`);
      } else {
        console.error(`[DEBUG] ${input.data}`, data);
      }
    }
    return ok(VoidSchema, undefined);
  },

  /**
   * Print an error message to stderr with optional data. Respects log level (error).
   * In JSON mode, emits a structured {@link LogEntry} with the data payload.
   *
   * @param message - Message to print.
   * @param data - Optional serializable data to include.
   * @returns `Result<Void>` — success, or a log-level/validation error.
   */
  error: (message: Str, data?: JsonData): Result<Void> => {
    const input: Result<Str> = safeParse(StrSchema, message);
    if (!input.ok) {
      return input;
    }
    const allowed: Result<Bool> = shouldLog('error');
    if (!allowed.ok) {
      return allowed;
    }
    if (allowed.data) {
      if (!shouldSample('error')) {
        return ok(VoidSchema, undefined);
      }
      if (isJsonOutput()) {
        return emitStructured('error', input.data, 'stderr', data);
      }
      dispatchNonJson('error', input.data, data);
      if (data === undefined) {
        console.error(input.data);
      } else {
        console.error(input.data, data);
      }
    }
    return ok(VoidSchema, undefined);
  },

  /**
   * Print a warning message to stdout with optional data. Respects log level (warn).
   * In JSON mode, emits a structured {@link LogEntry} with the data payload.
   *
   * @param message - Message to print.
   * @param data - Optional serializable data to include.
   * @returns `Result<Void>` — success, or a log-level/validation error.
   */
  warn: (message: Str, data?: JsonData): Result<Void> => {
    const input: Result<Str> = safeParse(StrSchema, message);
    if (!input.ok) {
      return input;
    }
    const allowed: Result<Bool> = shouldLog('warn');
    if (!allowed.ok) {
      return allowed;
    }
    if (allowed.data) {
      if (!shouldSample('warn')) {
        return ok(VoidSchema, undefined);
      }
      if (isJsonOutput()) {
        return emitStructured('warn', input.data, 'stdout', data);
      }
      dispatchNonJson('warn', input.data, data);
      if (data === undefined) {
        console.log(input.data);
      } else {
        console.log(input.data, data);
      }
    }
    return ok(VoidSchema, undefined);
  },

  /**
   * Print a success message to stdout with optional data. Respects log level (info).
   * In JSON mode, emits a structured {@link LogEntry} with the data payload.
   *
   * @param message - Message to print.
   * @param data - Optional serializable data to include.
   * @returns `Result<Void>` — success, or a log-level/validation error.
   */
  success: (message: Str, data?: JsonData): Result<Void> => {
    const input: Result<Str> = safeParse(StrSchema, message);
    if (!input.ok) {
      return input;
    }
    const allowed: Result<Bool> = shouldLog('info');
    if (!allowed.ok) {
      return allowed;
    }
    if (allowed.data) {
      if (!shouldSample('info')) {
        return ok(VoidSchema, undefined);
      }
      if (isJsonOutput()) {
        return emitStructured('info', input.data, 'stdout', data);
      }
      dispatchNonJson('info', input.data, data);
      if (data === undefined) {
        console.log(input.data);
      } else {
        console.log(input.data, data);
      }
    }
    return ok(VoidSchema, undefined);
  },

  /**
   * Print data as formatted JSON to stdout. Always prints regardless of log level.
   * In JSON mode, emits a structured {@link LogEntry} with the data payload.
   *
   * @param data - Serializable data to stringify.
   * @param indent - Indentation level (defaults to 2).
   * @returns `Result<Void>` — success, or a serialization error.
   */
  json: (data: JsonData, indent?: NonNegativeInteger): Result<Void> => {
    if (isJsonOutput()) {
      return emitStructured('info', 'json', 'stdout', data);
    }
    const jsonResult: Result<Str> = safeStringify(data, indent ?? DEFAULT_JSON_INDENT);
    if (!jsonResult.ok) {
      return jsonResult;
    }
    console.log(jsonResult.data);
    return ok(VoidSchema, undefined);
  },

  /**
   * Print a trace message to stderr. Only at trace level (most verbose).
   * In JSON mode, emits a structured {@link LogEntry}.
   *
   * Use for fine-grained diagnostic output: function entry/exit, variable
   * values, iteration details. More verbose than debug.
   *
   * @param message - Message to print.
   * @param data - Optional serializable data to include.
   * @returns `Result<Void>` — success, or a log-level/validation error.
   *
   * @example
   * ```typescript
   * log.trace('Entering parseConfig', { path: '/app/config.ts' });
   * ```
   */
  trace: (message: Str, data?: JsonData): Result<Void> => {
    const input: Result<Str> = safeParse(StrSchema, message);
    if (!input.ok) {
      return input;
    }
    const allowed: Result<Bool> = shouldLog('trace');
    if (!allowed.ok) {
      return allowed;
    }
    if (allowed.data) {
      if (!shouldSample('trace')) {
        return ok(VoidSchema, undefined);
      }
      if (isJsonOutput()) {
        return emitStructured('trace', input.data, 'stderr', data);
      }
      dispatchNonJson('trace', input.data, data);
      if (data === undefined) {
        console.error(`[TRACE] ${input.data}`);
      } else {
        console.error(`[TRACE] ${input.data}`, data);
      }
    }
    return ok(VoidSchema, undefined);
  },

  /**
   * Log an {@link AppError} with full structured context.
   *
   * In JSON mode, includes error code, message, stack, and metadata
   * in the structured log entry. In pretty mode, formats as multi-line
   * error output.
   *
   * @param error - The AppError to log.
   * @returns `Result<Void>`
   *
   * @example
   * ```typescript
   * if (!result.ok) {
   *   log.errorObject(result.error);
   * }
   * ```
   */
  errorObject: (error: AppError): Result<Void> => {
    const allowed: Result<Bool> = shouldLog('error');
    if (!allowed.ok) {
      return allowed;
    }
    if (!allowed.data) {
      return ok(VoidSchema, undefined);
    }

    if (isJsonOutput()) {
      return emitStructured('error', error.message, 'stderr', {
        errorId: error.id,
        errorCode: error.code,
        errorMessage: error.message,
        errorTimestamp: error.timestamp,
        errorStack: error.stack,
        ...(error.severity !== undefined && { severity: error.severity }),
        ...(error.httpStatus !== undefined && { httpStatus: error.httpStatus }),
        ...(error.meta !== undefined && { meta: error.meta }),
        ...(error.cause !== undefined && {
          cause: { code: error.cause.code, message: error.cause.message },
        }),
      });
    }

    // Pretty mode
    dispatchNonJson('error', error.message, {
      errorCode: error.code,
      errorStack: error.stack,
      ...(error.meta !== undefined && { meta: error.meta }),
    });
    console.error(`[${error.code}] ${error.message}`);
    if (error.stack) {
      const stackLines: Str[] = error.stack.split('\n').slice(0, 5);
      for (const line of stackLines) {
        console.error(`  ${line.trim()}`);
      }
    }
    return ok(VoidSchema, undefined);
  },
} as const;

// =============================================================================
// Child Loggers (Scoped Logging)
// =============================================================================

/**
 * Schema for child logger configuration.
 */
export const ChildLoggerOptionsSchema = v.strictObject({
  /** Fields to merge into every log entry from this child logger. */
  context: LogContextSchema,
  /** Optional log level override for this child (otherwise inherits parent). */
  level: v.optional(LogLevelSchema),
});

/** Inferred output type of {@link ChildLoggerOptionsSchema}. */
export type ChildLoggerOptions = v.InferOutput<typeof ChildLoggerOptionsSchema>;

/**
 * A scoped child logger with its own context fields.
 *
 * Created via {@link createChildLogger}. Each child merges its own context
 * into every log entry on top of the global context. Children can override
 * the log level — if not set, they inherit the global level.
 *
 * Follows pino `logger.child()`, bunyan `log.child()`, tslog `getSubLogger()`,
 * Go zerolog `logger.With()`, and zap `logger.With()`.
 */
export type ChildLogger = {
  /** Log an info message with optional data. @param message - Message text. @param data - Optional data. @returns `Result<Void>` */
  info: (message: Str, data?: JsonData) => Result<Void>;
  /** Log a debug message with optional data. @param message - Message text. @param data - Optional data. @returns `Result<Void>` */
  debug: (message: Str, data?: JsonData) => Result<Void>;
  /** Log an error message with optional data. @param message - Message text. @param data - Optional data. @returns `Result<Void>` */
  error: (message: Str, data?: JsonData) => Result<Void>;
  /** Log a warning message with optional data. @param message - Message text. @param data - Optional data. @returns `Result<Void>` */
  warn: (message: Str, data?: JsonData) => Result<Void>;
  /** Log a success message with optional data. @param message - Message text. @param data - Optional data. @returns `Result<Void>` */
  success: (message: Str, data?: JsonData) => Result<Void>;
  /** Log a trace message with optional data. @param message - Message text. @param data - Optional data. @returns `Result<Void>` */
  trace: (message: Str, data?: JsonData) => Result<Void>;
  /** Log structured JSON data. @param data - Serializable data. @param indent - Indentation. @returns `Result<Void>` */
  json: (data: JsonData, indent?: NonNegativeInteger) => Result<Void>;
  /** Log an AppError with full context. @param error - AppError to log. @returns `Result<Void>` */
  errorObject: (error: AppError) => Result<Void>;
  /** Create a further scoped child logger. @param options - Child config. @returns `Result<ChildLogger>` */
  child: (options: ChildLoggerOptions) => Result<ChildLogger>;
  /** Get this child's merged context. @returns `Result<LogContext>` */
  getContext: () => Result<LogContext>;
};

/**
 * Creates a child logger with scoped context.
 *
 * The child merges its context on top of the global context for every log
 * entry. Optional level override. Calling `.child()` on the result creates
 * a grandchild that merges all ancestor contexts.
 *
 * @param {ChildLoggerOptions} options - Child logger configuration with context and optional level.
 * @returns {Result<ChildLogger>} `Result<ChildLogger>` — the scoped child logger.
 *
 * @example
 * ```typescript
 * const apiLog = createChildLogger({
 *   context: { operation: 'api', runtime: 'worker' },
 * });
 * if (!apiLog.ok) return apiLog;
 * apiLog.data.info('Server started');
 * ```
 */
export function createChildLogger(options: ChildLoggerOptions): Result<ChildLogger> {
  const input: Result<ChildLoggerOptions> = safeParse(ChildLoggerOptionsSchema, options);
  if (!input.ok) {
    return input;
  }

  const childContext: LogContext = input.data.context;
  const childLevel: LogLevel | undefined = input.data.level;

  function shouldLogChild(level: LogLevel): Result<Bool> {
    if (childLevel !== undefined) {
      const currentIndex: number = LOG_LEVEL_ORDER.indexOf(childLevel);
      const messageIndex: number = LOG_LEVEL_ORDER.indexOf(level);
      return ok(BoolSchema, messageIndex <= currentIndex && level !== 'silent');
    }
    return shouldLog(level);
  }

  function getMergedContext(): Result<LogContext> {
    const globalCtx: LogContext = getResolvedContext();
    const merged: LogContext = { ...globalCtx, ...childContext };
    return safeParse(LogContextSchema, merged);
  }

  function emitChildStructured(
    level: LogLevel,
    message: Str,
    stream: 'stdout' | 'stderr',
    data?: unknown,
  ): Result<Void> {
    const ctx: Result<LogContext> = getMergedContext();
    if (!ctx.ok) {
      return ctx;
    }
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(Object.keys(ctx.data).length > 0 && { context: ctx.data }),
      ...(data !== undefined && { data }),
    };
    const redactedEntry: LogEntry = {
      ...entry,
      ...(entry.data !== undefined && { data: redactObject(entry.data) }),
    };
    if (_transports.length > 0) {
      dispatchToTransports(redactedEntry);
    }
    if (_bufferConfig) {
      bufferEntry(redactedEntry);
    }
    const jsonResult: Result<Str> = safeStringify(redactedEntry);
    if (!jsonResult.ok) {
      return jsonResult;
    }
    if (stream === 'stderr') {
      console.error(jsonResult.data);
    } else {
      console.log(jsonResult.data);
    }
    return ok(VoidSchema, undefined);
  }

  const childLogger: ChildLogger = {
    info: (message: Str, data?: JsonData): Result<Void> => {
      const msgInput: Result<Str> = safeParse(StrSchema, message);
      if (!msgInput.ok) {
        return msgInput;
      }
      const allowed: Result<Bool> = shouldLogChild('info');
      if (!allowed.ok) {
        return allowed;
      }
      if (allowed.data) {
        if (!shouldSample('info')) {
          return ok(VoidSchema, undefined);
        }
        if (isJsonOutput()) {
          return emitChildStructured('info', msgInput.data, 'stdout', data);
        }
        if (data === undefined) {
          console.log(msgInput.data);
        } else {
          console.log(msgInput.data, data);
        }
      }
      return ok(VoidSchema, undefined);
    },

    debug: (message: Str, data?: JsonData): Result<Void> => {
      const msgInput: Result<Str> = safeParse(StrSchema, message);
      if (!msgInput.ok) {
        return msgInput;
      }
      const allowed: Result<Bool> = shouldLogChild('debug');
      if (!allowed.ok) {
        return allowed;
      }
      if (allowed.data) {
        if (!shouldSample('debug')) {
          return ok(VoidSchema, undefined);
        }
        if (isJsonOutput()) {
          return emitChildStructured('debug', msgInput.data, 'stderr', data);
        }
        if (data === undefined) {
          console.error(`[DEBUG] ${msgInput.data}`);
        } else {
          console.error(`[DEBUG] ${msgInput.data}`, data);
        }
      }
      return ok(VoidSchema, undefined);
    },

    error: (message: Str, data?: JsonData): Result<Void> => {
      const msgInput: Result<Str> = safeParse(StrSchema, message);
      if (!msgInput.ok) {
        return msgInput;
      }
      const allowed: Result<Bool> = shouldLogChild('error');
      if (!allowed.ok) {
        return allowed;
      }
      if (allowed.data) {
        if (!shouldSample('error')) {
          return ok(VoidSchema, undefined);
        }
        if (isJsonOutput()) {
          return emitChildStructured('error', msgInput.data, 'stderr', data);
        }
        if (data === undefined) {
          console.error(msgInput.data);
        } else {
          console.error(msgInput.data, data);
        }
      }
      return ok(VoidSchema, undefined);
    },

    warn: (message: Str, data?: JsonData): Result<Void> => {
      const msgInput: Result<Str> = safeParse(StrSchema, message);
      if (!msgInput.ok) {
        return msgInput;
      }
      const allowed: Result<Bool> = shouldLogChild('warn');
      if (!allowed.ok) {
        return allowed;
      }
      if (allowed.data) {
        if (!shouldSample('warn')) {
          return ok(VoidSchema, undefined);
        }
        if (isJsonOutput()) {
          return emitChildStructured('warn', msgInput.data, 'stdout', data);
        }
        if (data === undefined) {
          console.log(msgInput.data);
        } else {
          console.log(msgInput.data, data);
        }
      }
      return ok(VoidSchema, undefined);
    },

    success: (message: Str, data?: JsonData): Result<Void> => {
      const msgInput: Result<Str> = safeParse(StrSchema, message);
      if (!msgInput.ok) {
        return msgInput;
      }
      const allowed: Result<Bool> = shouldLogChild('info');
      if (!allowed.ok) {
        return allowed;
      }
      if (allowed.data) {
        if (!shouldSample('info')) {
          return ok(VoidSchema, undefined);
        }
        if (isJsonOutput()) {
          return emitChildStructured('info', msgInput.data, 'stdout', data);
        }
        if (data === undefined) {
          console.log(msgInput.data);
        } else {
          console.log(msgInput.data, data);
        }
      }
      return ok(VoidSchema, undefined);
    },

    trace: (message: Str, data?: JsonData): Result<Void> => {
      const msgInput: Result<Str> = safeParse(StrSchema, message);
      if (!msgInput.ok) {
        return msgInput;
      }
      const allowed: Result<Bool> = shouldLogChild('trace');
      if (!allowed.ok) {
        return allowed;
      }
      if (allowed.data) {
        if (!shouldSample('trace')) {
          return ok(VoidSchema, undefined);
        }
        if (isJsonOutput()) {
          return emitChildStructured('trace', msgInput.data, 'stderr', data);
        }
        if (data === undefined) {
          console.error(`[TRACE] ${msgInput.data}`);
        } else {
          console.error(`[TRACE] ${msgInput.data}`, data);
        }
      }
      return ok(VoidSchema, undefined);
    },

    json: (data: JsonData, indent?: NonNegativeInteger): Result<Void> => {
      if (isJsonOutput()) {
        return emitChildStructured('info', 'json', 'stdout', data);
      }
      const jsonResult: Result<Str> = safeStringify(data, indent ?? DEFAULT_JSON_INDENT);
      if (!jsonResult.ok) {
        return jsonResult;
      }
      console.log(jsonResult.data);
      return ok(VoidSchema, undefined);
    },

    errorObject: (error: AppError): Result<Void> => {
      const allowed: Result<Bool> = shouldLogChild('error');
      if (!allowed.ok) {
        return allowed;
      }
      if (!allowed.data) {
        return ok(VoidSchema, undefined);
      }
      if (isJsonOutput()) {
        return emitChildStructured('error', error.message, 'stderr', {
          errorCode: error.code,
          errorMessage: error.message,
          errorStack: error.stack,
          ...(error.meta !== undefined && { meta: error.meta }),
          ...(error.cause !== undefined && {
            cause: { code: error.cause.code, message: error.cause.message },
          }),
        });
      }
      console.error(`[${error.code}] ${error.message}`);
      if (error.stack) {
        const stackLines: Str[] = error.stack.split('\n').slice(0, 5);
        for (const line of stackLines) {
          console.error(`  ${line.trim()}`);
        }
      }
      return ok(VoidSchema, undefined);
    },

    child: (childOpts: ChildLoggerOptions): Result<ChildLogger> => {
      const childInput: Result<ChildLoggerOptions> = safeParse(ChildLoggerOptionsSchema, childOpts);
      if (!childInput.ok) {
        return childInput;
      }
      const mergedChildContext: LogContext = { ...childContext, ...childInput.data.context };
      return createChildLogger({
        context: mergedChildContext,
        level: childInput.data.level ?? childLevel,
      });
    },

    getContext: getMergedContext,
  };

  return okUnchecked<ChildLogger>(childLogger);
}

// =============================================================================
// Timing / Performance Measurement
// =============================================================================

/**
 * Creates a timer that measures and logs the duration of an operation.
 *
 * Returns a `done()` function that, when called, logs the elapsed time
 * as a structured log entry with `durationMs`.
 *
 * @param {Str} label - Operation label for the log message.
 * @param {{ level?: LogLevel }} options - Optional: level (default 'debug').
 *{Result<{ done: (message?: Str) => Result<Void> }>}ult<Void> }>} `Result<{ done: (message?: Str) => Result<Void> }>` — timer with `done()` method.
 *
 * @example
 * ```typescript
 * const timer = startTimer('database query');
 * if (!timer.ok) return timer;
 * await db.query('SELECT * FROM users');
 * timer.data.done(); // logs: "database query completed in 42ms"
 * ```
 * @param {{ level?: LogLevel }} options - Description
 *{Result<{ done: (message?: Str) => Result<Void> }>}ult<Void> }>} Description
 * @param {{ level?: LogLevel }} options - Description
 * @param {{ level?: LogLevel }} options - Description
 * @returns {Result<{ done: (message?: Str) => Result<Void> }>} Description
 * @param {{ level?: LogLevel }} options - Description
 */
export function startTimer(
  label: Str,
  options?: { level?: LogLevel },
): Result<{ done: (message?: Str) => Result<Void> }> {
  const input: Result<Str> = safeParse(StrSchema, label);
  if (!input.ok) {
    return input;
  }

  const startTime: number = performance.now();
  const level: LogLevel = options?.level ?? 'debug';

  return okUnchecked({
    done: (message?: Str): Result<Void> => {
      const elapsed: number = Math.round(performance.now() - startTime);
      const msg: Str = message ?? `${input.data} completed in ${elapsed}ms`;

      if (isJsonOutput()) {
        const ctx: LogContext = getResolvedContext();
        const entry: LogEntry = {
          level,
          message: message ?? input.data,
          timestamp: new Date().toISOString(),
          durationMs: elapsed,
          ...(Object.keys(ctx).length > 0 && { context: ctx }),
        };
        if (_transports.length > 0) {
          dispatchToTransports(entry);
        }
        if (_bufferConfig) {
          bufferEntry(entry);
        }
        const jsonResult: Result<Str> = safeStringify(entry);
        if (!jsonResult.ok) {
          return jsonResult;
        }
        if (level === 'error') {
          console.error(jsonResult.data);
        } else {
          console.log(jsonResult.data);
        }
        return ok(VoidSchema, undefined);
      }

      // Pretty mode
      const allowed: Result<Bool> = shouldLog(level);
      if (!allowed.ok) {
        return allowed;
      }
      if (allowed.data) {
        dispatchNonJson(level, msg);
        if (level === 'debug' || level === 'trace') {
          console.error(`[${level.toUpperCase()}] ${msg}`);
        } else {
          console.log(msg);
        }
      }
      return ok(VoidSchema, undefined);
    },
  });
}

// =============================================================================
// Dynamic Log Level
// =============================================================================

/**
 * Initializes the log level from environment variables.
 *
 * Checks `LOG_LEVEL` and `DEBUG` environment variables at startup.
 * If `LOG_LEVEL` is set to a valid level, uses it. If `DEBUG` is set
 * (any value), sets level to `'debug'`. Otherwise uses the default.
 *
 * @returns {Result<LogLevel>} `Result<LogLevel>` — the resolved log level.
 *
 * @example
 * ```typescript
 * const level = initLogLevelFromEnv();
 * if (level.ok) level.data; // resolved from env or default
 * ```
 */
export function initLogLevelFromEnv(): Result<LogLevel> {
  /*
   * Read env directly instead of importing `getEnvRecord` from `process.ts`.
   * This breaks the circular dependency chain:
   *   logger → process → terminal → logger
   */
  const proc: OptionalNodeProcess =
    globalThis.process === undefined ? undefined : globalThis.process;
  const envResult: Result<EnvRecordWithUndefined> = safeParse(
    EnvRecordWithUndefinedSchema,
    proc?.env ?? {},
  );
  if (!envResult.ok) {
    return ok(LogLevelSchema, DEFAULT_LOG_LEVEL);
  }

  const envLevel: string | undefined = envResult.data.LOG_LEVEL;
  if (envLevel !== undefined) {
    const parsed: Result<LogLevel> = safeParse(LogLevelSchema, envLevel.toLowerCase());
    if (parsed.ok) {
      const setResult: Result<Void> = setLogLevel(parsed.data);
      if (!setResult.ok) {
        return setResult;
      }
      return ok(LogLevelSchema, parsed.data);
    }
  }

  const debugFlag: string | undefined = envResult.data.DEBUG;
  if (debugFlag !== undefined) {
    const setResult: Result<Void> = setLogLevel('debug');
    if (!setResult.ok) {
      return setResult;
    }
    return ok(LogLevelSchema, 'debug');
  }

  return ok(LogLevelSchema, DEFAULT_LOG_LEVEL);
}

/**
 * Temporarily elevates the log level for the duration of a callback.
 *
 * Restores the original level after the callback completes, even if it throws.
 *
 * @param {LogLevel} level - Temporary log level.
 * @param {() => T} fn - Callback to execute at the elevated level.
 * @returns {Result<T>} `Result<T>` — the callback's return value.
 *
 * @example
 * ```typescript
 * const result = withLogLevel('debug', () => {
 *   log.debug('This will be visible');
 *   return doSomething();
 * });
 * ```
 */
export function withLogLevel<T>(level: LogLevel, fn: () => T): Result<T> {
  const levelResult: Result<LogLevel> = safeParse(LogLevelSchema, level);
  if (!levelResult.ok) {
    return levelResult;
  }

  const previousResult: Result<LogLevel> = getLogLevel();
  if (!previousResult.ok) {
    return previousResult;
  }

  const setResult: Result<Void> = setLogLevel(levelResult.data);
  if (!setResult.ok) {
    return setResult;
  }

  try {
    const value: T = fn();
    setLogLevel(previousResult.data);
    return okUnchecked<T>(value);
  } catch (error: unknown) {
    setLogLevel(previousResult.data);
    return err(ERRORS.INTERNAL.UNEXPECTED, {
      cause: fromUnknownError(error),
      meta: { operation: 'withLogLevel' },
    });
  }
}

// =============================================================================
// Async Context (Request-Scoped)
// =============================================================================

/**
 * Initializes async-scoped logging context.
 *
 * In Node.js, uses `AsyncLocalStorage` for automatic request-scoped context.
 * Call once at startup. After initialization, `getContext()` automatically
 * returns the request-scoped context when inside a `withContext()` callback.
 *
 * @returns {Result<Void>} `Result<Void>` — success, or error if AsyncLocalStorage is unavailable.
 *
 * @example
 * ```typescript
 * initAsyncContext();
 * ```
 */
export function initAsyncContext(): Result<Void> {
  if (_asyncHooksModule?.AsyncLocalStorage) {
    _asyncLocalStorage =
      new _asyncHooksModule.AsyncLocalStorage() as AsyncLocalStorageType<LogContext>;
    return ok(VoidSchema, undefined);
  }
  return err(ERRORS.RUNTIME.UNSUPPORTED, {
    meta: { reason: 'AsyncLocalStorage not available in this runtime' },
  });
}

/**
 * Runs a callback with request-scoped logging context.
 *
 * All `log.*` calls within the callback will include the scoped context fields.
 * Requires `initAsyncContext()`. Falls back to global `mergeContext()` if not initialized.
 *
 * @param {LogContext} context - Request-scoped context fields.
 * @param {() => T} fn - Callback to execute with scoped context.
 * @returns {Result<T>} `Result<T>` — the callback's return value.
 *
 * @example
 * ```typescript
 * const result = withContext(
 *   { requestId: 'req-123', userId: 'user-42' },
 *   async () => {
 *     log.info('Processing'); // includes requestId + userId
 *     return await handleRequest();
 *   },
 * );
 * ```
 */
export function withContext<T>(context: LogContext, fn: () => T): Result<T> {
  const input: Result<LogContext> = safeParse(LogContextSchema, context);
  if (!input.ok) {
    return input;
  }

  if (_asyncLocalStorage) {
    const globalCtx: LogContext = getResolvedContext();
    const merged: LogContext = { ...globalCtx, ...input.data };
    try {
      const value: T = _asyncLocalStorage.run(merged, fn);
      return okUnchecked<T>(value);
    } catch (error: unknown) {
      return err(ERRORS.INTERNAL.UNEXPECTED, {
        cause: fromUnknownError(error),
        meta: { operation: 'withContext' },
      });
    }
  }

  // Fallback: use global context (not request-safe)
  const prevCtx: LogContext = { ...currentContext };
  mergeContext(input.data);
  try {
    const value: T = fn();
    setContext(prevCtx);
    return okUnchecked<T>(value);
  } catch (error: unknown) {
    setContext(prevCtx);
    return err(ERRORS.INTERNAL.UNEXPECTED, {
      cause: fromUnknownError(error),
      meta: { operation: 'withContext' },
    });
  }
}

// =============================================================================
// JUnit XML Output
// =============================================================================

/**
 * Schema for a JUnit test case result.
 */
export const JUnitTestCaseSchema = v.strictObject({
  /** Test suite name (e.g., package name). */
  suite: v.pipe(v.string(), v.minLength(1)),
  /** Test case name. */
  name: v.pipe(v.string(), v.minLength(1)),
  /** Duration in seconds. */
  time: v.optional(v.pipe(v.number(), v.minValue(0))),
  /** If present, the test failed with this message. */
  failure: v.optional(v.string()),
  /** If present, the test errored with this message. */
  error: v.optional(v.string()),
  /** If true, the test was skipped. */
  skipped: v.optional(v.boolean()),
  /** stdout capture. */
  stdout: v.optional(v.string()),
  /** stderr capture. */
  stderr: v.optional(v.string()),
});

/** Inferred output type of {@link JUnitTestCaseSchema}. */
export type JUnitTestCase = v.InferOutput<typeof JUnitTestCaseSchema>;

/**
 * Formats test results as JUnit XML.
 *
 * @param {JUnitTestCase[]} testCases - Array of test case results.
 * @param {Str} suiteName - Top-level suite name.
 * @returns {Result<Str>} `Result<Str>` — JUnit XML string.
 *
 * @example
 * ```typescript
 * const xml = formatJUnit([
 *   { suite: 'format', name: 'check biome config', time: 0.5 },
 *   { suite: 'format', name: 'validate schemas', time: 0.2, failure: 'Schema mismatch' },
 * ], 'qa:format');
 * ```
 */
export function formatJUnit(testCases: JUnitTestCase[], suiteName: Str): Result<Str> {
  const input: Result<Str> = safeParse(StrSchema, suiteName);
  if (!input.ok) {
    return input;
  }

  const totalTests: number = testCases.length;
  const failures: number = testCases.filter((t) => t.failure !== undefined).length;
  const errors: number = testCases.filter((t) => t.error !== undefined).length;
  const skipped: number = testCases.filter((t) => t.skipped).length;
  const totalTime: number = testCases.reduce((sum, t) => sum + (t.time ?? 0), 0);

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuites tests="${totalTests}" failures="${failures}" errors="${errors}" time="${totalTime.toFixed(3)}">`,
    `  <testsuite name="${escapeXml(input.data)}" tests="${totalTests}" failures="${failures}" errors="${errors}" skipped="${skipped}" time="${totalTime.toFixed(3)}">`,
  ];

  for (const tc of testCases) {
    const timeAttr: string = tc.time === undefined ? '' : ` time="${tc.time.toFixed(3)}"`;

    lines.push(
      `    <testcase classname="${escapeXml(tc.suite)}" name="${escapeXml(tc.name)}"${timeAttr}>`,
    );
    if (tc.failure !== undefined) {
      lines.push(
        `      <failure message="${escapeXml(tc.failure)}">${escapeXml(tc.failure)}</failure>`,
      );
    }
    if (tc.error !== undefined) {
      lines.push(`      <error message="${escapeXml(tc.error)}">${escapeXml(tc.error)}</error>`);
    }
    if (tc.skipped) {
      lines.push('      <skipped/>');
    }
    if (tc.stdout !== undefined) {
      lines.push(`      <system-out>${escapeXml(tc.stdout)}</system-out>`);
    }
    if (tc.stderr !== undefined) {
      lines.push(`      <system-err>${escapeXml(tc.stderr)}</system-err>`);
    }
    lines.push('    </testcase>');
  }

  lines.push('  </testsuite>');
  lines.push('</testsuites>');

  return ok(StrSchema, lines.join('\n'));
}

/**
 * Escape special XML characters.
 *
 * @param text - Text to escape.
 * @returns Escaped text safe for XML attributes and content.
 */
function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

// =============================================================================
// Setup Logging (Single Entry Point)
// =============================================================================

/**
 * Schema for logging system configuration.
 *
 * One call configures the entire logging pipeline. All fields are optional
 * with sensible defaults. Mirrors {@link GlobalErrorHandlerOptionsSchema}.
 */
export const LoggingOptionsSchema = v.strictObject({
  /** Log level. If not set, reads from `LOG_LEVEL`/`DEBUG` env vars, then falls back to default. */
  level: v.optional(LogLevelSchema),
  /** Output format. If not set, uses the current output format. */
  format: v.optional(OutputFormatSchema),
  /** Service name attached to every log entry. */
  service: v.optional(v.pipe(v.string(), v.minLength(1))),
  /** Initial global log context fields. */
  context: v.optional(LogContextSchema),
  /** Transports to register for fan-out logging. */
  transports: v.optional(v.array(TransportConfigSchema)),
  /** Redaction configuration for sensitive data masking. */
  redaction: v.optional(RedactionConfigSchema),
  /** Sampling configuration for high-throughput environments. */
  sampling: v.optional(SamplingConfigSchema),
  /** Buffer configuration for batched log submission. */
  buffer: v.optional(BufferConfigSchema),
  /** Whether to initialize AsyncLocalStorage for request-scoped context. */
  asyncContext: v.optional(BoolSchema),
  /** Whether to read `LOG_LEVEL`/`DEBUG` env vars. Default: true. */
  initFromEnv: v.optional(BoolSchema),
});

/** Inferred output type of {@link LoggingOptionsSchema}. */
export type LoggingOptions = v.InferOutput<typeof LoggingOptionsSchema>;

/**
 * Sets up the entire logging system with a single call.
 *
 * Configures level, format, service, context, transports, redaction,
 * sampling, buffering, and async context. Returns a teardown function
 * that reverses all setup.
 *
 * @param {LoggingOptions} options - Logging configuration.
 * @returns {Result<TeardownFn>} `Result<TeardownFn>` — teardown function, or a validation error.
 *
 * @example
 * ```typescript
 * const setup = setupLogging({
 *   level: 'debug',
 *   service: 'user-api',
 *   context: { runtime: 'node-tty', operation: 'api' },
 *   redaction: { paths: ['password', 'token'], censor: '***' },
 * });
 * if (!setup.ok) return setup;
 * // On shutdown: setup.data();
 * ```
 */
export function setupLogging(options: LoggingOptions): Result<TeardownFn> {
  const input: Result<LoggingOptions> = safeParse(LoggingOptionsSchema, options);
  if (!input.ok) {
    return input;
  }

  const opts: LoggingOptions = input.data as LoggingOptions;

  // 1. Log level: explicit → env var → default
  if (opts.level !== undefined) {
    const levelResult: Result<Void> = setLogLevel(opts.level);
    if (!levelResult.ok) {
      return levelResult;
    }
  } else if (opts.initFromEnv !== false) {
    const envResult: Result<LogLevel> = initLogLevelFromEnv();
    if (!envResult.ok) {
      return envResult;
    }
  }

  // 2. Output format
  if (opts.format !== undefined) {
    const formatResult: Result<Void> = setOutputFormat(opts.format);
    if (!formatResult.ok) {
      return formatResult;
    }
  }

  // 3. Global context (merge service name into context)
  const contextToSet: LogContext = {
    ...opts.context,
    ...(opts.service !== undefined && { service: opts.service }),
  };
  if (Object.keys(contextToSet).length > 0) {
    const ctxResult: Result<Void> = setContext(contextToSet);
    if (!ctxResult.ok) {
      return ctxResult;
    }
  }

  // 4. Redaction
  if (opts.redaction !== undefined) {
    const redactResult: Result<Void> = setRedaction(opts.redaction);
    if (!redactResult.ok) {
      return redactResult;
    }
  }

  // 5. Sampling
  if (opts.sampling !== undefined) {
    const sampleResult: Result<Void> = setSampling(opts.sampling);
    if (!sampleResult.ok) {
      return sampleResult;
    }
  }

  // 6. Transports
  if (opts.transports !== undefined) {
    for (const transport of opts.transports) {
      const transportResult: Result<Void> = addTransport(transport);
      if (!transportResult.ok) {
        return transportResult;
      }
    }
  }

  // 7. Buffering
  if (opts.buffer !== undefined) {
    const bufferResult: Result<Void> = enableBuffer(opts.buffer);
    if (!bufferResult.ok) {
      return bufferResult;
    }
  }

  // 8. Async context
  if (opts.asyncContext) {
    const asyncResult: Result<Void> = initAsyncContext();
    // Non-fatal — async context is a nice-to-have (unavailable in browser)
    if (!asyncResult.ok) {
      log.debug(`AsyncLocalStorage unavailable: ${asyncResult.error.message}`);
    }
  }

  // Return teardown function
  const teardownFn: TeardownFn = (): Void => {
    disableBuffer();
    clearTransports();
    clearSampling();
    setRedaction({ paths: [...DEFAULT_REDACT_PATHS], censor: '[REDACTED]' });
    setLogLevel(DEFAULT_LOG_LEVEL);
    setContext({});
  };

  return okUnchecked<TeardownFn>(teardownFn);
}
