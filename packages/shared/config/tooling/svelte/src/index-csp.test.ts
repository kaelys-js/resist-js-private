/**
 * Tests for CSP production branch in createSvelteConfig.
 *
 * IS_PRODUCTION is evaluated at module load time from process.env.NODE_ENV,
 * so we need a separate test file with vi.stubEnv before module import.
 *
 * @module
 */

import { strict as assert } from 'node:assert';
import { describe, expect, it, vi } from 'vitest';
import type { Adapter } from '@sveltejs/kit';
import type { Str, Path } from '@/schemas/common';
import type { Result, DeepReadonly } from '@/schemas/result/result';

// =============================================================================
// Stub NODE_ENV=production BEFORE any module imports
// =============================================================================

vi.stubEnv('NODE_ENV', 'production');

// =============================================================================
// Mocks (same as index.test.ts)
// =============================================================================

const MOCK_TSCONFIG_JSON: string = JSON.stringify({
  compilerOptions: {
    paths: {
      '@/schemas/common': ['./packages/shared/schemas/common/src/index.ts'],
    },
  },
});

vi.mock('@/utils/core/workspace', () => ({
  findWorkspaceRoot: vi.fn(
    (): Result<Path> => ({
      ok: true,
      data: '/mock/root' as Path,
      error: null,
    }),
  ),
}));

vi.mock('@/utils/core/fs', () => ({
  readFile: vi.fn(
    (): Result<Str> => ({
      ok: true,
      data: MOCK_TSCONFIG_JSON as Str,
      error: null,
    }),
  ),
  parseJsonWithComments: vi.fn(
    <T>(content: string): Result<T> => ({
      ok: true,
      data: JSON.parse(content) as DeepReadonly<T>,
      error: null,
    }),
  ),
}));

vi.mock('@/utils/core/shell', () => ({
  execSyncSafe: vi.fn(
    (): Result<Str> => ({
      ok: true,
      data: 'abc1234' as Str,
      error: null,
    }),
  ),
}));

vi.mock('@/utils/core/path', () => ({
  joinPath: vi.fn(
    (segments: string[]): Result<Path> => ({
      ok: true,
      data: segments.join('/') as Path,
      error: null,
    }),
  ),
  resolvePath: vi.fn(
    (segments: string[]): Result<Path> => ({
      ok: true,
      data: segments.join('/') as Path,
      error: null,
    }),
  ),
}));

vi.mock('@sveltejs/vite-plugin-svelte', () => ({
  vitePreprocess: vi.fn(() => ({ name: 'vitePreprocess' })),
}));

const { createSvelteConfig } = await import('./index.ts');

// =============================================================================
// Tests
// =============================================================================

describe('CSP in production mode', () => {
  const mockAdapter: Adapter = { name: 'test-adapter', adapt: vi.fn() };

  it('includes CSP directives when enableCsp=true and NODE_ENV=production', () => {
    const config = createSvelteConfig({ adapter: mockAdapter });
    assert.ok(config.kit, 'kit should be defined');
    expect(config.kit.csp).toBeDefined();
    assert.ok(config.kit.csp, 'csp should be defined');
    expect(config.kit.csp.mode).toBe('auto');
    expect(config.kit.csp.directives).toBeDefined();
  });

  it('CSP includes expected directives', () => {
    const config = createSvelteConfig({ adapter: mockAdapter });
    assert.ok(config.kit, 'kit should be defined');
    assert.ok(config.kit.csp, 'csp should be defined');
    assert.ok(config.kit.csp.directives, 'directives should be defined');
    expect(config.kit.csp.directives['default-src']).toContain('self');
    expect(config.kit.csp.directives['script-src']).toContain('self');
    expect(config.kit.csp.directives['frame-ancestors']).toContain('none');
  });

  it('omits CSP when enableCsp=false even in production', () => {
    const config = createSvelteConfig({ adapter: mockAdapter, enableCsp: false });
    assert.ok(config.kit, 'kit should be defined');
    expect(config.kit.csp).toBeUndefined();
  });
});
