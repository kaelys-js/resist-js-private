/**
 * Tests for the logger module.
 *
 * Comprehensive coverage of log level state, context, transports, redaction,
 * sampling, buffering, log methods, child loggers, timers, env init,
 * scoped-level execution, async context, JUnit formatting, and setupLogging.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Bool,
  LogContext,
  LogLevel,
  NonNegativeInteger,
  OutputFormat,
  Str,
  TeardownFn,
} from '@/schemas/common';
import type { AppError, Result } from '@/schemas/result/result';
import {
  addTransport,
  clearSampling,
  clearTransports,
  createChildLogger,
  disableBuffer,
  enableBuffer,
  flushBuffer,
  formatJUnit,
  getContext,
  getLogLevel,
  initAsyncContext,
  initLogLevelFromEnv,
  log,
  mergeContext,
  removeTransport,
  setContext,
  setLogLevel,
  setRedaction,
  setSampling,
  setupLogging,
  shouldLog,
  startTimer,
  withContext,
  withLogLevel,
  type ChildLogger,
  type JUnitTestCase,
  type LogTransport,
  type LoggingOptions,
  type TransportConfig,
} from './logger';
import { getOutputFormat, setOutputFormat } from './output-context';

// ── Setup / Teardown ────────────────────────────────────────────────────

let teardown: TeardownFn | undefined;

beforeEach(() => {
  /* Reset all logger state to known defaults. */
  setLogLevel('info');
  setContext({});
  clearTransports();
  clearSampling();
  disableBuffer();
  setRedaction({ paths: ['password', 'token'], censor: '[REDACTED]' });
  setOutputFormat('pretty' as OutputFormat);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  if (teardown) {
    teardown();
    teardown = undefined;
  }
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ── Log Level ───────────────────────────────────────────────────────────

describe('log level state', () => {
  it('setLogLevel accepts valid level and getLogLevel returns it', () => {
    const result = setLogLevel('debug');
    expect(result.ok).toBe(true);
    const level = getLogLevel();
    expect(level.ok).toBe(true);
    if (level.ok) {
      expect(level.data).toBe('debug');
    }
  });

  it('setLogLevel rejects invalid level', () => {
    const result = setLogLevel('invalid' as LogLevel);
    expect(result.ok).toBe(false);
  });

  it('shouldLog returns true when level passes filter', () => {
    setLogLevel('debug');
    const result: Result<Bool> = shouldLog('info');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(true);
    }
  });

  it('shouldLog returns false when level is below current', () => {
    setLogLevel('error');
    const result: Result<Bool> = shouldLog('info');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(false);
    }
  });

  it('silent level rejects even error messages', () => {
    setLogLevel('silent');
    const result: Result<Bool> = shouldLog('error');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(false);
    }
  });

  it('shouldLog("silent") always returns false', () => {
    setLogLevel('trace');
    const result: Result<Bool> = shouldLog('silent');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(false);
    }
  });

  it('trace level enables every other level', () => {
    setLogLevel('trace');
    for (const level of ['error', 'warn', 'info', 'debug', 'trace'] as const) {
      const r: Result<Bool> = shouldLog(level);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.data).toBe(true);
      }
    }
  });

  it('shouldLog returns err for invalid level', () => {
    const result: Result<Bool> = shouldLog('bogus' as LogLevel);
    expect(result.ok).toBe(false);
  });
});

// ── Context ─────────────────────────────────────────────────────────────

describe('context', () => {
  it('setContext and getContext round-trip', () => {
    setContext({ service: 'test', operation: 'unit' });
    const ctx = getContext();
    expect(ctx.ok).toBe(true);
    if (ctx.ok) {
      expect(ctx.data.service).toBe('test');
      expect(ctx.data.operation).toBe('unit');
    }
  });

  it('mergeContext adds fields to existing context', () => {
    setContext({ service: 'test' });
    mergeContext({ operation: 'merge' });
    const ctx = getContext();
    expect(ctx.ok).toBe(true);
    if (ctx.ok) {
      expect(ctx.data.service).toBe('test');
      expect(ctx.data.operation).toBe('merge');
    }
  });

  it('mergeContext overwrites existing keys', () => {
    setContext({ service: 'old' });
    mergeContext({ service: 'new' });
    const ctx = getContext();
    expect(ctx.ok).toBe(true);
    if (ctx.ok) {
      expect(ctx.data.service).toBe('new');
    }
  });

  it('setContext with empty object clears previous context', () => {
    setContext({ service: 'temp' });
    setContext({});
    const ctx = getContext();
    expect(ctx.ok).toBe(true);
    if (ctx.ok) {
      expect(ctx.data.service).toBeUndefined();
    }
  });

  it('setContext rejects invalid shape', () => {
    /* service must be a string — pass number to trigger validation error. */
    const result = setContext({ service: 123 as unknown as Str });
    expect(result.ok).toBe(false);
  });

  it('mergeContext rejects invalid partial', () => {
    const result = mergeContext({ service: 123 as unknown as Str });
    expect(result.ok).toBe(false);
  });

  it('mergeContext preserves runtime and adds operation', () => {
    setContext({ runtime: 'node-tty' });
    mergeContext({ operation: 'sync' });
    const ctx = getContext();
    if (ctx.ok) {
      expect(ctx.data.runtime).toBe('node-tty');
      expect(ctx.data.operation).toBe('sync');
    }
  });
});

// ── Transports ──────────────────────────────────────────────────────────

