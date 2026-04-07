/**
 * Tests for module-level resolveTemplatePaths throw branches (lines 206, 213).
 *
 * resolveTemplatePaths() runs at import time and throws if resolvePath fails.
 * Must be a separate file with vi.resetModules to re-trigger module initialization.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest';
import type { Str, Path } from '@/schemas/common';
import type { Result, DeepReadonly } from '@/schemas/result/result';

describe('resolveTemplatePaths module-level throws', () => {
  it('throws when appHtml path resolution fails (line 206)', async () => {
    vi.resetModules();

    vi.doMock('@/utils/core/path', () => ({
      joinPath: vi.fn(
        (segments: string[]): Result<Path> => ({
          ok: true,
          data: segments.join('/') as Path,
          error: null,
        }),
      ),
      resolvePath: vi.fn(
        (): Result<Path> =>
          ({
            ok: false,
            data: null,
            error: { code: 'VALIDATION.SCHEMA_FAILED', message: 'resolve failed' },
          }) as Result<Path>,
      ),
    }));

    vi.doMock('@/utils/core/workspace', () => ({
      findWorkspaceRoot: vi.fn(),
    }));

    vi.doMock('@/utils/core/fs', () => ({
      readFile: vi.fn(),
      parseJsonWithComments: vi.fn(),
    }));

    vi.doMock('@/utils/core/shell', () => ({
      execSyncSafe: vi.fn(),
    }));

    vi.doMock('@/utils/core/git', () => ({
      getGitCommitShort: vi.fn(),
    }));

    vi.doMock('@sveltejs/vite-plugin-svelte', () => ({
      vitePreprocess: vi.fn(() => ({ name: 'vitePreprocess' })),
    }));

    await expect(async () => import('./index')).rejects.toThrow();
  });

  it('throws when errorHtml path resolution fails (line 213)', async () => {
    vi.resetModules();

    let callCount = 0;
    vi.doMock('@/utils/core/path', () => ({
      joinPath: vi.fn(
        (segments: string[]): Result<Path> => ({
          ok: true,
          data: segments.join('/') as Path,
          error: null,
        }),
      ),
      resolvePath: vi.fn((): Result<Path> => {
        callCount++;
        // First call: appHtml — succeed
        if (callCount === 1) {
          return {
            ok: true,
            data: '/mock/templates/app.html' as Path,
            error: null,
          };
        }
        // Second call: errorHtml — fail
        return {
          ok: false,
          data: null,
          error: { code: 'VALIDATION.SCHEMA_FAILED', message: 'error.html resolve failed' },
        } as Result<Path>;
      }),
    }));

    vi.doMock('@/utils/core/workspace', () => ({
      findWorkspaceRoot: vi.fn(),
    }));

    vi.doMock('@/utils/core/fs', () => ({
      readFile: vi.fn(),
      parseJsonWithComments: vi.fn(),
    }));

    vi.doMock('@/utils/core/shell', () => ({
      execSyncSafe: vi.fn(),
    }));

    vi.doMock('@/utils/core/git', () => ({
      getGitCommitShort: vi.fn(),
    }));

    vi.doMock('@sveltejs/vite-plugin-svelte', () => ({
      vitePreprocess: vi.fn(() => ({ name: 'vitePreprocess' })),
    }));

    await expect(async () => import('./index')).rejects.toThrow();
  });
});
