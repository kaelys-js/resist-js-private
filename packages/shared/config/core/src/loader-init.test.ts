/**
 * Tests for loader.ts module-level throw branch (lines 54-57).
 *
 * This test verifies that loader.ts throws when the default config filename
 * fails FilenameSchema validation at module load time. Must be a separate
 * file because the throw happens at import time.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest';

describe('loader module-level throw', () => {
  it('throws when configFilename fails FilenameSchema validation', async () => {
    vi.resetModules();

    // Mock defaults with an invalid configFilename (empty string fails minLength(1))
    vi.doMock('@/config/core/defaults', () => ({
      defaults: {
        tooling: {
          paths: {
            configFilename: '',
          },
        },
      },
    }));

    vi.doMock('@/utils/core/logger', () => ({
      log: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
      setupLogging: vi.fn(),
    }));

    vi.doMock('@/utils/core/node-imports', () => ({
      nodePath: { join: (...args: string[]) => args.join('/') },
    }));

    vi.doMock('@/utils/core/workspace', () => ({
      findWorkspaceRoot: vi.fn(),
    }));

    vi.doMock('@/utils/core/path', () => ({
      joinPath: vi.fn(),
      pathExists: vi.fn(),
    }));

    await expect(() => import('./loader')).rejects.toThrow();
  });
});