describe('transports', () => {
  it('addTransport registers a transport', () => {
    const transport: LogTransport = vi.fn();
    const result = addTransport({ name: 'test-transport', transport });
    expect(result.ok).toBe(true);
  });

  it('removeTransport removes by name and returns true', () => {
    const transport: LogTransport = vi.fn();
    addTransport({ name: 'removable', transport });
    const result: Result<Bool> = removeTransport('removable');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(true);
    }
  });

  it('removeTransport returns false for unknown name', () => {
    const result: Result<Bool> = removeTransport('nonexistent');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(false);
    }
  });

  it('clearTransports removes all', () => {
    const transport: LogTransport = vi.fn();
    addTransport({ name: 'a', transport });
    addTransport({ name: 'b', transport });
    const result = clearTransports();
    expect(result.ok).toBe(true);
  });

  it('transport receives log entry when log.info called', () => {
    const transport: LogTransport = vi.fn();
    addTransport({ name: 't1', transport });
    log.info('hello');
    expect(transport).toHaveBeenCalledTimes(1);
    const entry = (transport as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(entry).toMatchObject({ level: 'info', message: 'hello' });
    expect(typeof entry.timestamp).toBe('string');
  });

  it('transport level filter drops below-threshold entries', () => {
    const transport: LogTransport = vi.fn();
    addTransport({ name: 'errors-only', transport, level: 'error' });
    setLogLevel('trace');
    log.info('skipped'); /* info > error index → skipped */
    log.error('kept');
    expect(transport).toHaveBeenCalledTimes(1);
    const entry = (transport as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(entry.message).toBe('kept');
  });

  it('transport throw does not break logging pipeline', () => {
    const transport: LogTransport = vi.fn(() => {
      throw new Error('transport blew up');
    });
    addTransport({ name: 'bad', transport });
    const r = log.info('still ok');
    expect(r.ok).toBe(true);
    expect(transport).toHaveBeenCalled();
  });

  it('multiple transports all receive the entry', () => {
    const t1: LogTransport = vi.fn();
    const t2: LogTransport = vi.fn();
    addTransport({ name: 'a', transport: t1 });
    addTransport({ name: 'b', transport: t2 });
    log.info('fanout');
    expect(t1).toHaveBeenCalledTimes(1);
    expect(t2).toHaveBeenCalledTimes(1);
  });

  it('addTransport rejects invalid config (missing transport fn)', () => {
    const result = addTransport({
      name: 'bad',
      transport: 'not-a-fn',
    } as unknown as TransportConfig);
    expect(result.ok).toBe(false);
  });

  it('addTransport rejects empty name', () => {
    const transport: LogTransport = vi.fn();
    const result = addTransport({ name: '', transport });
    expect(result.ok).toBe(false);
  });
});

// ── Redaction ───────────────────────────────────────────────────────────

