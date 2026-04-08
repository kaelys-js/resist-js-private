/**
 * Mocked tests for svelte-check workspace tool.
 *
 * Tests discoverSveltePackageDirs and runSvelteCheckAllPackages with
 * mocked fs and child_process to exercise all branches without real I/O.
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
    readdirSync: vi.fn(),
  };
});

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { discoverSveltePackageDirs, runSvelteCheckAllPackages } from './svelte-check.ts';

/**
 * Helper to create a mock Dirent.
 */
function makeDirent(
  name: string,
  opts: { isFile?: boolean; isDirectory?: boolean } = {},
): import('node:fs').Dirent {
  return {
    name,
    isFile: () => opts.isFile ?? false,
    isDirectory: () => opts.isDirectory ?? false,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    isSymbolicLink: () => false,
    path: '',
    parentPath: '',
  };
}

/* ---------- discoverSveltePackageDirs ---------- */

describe('discoverSveltePackageDirs', () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReset();
    vi.mocked(readdirSync).mockReset();
  });

  it('returns empty when packages dir does not exist', () => {
    vi.mocked(existsSync).mockReturnValue(false);
    expect(discoverSveltePackageDirs('/workspace')).toEqual([]);
  });

  it('finds package with .svelte file', () => {
    vi.mocked(existsSync).mockImplementation((p: import('node:fs').PathLike): boolean => {
      const s = String(p);
      if (s === '/workspace/packages') return true;
      if (s === join('/workspace/packages/my-app', 'package.json')) return true;
      return false;
    });

    vi.mocked(readdirSync).mockImplementation(
      (dir: import('node:fs').PathLike, _opts?: unknown): unknown[] => {
        const d = String(dir);
        if (d === '/workspace/packages') {
          return [makeDirent('my-app', { isDirectory: true })];
        }
        if (d === '/workspace/packages/my-app') {
          return [makeDirent('App.svelte', { isFile: true })];
        }
        return [];
      },
    );

    const result = discoverSveltePackageDirs('/workspace');
    expect(result).toContain('/workspace/packages/my-app');
  });

  it('skips node_modules and .svelte-kit directories', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readdirSync).mockImplementation(
      (dir: import('node:fs').PathLike, _opts?: unknown): unknown[] => {
        const d = String(dir);
        if (d === '/workspace/packages') {
          return [
            makeDirent('node_modules', { isDirectory: true }),
            makeDirent('.svelte-kit', { isDirectory: true }),
            makeDirent('dist', { isDirectory: true }),
          ];
        }
        return [];
      },
    );

    const result = discoverSveltePackageDirs('/workspace');
    expect(result).toEqual([]);
  });

  it('returns empty when readdirSync throws', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readdirSync).mockImplementation(() => {
      throw new Error('EACCES');
    });

    const result = discoverSveltePackageDirs('/workspace');
    expect(result).toEqual([]);
  });

  it('finds nested svelte files in subdirectories', () => {
    vi.mocked(existsSync).mockImplementation((p: import('node:fs').PathLike): boolean => {
      const s = String(p);
      if (s === '/workspace/packages') return true;
      if (s === join('/workspace/packages/lib', 'package.json')) return true;
      return false;
    });

    vi.mocked(readdirSync).mockImplementation(
      (dir: import('node:fs').PathLike, _opts?: unknown): unknown[] => {
        const d = String(dir);
        if (d === '/workspace/packages') {
          return [makeDirent('lib', { isDirectory: true })];
        }
        if (d === '/workspace/packages/lib') {
          return [makeDirent('src', { isDirectory: true })];
        }
        if (d === '/workspace/packages/lib/src') {
          return [makeDirent('Widget.svelte', { isFile: true })];
        }
        return [];
      },
    );

    const result = discoverSveltePackageDirs('/workspace');
    expect(result).toContain('/workspace/packages/lib');
  });

  it('skips directory without package.json even if it has svelte files', () => {
    vi.mocked(existsSync).mockImplementation((p: import('node:fs').PathLike): boolean => {
      const s = String(p);
      if (s === '/workspace/packages') return true;
      /* no package.json check returns true */
      return false;
    });

    vi.mocked(readdirSync).mockImplementation(
      (dir: import('node:fs').PathLike, _opts?: unknown): unknown[] => {
        const d = String(dir);
        if (d === '/workspace/packages') {
          return [makeDirent('no-pkg', { isDirectory: true })];
        }
        if (d === '/workspace/packages/no-pkg') {
          return [makeDirent('App.svelte', { isFile: true })];
        }
        return [];
      },
    );

    const result = discoverSveltePackageDirs('/workspace');
    expect(result).toEqual([]);
  });
});

/* ---------- runSvelteCheckAllPackages ---------- */

