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

/** Helper to create a success Result. */
function mockOk<T>(data: T): Result<T> {
  return Object.freeze({ ok: true as const, data, error: null }) as Result<T>;
}

/** Helper to create a failure Result. */
function mockErr(code: Str): Result<never> {
  return Object.freeze({
    ok: false as const,
    data: null,
    error: Object.freeze({ code, message: code, meta: {} }),
  }) as Result<never>;
}

const execSyncSafeMock = vi.fn((): Result<Str> => mockOk(''));
const readFileMock = vi.fn((): Result<Str> => mockOk('{}'));
const parseJsonWithCommentsMock = vi.fn((): Result<Record<Str, unknown>> => mockOk({}));
const safeStringifyMock = vi.fn((data: unknown): Result<Str> => mockOk(JSON.stringify(data)));

vi.mock('@/utils/core/shell', () => ({
  execSyncSafe: (...args: unknown[]): Result<Str> => execSyncSafeMock(...args),
}));

vi.mock('@/utils/core/fs', () => ({
  readFile: (...args: unknown[]): Result<Str> => readFileMock(...args),
  parseJsonWithComments: (...args: unknown[]): Result<Record<Str, unknown>> => parseJsonWithCommentsMock(...args),
}));

vi.mock('@/utils/core/object', () => ({
  safeStringify: (...args: unknown[]): Result<Str> => safeStringifyMock(...args),
}));

const { createViteConfig } = await import('./index.ts');

beforeEach(() => {
  vi.clearAllMocks();

  // Default: git commands succeed
  execSyncSafeMock.mockImplementation((cmd: unknown): Result<Str> => {
    const command: Str = cmd as Str;
    if (command.includes('--short HEAD')) return mockOk('abc1234');
    if (command.includes('rev-parse HEAD')) return mockOk('abc1234def5678901234567890abcdef12345678');
    if (command.includes('--abbrev-ref HEAD')) return mockOk('main');
    if (command.includes('--porcelain')) return mockOk('');
    return mockOk('');
  });

  // Default: readFile succeeds
  readFileMock.mockReturnValue(mockOk('{"version":"1.2.3"}'));

  // Default: parseJsonWithComments succeeds
  parseJsonWithCommentsMock.mockReturnValue(mockOk({ version: '1.2.3' }));

  // Default: safeStringify succeeds
  safeStringifyMock.mockImplementation((data: unknown): Result<Str> => mockOk(JSON.stringify(data)));
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
    execSyncSafeMock.mockReturnValue(mockErr('IO.EXEC_FAILED'));
    expect(() => createViteConfig({ plugins: [] })).toThrow();
  });

  it('throws when package.json is missing', () => {
    readFileMock.mockReturnValue(mockErr('IO.READ_FAILED'));
    expect(() => createViteConfig({ plugins: [] })).toThrow();
  });

  it('throws when package.json has no version field', () => {
    parseJsonWithCommentsMock.mockReturnValue(mockOk({}));
    expect(() => createViteConfig({ plugins: [] })).toThrow();
  });

  it('throws when package.json has empty version', () => {
    parseJsonWithCommentsMock.mockReturnValue(mockOk({ version: '' }));
    expect(() => createViteConfig({ plugins: [] })).toThrow();
  });

  it('throws when safeStringify fails', () => {
    safeStringifyMock.mockReturnValue(mockErr('INTERNAL.OUTPUT_VALIDATION_FAILED'));
    expect(() => createViteConfig({ plugins: [] })).toThrow();
  });

  it('server.watch.ignored includes standard directories', () => {
    const config = createViteConfig({ plugins: [] });
    const ignored = config.server?.watch?.ignored as Str[];
    expect(ignored).toContain('**/.svelte-kit/**');
    expect(ignored).toContain('**/node_modules/**');
    expect(ignored).toContain('**/.vite/**');
  });
});
