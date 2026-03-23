/**
 * Tests for environment detection utilities.
 *
 * @module
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Bool, ColorLevel, EnvRecordWithUndefined, RuntimeKind, Str } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import {
  getProcess,
  hasBrowserGlobals,
  hasNodeProcess,
  detectRuntime,
  detectColorLevel,
  detectRuntimeInfo,
  requireRuntime,
  detectEnvironment,
} from './environment';

// ── getProcess ──────────────────────────────────────────────────────────

describe('getProcess', () => {
  it('returns process when globalThis.process exists', () => {
    const proc = getProcess();
    expect(proc).toBeDefined();
    expect(proc).toBe(globalThis.process);
  });

  it('returns undefined when process is undefined', () => {
    const original = globalThis.process;
    // @ts-expect-error — simulating non-Node environment
    globalThis.process = undefined;
    try {
      expect(getProcess()).toBeUndefined();
    } finally {
      globalThis.process = original;
    }
  });
});

// ── hasBrowserGlobals ───────────────────────────────────────────────────

describe('hasBrowserGlobals', () => {
  it('returns a boolean result', () => {
    const result: Result<Bool> = hasBrowserGlobals();
    expect(result.ok).toBe(true);
    if (result.ok) expect(typeof result.data).toBe('boolean');
  });
});

// ── hasNodeProcess ──────────────────────────────────────────────────────

describe('hasNodeProcess', () => {
  it('returns true in Node environment', () => {
    const result: Result<Bool> = hasNodeProcess();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(true);
  });
});

// ── detectRuntime ───────────────────────────────────────────────────────

describe('detectRuntime', () => {
  it('detects node-tty or node-pipe in test environment', () => {
    const result: Result<RuntimeKind> = detectRuntime();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(['node-tty', 'node-pipe']).toContain(result.data);
    }
  });

  it('detects deno when Deno global exists', () => {
    const _g = globalThis as Record<Str, unknown>;
    _g.Deno = { version: { deno: '1.0.0' } };
    try {
      const result: Result<RuntimeKind> = detectRuntime();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data).toBe('deno');
    } finally {
      delete _g.Deno;
    }
  });

  it('detects bun when Bun global exists', () => {
    const _g = globalThis as Record<Str, unknown>;
    _g.Bun = { version: '1.0.0' };
    try {
      const result: Result<RuntimeKind> = detectRuntime();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data).toBe('bun');
    } finally {
      delete _g.Bun;
    }
  });

  it('detects edge-light when EdgeRuntime global is a string', () => {
    const _g = globalThis as Record<Str, unknown>;
    _g.EdgeRuntime = 'vercel';
    try {
      const result: Result<RuntimeKind> = detectRuntime();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data).toBe('edge-light');
    } finally {
      delete _g.EdgeRuntime;
    }
  });

  it('detects worker as fallback when no process or browser globals', () => {
    const original = globalThis.process;
    // @ts-expect-error — simulating non-Node environment
    globalThis.process = undefined;
    try {
      const result: Result<RuntimeKind> = detectRuntime();
      expect(result.ok).toBe(true);
      // Without process and without browser globals, should be 'worker'
      if (result.ok) expect(result.data).toBe('worker');
    } finally {
      globalThis.process = original;
    }
  });
});

// ── detectColorLevel ────────────────────────────────────────────────────

describe('detectColorLevel', () => {
  it('returns 0 when NO_COLOR is set', () => {
    const result: Result<ColorLevel> = detectColorLevel({ NO_COLOR: '1' }, true, false);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(0);
  });

  it('returns 0 when FORCE_COLOR=0', () => {
    const result: Result<ColorLevel> = detectColorLevel({ FORCE_COLOR: '0' }, true, false);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(0);
  });

  it('returns 1 when FORCE_COLOR=1', () => {
    const result: Result<ColorLevel> = detectColorLevel({ FORCE_COLOR: '1' }, false, false);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(1);
  });

  it('returns 1 when FORCE_COLOR is empty string', () => {
    const result: Result<ColorLevel> = detectColorLevel({ FORCE_COLOR: '' }, false, false);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(1);
  });

  it('returns 2 when FORCE_COLOR=2', () => {
    const result: Result<ColorLevel> = detectColorLevel({ FORCE_COLOR: '2' }, false, false);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(2);
  });

  it('returns 3 when FORCE_COLOR=3', () => {
    const result: Result<ColorLevel> = detectColorLevel({ FORCE_COLOR: '3' }, false, false);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(3);
  });

  it('returns 0 for non-TTY non-CI', () => {
    const result: Result<ColorLevel> = detectColorLevel({}, false, false);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(0);
  });

  it('returns 3 for COLORTERM=truecolor', () => {
    const result: Result<ColorLevel> = detectColorLevel({ COLORTERM: 'truecolor' }, true, false);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(3);
  });

  it('returns 3 for COLORTERM=24bit', () => {
    const result: Result<ColorLevel> = detectColorLevel({ COLORTERM: '24bit' }, true, false);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(3);
  });

  it('returns 2 for TERM=xterm-256color', () => {
    const result: Result<ColorLevel> = detectColorLevel({ TERM: 'xterm-256color' }, true, false);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(2);
  });

  it('returns 1 for CI with GITHUB_ACTIONS', () => {
    const result: Result<ColorLevel> = detectColorLevel(
      { CI: 'true', GITHUB_ACTIONS: 'true' },
      false,
      true,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(1);
  });

  it('returns 0 for unknown CI', () => {
    const result: Result<ColorLevel> = detectColorLevel({ CI: 'true' }, false, true);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(0);
  });

  it('returns 1 for TTY fallback', () => {
    const result: Result<ColorLevel> = detectColorLevel({}, true, false);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(1);
  });
});

// ── detectRuntimeInfo ───────────────────────────────────────────────────

describe('detectRuntimeInfo', () => {
  it('returns runtime kind with version in Node environment', () => {
    const result = detectRuntimeInfo();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBeDefined();
      // In Node test env, version should be defined
      expect(result.data.version).toBeDefined();
    }
  });

  it('returns undefined version for non-versioned runtimes', () => {
    // Simulate worker runtime by removing process
    const original = globalThis.process;
    // @ts-expect-error — simulating non-Node
    globalThis.process = undefined;
    try {
      const result = detectRuntimeInfo();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.name).toBe('worker');
        expect(result.data.version).toBeUndefined();
      }
    } finally {
      globalThis.process = original;
    }
  });
});

// ── requireRuntime ──────────────────────────────────────────────────────

describe('requireRuntime', () => {
  it('returns RUNTIME.UNSUPPORTED error with function name and runtime', () => {
    const result = requireRuntime('readFile', 'node');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toContain('RUNTIME');
      expect(result.error.meta).toBeDefined();
      expect(result.error.meta!.function).toBe('readFile');
      expect(result.error.meta!.requires).toBe('node');
    }
  });

  it('returns validation error for invalid runtime value', () => {
    const result = requireRuntime('test', 'invalid-runtime' as never);
    expect(result.ok).toBe(false);
  });
});

// ── detectEnvironment ───────────────────────────────────────────────────

describe('detectEnvironment', () => {
  it('returns EnvironmentConfig with all expected fields', () => {
    const result = detectEnvironment();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.data.isTTY).toBe('boolean');
      expect(typeof result.data.isCI).toBe('boolean');
      expect(typeof result.data.isNode).toBe('boolean');
      expect(typeof result.data.colorLevel).toBe('number');
      expect(result.data.nodeVersion).toBeDefined();
    }
  });

  it('detects isVitest in test environment', () => {
    const result = detectEnvironment();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.isVitest).toBe(true);
    }
  });

  it('detects isNode in Node environment', () => {
    const result = detectEnvironment();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.isNode).toBe(true);
    }
  });
});