describe('runSvelteCheckAllPackages', () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReset();
    vi.mocked(readdirSync).mockReset();
    vi.mocked(execFileSync).mockReset();
  });

  it('returns empty when no svelte packages found', () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const results = runSvelteCheckAllPackages('/workspace');
    expect(results).toEqual([]);
  });

  it('transforms successful svelte-check output', () => {
    /* Setup: one svelte package discovered */
    vi.mocked(existsSync).mockImplementation((p: import('node:fs').PathLike): boolean => {
      const s = String(p);
      if (s === '/ws/packages') return true;
      if (s === join('/ws/packages/app', 'package.json')) return true;
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(
      (dir: import('node:fs').PathLike, _opts?: unknown): unknown[] => {
        const d = String(dir);
        if (d === '/ws/packages') return [makeDirent('app', { isDirectory: true })];
        if (d === '/ws/packages/app') return [makeDirent('Page.svelte', { isFile: true })];
        return [];
      },
    );

    vi.mocked(execFileSync).mockReturnValue(
      '1711814400000 ERROR "src/Page.svelte" 5:3 "Type mismatch"\n',
    );

    const results = runSvelteCheckAllPackages('/ws');
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('svelte-check/error');
    expect(results[0]?.message).toBe('Type mismatch');
  });

  it('captures stdout from svelte-check that exits non-zero', () => {
    vi.mocked(existsSync).mockImplementation((p: import('node:fs').PathLike): boolean => {
      const s = String(p);
      if (s === '/ws/packages') return true;
      if (s === join('/ws/packages/app', 'package.json')) return true;
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(
      (dir: import('node:fs').PathLike, _opts?: unknown): unknown[] => {
        const d = String(dir);
        if (d === '/ws/packages') return [makeDirent('app', { isDirectory: true })];
        if (d === '/ws/packages/app') return [makeDirent('Comp.svelte', { isFile: true })];
        return [];
      },
    );

    const error = new Error('exit code 1') as Error & { stdout: string };
    error.stdout = '1711814400000 WARNING "src/Comp.svelte" 10:1 "Unused prop"';
    vi.mocked(execFileSync).mockImplementation(() => {
      throw error;
    });

    const results = runSvelteCheckAllPackages('/ws');
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('svelte-check/warning');
    expect(results[0]?.message).toBe('Unused prop');
  });

  it('emits tool-crash when svelte-check throws without stdout', () => {
    vi.mocked(existsSync).mockImplementation((p: import('node:fs').PathLike): boolean => {
      const s = String(p);
      if (s === '/ws/packages') return true;
      if (s === join('/ws/packages/app', 'package.json')) return true;
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(
      (dir: import('node:fs').PathLike, _opts?: unknown): unknown[] => {
        const d = String(dir);
        if (d === '/ws/packages') return [makeDirent('app', { isDirectory: true })];
        if (d === '/ws/packages/app') return [makeDirent('A.svelte', { isFile: true })];
        return [];
      },
    );

    vi.mocked(execFileSync).mockImplementation(() => {
      throw new Error('ENOENT: command not found');
    });

    const results = runSvelteCheckAllPackages('/ws');
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('internal/tool-crash');
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain('svelte-check crashed');
    expect(results[0]?.message).toContain('ENOENT');
  });

  it('aggregates results from multiple svelte packages', () => {
    vi.mocked(existsSync).mockImplementation((p: import('node:fs').PathLike): boolean => {
      const s = String(p);
      if (s === '/ws/packages') return true;
      if (s === join('/ws/packages/app1', 'package.json')) return true;
      if (s === join('/ws/packages/app2', 'package.json')) return true;
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(
      (dir: import('node:fs').PathLike, _opts?: unknown): unknown[] => {
        const d = String(dir);
        if (d === '/ws/packages') {
          return [
            makeDirent('app1', { isDirectory: true }),
            makeDirent('app2', { isDirectory: true }),
          ];
        }
        if (d === '/ws/packages/app1') return [makeDirent('A.svelte', { isFile: true })];
        if (d === '/ws/packages/app2') return [makeDirent('B.svelte', { isFile: true })];
        return [];
      },
    );

    let callCount = 0;
    vi.mocked(execFileSync).mockImplementation((): string => {
      callCount++;
      if (callCount === 1) {
        return '1711814400000 ERROR "src/A.svelte" 1:1 "Error in app1"\n';
      }
      return '1711814400000 WARNING "src/B.svelte" 2:2 "Warning in app2"\n';
    });

    const results = runSvelteCheckAllPackages('/ws');
    expect(results).toHaveLength(2);
    expect(results[0]?.message).toBe('Error in app1');
    expect(results[1]?.message).toBe('Warning in app2');
  });
});
