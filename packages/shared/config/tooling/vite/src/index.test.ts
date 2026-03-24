/**
 * Tests for the shared Vite configuration factory.
 *
 * @module
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Str } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';

// ---------------------------------------------------------------------------
// Mocks — mock the shared utilities, not raw node:* modules
// ---------------------------------------------------------------------------

/** Git metadata shape returned by getGitInfo. */
type MockGitInfo = {
  commit: Str;
  commitFull: Str;
  branch: Str;
  dirty: boolean;
};

/**
 * Helper to create a success Result.
 *
 * @param {T} data - The success data to wrap
 * @returns {Result<T>} A frozen success Result
 */
function mockOk<T>(data: T): Result<T> {
  return Object.freeze({ ok: true as const, data, error: null }) as Result<T>;
}

/**
 * Helper to create a failure Result.
 *
 * @param {Str} code - The error code
 * @returns {Result<never>} A frozen failure Result
 */
function mockErr(code: Str): Result<never> {
  return Object.freeze({
    ok: false as const,
    data: null,
    error: Object.freeze({ code, message: code, meta: {} }),
  }) as Result<never>;
}

const getGitInfoMock = vi.fn(
  (): Result<MockGitInfo> =>
    mockOk({
      commit: 'abc1234',
      commitFull: 'abc1234def5678901234567890abcdef12345678',
      branch: 'main',
      dirty: false,
    }),
);
const getPackageVersionMock = vi.fn((): Result<Str> => mockOk('1.2.3'));
const safeStringifyMock = vi.fn((data: unknown): Result<Str> => mockOk(JSON.stringify(data)));

vi.mock('@/utils/core/git', () => ({
  getGitInfo: (): Result<MockGitInfo> => getGitInfoMock(),
  getPackageVersion: (): Result<Str> => getPackageVersionMock(),
  GitInfoSchema: {},
}));

vi.mock('@/utils/core/object', () => ({
  safeStringify: (data: unknown): Result<Str> => safeStringifyMock(data),
}));

const { createViteConfig } = await import('./index.ts');

beforeEach(() => {
  vi.clearAllMocks();

  // Default: getGitInfo succeeds
  getGitInfoMock.mockReturnValue(
    mockOk({
      commit: 'abc1234',
      commitFull: 'abc1234def5678901234567890abcdef12345678',
      branch: 'main',
      dirty: false,
    }),
  );

  // Default: getPackageVersion succeeds
  getPackageVersionMock.mockReturnValue(mockOk('1.2.3'));

  // Default: safeStringify succeeds
  safeStringifyMock.mockImplementation(
    (data: unknown): Result<Str> => mockOk(JSON.stringify(data)),
  );
});

// ---------------------------------------------------------------------------
// createViteConfig
// ---------------------------------------------------------------------------

describe('createViteConfig', () => {
  it('returns a valid Vite config object', () => {
    const config = createViteConfig({ plugins: [] });
    expect(config).toHaveProperty('plugins');
    expect(config).toHaveProperty('define');
    expect(config).toHaveProperty('server');
    expect(config).toHaveProperty('ssr');
  });

  it('injects git metadata defines', () => {
    const config = createViteConfig({ plugins: [] });
    const define = config.define as Record<Str, Str>;
    expect(define.__APP_VERSION__).toBe('"1.2.3"');
    expect(define.__GIT_COMMIT__).toBe('"abc1234"');
    expect(define.__GIT_COMMIT_FULL__).toBe('"abc1234def5678901234567890abcdef12345678"');
    expect(define.__GIT_BRANCH__).toBe('"main"');
    expect(define.__GIT_DIRTY__).toBe('false');
    expect(define.__BUILD_TIMESTAMP__).toBeDefined();
  });

  it('merges extraDefines over defaults', () => {
    const config = createViteConfig({
      plugins: [],
      extraDefines: { __CUSTOM__: '"test"' },
    });
    const define = config.define as Record<Str, Str>;
    expect(define.__CUSTOM__).toBe('"test"');
    expect(define.__APP_VERSION__).toBeDefined();
  });

  it('uses default ssrNoExternal when not provided', () => {
    const config = createViteConfig({ plugins: [] });
    expect(config.ssr?.noExternal).toEqual(['@lucide/svelte']);
  });

  it('uses custom ssrNoExternal when provided', () => {
    const config = createViteConfig({
      plugins: [],
      ssrNoExternal: ['custom-pkg', 'another-pkg'],
    });
    expect(config.ssr?.noExternal).toEqual(['custom-pkg', 'another-pkg']);
  });

  it('spreads extraConfig into the result', () => {
    const config = createViteConfig({
      plugins: [],
      extraConfig: { build: { target: 'es2024' } },
    });
    expect(config.build?.target).toBe('es2024');
  });

  it('throws when git is unavailable', () => {
    getGitInfoMock.mockReturnValue(mockErr('IO.EXEC_FAILED'));
    expect(() => createViteConfig({ plugins: [] })).toThrow();
  });

  it('throws when package.json is missing', () => {
    getPackageVersionMock.mockReturnValue(mockErr('IO.READ_FAILED'));
    expect(() => createViteConfig({ plugins: [] })).toThrow();
  });

  it('throws when package version is invalid', () => {
    getPackageVersionMock.mockReturnValue(mockErr('CONFIG.INVALID'));
    expect(() => createViteConfig({ plugins: [] })).toThrow();
  });

  it('throws when safeStringify fails', () => {
    safeStringifyMock.mockReturnValue(mockErr('INTERNAL.OUTPUT_VALIDATION_FAILED'));
    expect(() => createViteConfig({ plugins: [] })).toThrow();
  });

  it('throws when options are invalid (missing plugins)', () => {
    expect(() => createViteConfig({} as Parameters<typeof createViteConfig>[0])).toThrow();
  });

  it('server.watch.ignored includes standard directories', () => {
    const config = createViteConfig({ plugins: [] });
    const ignored = config.server?.watch?.ignored as Str[];
    expect(ignored).toContain('**/.svelte-kit/**');
    expect(ignored).toContain('**/node_modules/**');
    expect(ignored).toContain('**/.vite/**');
  });
});
