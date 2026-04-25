/**
 * Tests for environment detection utilities.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import type { Bool, ColorLevel, RuntimeKind, Str } from '@/schemas/common';
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
    if (result.ok) {
      expect(typeof result.data).toBe('boolean');
    }
  });
});

// ── hasNodeProcess ──────────────────────────────────────────────────────

describe('hasNodeProcess', () => {
  it('returns true in Node environment', () => {
    const result: Result<Bool> = hasNodeProcess();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(true);
    }
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
      if (result.ok) {
        expect(result.data).toBe('deno');
      }
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
      if (result.ok) {
        expect(result.data).toBe('bun');
      }
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
      if (result.ok) {
        expect(result.data).toBe('edge-light');
      }
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
      if (result.ok) {
        expect(result.data).toBe('worker');
      }
    } finally {
      globalThis.process = original;
    }
  });

  it('detects fastly when fastly global exists', () => {
    const _g = globalThis as Record<Str, unknown>;
    _g.fastly = {};
    try {
      const result: Result<RuntimeKind> = detectRuntime();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBe('fastly');
      }
    } finally {
      delete _g.fastly;
    }
  });

  it('detects netlify when Netlify global exists', () => {
    const _g = globalThis as Record<Str, unknown>;
    _g.Netlify = {};
    try {
      const result: Result<RuntimeKind> = detectRuntime();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBe('netlify');
      }
    } finally {
      delete _g.Netlify;
    }
  });

  it('detects node-pipe when stdout is not TTY', () => {
    // Vitest runs tests with stdout as pipe, not TTY
    const origTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: false });
    try {
      const result: Result<RuntimeKind> = detectRuntime();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBe('node-pipe');
      }
    } finally {
      Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: origTTY });
    }
  });

  it('detects node-tty when stdout is TTY', () => {
    const origTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: true });
    try {
      const result: Result<RuntimeKind> = detectRuntime();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBe('node-tty');
      }
    } finally {
      Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: origTTY });
    }
  });
});

// ── detectColorLevel ────────────────────────────────────────────────────

describe('detectColorLevel', () => {
  it('returns 0 when NO_COLOR is set', () => {
    const result: Result<ColorLevel> = detectColorLevel({ NO_COLOR: '1' }, true, false);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(0);
    }
  });

  it('returns 0 when FORCE_COLOR=0', () => {
    const result: Result<ColorLevel> = detectColorLevel({ FORCE_COLOR: '0' }, true, false);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(0);
    }
  });

  it('returns 1 when FORCE_COLOR=1', () => {
    const result: Result<ColorLevel> = detectColorLevel({ FORCE_COLOR: '1' }, false, false);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(1);
    }
  });

  it('returns 1 when FORCE_COLOR is empty string', () => {
    const result: Result<ColorLevel> = detectColorLevel({ FORCE_COLOR: '' }, false, false);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(1);
    }
  });

  it('returns 2 when FORCE_COLOR=2', () => {
    const result: Result<ColorLevel> = detectColorLevel({ FORCE_COLOR: '2' }, false, false);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(2);
    }
  });

  it('returns 3 when FORCE_COLOR=3', () => {
    const result: Result<ColorLevel> = detectColorLevel({ FORCE_COLOR: '3' }, false, false);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(3);
    }
  });

  it('returns 0 for non-TTY non-CI', () => {
    const result: Result<ColorLevel> = detectColorLevel({}, false, false);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(0);
    }
  });

  it('returns 3 for COLORTERM=truecolor', () => {
    const result: Result<ColorLevel> = detectColorLevel({ COLORTERM: 'truecolor' }, true, false);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(3);
    }
  });

  it('returns 3 for COLORTERM=24bit', () => {
    const result: Result<ColorLevel> = detectColorLevel({ COLORTERM: '24bit' }, true, false);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(3);
    }
  });

  it('returns 2 for TERM=xterm-256color', () => {
    const result: Result<ColorLevel> = detectColorLevel({ TERM: 'xterm-256color' }, true, false);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(2);
    }
  });

  it('returns 1 for CI with GITHUB_ACTIONS', () => {
    const result: Result<ColorLevel> = detectColorLevel(
      { CI: 'true', GITHUB_ACTIONS: 'true' },
      false,
      true,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(1);
    }
  });

  it('returns 0 for unknown CI', () => {
    const result: Result<ColorLevel> = detectColorLevel({ CI: 'true' }, false, true);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(0);
    }
  });

  it('returns 1 for TTY fallback', () => {
    const result: Result<ColorLevel> = detectColorLevel({}, true, false);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(1);
    }
  });

  it('returns 1 for CI with TRAVIS', () => {
    const result: Result<ColorLevel> = detectColorLevel(
      { CI: 'true', TRAVIS: 'true' },
      false,
      true,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(1);
    }
  });

  it('returns 1 for CI with CIRCLECI', () => {
    const result: Result<ColorLevel> = detectColorLevel(
      { CI: 'true', CIRCLECI: 'true' },
      false,
      true,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(1);
    }
  });

  it('returns 1 for CI with GITLAB_CI', () => {
    const result: Result<ColorLevel> = detectColorLevel(
      { CI: 'true', GITLAB_CI: 'true' },
      false,
      true,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(1);
    }
  });

  it('returns 1 for CI with BUILDKITE', () => {
    const result: Result<ColorLevel> = detectColorLevel(
      { CI: 'true', BUILDKITE: 'true' },
      false,
      true,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(1);
    }
  });

  it('returns 1 for CI with DRONE', () => {
    const result: Result<ColorLevel> = detectColorLevel({ CI: 'true', DRONE: 'true' }, false, true);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(1);
    }
  });

  it('returns 1 for CI with APPVEYOR', () => {
    const result: Result<ColorLevel> = detectColorLevel(
      { CI: 'true', APPVEYOR: 'true' },
      false,
      true,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(1);
    }
  });

  it('returns 1 for CI with CODEBUILD_BUILD_ARN', () => {
    const result: Result<ColorLevel> = detectColorLevel(
      { CI: 'true', CODEBUILD_BUILD_ARN: 'arn:...' },
      false,
      true,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(1);
    }
  });

  it('returns 1 for CI with TEAMCITY_VERSION', () => {
    const result: Result<ColorLevel> = detectColorLevel(
      { CI: 'true', TEAMCITY_VERSION: '2023.1' },
      false,
      true,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(1);
    }
  });

  it('returns 2 for TERM=screen-256color', () => {
    const result: Result<ColorLevel> = detectColorLevel({ TERM: 'screen-256color' }, true, false);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(2);
    }
  });

  it('returns 0 for non-TTY without CI and no FORCE_COLOR', () => {
    // env with TERM but no TTY and no CI — should still hit the early non-TTY branch
    const result: Result<ColorLevel> = detectColorLevel({ TERM: 'dumb' }, false, false);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(0);
    }
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

  it('returns deno version when Deno global exposes version', () => {
    const _g = globalThis as Record<Str, unknown>;
    _g.Deno = { version: { deno: '1.2.3' } };
    try {
      const result = detectRuntimeInfo();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.name).toBe('deno');
        expect(result.data.version).toBe('1.2.3');
      }
    } finally {
      delete _g.Deno;
    }
  });

  it('returns bun version when Bun global exposes version', () => {
    const _g = globalThis as Record<Str, unknown>;
    _g.Bun = { version: '1.1.0' };
    try {
      const result = detectRuntimeInfo();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.name).toBe('bun');
        expect(result.data.version).toBe('1.1.0');
      }
    } finally {
      delete _g.Bun;
    }
  });

  it('returns undefined version for deno without version info', () => {
    const _g = globalThis as Record<Str, unknown>;
    _g.Deno = {};
    try {
      const result = detectRuntimeInfo();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.name).toBe('deno');
        expect(result.data.version).toBeUndefined();
      }
    } finally {
      delete _g.Deno;
    }
  });

  it('returns undefined version for bun without version info', () => {
    const _g = globalThis as Record<Str, unknown>;
    _g.Bun = {};
    try {
      const result = detectRuntimeInfo();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.name).toBe('bun');
        expect(result.data.version).toBeUndefined();
      }
    } finally {
      delete _g.Bun;
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

  it('accepts empty function name (StrSchema has no min-length guard)', () => {
    // StrSchema = v.string() allows empty strings; requireRuntime only
    // validates the string type and then returns RUNTIME.UNSUPPORTED.
    const result = requireRuntime('' as Str, 'node');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('RUNTIME.UNSUPPORTED');
    }
  });

  it('returns validation error for non-string function name', () => {
    const result = requireRuntime(123 as unknown as Str, 'node');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
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

  it('populates nodeMajorVersion as integer', () => {
    const result = detectEnvironment();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.data.nodeMajorVersion).toBe('number');
      expect(Number.isInteger(result.data.nodeMajorVersion!)).toBe(true);
      expect(result.data.nodeMajorVersion).toBeGreaterThan(0);
    }
  });

  it('detects NO_COLOR / FORCE_COLOR env flags', () => {
    const origNoColor = process.env.NO_COLOR;
    process.env.NO_COLOR = '1';
    try {
      const result = detectEnvironment();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.noColor).toBe(true);
      }
    } finally {
      if (origNoColor === undefined) {
        delete process.env.NO_COLOR;
      } else {
        process.env.NO_COLOR = origNoColor;
      }
    }
  });

  it('isMacOS true on darwin', () => {
    // process.platform is read-only; just check it reflects reality
    const result = detectEnvironment();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.isMacOS).toBe(process.platform === 'darwin');
      expect(result.data.isWindows).toBe(process.platform === 'win32');
      expect(result.data.isLinux).toBe(process.platform === 'linux');
    }
  });

  it('detects isDocker from DOCKER env var', () => {
    const orig = process.env.DOCKER;
    process.env.DOCKER = '1';
    try {
      const result = detectEnvironment();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.isDocker).toBe(true);
      }
    } finally {
      if (orig === undefined) {
        delete process.env.DOCKER;
      } else {
        process.env.DOCKER = orig;
      }
    }
  });

  it('detects isDocker from container env var', () => {
    const origDocker = process.env.DOCKER;
    const origContainer = process.env.container;
    delete process.env.DOCKER;
    process.env.container = 'podman';
    try {
      const result = detectEnvironment();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.isDocker).toBe(true);
      }
    } finally {
      if (origDocker === undefined) {
        delete process.env.DOCKER;
      } else {
        process.env.DOCKER = origDocker;
      }
      if (origContainer === undefined) {
        delete process.env.container;
      } else {
        process.env.container = origContainer;
      }
    }
  });

  it('detects isSSH from SSH_CONNECTION', () => {
    const orig = process.env.SSH_CONNECTION;
    process.env.SSH_CONNECTION = '1.2.3.4 1234 5.6.7.8 22';
    try {
      const result = detectEnvironment();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.isSSH).toBe(true);
      }
    } finally {
      if (orig === undefined) {
        delete process.env.SSH_CONNECTION;
      } else {
        process.env.SSH_CONNECTION = orig;
      }
    }
  });

  it('detects isTest from NODE_ENV=test', () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      const result = detectEnvironment();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.isTest).toBe(true);
      }
    } finally {
      if (orig === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = orig;
      }
    }
  });

  it('detects isProduction from NODE_ENV=production', () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const result = detectEnvironment();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.isProduction).toBe(true);
      }
    } finally {
      if (orig === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = orig;
      }
    }
  });

  it('detects isDevelopment from NODE_ENV=development', () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      const result = detectEnvironment();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.isDevelopment).toBe(true);
      }
    } finally {
      if (orig === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = orig;
      }
    }
  });

  it('detects isDevelopment from NODE_ENV=dev', () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = 'dev';
    try {
      const result = detectEnvironment();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.isDevelopment).toBe(true);
      }
    } finally {
      if (orig === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = orig;
      }
    }
  });

  it('detects capacitor platform when Capacitor global exists', () => {
    const _g = globalThis as Record<Str, unknown>;
    _g.Capacitor = { getPlatform: () => 'ios' };
    try {
      const result = detectEnvironment();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.isCapacitor).toBe(true);
        expect(result.data.isIOS).toBe(true);
        expect(result.data.capacitorPlatform).toBe('ios');
      }
    } finally {
      delete _g.Capacitor;
    }
  });

  it('detects capacitor platform android', () => {
    const _g = globalThis as Record<Str, unknown>;
    _g.Capacitor = { getPlatform: () => 'android' };
    try {
      const result = detectEnvironment();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.isAndroid).toBe(true);
        expect(result.data.capacitorPlatform).toBe('android');
      }
    } finally {
      delete _g.Capacitor;
    }
  });

  it('detects Tauri when __TAURI__ global exists', () => {
    const _g = globalThis as Record<Str, unknown>;
    _g.__TAURI__ = {};
    try {
      const result = detectEnvironment();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.isTauri).toBe(true);
      }
    } finally {
      delete _g.__TAURI__;
    }
  });

  it('detects edge-light runtime via EdgeRuntime global', () => {
    const _g = globalThis as Record<Str, unknown>;
    _g.EdgeRuntime = 'vercel';
    try {
      const result = detectEnvironment();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.isEdgeLight).toBe(true);
      }
    } finally {
      delete _g.EdgeRuntime;
    }
  });

  it('detects isCloudflarePages via CF_PAGES env var', () => {
    const orig = process.env.CF_PAGES;
    process.env.CF_PAGES = '1';
    try {
      const result = detectEnvironment();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.isCloudflarePages).toBe(true);
      }
    } finally {
      if (orig === undefined) {
        delete process.env.CF_PAGES;
      } else {
        process.env.CF_PAGES = orig;
      }
    }
  });

  it('detects Deno-Deploy staging via DENO_DEPLOYMENT_ID + Deno global', () => {
    const _g = globalThis as Record<Str, unknown>;
    _g.Deno = {};
    const orig = process.env.DENO_DEPLOYMENT_ID;
    process.env.DENO_DEPLOYMENT_ID = 'abc';
    try {
      const result = detectEnvironment();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.isDenoDeployStaging).toBe(true);
      }
    } finally {
      delete _g.Deno;
      if (orig === undefined) {
        delete process.env.DENO_DEPLOYMENT_ID;
      } else {
        process.env.DENO_DEPLOYMENT_ID = orig;
      }
    }
  });

  it('detects Capacitor platform string web (covers picklist arm)', () => {
    /* The IIFE at line 429 picks `platform` only if equal to ios/android/web.
     * Hitting the 'web' branch covers the third arm in the picklist. */
    const _g = globalThis as Record<Str, unknown>;
    _g.Capacitor = { getPlatform: () => 'web' };
    try {
      const result = detectEnvironment();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.isCapacitor).toBe(true);
        expect(result.data.capacitorPlatform).toBe('web');
        expect(result.data.isIOS).toBe(false);
        expect(result.data.isAndroid).toBe(false);
      }
    } finally {
      delete _g.Capacitor;
    }
  });

  it('Capacitor with non-function getPlatform yields undefined platform', () => {
    /* Line 433: `typeof getPlatform !== 'function'` returns undefined. */
    const _g = globalThis as Record<Str, unknown>;
    _g.Capacitor = { getPlatform: 'not-a-fn' };
    try {
      const result = detectEnvironment();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.isCapacitor).toBe(true);
        expect(result.data.capacitorPlatform).toBeUndefined();
      }
    } finally {
      delete _g.Capacitor;
    }
  });

  it('Capacitor with non-recognised platform string yields undefined platform', () => {
    /* Line 435 picklist with an unmatched value — no return. */
    const _g = globalThis as Record<Str, unknown>;
    _g.Capacitor = { getPlatform: () => 'windows' };
    try {
      const result = detectEnvironment();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.isCapacitor).toBe(true);
        expect(result.data.capacitorPlatform).toBeUndefined();
      }
    } finally {
      delete _g.Capacitor;
    }
  });
});
