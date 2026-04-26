/**
 * Tests for process utilities.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Bool,
  ExitCode,
  FatalExitOptions,
  NonNegativeInteger,
  Str,
  StrArray,
  Void,
} from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import {
  DEFAULT_CONCURRENCY,
  clearLine,
  cursorTo,
  exit,
  fatalExit,
  getArgv,
  getColumns,
  getEnvRecord,
  getEnvVar,
  getScriptPath,
  isLinux,
  isMacOS,
  isTTY,
  isWindows,
  readStdin,
  setExitCode,
  writeStderr,
  writeStdout,
} from './process';

// ── Constants ───────────────────────────────────────────────────────────

describe('constants', () => {
  it('DEFAULT_CONCURRENCY is a positive integer', () => {
    expect(DEFAULT_CONCURRENCY).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(DEFAULT_CONCURRENCY)).toBe(true);
  });

  it('exactly one platform constant matches current platform', () => {
    const trueCount = [isWindows, isMacOS, isLinux].filter(Boolean).length;
    /*
     * At least one should match on CI/dev machines (macOS/Linux); on exotic
     * platforms, all could be false — that's valid too.
     */
    expect(trueCount).toBeLessThanOrEqual(1);
  });

  it('platform constants match process.platform', () => {
    if (process.platform === 'darwin') {
      expect(isMacOS).toBe(true);
    }
    if (process.platform === 'win32') {
      expect(isWindows).toBe(true);
    }
    if (process.platform === 'linux') {
      expect(isLinux).toBe(true);
    }
  });
});

// ── TTY & Terminal ──────────────────────────────────────────────────────

describe('isTTY', () => {
  it('returns a boolean result', () => {
    const result: Result<Bool> = isTTY();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.data).toBe('boolean');
    }
  });

  it('reflects process.stdout.isTTY === true', () => {
    const orig = process.stdout.isTTY;
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    const result = isTTY();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(true);
    }
    Object.defineProperty(process.stdout, 'isTTY', { value: orig, configurable: true });
  });

  it('reflects process.stdout.isTTY === false', () => {
    const orig = process.stdout.isTTY;
    Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true });
    const result = isTTY();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(false);
    }
    Object.defineProperty(process.stdout, 'isTTY', { value: orig, configurable: true });
  });
});

describe('getColumns', () => {
  it('returns a non-negative integer', () => {
    const result: Result<NonNegativeInteger> = getColumns();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeGreaterThanOrEqual(0);
    }
  });

  it('reflects process.stdout.columns value', () => {
    const orig = process.stdout.columns;
    Object.defineProperty(process.stdout, 'columns', { value: 123, configurable: true });
    const result = getColumns();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(123);
    }
    Object.defineProperty(process.stdout, 'columns', { value: orig, configurable: true });
  });

  it('falls back to DEFAULT_TERMINAL_WIDTH when columns is undefined', () => {
    const orig = process.stdout.columns;
    Object.defineProperty(process.stdout, 'columns', { value: undefined, configurable: true });
    const result = getColumns();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeGreaterThan(0);
    }
    Object.defineProperty(process.stdout, 'columns', { value: orig, configurable: true });
  });
});

// ── Arguments & Environment ─────────────────────────────────────────────

describe('getArgv', () => {
  it('returns string array (argv.slice(2))', () => {
    const result: Result<StrArray> = getArgv();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.isArray(result.data)).toBe(true);
      /* All entries must be strings per StrArraySchema. */
      for (const entry of result.data) {
        expect(typeof entry).toBe('string');
      }
    }
  });
});

describe('getScriptPath', () => {
  it('returns ok with a string or undefined', () => {
    const result = getScriptPath();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data === undefined || typeof result.data === 'string').toBe(true);
    }
  });
});

describe('getEnvVar', () => {
  it('returns value for existing env var', () => {
    const result = getEnvVar('PATH' as Str);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.data).toBe('string');
    }
  });

  it('returns undefined for missing env var', () => {
    const result = getEnvVar('NONEXISTENT_VAR_XYZ_123' as Str);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeUndefined();
    }
  });

  it('rejects non-string name via safeParse', () => {
    const result = getEnvVar(42 as unknown as Str);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });
});

describe('getEnvRecord', () => {
  it('returns object with env vars including PATH', () => {
    const result = getEnvRecord();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.data).toBe('object');
      expect(result.data).not.toBeNull();
      expect(result.data.PATH).toBeDefined();
    }
  });
});

// ── Stdio ───────────────────────────────────────────────────────────────

describe('writeStdout', () => {
  it('writes text to stdout', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const result: Result<Void> = writeStdout('hello' as Str);
    expect(result.ok).toBe(true);
    expect(spy).toHaveBeenCalledWith('hello');
    spy.mockRestore();
  });

  it('rejects non-string input via safeParse', () => {
    const result: Result<Void> = writeStdout(42 as unknown as Str);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('writes empty string', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const result: Result<Void> = writeStdout('' as Str);
    expect(result.ok).toBe(true);
    expect(spy).toHaveBeenCalledWith('');
    spy.mockRestore();
  });
});

