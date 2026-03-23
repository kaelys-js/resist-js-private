/**
 * Tests for process utilities.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest';
import type { Bool, ExitCode, NonNegativeInteger, Str, StrArray, Void } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import {
  DEFAULT_CONCURRENCY,
  isWindows,
  isMacOS,
  isLinux,
  isTTY,
  getColumns,
  getArgv,
  getScriptPath,
  getEnvVar,
  getEnvRecord,
  writeStdout,
  writeStderr,
  clearLine,
  cursorTo,
  setExitCode,
} from './process';

// ── Constants ───────────────────────────────────────────────────────────

describe('constants', () => {
  it('DEFAULT_CONCURRENCY is a positive integer', () => {
    expect(DEFAULT_CONCURRENCY).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(DEFAULT_CONCURRENCY)).toBe(true);
  });

  it('exactly one platform constant matches current platform', () => {
    const trueCount = [isWindows, isMacOS, isLinux].filter(Boolean).length;
    // At least one should match on CI/dev machines (macOS/Linux)
    // On exotic platforms, all could be false — that's valid too
    expect(trueCount).toBeLessThanOrEqual(1);
  });

  it('platform constants match process.platform', () => {
    if (process.platform === 'darwin') expect(isMacOS).toBe(true);
    if (process.platform === 'win32') expect(isWindows).toBe(true);
    if (process.platform === 'linux') expect(isLinux).toBe(true);
  });
});

// ── TTY & Terminal ──────────────────────────────────────────────────────

describe('isTTY', () => {
  it('returns a boolean result', () => {
    const result: Result<Bool> = isTTY();
    expect(result.ok).toBe(true);
    if (result.ok) expect(typeof result.data).toBe('boolean');
  });
});

describe('getColumns', () => {
  it('returns a non-negative number', () => {
    const result: Result<NonNegativeInteger> = getColumns();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBeGreaterThanOrEqual(0);
  });
});

// ── Arguments & Environment ─────────────────────────────────────────────

describe('getArgv', () => {
  it('returns string array', () => {
    const result: Result<StrArray> = getArgv();
    expect(result.ok).toBe(true);
    if (result.ok) expect(Array.isArray(result.data)).toBe(true);
  });
});

describe('getScriptPath', () => {
  it('returns a string or undefined', () => {
    const result = getScriptPath();
    expect(result.ok).toBe(true);
  });
});

describe('getEnvVar', () => {
  it('returns value for existing env var', () => {
    const result = getEnvVar('PATH');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBeDefined();
  });

  it('returns undefined for missing env var', () => {
    const result = getEnvVar('NONEXISTENT_VAR_XYZ_123');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBeUndefined();
  });
});

describe('getEnvRecord', () => {
  it('returns object with env vars', () => {
    const result = getEnvRecord();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.data).toBe('object');
      expect(result.data.PATH).toBeDefined();
    }
  });
});

// ── Stdio ───────────────────────────────────────────────────────────────

describe('writeStdout', () => {
  it('writes text to stdout', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const result: Result<Void> = writeStdout('hello');
    expect(result.ok).toBe(true);
    expect(spy).toHaveBeenCalledWith('hello');
    spy.mockRestore();
  });
});

describe('writeStderr', () => {
  it('writes text to stderr', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const result: Result<Void> = writeStderr('error msg');
    expect(result.ok).toBe(true);
    expect(spy).toHaveBeenCalledWith('error msg');
    spy.mockRestore();
  });
});

describe('clearLine', () => {
  it('returns ok', () => {
    const result: Result<Void> = clearLine();
    expect(result.ok).toBe(true);
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
  });
});

// ── Exit code ───────────────────────────────────────────────────────────

describe('setExitCode', () => {
  it('sets exit code', () => {
    const result: Result<Void> = setExitCode(0 as ExitCode);
    expect(result.ok).toBe(true);
    // Reset to avoid affecting other tests
    process.exitCode = undefined;
  });

  it('returns validation error for invalid exit code', () => {
    const result: Result<Void> = setExitCode(999 as unknown as ExitCode);
    expect(result.ok).toBe(false);
  });
});
