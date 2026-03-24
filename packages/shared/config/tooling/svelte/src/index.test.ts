/**
 * Tests for the shared SvelteKit configuration factory.
 *
 * @module
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Str, Path } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const MOCK_TSCONFIG_JSON: string = JSON.stringify({
  compilerOptions: {
    paths: {
      '@/schemas/common': ['./packages/shared/schemas/common/src/index.ts'],
      '@/utils/core/*': ['./packages/shared/utils/core/src/*.ts'],
      '@/locale/svelte': ['./packages/shared/locale/src/svelte.svelte.ts'],
    },
  },
});

vi.mock('@/utils/core/workspace', () => ({
  findWorkspaceRoot: vi.fn((): Result<Path> => ({
    ok: true,
    data: '/mock/root' as Path,
    error: null,
  })),
}));

vi.mock('@/utils/core/fs', () => ({
  readFile: vi.fn((): Result<Str> => ({
    ok: true,
    data: MOCK_TSCONFIG_JSON as Str,
    error: null,
  })),
  parseJsonWithComments: vi.fn(<T>(content: string): Result<T> => ({
    ok: true,
    data: JSON.parse(content) as T,
    error: null,
  })),
}));

vi.mock('@/utils/core/shell', () => ({
  execSyncSafe: vi.fn((): Result<Str> => ({
    ok: true,
    data: 'abc1234' as Str,
    error: null,
  })),
}));

vi.mock('@/utils/core/path', () => ({
  joinPath: vi.fn((segments: string[]): Result<Path> => ({
    ok: true,
    data: segments.join('/') as Path,
    error: null,
  })),
  resolvePath: vi.fn((segments: string[]): Result<Path> => ({
    ok: true,
    data: segments.join('/') as Path,
    error: null,
  })),
}));

vi.mock('@sveltejs/vite-plugin-svelte', () => ({
  vitePreprocess: vi.fn(() => ({ name: 'vitePreprocess' })),
}));

const { createSvelteConfig, TEMPLATE_PATHS } = await import('./index.ts');
const { execSyncSafe } = await import('@/utils/core/shell');
const { readFile } = await import('@/utils/core/fs');

beforeEach(() => {
  vi.clearAllMocks();
  // Re-set default mocks
  (execSyncSafe as ReturnType<typeof vi.fn>).mockReturnValue({
    ok: true,
    data: 'abc1234' as Str,
    error: null,
  });
  (readFile as ReturnType<typeof vi.fn>).mockReturnValue({
    ok: true,
    data: MOCK_TSCONFIG_JSON as Str,
    error: null,
  });
});

// ---------------------------------------------------------------------------
// TEMPLATE_PATHS
// ---------------------------------------------------------------------------

describe('TEMPLATE_PATHS', () => {
  it('appHtml path ends with templates/app.html', () => {
    expect(TEMPLATE_PATHS.appHtml).toMatch(/templates[/\\]app\.html$/);
  });

  it('errorHtml path ends with templates/error.html', () => {
    expect(TEMPLATE_PATHS.errorHtml).toMatch(/templates[/\\]error\.html$/);
  });
});

// ---------------------------------------------------------------------------
// createSvelteConfig
// ---------------------------------------------------------------------------

describe('createSvelteConfig', () => {
  const mockAdapter = { name: 'test-adapter' };

  it('returns config with preprocess', () => {
    const config = createSvelteConfig({ adapter: mockAdapter });
    expect(config).toHaveProperty('preprocess');
  });

  it('includes kit.adapter from provided adapter', () => {
    const config = createSvelteConfig({ adapter: mockAdapter });
    expect(config.kit.adapter).toBe(mockAdapter);
  });

  it('includes kit.version.name from git commit', () => {
    const config = createSvelteConfig({ adapter: mockAdapter });
    expect(config.kit.version.name).toBe('abc1234');
  });

  it('includes kit.alias with tsconfig-derived aliases', () => {
    const config = createSvelteConfig({ adapter: mockAdapter });
    const aliases: Record<Str, Str> = config.kit.alias;
    // Should have entries from tsconfig paths mock
    expect(aliases).toHaveProperty('@/schemas/common');
    expect(aliases).toHaveProperty('@/utils/core/*');
  });

  it('strips .ts extension from non-wildcard aliases but keeps .svelte.ts', () => {
    const config = createSvelteConfig({ adapter: mockAdapter });
    const aliases: Record<Str, Str> = config.kit.alias;
    // Non-wildcard: should have stripped .ts
    const commonPath: Str = aliases['@/schemas/common'] as Str;
    expect(commonPath).not.toMatch(/\.ts$/);
    // .svelte.ts should be preserved
    const sveltePath: Str = aliases['@/locale/svelte'] as Str;
    expect(sveltePath).toMatch(/\.svelte\.ts$/);
  });

  it('includes kit.files pointing to shared templates', () => {
    const config = createSvelteConfig({ adapter: mockAdapter });
    expect(config.kit.files.appTemplate).toBe(TEMPLATE_PATHS.appHtml);
    expect(config.kit.files.errorTemplate).toBe(TEMPLATE_PATHS.errorHtml);
  });

  it('disables CSP when enableCsp is false', () => {
    const config = createSvelteConfig({ adapter: mockAdapter, enableCsp: false });
    expect(config.kit).not.toHaveProperty('csp');
  });

  it('merges extraAliases into kit.alias', () => {
    const config = createSvelteConfig({
      adapter: mockAdapter,
      extraAliases: { '$custom': '/path/to/custom' },
    });
    expect(config.kit.alias['$custom']).toBe('/path/to/custom');
  });

  it('throws when git is unavailable', () => {
    const gitError = { code: 'IO.EXEC_FAILED', message: 'git not found' };
    (execSyncSafe as ReturnType<typeof vi.fn>).mockReturnValue({
      ok: false,
      data: null,
      error: gitError,
    });
    expect(() => createSvelteConfig({ adapter: mockAdapter })).toThrow();
  });

  it('spreads extraKit into kit config', () => {
    const config = createSvelteConfig({
      adapter: mockAdapter,
      extraKit: { serviceWorker: { register: false } },
    });
    expect(config.kit.serviceWorker).toEqual({ register: false });
  });

  it('uses custom appTemplate when files.appTemplate provided', () => {
    const config = createSvelteConfig({
      adapter: mockAdapter,
      files: { appTemplate: '/custom/app.html' },
    });
    expect(config.kit.files.appTemplate).toBe('/custom/app.html');
    // errorTemplate should still use shared default
    expect(config.kit.files.errorTemplate).toBe(TEMPLATE_PATHS.errorHtml);
  });

  it('handles tsconfig with no paths field', () => {
    (readFile as ReturnType<typeof vi.fn>).mockReturnValue({
      ok: true,
      data: JSON.stringify({ compilerOptions: {} }),
      error: null,
    });

    const config = createSvelteConfig({ adapter: mockAdapter });
    // Should still work — aliases will be empty from tsconfig, but extraAliases can add
    expect(config.kit.alias).toBeDefined();
  });

  it('CSP is undefined in non-production (NODE_ENV is test)', () => {
    // In test environment, NODE_ENV is 'test', not 'production'
    // so CSP should be undefined even with enableCsp=true (default)
    const config = createSvelteConfig({ adapter: mockAdapter });
    // CSP is only defined in production mode
    expect(config.kit.csp).toBeUndefined();
  });
});