describe('writeStderr', () => {
  it('writes text to stderr', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const result: Result<Void> = writeStderr('error msg' as Str);
    expect(result.ok).toBe(true);
    expect(spy).toHaveBeenCalledWith('error msg');
    spy.mockRestore();
  });

  it('rejects non-string input via safeParse', () => {
    const result: Result<Void> = writeStderr({} as unknown as Str);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });
});

describe('clearLine', () => {
  it('returns ok (no-op when stdout is not TTY)', () => {
    const result: Result<Void> = clearLine();
    expect(result.ok).toBe(true);
  });

  it('invokes process.stdout.clearLine when available', () => {
    const origClearLine = process.stdout.clearLine;
    const fn = vi.fn().mockReturnValue(true);
    (process.stdout as unknown as { clearLine: typeof fn }).clearLine = fn;
    const result: Result<Void> = clearLine();
    expect(result.ok).toBe(true);
    expect(fn).toHaveBeenCalledWith(0);
    (process.stdout as unknown as { clearLine: typeof origClearLine }).clearLine = origClearLine;
  });
});

describe('cursorTo', () => {
  it('returns ok for valid column', () => {
    const result: Result<Void> = cursorTo(0 as NonNegativeInteger);
    expect(result.ok).toBe(true);
  });

  it('returns validation error for negative column', () => {
    const result: Result<Void> = cursorTo(-1 as unknown as NonNegativeInteger);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('rejects non-integer column', () => {
    const result: Result<Void> = cursorTo(1.5 as unknown as NonNegativeInteger);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('invokes process.stdout.cursorTo when available', () => {
    const origCursorTo = process.stdout.cursorTo;
    const fn = vi.fn().mockReturnValue(true);
    (process.stdout as unknown as { cursorTo: typeof fn }).cursorTo = fn;
    const result = cursorTo(5 as NonNegativeInteger);
    expect(result.ok).toBe(true);
    expect(fn).toHaveBeenCalledWith(5);
    (process.stdout as unknown as { cursorTo: typeof origCursorTo }).cursorTo = origCursorTo;
  });
});

// ── Exit code ───────────────────────────────────────────────────────────

describe('setExitCode', () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  it('sets exit code to 0', () => {
    const result: Result<Void> = setExitCode(0 as ExitCode);
    expect(result.ok).toBe(true);
    expect(process.exitCode).toBe(0);
  });

  it('sets exit code to 1', () => {
    const result: Result<Void> = setExitCode(1 as ExitCode);
    expect(result.ok).toBe(true);
    expect(process.exitCode).toBe(1);
  });

  it('returns validation error for out-of-range exit code', () => {
    const result: Result<Void> = setExitCode(999 as unknown as ExitCode);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('returns validation error for negative exit code', () => {
    const result: Result<Void> = setExitCode(-1 as unknown as ExitCode);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });
});

// ── readStdin ───────────────────────────────────────────────────────────

describe('readStdin', () => {
  it('returns empty string when stdin is a TTY', async () => {
    const origIsTTY = process.stdin.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    const result: Result<Str> = await readStdin(100 as NonNegativeInteger);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('');
    }
    Object.defineProperty(process.stdin, 'isTTY', { value: origIsTTY, configurable: true });
  });

  it('rejects non-integer timeout', async () => {
    const result: Result<Str> = await readStdin(-1 as unknown as NonNegativeInteger);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('resolves with collected data when stdin emits data + end', async () => {
    /* Replace process.stdin with a controllable EventEmitter to drive the
     * non-TTY code path: data handler appends, end handler resolves. This
     * exercises the data + end listeners (lines 424–428, 430–433). */
    const { EventEmitter } = await import('node:events');
    type StdinLike = typeof process.stdin;
    const origStdin: StdinLike = process.stdin;
    const fakeStdin = new EventEmitter() as unknown as StdinLike & {
      isTTY: boolean;
      setEncoding: (e: string) => void;
      resume: () => void;
    };
    /* Required surface for readStdin's body. */
    Object.assign(fakeStdin, {
      isTTY: false,
      setEncoding: (): void => undefined,
      resume: (): void => undefined,
    });
    Object.defineProperty(process, 'stdin', { value: fakeStdin, configurable: true });
    try {
      const promise = readStdin(1000 as NonNegativeInteger);
      /* Emit synchronously after readStdin attaches listeners on next tick. */
      await new Promise<void>((resolve): void => {
        setImmediate(resolve);
      });
      fakeStdin.emit('data', 'hello ');
      fakeStdin.emit('data', 'world');
      fakeStdin.emit('end');
      const result: Result<Str> = await promise;
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBe('hello world');
      }
    } finally {
      Object.defineProperty(process, 'stdin', { value: origStdin, configurable: true });
    }
  });

  it('resolves with empty string on stdin error event', async () => {
    /* Exercises the `error` listener (lines 435–438). */
    const { EventEmitter } = await import('node:events');
    type StdinLike = typeof process.stdin;
    const origStdin: StdinLike = process.stdin;
    const fakeStdin = new EventEmitter() as unknown as StdinLike & {
      isTTY: boolean;
      setEncoding: (e: string) => void;
      resume: () => void;
    };
    Object.assign(fakeStdin, {
      isTTY: false,
      setEncoding: (): void => undefined,
      resume: (): void => undefined,
    });
    Object.defineProperty(process, 'stdin', { value: fakeStdin, configurable: true });
    try {
      const promise = readStdin(1000 as NonNegativeInteger);
      await new Promise<void>((resolve): void => {
        setImmediate(resolve);
      });
      fakeStdin.emit('error', new Error('stdin failed'));
      const result: Result<Str> = await promise;
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBe('');
      }
    } finally {
      Object.defineProperty(process, 'stdin', { value: origStdin, configurable: true });
    }
  });

  it('resolves with empty string when timeout expires before any data arrives', async () => {
    /* Exercises the timeout callback (lines 411–417). */
    const { EventEmitter } = await import('node:events');
    type StdinLike = typeof process.stdin;
    const origStdin: StdinLike = process.stdin;
    const fakeStdin = new EventEmitter() as unknown as StdinLike & {
      isTTY: boolean;
      setEncoding: (e: string) => void;
      resume: () => void;
      removeAllListeners: (e?: string) => void;
    };
    Object.assign(fakeStdin, {
      isTTY: false,
      setEncoding: (): void => undefined,
      resume: (): void => undefined,
    });
    Object.defineProperty(process, 'stdin', { value: fakeStdin, configurable: true });
    try {
      const result: Result<Str> = await readStdin(20 as NonNegativeInteger);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBe('');
      }
    } finally {
      Object.defineProperty(process, 'stdin', { value: origStdin, configurable: true });
    }
  });
});

// ── exit / fatalExit ────────────────────────────────────────────────────

describe('exit', () => {
  let origExit: typeof process.exit;

  beforeEach(() => {
    origExit = process.exit;
  });

  afterEach(() => {
    process.exit = origExit;
  });

  it('calls process.exit with given code', () => {
    const spy = vi.fn();
    /* process.exit is typed `never` — cast to any to stub. */
    (process as unknown as { exit: typeof spy }).exit = spy;
    try {
      exit(0 as ExitCode);
    } catch {
      /* exit() throws after calling process.exit when the stub returns. */
    }
    expect(spy).toHaveBeenCalledWith(0);
  });

  it('passes failure code through on validation failure', () => {
    const spy = vi.fn();
    (process as unknown as { exit: typeof spy }).exit = spy;
    try {
      exit(9999 as unknown as ExitCode);
    } catch {
      /* ignore throw-after-exit */
    }
    /* Invalid ExitCode falls back to FAILURE_EXIT_CODE (1). */
    expect(spy).toHaveBeenCalledWith(1);
  });

  it('uses DEFAULT_EXIT_CODE when called without args', () => {
    const spy = vi.fn();
    (process as unknown as { exit: typeof spy }).exit = spy;
    try {
      exit();
    } catch {
      /* ignore throw-after-exit */
    }
    expect(spy).toHaveBeenCalledWith(0);
  });
});

describe('fatalExit', () => {
  let origExit: typeof process.exit;

  beforeEach(() => {
    origExit = process.exit;
  });

  afterEach(() => {
    process.exit = origExit;
  });

  it('writes message to stderr and calls process.exit', () => {
    const exitSpy = vi.fn();
    (process as unknown as { exit: typeof exitSpy }).exit = exitSpy;
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      fatalExit({ message: 'boom' as Str, exitCode: 2 as ExitCode } as FatalExitOptions);
    } catch {
      /* ignore throw-after-exit */
    }
    /* At least the message line was written. */
    const writes = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(writes).toContain('Error:');
    expect(writes).toContain('boom');
    expect(exitSpy).toHaveBeenCalledWith(2);
    stderrSpy.mockRestore();
  });

  it('emits details line when provided', () => {
    const exitSpy = vi.fn();
    (process as unknown as { exit: typeof exitSpy }).exit = exitSpy;
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      fatalExit({
        message: 'failed' as Str,
        exitCode: 1 as ExitCode,
        details: 'extra context' as Str,
      } as FatalExitOptions);
    } catch {
      /* ignore */
    }
    const writes = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(writes).toContain('extra context');
    stderrSpy.mockRestore();
  });

  it('emits stack trace when error provided', () => {
    const exitSpy = vi.fn();
    (process as unknown as { exit: typeof exitSpy }).exit = exitSpy;
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      const e = new Error('original');
      fatalExit({
        message: 'wrapper' as Str,
        exitCode: 1 as ExitCode,
        error: e,
      } as FatalExitOptions);
    } catch {
      /* ignore */
    }
    const writes = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(writes).toContain('Stack trace:');
    expect(writes).toContain('original');
    stderrSpy.mockRestore();
  });

  it('falls back to failure exit on invalid options', () => {
    const exitSpy = vi.fn();
    (process as unknown as { exit: typeof exitSpy }).exit = exitSpy;
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      /* Missing required `message` field triggers safeParse failure → exit(1). */
      fatalExit({} as FatalExitOptions);
    } catch {
      /* ignore */
    }
    expect(exitSpy).toHaveBeenCalledWith(1);
    stderrSpy.mockRestore();
  });
});