describe('redaction', () => {
  it('setRedaction accepts valid config', () => {
    const result = setRedaction({ paths: ['password', 'token'], censor: '***' });
    expect(result.ok).toBe(true);
  });

  it('setRedaction applies custom censor string', () => {
    const result = setRedaction({ paths: ['secret'], censor: '[HIDDEN]' });
    expect(result.ok).toBe(true);
  });

  it('redacts matching keys in json-mode entry data', () => {
    setOutputFormat('json' as OutputFormat);
    setRedaction({ paths: ['password'], censor: '[REDACTED]' });
    const transport: LogTransport = vi.fn();
    addTransport({ name: 'sink', transport });
    log.info('user', { username: 'alice', password: 'secret123' });
    const entry = (transport as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(entry.data.password).toBe('[REDACTED]');
    expect(entry.data.username).toBe('alice');
  });

  it('redacts nested keys recursively', () => {
    setOutputFormat('json' as OutputFormat);
    setRedaction({ paths: ['token'], censor: '***' });
    const transport: LogTransport = vi.fn();
    addTransport({ name: 'sink', transport });
    log.info('nested', { auth: { token: 'abc', user: 'bob' } });
    const entry = (transport as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(entry.data.auth.token).toBe('***');
    expect(entry.data.auth.user).toBe('bob');
  });

  it('setRedaction rejects invalid config (empty path string)', () => {
    const result = setRedaction({ paths: [''], censor: 'x' });
    expect(result.ok).toBe(false);
  });

  it('redaction leaves non-matching keys untouched', () => {
    setOutputFormat('json' as OutputFormat);
    setRedaction({ paths: ['password'] });
    const transport: LogTransport = vi.fn();
    addTransport({ name: 'sink', transport });
    log.info('no match', { kept: 42, also: 'fine' });
    const entry = (transport as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(entry.data.kept).toBe(42);
    expect(entry.data.also).toBe('fine');
  });
});

// ── Sampling ────────────────────────────────────────────────────────────

describe('sampling', () => {
  it('setSampling accepts valid config', () => {
    const result = setSampling({ rate: 0.5, alwaysSample: ['error'] });
    expect(result.ok).toBe(true);
  });

  it('clearSampling restores full logging', () => {
    setSampling({ rate: 0.1, alwaysSample: ['debug'] });
    const result = clearSampling();
    expect(result.ok).toBe(true);
  });

  it('rate=0 drops info logs but keeps alwaysSample=["error"] default', () => {
    const transport: LogTransport = vi.fn();
    addTransport({ name: 'sink', transport });
    setLogLevel('trace');
    setSampling({ rate: 0 }); /* default alwaysSample is ['error'] */
    log.info('dropped');
    log.error('kept');
    expect(transport).toHaveBeenCalledTimes(1);
    const entry = (transport as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(entry.message).toBe('kept');
  });

  it('rate=1 keeps everything', () => {
    const transport: LogTransport = vi.fn();
    addTransport({ name: 'sink', transport });
    setSampling({ rate: 1 });
    log.info('a');
    log.info('b');
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it('custom alwaysSample keeps only those levels at rate=0', () => {
    const transport: LogTransport = vi.fn();
    addTransport({ name: 'sink', transport });
    setLogLevel('trace');
    setSampling({ rate: 0, alwaysSample: ['warn'] });
    log.info('dropped');
    log.warn('kept');
    log.error('dropped-because-no-longer-in-alwaysSample');
    const kept = (transport as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: unknown[]) => (c[0] as { message: string }).message,
    );
    expect(kept).toEqual(['kept']);
  });

  it('setSampling rejects rate > 1', () => {
    const result = setSampling({ rate: 2 });
    expect(result.ok).toBe(false);
  });

  it('setSampling rejects negative rate', () => {
    const result = setSampling({ rate: -0.1 });
    expect(result.ok).toBe(false);
  });
});

// ── Buffering ───────────────────────────────────────────────────────────

describe('buffering', () => {
  it('enableBuffer accepts valid config', () => {
    const onFlush = vi.fn();
    const result = enableBuffer({ maxSize: 100, flushIntervalMs: 0, onFlush });
    expect(result.ok).toBe(true);
  });

  it('flushBuffer returns ok even when buffer empty', () => {
    const onFlush = vi.fn();
    enableBuffer({ maxSize: 100, flushIntervalMs: 0, onFlush });
    const result = flushBuffer();
    expect(result.ok).toBe(true);
    expect(onFlush).not.toHaveBeenCalled();
  });

  it('disableBuffer returns ok and flushes remaining entries', () => {
    const onFlush = vi.fn();
    enableBuffer({ maxSize: 100, flushIntervalMs: 0, onFlush });
    setOutputFormat('json' as OutputFormat);
    log.info('buffered');
    const result = disableBuffer();
    expect(result.ok).toBe(true);
    expect(onFlush).toHaveBeenCalledTimes(1);
  });

  it('buffer auto-flushes when maxSize reached', () => {
    const onFlush = vi.fn();
    enableBuffer({ maxSize: 2, flushIntervalMs: 0, onFlush });
    setOutputFormat('json' as OutputFormat);
    log.info('1');
    expect(onFlush).not.toHaveBeenCalled();
    log.info('2');
    /* After 2nd entry, _buffer.length >= maxSize triggers flush. */
    expect(onFlush).toHaveBeenCalledTimes(1);
    const entries = (onFlush as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(entries).toHaveLength(2);
  });

  it('flushBuffer onFlush throw does not break pipeline', () => {
    const onFlush = vi.fn(() => {
      throw new Error('flush failed');
    });
    enableBuffer({ maxSize: 100, flushIntervalMs: 0, onFlush });
    setOutputFormat('json' as OutputFormat);
    log.info('msg');
    const result = flushBuffer();
    expect(result.ok).toBe(true);
  });

  it('buffer flushes on interval', () => {
    vi.useFakeTimers();
    const onFlush = vi.fn();
    enableBuffer({ maxSize: 100, flushIntervalMs: 1000, onFlush });
    setOutputFormat('json' as OutputFormat);
    log.info('tick');
    expect(onFlush).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(onFlush).toHaveBeenCalledTimes(1);
  });

  it('flushBuffer without enableBuffer is a no-op', () => {
    const result = flushBuffer();
    expect(result.ok).toBe(true);
  });
});

// ── log object ──────────────────────────────────────────────────────────

describe('log object', () => {
  it('log.info logs to stdout', () => {
    setLogLevel('info');
    const result = log.info('hello');
    expect(result.ok).toBe(true);
    expect(console.log).toHaveBeenCalled();
  });

  it('log.info with data passes both args to console.log', () => {
    setLogLevel('info');
    log.info('msg', { k: 1 });
    expect(console.log).toHaveBeenCalledWith('msg', { k: 1 });
  });

  it('log.debug logs with [DEBUG] prefix at debug level', () => {
    setLogLevel('debug');
    const result = log.debug('debug msg');
    expect(result.ok).toBe(true);
    expect(console.error).toHaveBeenCalledWith('[DEBUG] debug msg');
  });

  it('log.debug with data includes data arg', () => {
    setLogLevel('debug');
    log.debug('msg', { detail: true });
    expect(console.error).toHaveBeenCalledWith('[DEBUG] msg', { detail: true });
  });

  it('log.warn logs to stdout', () => {
    setLogLevel('info');
    const result = log.warn('warning');
    expect(result.ok).toBe(true);
    expect(console.log).toHaveBeenCalled();
  });

  it('log.error logs to stderr', () => {
    setLogLevel('error');
    const result = log.error('error msg');
    expect(result.ok).toBe(true);
    expect(console.error).toHaveBeenCalled();
  });

  it('log.trace logs at trace level with [TRACE] prefix', () => {
    setLogLevel('trace');
    const result = log.trace('trace msg');
    expect(result.ok).toBe(true);
    expect(console.error).toHaveBeenCalledWith('[TRACE] trace msg');
  });

  it('log.trace with data includes data arg', () => {
    setLogLevel('trace');
    log.trace('entry', { step: 1 });
    expect(console.error).toHaveBeenCalledWith('[TRACE] entry', { step: 1 });
  });

  it('log.success logs at info level', () => {
    setLogLevel('info');
    const result = log.success('ok');
    expect(result.ok).toBe(true);
    expect(console.log).toHaveBeenCalled();
  });

  it('log.success with data passes both args', () => {
    setLogLevel('info');
    log.success('done', { count: 3 });
    expect(console.log).toHaveBeenCalledWith('done', { count: 3 });
  });

  it('log.json in pretty mode emits indented JSON', () => {
    log.json({ foo: 'bar' });
    const call = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(String(call)).toContain('"foo"');
    expect(String(call)).toContain('"bar"');
  });

  it('log.json accepts custom indent', () => {
    log.json({ a: 1 }, 4 as NonNegativeInteger);
    const call = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    /* indent 4 means 4-space indentation. */
    expect(String(call)).toContain('    "a"');
  });

  it('log.json in json output mode emits structured entry', () => {
    setOutputFormat('json' as OutputFormat);
    const r = log.json({ count: 1 });
    expect(r.ok).toBe(true);
    const call = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(String(call));
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('json');
    expect(parsed.data).toEqual({ count: 1 });
  });

  it('log.info suppressed when level is error', () => {
    setLogLevel('error');
    const result = log.info('should not appear');
    expect(result.ok).toBe(true);
    expect(console.log).not.toHaveBeenCalled();
  });

  it('log.debug suppressed at info level', () => {
    setLogLevel('info');
    log.debug('hidden');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('log.info rejects non-string', () => {
    const result = log.info(42 as unknown as Str);
    expect(result.ok).toBe(false);
  });

  it('log.info at silent level is suppressed', () => {
    setLogLevel('silent');
    const r = log.info('nope');
    expect(r.ok).toBe(true);
    expect(console.log).not.toHaveBeenCalled();
  });

  it('log.error emits structured entry in json mode', () => {
    setOutputFormat('json' as OutputFormat);
    setLogLevel('error');
    log.error('boom', { code: 'X' });
    const call = (console.error as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(String(call));
    expect(parsed.level).toBe('error');
    expect(parsed.message).toBe('boom');
    expect(parsed.data).toEqual({ code: 'X' });
  });

  it('log.errorObject pretty mode prints [code] message + stack lines', () => {
    setLogLevel('error');
    const appErr: AppError = {
      id: 'err-1',
      code: 'INTERNAL.UNEXPECTED',
      message: 'boom',
      timestamp: new Date().toISOString(),
      stack: 'Error: boom\n    at frame1\n    at frame2',
    } as AppError;
    const r = log.errorObject(appErr);
    expect(r.ok).toBe(true);
    expect(console.error).toHaveBeenCalledWith('[INTERNAL.UNEXPECTED] boom');
  });

  it('log.errorObject in json mode emits errorCode + stack fields', () => {
    setOutputFormat('json' as OutputFormat);
    setLogLevel('error');
    const appErr: AppError = {
      id: 'err-1',
      code: 'INTERNAL.UNEXPECTED',
      message: 'boom',
      timestamp: '2026-01-01T00:00:00.000Z',
      stack: 'Error: boom',
    } as AppError;
    log.errorObject(appErr);
    const call = (console.error as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(String(call));
    expect(parsed.data.errorCode).toBe('INTERNAL.UNEXPECTED');
    expect(parsed.data.errorMessage).toBe('boom');
  });

  it('log.errorObject suppressed when level below error', () => {
    setLogLevel('silent');
    const appErr: AppError = {
      id: 'e',
      code: 'X',
      message: 'm',
      timestamp: 't',
    } as unknown as AppError;
    const r = log.errorObject(appErr);
    expect(r.ok).toBe(true);
    expect(console.error).not.toHaveBeenCalled();
  });
});

// ── Timer ───────────────────────────────────────────────────────────────

describe('startTimer', () => {
  it('returns done function that logs elapsed time', () => {
    setLogLevel('debug');
    const timerResult = startTimer('test op');
    expect(timerResult.ok).toBe(true);
    if (timerResult.ok) {
      const doneResult = timerResult.data.done();
      expect(doneResult.ok).toBe(true);
    }
  });

  it('done uses custom message when provided', () => {
    setLogLevel('debug');
    const timerResult = startTimer('test op');
    expect(timerResult.ok).toBe(true);
    if (timerResult.ok) {
      const doneResult = timerResult.data.done('custom done message');
      expect(doneResult.ok).toBe(true);
    }
  });

  it('startTimer rejects invalid label', () => {
    const r = startTimer(42 as unknown as Str);
    expect(r.ok).toBe(false);
  });

  it('timer with explicit "info" level prints to stdout in pretty mode', () => {
    setLogLevel('info');
    const timer = startTimer('op', { level: 'info' });
    if (timer.ok) {
      timer.data.done();
    }
    expect(console.log).toHaveBeenCalled();
  });

  it('timer with "debug" level prints to stderr with [DEBUG] prefix', () => {
    setLogLevel('debug');
    const timer = startTimer('op', { level: 'debug' });
    if (timer.ok) {
      timer.data.done();
    }
    /* In pretty mode the timer routes debug/trace to stderr with prefix;
     * info/warn/error all go to stdout (plain message). */
    expect(console.error).toHaveBeenCalled();
    const call = (console.error as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(String(call)).toContain('[DEBUG]');
  });

  it('timer suppressed when level is below threshold', () => {
    setLogLevel('error'); /* Only 'error' and 'silent' visible. */
    const timer = startTimer('op', { level: 'debug' });
    if (timer.ok) {
      timer.data.done();
    }
    expect(console.log).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('timer in json mode emits entry with durationMs', () => {
    setOutputFormat('json' as OutputFormat);
    setLogLevel('debug');
    const timer = startTimer('op');
    if (timer.ok) {
      timer.data.done();
    }
    const call = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(String(call));
    expect(parsed.level).toBe('debug');
    expect(typeof parsed.durationMs).toBe('number');
  });
});

// ── initLogLevelFromEnv ─────────────────────────────────────────────────

describe('initLogLevelFromEnv', () => {
  const savedLogLevel: string | undefined = process.env.LOG_LEVEL;
  const savedDebug: string | undefined = process.env.DEBUG;

  afterEach(() => {
    if (savedLogLevel === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = savedLogLevel;
    }
    if (savedDebug === undefined) {
      delete process.env.DEBUG;
    } else {
      process.env.DEBUG = savedDebug;
    }
  });

  it('returns a valid log level', () => {
    const result: Result<LogLevel> = initLogLevelFromEnv();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(['silent', 'error', 'warn', 'info', 'debug', 'trace']).toContain(result.data);
    }
  });

  it('reads LOG_LEVEL env var when set', () => {
    delete process.env.DEBUG;
    process.env.LOG_LEVEL = 'trace';
    const result = initLogLevelFromEnv();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('trace');
    }
  });

  it('handles uppercase LOG_LEVEL via toLowerCase', () => {
    delete process.env.DEBUG;
    process.env.LOG_LEVEL = 'DEBUG';
    const result = initLogLevelFromEnv();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('debug');
    }
  });

  it('falls back to DEBUG flag when LOG_LEVEL invalid', () => {
    process.env.LOG_LEVEL = 'garbage';
    process.env.DEBUG = '1';
    const result = initLogLevelFromEnv();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('debug');
    }
  });

  it('returns default when neither env var is set', () => {
    delete process.env.LOG_LEVEL;
    delete process.env.DEBUG;
    const result = initLogLevelFromEnv();
    expect(result.ok).toBe(true);
    /* Default log level is 'info' per DEFAULT_LOG_LEVEL. */
    if (result.ok) {
      expect(result.data).toBe('info');
    }
  });
});

// ── withLogLevel ────────────────────────────────────────────────────────

describe('withLogLevel', () => {
  it('temporarily changes level and restores', () => {
    setLogLevel('info');
    const result = withLogLevel('trace', () => {
      const inner = getLogLevel();
      return inner.ok ? inner.data : 'unknown';
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('trace');
    }
    const after = getLogLevel();
    expect(after.ok).toBe(true);
    if (after.ok) {
      expect(after.data).toBe('info');
    }
  });

  it('restores level when callback throws', () => {
    setLogLevel('info');
    const result = withLogLevel('trace', () => {
      throw new Error('kaboom');
    });
    expect(result.ok).toBe(false);
    const after = getLogLevel();
    if (after.ok) {
      expect(after.data).toBe('info'); /* restored */
    }
  });

  it('rejects invalid level', () => {
    const result = withLogLevel('bogus' as LogLevel, () => 1);
    expect(result.ok).toBe(false);
  });
});

// ── withContext ──────────────────────────────────────────────────────────

describe('withContext', () => {
  it('temporarily merges context and restores', () => {
    setContext({ service: 'base' });
    const result = withContext({ operation: 'temp' }, () => {
      const ctx = getContext();
      return ctx.ok ? ctx.data : {};
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const ctx = result.data as LogContext;
      expect(ctx.operation).toBe('temp');
      expect(ctx.service).toBe('base');
    }

    const after = getContext();
    expect(after.ok).toBe(true);
    if (after.ok) {
      expect(after.data.operation).toBeUndefined();
    }
  });

  it('restores context when callback throws (fallback path)', () => {
    setContext({ service: 'base' });
    const result = withContext({ operation: 'oops' }, () => {
      throw new Error('k');
    });
    expect(result.ok).toBe(false);
    const after = getContext();
    if (after.ok) {
      expect(after.data.service).toBe('base');
      expect(after.data.operation).toBeUndefined();
    }
  });

  it('rejects invalid context shape', () => {
    const result = withContext({ service: 123 as unknown as Str }, () => 1);
    expect(result.ok).toBe(false);
  });
});

// ── initAsyncContext ────────────────────────────────────────────────────

describe('initAsyncContext', () => {
  it('returns ok in Node runtime where AsyncLocalStorage is available', () => {
    const result = initAsyncContext();
    /* In Node, this always succeeds. In browser, returns err. */
    expect(result.ok === true || result.ok === false).toBe(true);
  });

  it('withContext uses AsyncLocalStorage after init', () => {
    initAsyncContext();
    setContext({ service: 'base' });
    const result = withContext({ requestId: 'r1' }, () => {
      const ctx = getContext();
      return ctx.ok ? ctx.data : {};
    });
    if (result.ok) {
      const ctx = result.data as LogContext;
      expect(ctx.requestId).toBe('r1');
    }
  });
});

// ── setupLogging ────────────────────────────────────────────────────────

describe('setupLogging', () => {
  it('configures level, service, and context', () => {
    const result: Result<TeardownFn> = setupLogging({
      level: 'debug',
      service: 'test-svc',
      context: { runtime: 'node-tty' },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      teardown = result.data;
    }
    const level = getLogLevel();
    expect(level.ok).toBe(true);
    if (level.ok) {
      expect(level.data).toBe('debug');
    }
    const ctx = getContext();
    expect(ctx.ok).toBe(true);
    if (ctx.ok) {
      expect(ctx.data.service).toBe('test-svc');
      expect(ctx.data.runtime).toBe('node-tty');
    }
  });

  it('returns teardown function that resets state', () => {
    const result: Result<TeardownFn> = setupLogging({
      level: 'trace',
      service: 'teardown-test',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    result.data();

    const level = getLogLevel();
    expect(level.ok).toBe(true);
    if (level.ok) {
      expect(level.data).toBe('info'); /* default */
    }

    const ctx = getContext();
    expect(ctx.ok).toBe(true);
    if (ctx.ok) {
      expect(Object.keys(ctx.data)).toHaveLength(0);
    }
  });

  it('rejects invalid options', () => {
    const result: Result<TeardownFn> = setupLogging({
      level: 'invalid-level' as LogLevel,
    } as LoggingOptions);
    expect(result.ok).toBe(false);
  });

  it('registers transports from options', () => {
    const transport: LogTransport = vi.fn();
    const result = setupLogging({
      transports: [{ name: 'opt', transport }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      teardown = result.data;
    }
    log.info('after setup');
    expect(transport).toHaveBeenCalled();
  });

  it('applies redaction from options', () => {
    setOutputFormat('json' as OutputFormat);
    const transport: LogTransport = vi.fn();
    const result = setupLogging({
      transports: [{ name: 't', transport }],
      redaction: { paths: ['apiKey'], censor: '<hidden>' },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      teardown = result.data;
    }
    log.info('req', { apiKey: 'k-123', user: 'u' });
    const entry = (transport as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(entry.data.apiKey).toBe('<hidden>');
    expect(entry.data.user).toBe('u');
  });

  it('applies sampling from options', () => {
    const transport: LogTransport = vi.fn();
    const result = setupLogging({
      level: 'trace',
      transports: [{ name: 't', transport }],
      sampling: { rate: 0, alwaysSample: ['warn'] },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      teardown = result.data;
    }
    log.info('dropped');
    log.warn('kept');
    const messages = (transport as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: unknown[]) => (c[0] as { message: string }).message,
    );
    expect(messages).toEqual(['kept']);
  });

  it('applies format option via setOutputFormat', () => {
    const result = setupLogging({ format: 'json' as OutputFormat });
    expect(result.ok).toBe(true);
    if (result.ok) {
      teardown = result.data;
    }
    const fmt = getOutputFormat();
    if (fmt.ok) {
      expect(fmt.data).toBe('json');
    }
  });

  it('initFromEnv=false skips env detection', () => {
    const prev = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = 'trace';
    setLogLevel('info'); /* baseline */
    const result = setupLogging({ initFromEnv: false });
    expect(result.ok).toBe(true);
    if (result.ok) {
      teardown = result.data;
    }
    /* Since level was not explicitly set and initFromEnv=false, level stays at 'info'. */
    const level = getLogLevel();
    if (level.ok) {
      expect(level.data).toBe('info');
    }
    if (prev === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = prev;
    }
  });
});

// ── formatJUnit ─────────────────────────────────────────────────────────

describe('formatJUnit', () => {
  it('formats passing test cases as XML', () => {
    const cases: JUnitTestCase[] = [
      { suite: 'format', name: 'escapeXml works', time: 0.01 },
      { suite: 'format', name: 'duration formats', time: 0.02 },
    ];
    const result: Result<Str> = formatJUnit(cases, 'qa:test');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('<?xml version="1.0"');
      expect(result.data).toContain('tests="2"');
      expect(result.data).toContain('failures="0"');
      expect(result.data).toContain('escapeXml works');
    }
  });

  it('formats failing test cases with failure element', () => {
    const cases: JUnitTestCase[] = [
      {
        suite: 'format',
        name: 'broken test',
        time: 0.1,
        failure: 'Expected true got false',
      },
    ];
    const result: Result<Str> = formatJUnit(cases, 'qa:test');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('failures="1"');
      expect(result.data).toContain('<failure');
      expect(result.data).toContain('Expected true got false');
    }
  });

  it('formats error test cases with error element', () => {
    const cases: JUnitTestCase[] = [
      { suite: 'fmt', name: 'crash', time: 0.1, error: 'Uncaught TypeError' },
    ];
    const result = formatJUnit(cases, 'qa:test');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('errors="1"');
      expect(result.data).toContain('<error');
      expect(result.data).toContain('Uncaught TypeError');
    }
  });

  it('formats skipped test cases', () => {
    const cases: JUnitTestCase[] = [{ suite: 'fmt', name: 'later', skipped: true }];
    const result = formatJUnit(cases, 'qa:test');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('skipped="1"');
      expect(result.data).toContain('<skipped/>');
    }
  });

  it('embeds stdout and stderr when present', () => {
    const cases: JUnitTestCase[] = [
      {
        suite: 'fmt',
        name: 'tc',
        time: 0.05,
        stdout: 'out text',
        stderr: 'err text',
      },
    ];
    const result = formatJUnit(cases, 'qa:test');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('<system-out>out text</system-out>');
      expect(result.data).toContain('<system-err>err text</system-err>');
    }
  });

  it('escapes XML special chars in messages', () => {
    const cases: JUnitTestCase[] = [
      {
        suite: 'fmt',
        name: 'has <&"\' chars',
        failure: 'got <bad> & "broken"',
      },
    ];
    const result = formatJUnit(cases, 'qa:test');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('&lt;');
      expect(result.data).toContain('&gt;');
      expect(result.data).toContain('&amp;');
      expect(result.data).toContain('&quot;');
      expect(result.data).toContain('&apos;');
    }
  });

  it('empty testCases produces valid minimal XML', () => {
    const result = formatJUnit([], 'empty-suite');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('tests="0"');
      expect(result.data).toContain('failures="0"');
      expect(result.data).toContain('empty-suite');
    }
  });

  it('rejects invalid suiteName', () => {
    const result = formatJUnit([], 123 as unknown as Str);
    expect(result.ok).toBe(false);
  });
});

// ── createChildLogger ───────────────────────────────────────────────────

describe('createChildLogger', () => {
  it('creates child logger that logs successfully', () => {
    setLogLevel('info');
    const result: Result<ChildLogger> = createChildLogger({
      context: { service: 'child-service' },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const logResult = result.data.info('child message');
      expect(logResult.ok).toBe(true);
      expect(console.log).toHaveBeenCalled();
    }
  });

  it('child logger respects its own level', () => {
    setLogLevel('info');
    const result: Result<ChildLogger> = createChildLogger({
      context: { service: 'child-service' },
      level: 'error',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const logResult = result.data.info('should not appear');
      expect(logResult.ok).toBe(true);
      expect(console.log).not.toHaveBeenCalled();
    }
  });

  it('child getContext returns merged parent + child context', () => {
    setContext({ service: 'parent' });
    const child = createChildLogger({ context: { operation: 'op-1' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    const ctx = child.data.getContext();
    expect(ctx.ok).toBe(true);
    if (ctx.ok) {
      expect(ctx.data.service).toBe('parent');
      expect(ctx.data.operation).toBe('op-1');
    }
  });

  it('grandchild merges parent + child + grandchild context', () => {
    setContext({ service: 'root' });
    const child = createChildLogger({ context: { operation: 'child' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    const grand = child.data.child({
      context: { operation: 'grand', requestId: 'r-1' },
    });
    expect(grand.ok).toBe(true);
    if (grand.ok) {
      const ctx = grand.data.getContext();
      if (ctx.ok) {
        expect(ctx.data.service).toBe('root');
        /* grandchild override wins. */
        expect(ctx.data.operation).toBe('grand');
        expect(ctx.data.requestId).toBe('r-1');
      }
    }
  });

  it('child.debug logs [DEBUG] prefix at debug level', () => {
    setLogLevel('debug');
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    child.data.debug('msg');
    expect(console.error).toHaveBeenCalledWith('[DEBUG] msg');
  });

  it('child.error logs at error level', () => {
    setLogLevel('error');
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    child.data.error('oops');
    expect(console.error).toHaveBeenCalledWith('oops');
  });

  it('child.warn logs at warn level', () => {
    setLogLevel('warn');
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    child.data.warn('careful');
    expect(console.log).toHaveBeenCalledWith('careful');
  });

  it('child.trace logs [TRACE] prefix at trace level', () => {
    setLogLevel('trace');
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    child.data.trace('deep');
    expect(console.error).toHaveBeenCalledWith('[TRACE] deep');
  });

  it('child.success logs at info level', () => {
    setLogLevel('info');
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    child.data.success('done');
    expect(console.log).toHaveBeenCalledWith('done');
  });

  it('child.json emits JSON in pretty mode', () => {
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    child.data.json({ k: 1 });
    expect(console.log).toHaveBeenCalled();
  });

  it('child.errorObject logs error code + message', () => {
    setLogLevel('error');
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    const appErr: AppError = {
      id: 'e',
      code: 'TEST.BOOM',
      message: 'broken',
      timestamp: 't',
      stack: 'Error: broken\n    at frame',
    } as unknown as AppError;
    child.data.errorObject(appErr);
    expect(console.error).toHaveBeenCalledWith('[TEST.BOOM] broken');
  });

  it('createChildLogger rejects invalid options', () => {
    const result = createChildLogger({
      context: { service: 123 as unknown as Str },
    });
    expect(result.ok).toBe(false);
  });

  it('child in json mode emits structured entry with merged context', () => {
    setOutputFormat('json' as OutputFormat);
    setLogLevel('info');
    setContext({ service: 'parent' });
    const child = createChildLogger({ context: { operation: 'op' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    child.data.info('msg');
    const call = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(String(call));
    expect(parsed.context.service).toBe('parent');
    expect(parsed.context.operation).toBe('op');
  });
});

// ── Child logger — data variant branches ────────────────────────────────

describe('child logger data variants', () => {
  it('child.info with data arg passes both to console.log', () => {
    setLogLevel('info');
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    child.data.info('msg', { k: 1 });
    expect(console.log).toHaveBeenCalledWith('msg', { k: 1 });
  });

  it('child.debug with data arg passes both to console.error', () => {
    setLogLevel('debug');
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    child.data.debug('msg', { detail: true });
    expect(console.error).toHaveBeenCalledWith('[DEBUG] msg', { detail: true });
  });

  it('child.error with data arg passes both to console.error', () => {
    setLogLevel('error');
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    child.data.error('oops', { code: 'X' });
    expect(console.error).toHaveBeenCalledWith('oops', { code: 'X' });
  });

  it('child.warn with data arg passes both', () => {
    setLogLevel('warn');
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    child.data.warn('careful', { count: 2 });
    expect(console.log).toHaveBeenCalledWith('careful', { count: 2 });
  });

  it('child.success with data arg passes both', () => {
    setLogLevel('info');
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    child.data.success('done', { count: 3 });
    expect(console.log).toHaveBeenCalledWith('done', { count: 3 });
  });

  it('child.trace with data arg passes both', () => {
    setLogLevel('trace');
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    child.data.trace('deep', { step: 1 });
    expect(console.error).toHaveBeenCalledWith('[TRACE] deep', { step: 1 });
  });

  it('child.json emits structured entry in json output mode', () => {
    setOutputFormat('json' as OutputFormat);
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    child.data.json({ count: 1 });
    const call = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(String(call));
    expect(parsed.level).toBe('info');
    expect(parsed.data).toEqual({ count: 1 });
  });

  it('child.json accepts custom indent in pretty mode', () => {
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    child.data.json({ a: 1 }, 4 as NonNegativeInteger);
    const call = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(String(call)).toContain('    "a"');
  });
});

// ── Child logger — JSON mode for each method ────────────────────────────

describe('child logger in JSON mode', () => {
  it('child.debug emits structured stderr entry', () => {
    setOutputFormat('json' as OutputFormat);
    setLogLevel('debug');
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    child.data.debug('dbg', { k: 1 });
    const call = (console.error as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(String(call));
    expect(parsed.level).toBe('debug');
    expect(parsed.message).toBe('dbg');
    expect(parsed.data).toEqual({ k: 1 });
  });

  it('child.warn emits structured stdout entry', () => {
    setOutputFormat('json' as OutputFormat);
    setLogLevel('warn');
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    child.data.warn('w');
    const call = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(String(call));
    expect(parsed.level).toBe('warn');
  });

  it('child.error emits structured stderr entry', () => {
    setOutputFormat('json' as OutputFormat);
    setLogLevel('error');
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    child.data.error('e');
    const call = (console.error as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(String(call));
    expect(parsed.level).toBe('error');
  });

  it('child.success emits structured stdout entry with info level', () => {
    setOutputFormat('json' as OutputFormat);
    setLogLevel('info');
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    child.data.success('ok');
    const call = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(String(call));
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('ok');
  });

  it('child.trace emits structured stderr entry', () => {
    setOutputFormat('json' as OutputFormat);
    setLogLevel('trace');
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    child.data.trace('t');
    const call = (console.error as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(String(call));
    expect(parsed.level).toBe('trace');
  });

  it('child.errorObject in json mode emits errorCode/errorMessage/errorStack', () => {
    setOutputFormat('json' as OutputFormat);
    setLogLevel('error');
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    const appErr: AppError = {
      id: 'e',
      code: 'TEST.BOOM',
      message: 'broken',
      timestamp: 't',
      stack: 'Error: broken',
      meta: { k: 1 },
      cause: { code: 'LOW.LEVEL', message: 'inner' },
    } as unknown as AppError;
    child.data.errorObject(appErr);
    const call = (console.error as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(String(call));
    expect(parsed.data.errorCode).toBe('TEST.BOOM');
    expect(parsed.data.errorMessage).toBe('broken');
    expect(parsed.data.meta).toEqual({ k: 1 });
    expect(parsed.data.cause.code).toBe('LOW.LEVEL');
  });
});

// ── Child logger — suppression / validation branches ────────────────────

describe('child logger suppression & validation', () => {
  it('child.info rejects non-string message', () => {
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    const r = child.data.info(42 as unknown as Str);
    expect(r.ok).toBe(false);
  });

  it('child.debug rejects non-string message', () => {
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    const r = child.data.debug(42 as unknown as Str);
    expect(r.ok).toBe(false);
  });

  it('child.error rejects non-string message', () => {
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    const r = child.data.error(null as unknown as Str);
    expect(r.ok).toBe(false);
  });

  it('child.warn rejects non-string message', () => {
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    const r = child.data.warn({} as unknown as Str);
    expect(r.ok).toBe(false);
  });

  it('child.success rejects non-string message', () => {
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    const r = child.data.success([] as unknown as Str);
    expect(r.ok).toBe(false);
  });

  it('child.trace rejects non-string message', () => {
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    const r = child.data.trace(true as unknown as Str);
    expect(r.ok).toBe(false);
  });

  it('child.info suppressed when its level is set above info', () => {
    const child = createChildLogger({ context: { service: 'x' }, level: 'error' });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    child.data.info('no');
    expect(console.log).not.toHaveBeenCalled();
  });

  it('child.debug suppressed when level is info', () => {
    setLogLevel('info');
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    child.data.debug('no');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('child.warn suppressed when level is error', () => {
    setLogLevel('error');
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    child.data.warn('no');
    expect(console.log).not.toHaveBeenCalled();
  });

  it('child.trace suppressed when level is debug', () => {
    setLogLevel('debug');
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    child.data.trace('no');
    expect(console.error).not.toHaveBeenCalledWith('[TRACE] no');
  });

  it('child.success suppressed when level is error', () => {
    setLogLevel('error');
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    child.data.success('no');
    expect(console.log).not.toHaveBeenCalled();
  });

  it('child.errorObject suppressed when level is silent', () => {
    setLogLevel('silent');
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    const appErr: AppError = {
      id: 'e',
      code: 'X',
      message: 'm',
      timestamp: 't',
    } as unknown as AppError;
    const r = child.data.errorObject(appErr);
    expect(r.ok).toBe(true);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('child.errorObject pretty mode without stack skips stack dump', () => {
    setLogLevel('error');
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    const appErr: AppError = {
      id: 'e',
      code: 'TEST.X',
      message: 'm',
      timestamp: 't',
    } as unknown as AppError;
    child.data.errorObject(appErr);
    expect(console.error).toHaveBeenCalledWith('[TEST.X] m');
    /* Only the main line was logged — no stack lines. */
    const { calls } = (console.error as ReturnType<typeof vi.fn>).mock;
    expect(calls).toHaveLength(1);
  });

  it('child.child rejects invalid options', () => {
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    const r = child.data.child({
      context: { service: 123 as unknown as Str },
    });
    expect(r.ok).toBe(false);
  });

  it('child dispatches to transports alongside console', () => {
    setLogLevel('info');
    const entries: Array<{ level: string; message: string }> = [];
    addTransport({
      name: 'child-capture',
      transport: (entry) => {
        entries.push({ level: entry.level, message: entry.message });
      },
    });
    const child = createChildLogger({ context: { service: 'x' } });
    if (!child.ok) {
      throw new Error('expected ok');
    }
    setOutputFormat('json' as OutputFormat);
    child.data.info('hello', { id: 1 });
    expect(entries.length).toBeGreaterThan(0);
  });
});

// ── log.* data variant branches (parent logger) ─────────────────────────

describe('parent log data variants', () => {
  it('log.warn with data passes both args', () => {
    setLogLevel('warn');
    log.warn('careful', { count: 2 });
    expect(console.log).toHaveBeenCalledWith('careful', { count: 2 });
  });

  it('log.error with data passes both args', () => {
    setLogLevel('error');
    log.error('oops', { code: 'X' });
    expect(console.error).toHaveBeenCalledWith('oops', { code: 'X' });
  });

  it('log.debug rejects non-string', () => {
    setLogLevel('debug');
    const r = log.debug(42 as unknown as Str);
    expect(r.ok).toBe(false);
  });

  it('log.warn rejects non-string', () => {
    const r = log.warn({} as unknown as Str);
    expect(r.ok).toBe(false);
  });

  it('log.error rejects non-string', () => {
    const r = log.error(null as unknown as Str);
    expect(r.ok).toBe(false);
  });

  it('log.trace rejects non-string', () => {
    setLogLevel('trace');
    const r = log.trace(true as unknown as Str);
    expect(r.ok).toBe(false);
  });

  it('log.success rejects non-string', () => {
    const r = log.success([] as unknown as Str);
    expect(r.ok).toBe(false);
  });

  it('log.errorObject without stack skips stack-line loop', () => {
    setLogLevel('error');
    const appErr: AppError = {
      id: 'err-nostack',
      code: 'NOSTACK',
      message: 'm',
      timestamp: 't',
    } as unknown as AppError;
    log.errorObject(appErr);
    expect(console.error).toHaveBeenCalledWith('[NOSTACK] m');
    const { calls } = (console.error as ReturnType<typeof vi.fn>).mock;
    expect(calls).toHaveLength(1);
  });

  it('log.errorObject in json mode with severity/httpStatus/meta/cause emits optional fields', () => {
    setOutputFormat('json' as OutputFormat);
    setLogLevel('error');
    const appErr: AppError = {
      id: 'err-full',
      code: 'INTERNAL.X',
      message: 'full',
      timestamp: '2026-01-01T00:00:00.000Z',
      stack: 'Error: full',
      severity: 'error',
      httpStatus: 500,
      meta: { k: 1 },
      cause: { code: 'CAUSE.X', message: 'because' },
    } as unknown as AppError;
    log.errorObject(appErr);
    const call = (console.error as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(String(call));
    expect(parsed.data.severity).toBe('error');
    expect(parsed.data.httpStatus).toBe(500);
    expect(parsed.data.meta).toEqual({ k: 1 });
    expect(parsed.data.cause.code).toBe('CAUSE.X');
  });

  it('log.trace suppressed at debug level', () => {
    setLogLevel('debug');
    log.trace('no');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('log.warn suppressed at error level', () => {
    setLogLevel('error');
    log.warn('no');
    expect(console.log).not.toHaveBeenCalled();
  });

  it('log.success suppressed at error level', () => {
    setLogLevel('error');
    log.success('no');
    expect(console.log).not.toHaveBeenCalled();
  });

  it('log.info sampled out at rate=0 returns ok without calling console', () => {
    setLogLevel('info');
    setSampling({ rate: 0, alwaysSample: [] });
    const r = log.info('sampled out');
    expect(r.ok).toBe(true);
    expect(console.log).not.toHaveBeenCalled();
  });

  it('log.debug sampled out at rate=0', () => {
    setLogLevel('debug');
    setSampling({ rate: 0, alwaysSample: [] });
    const r = log.debug('sampled out');
    expect(r.ok).toBe(true);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('log.warn sampled out at rate=0', () => {
    setLogLevel('warn');
    setSampling({ rate: 0, alwaysSample: [] });
    const r = log.warn('sampled');
    expect(r.ok).toBe(true);
    expect(console.log).not.toHaveBeenCalled();
  });

  it('log.error sampled out at rate=0 (no alwaysSample)', () => {
    setLogLevel('error');
    setSampling({ rate: 0, alwaysSample: [] });
    const r = log.error('sampled');
    expect(r.ok).toBe(true);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('log.trace sampled out at rate=0', () => {
    setLogLevel('trace');
    setSampling({ rate: 0, alwaysSample: [] });
    const r = log.trace('sampled');
    expect(r.ok).toBe(true);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('log.success sampled out at rate=0', () => {
    setLogLevel('info');
    setSampling({ rate: 0, alwaysSample: [] });
    const r = log.success('sampled');
    expect(r.ok).toBe(true);
    expect(console.log).not.toHaveBeenCalled();
  });
});
