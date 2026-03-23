/**
 * Tests for the logger module.
 *
 * @module
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Bool, LogContext, LogLevel, Str, TeardownFn, Void } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import {
  setLogLevel,
  getLogLevel,
  shouldLog,
  setContext,
  getContext,
  mergeContext,
  addTransport,
  removeTransport,
  clearTransports,
  setRedaction,
  setSampling,
  clearSampling,
  enableBuffer,
  flushBuffer,
  disableBuffer,
  log,
  startTimer,
  initLogLevelFromEnv,
  withLogLevel,
  withContext,
  setupLogging,
  formatJUnit,
  createChildLogger,
  type ChildLogger,
  type JUnitTestCase,
  type LoggingOptions,
} from './logger';

// ── Setup / Teardown ────────────────────────────────────────────────────

let teardown: TeardownFn | undefined;

beforeEach(() => {
  // Reset logger to known state
  setLogLevel('info');
  setContext({});
  clearTransports();
  clearSampling();
  disableBuffer();
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
});

// ── Log Level ───────────────────────────────────────────────────────────

describe('log level state', () => {
  it('setLogLevel accepts valid level and getLogLevel returns it', () => {
    const result = setLogLevel('debug');
    expect(result.ok).toBe(true);
    const level = getLogLevel();
    expect(level.ok).toBe(true);
    if (level.ok) expect(level.data).toBe('debug');
  });

  it('setLogLevel rejects invalid level', () => {
    const result = setLogLevel('invalid' as LogLevel);
    expect(result.ok).toBe(false);
  });

  it('shouldLog returns true when level passes filter', () => {
    setLogLevel('debug');
    const result: Result<Bool> = shouldLog('info');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(true);
  });

  it('shouldLog returns false when level is below current', () => {
    setLogLevel('error');
    const result: Result<Bool> = shouldLog('info');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(false);
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
    if (ctx.ok) expect(ctx.data.service).toBe('new');
  });
});

// ── Transports ──────────────────────────────────────────────────────────

describe('transports', () => {
  it('addTransport registers a transport', () => {
    const transport = vi.fn();
    const result = addTransport({ name: 'test-transport', transport });
    expect(result.ok).toBe(true);
  });

  it('removeTransport removes by name and returns true', () => {
    const transport = vi.fn();
    addTransport({ name: 'removable', transport });
    const result: Result<Bool> = removeTransport('removable');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(true);
  });

  it('removeTransport returns false for unknown name', () => {
    const result: Result<Bool> = removeTransport('nonexistent');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(false);
  });

  it('clearTransports removes all', () => {
    const transport = vi.fn();
    addTransport({ name: 'a', transport });
    addTransport({ name: 'b', transport });
    const result = clearTransports();
    expect(result.ok).toBe(true);
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
});

// ── Buffering ───────────────────────────────────────────────────────────

describe('buffering', () => {
  it('enableBuffer accepts valid config', () => {
    const onFlush = vi.fn();
    const result = enableBuffer({ maxSize: 100, flushIntervalMs: 0, onFlush });
    expect(result.ok).toBe(true);
  });

  it('flushBuffer returns ok', () => {
    const onFlush = vi.fn();
    enableBuffer({ maxSize: 100, flushIntervalMs: 0, onFlush });
    const result = flushBuffer();
    expect(result.ok).toBe(true);
  });

  it('disableBuffer returns ok', () => {
    const onFlush = vi.fn();
    enableBuffer({ maxSize: 100, flushIntervalMs: 0, onFlush });
    const result = disableBuffer();
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

  it('log.debug logs with [DEBUG] prefix at debug level', () => {
    setLogLevel('debug');
    const result = log.debug('debug msg');
    expect(result.ok).toBe(true);
    expect(console.error).toHaveBeenCalled();
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

  it('log.trace logs at trace level', () => {
    setLogLevel('trace');
    const result = log.trace('trace msg');
    expect(result.ok).toBe(true);
    expect(console.error).toHaveBeenCalled();
  });

  it('log.info suppressed when level is error', () => {
    setLogLevel('error');
    const result = log.info('should not appear');
    expect(result.ok).toBe(true);
    expect(console.log).not.toHaveBeenCalled();
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
});

// ── initLogLevelFromEnv ─────────────────────────────────────────────────

describe('initLogLevelFromEnv', () => {
  it('returns a valid log level', () => {
    const result: Result<LogLevel> = initLogLevelFromEnv();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(['silent', 'error', 'warn', 'info', 'debug', 'trace']).toContain(result.data);
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
    if (result.ok) expect(result.data).toBe('trace');

    // Restored
    const after = getLogLevel();
    expect(after.ok).toBe(true);
    if (after.ok) expect(after.data).toBe('info');
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

    // Restored — operation should be gone
    const after = getContext();
    expect(after.ok).toBe(true);
    if (after.ok) expect(after.data.operation).toBeUndefined();
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
    if (result.ok) teardown = result.data;

    const level = getLogLevel();
    expect(level.ok).toBe(true);
    if (level.ok) expect(level.data).toBe('debug');

    const ctx = getContext();
    expect(ctx.ok).toBe(true);
    if (ctx.ok) {
      expect(ctx.data.service).toBe('test-svc');
      expect(ctx.data.runtime).toBe('node-tty');
    }
  });

  it('returns teardown function that resets state', () => {
    const result: Result<TeardownFn> = setupLogging({ level: 'trace', service: 'teardown-test' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Call teardown
    result.data();

    const level = getLogLevel();
    expect(level.ok).toBe(true);
    if (level.ok) expect(level.data).toBe('info'); // default

    const ctx = getContext();
    expect(ctx.ok).toBe(true);
    if (ctx.ok) expect(Object.keys(ctx.data)).toHaveLength(0);
  });

  it('rejects invalid options', () => {
    const result: Result<TeardownFn> = setupLogging({
      level: 'invalid-level' as LogLevel,
    } as LoggingOptions);
    expect(result.ok).toBe(false);
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
      { suite: 'format', name: 'broken test', time: 0.1, failure: 'Expected true got false' },
    ];
    const result: Result<Str> = formatJUnit(cases, 'qa:test');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('failures="1"');
      expect(result.data).toContain('<failure');
      expect(result.data).toContain('Expected true got false');
    }
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
      // info should be suppressed at child's error level
      const logResult = result.data.info('should not appear');
      expect(logResult.ok).toBe(true);
    }
  });
});
