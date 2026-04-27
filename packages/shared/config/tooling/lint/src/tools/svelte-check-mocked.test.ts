/**
 * Mocked tests for svelte-check workspace tool.
 *
 * Tests discoverSveltePackageDirs and runSvelteCheckAllPackages with
 * mocked fs and child_process to exercise all branches without real I/O.
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as NodeFsModule from 'node:fs';
import { existsSync, readdirSync, type Dirent, type PathLike } from 'node:fs';
import { join } from 'node:path';

import { execFileAsync } from '@/lint/framework/exec.ts';
import * as ToolOrchestratorModule from '@/lint/framework/tool-orchestrator.ts';
import type { LintCache } from '@/lint/framework/cache.ts';
import { discoverSveltePackageDirs, runSvelteCheckAllPackages } from './svelte-check.ts';

const { isCommandAvailable } = ToolOrchestratorModule;

vi.mock('@/lint/framework/exec.ts', () => ({
  execFileAsync: vi.fn(),
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof NodeFsModule>();
  return {
    ...actual,
    existsSync: vi.fn(),
    readdirSync: vi.fn(),
  };
});

/* Force isCommandAvailable to return true so the required-aware guard
 * inside runSvelteCheckAllPackages does not short-circuit these tests in
 * environments where svelte-check is not on PATH. */
vi.mock('@/lint/framework/tool-orchestrator.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof ToolOrchestratorModule>();
  return {
    ...actual,
    isCommandAvailable: vi.fn((): boolean => true),
  };
});

/**
 * Helper to create a mock Dirent.
 * @returns Description
 */
function makeDirent(name: string, opts: { isFile?: boolean; isDirectory?: boolean } = {}): Dirent {
  return {
    name,
    isFile: () => opts.isFile ?? false,
    isDirectory: () => opts.isDirectory ?? false,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    isSymbolicLink: () => false,
    parentPath: '',
  } as Dirent;
}

/* ---------- discoverSveltePackageDirs ---------- */

describe('discoverSveltePackageDirs', () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReset();
    vi.mocked(readdirSync).mockReset();
  });

  it('returns empty when packages dir does not exist', async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    expect(discoverSveltePackageDirs('/workspace')).toEqual([]);
  });

  it('finds package with .svelte file', async () => {
    vi.mocked(existsSync).mockImplementation((p: PathLike): boolean => {
      const s = String(p);
      if (s === '/workspace/packages') {
        return true;
      }
      if (s === join('/workspace/packages/my-app', 'package.json')) {
        return true;
      }
      if (s === join('/workspace/packages/my-app', 'tsconfig.json')) {
        return true;
      }
      return false;
    });

    vi.mocked(readdirSync).mockImplementation(((dir: PathLike, _opts?: unknown): unknown[] => {
      const d = String(dir);
      if (d === '/workspace/packages') {
        return [makeDirent('my-app', { isDirectory: true })];
      }
      if (d === '/workspace/packages/my-app') {
        return [makeDirent('App.svelte', { isFile: true })];
      }
      return [];
    }) as never);

    const result = discoverSveltePackageDirs('/workspace');
    expect(result).toContain('/workspace/packages/my-app');
  });

  it('skips node_modules and .svelte-kit directories', async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readdirSync).mockImplementation(((dir: PathLike, _opts?: unknown): unknown[] => {
      const d = String(dir);
      if (d === '/workspace/packages') {
        return [
          makeDirent('node_modules', { isDirectory: true }),
          makeDirent('.svelte-kit', { isDirectory: true }),
          makeDirent('dist', { isDirectory: true }),
        ];
      }
      return [];
    }) as never);

    const result = discoverSveltePackageDirs('/workspace');
    expect(result).toEqual([]);
  });

  it('returns empty when readdirSync throws', async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readdirSync).mockImplementation(() => {
      throw new Error('EACCES');
    });

    const result = discoverSveltePackageDirs('/workspace');
    expect(result).toEqual([]);
  });

  it('finds nested svelte files in subdirectories', async () => {
    vi.mocked(existsSync).mockImplementation((p: PathLike): boolean => {
      const s = String(p);
      if (s === '/workspace/packages') {
        return true;
      }
      if (s === join('/workspace/packages/lib', 'package.json')) {
        return true;
      }
      if (s === join('/workspace/packages/lib', 'tsconfig.json')) {
        return true;
      }
      return false;
    });

    vi.mocked(readdirSync).mockImplementation(((dir: PathLike, _opts?: unknown): unknown[] => {
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
    }) as never);

    const result = discoverSveltePackageDirs('/workspace');
    expect(result).toContain('/workspace/packages/lib');
  });

  it('skips directory without package.json even if it has svelte files', async () => {
    vi.mocked(existsSync).mockImplementation((p: PathLike): boolean => {
      const s = String(p);
      if (s === '/workspace/packages') {
        return true;
      }
      /* no package.json check returns true */
      return false;
    });

    vi.mocked(readdirSync).mockImplementation(((dir: PathLike, _opts?: unknown): unknown[] => {
      const d = String(dir);
      if (d === '/workspace/packages') {
        return [makeDirent('no-pkg', { isDirectory: true })];
      }
      if (d === '/workspace/packages/no-pkg') {
        return [makeDirent('App.svelte', { isFile: true })];
      }
      return [];
    }) as never);

    const result = discoverSveltePackageDirs('/workspace');
    expect(result).toEqual([]);
  });
});

/* ---------- runSvelteCheckAllPackages ---------- */

describe('runSvelteCheckAllPackages', () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReset();
    vi.mocked(readdirSync).mockReset();
    vi.mocked(execFileAsync).mockReset();
  });

  it('returns empty when no svelte packages found', async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const results = await runSvelteCheckAllPackages('/workspace');
    expect(results).toEqual([]);
  });

  it('transforms successful svelte-check output', async () => {
    /* Setup: one svelte package discovered */
    vi.mocked(existsSync).mockImplementation((p: PathLike): boolean => {
      const s = String(p);
      if (s === '/ws/packages') {
        return true;
      }
      if (s === join('/ws/packages/app', 'package.json')) {
        return true;
      }
      if (s === join('/ws/packages/app', 'tsconfig.json')) {
        return true;
      }
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(((dir: PathLike, _opts?: unknown): unknown[] => {
      const d = String(dir);
      if (d === '/ws/packages') {
        return [makeDirent('app', { isDirectory: true })];
      }
      if (d === '/ws/packages/app') {
        return [makeDirent('Page.svelte', { isFile: true })];
      }
      return [];
    }) as never);

    vi.mocked(execFileAsync).mockResolvedValue({
      stdout: '1711814400000 ERROR "src/Page.svelte" 5:3 "Type mismatch"\n',
      stderr: '',
    });

    const results = await runSvelteCheckAllPackages('/ws');
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('svelte-check/error');
    expect(results[0]?.message).toBe('Type mismatch');
  });

  it('captures stdout from svelte-check that exits non-zero', async () => {
    vi.mocked(existsSync).mockImplementation((p: PathLike): boolean => {
      const s = String(p);
      if (s === '/ws/packages') {
        return true;
      }
      if (s === join('/ws/packages/app', 'package.json')) {
        return true;
      }
      if (s === join('/ws/packages/app', 'tsconfig.json')) {
        return true;
      }
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(((dir: PathLike, _opts?: unknown): unknown[] => {
      const d = String(dir);
      if (d === '/ws/packages') {
        return [makeDirent('app', { isDirectory: true })];
      }
      if (d === '/ws/packages/app') {
        return [makeDirent('Comp.svelte', { isFile: true })];
      }
      return [];
    }) as never);

    const error = new Error('exit code 1') as Error & { stdout: string };
    error.stdout = '1711814400000 WARNING "src/Comp.svelte" 10:1 "Unused prop"';
    vi.mocked(execFileAsync).mockRejectedValue(error);

    const results = await runSvelteCheckAllPackages('/ws');
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('svelte-check/warning');
    expect(results[0]?.message).toBe('Unused prop');
  });

  it('emits tool-crash when svelte-check throws without stdout', async () => {
    vi.mocked(existsSync).mockImplementation((p: PathLike): boolean => {
      const s = String(p);
      if (s === '/ws/packages') {
        return true;
      }
      if (s === join('/ws/packages/app', 'package.json')) {
        return true;
      }
      if (s === join('/ws/packages/app', 'tsconfig.json')) {
        return true;
      }
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(((dir: PathLike, _opts?: unknown): unknown[] => {
      const d = String(dir);
      if (d === '/ws/packages') {
        return [makeDirent('app', { isDirectory: true })];
      }
      if (d === '/ws/packages/app') {
        return [makeDirent('A.svelte', { isFile: true })];
      }
      return [];
    }) as never);

    vi.mocked(execFileAsync).mockRejectedValue(new Error('ENOENT: command not found'));

    const results = await runSvelteCheckAllPackages('/ws');
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('internal/tool-crash');
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain('svelte-check crashed');
    expect(results[0]?.message).toContain('ENOENT');
  });

  it('aggregates results from multiple svelte packages', async () => {
    vi.mocked(existsSync).mockImplementation((p: PathLike): boolean => {
      const s = String(p);
      if (s === '/ws/packages') {
        return true;
      }
      if (s === join('/ws/packages/app1', 'package.json')) {
        return true;
      }
      if (s === join('/ws/packages/app1', 'tsconfig.json')) {
        return true;
      }
      if (s === join('/ws/packages/app2', 'package.json')) {
        return true;
      }
      if (s === join('/ws/packages/app2', 'tsconfig.json')) {
        return true;
      }
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(((dir: PathLike, _opts?: unknown): unknown[] => {
      const d = String(dir);
      if (d === '/ws/packages') {
        return [
          makeDirent('app1', { isDirectory: true }),
          makeDirent('app2', { isDirectory: true }),
        ];
      }
      if (d === '/ws/packages/app1') {
        return [makeDirent('A.svelte', { isFile: true })];
      }
      if (d === '/ws/packages/app2') {
        return [makeDirent('B.svelte', { isFile: true })];
      }
      return [];
    }) as never);

    let callCount = 0;
    vi.mocked(execFileAsync).mockImplementation((async () => {
      callCount++;
      if (callCount === 1) {
        return { stdout: '1711814400000 ERROR "src/A.svelte" 1:1 "Error in app1"\n', stderr: '' };
      }
      return { stdout: '1711814400000 WARNING "src/B.svelte" 2:2 "Warning in app2"\n', stderr: '' };
    }) as unknown as typeof execFileAsync);

    const results = await runSvelteCheckAllPackages('/ws');
    expect(results).toHaveLength(2);
    expect(results[0]?.message).toBe('Error in app1');
    expect(results[1]?.message).toBe('Warning in app2');
  });

  it('scopes svelte-check to a single package when one file is passed', async () => {
    vi.mocked(existsSync).mockImplementation((p: PathLike): boolean => {
      const s = String(p);
      if (s === '/ws/packages') {
        return true;
      }
      if (s === join('/ws/packages/app1', 'package.json')) {
        return true;
      }
      if (s === join('/ws/packages/app1', 'tsconfig.json')) {
        return true;
      }
      if (s === join('/ws/packages/app2', 'package.json')) {
        return true;
      }
      if (s === join('/ws/packages/app2', 'tsconfig.json')) {
        return true;
      }
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(((dir: PathLike, _opts?: unknown): unknown[] => {
      const d = String(dir);
      if (d === '/ws/packages') {
        return [
          makeDirent('app1', { isDirectory: true }),
          makeDirent('app2', { isDirectory: true }),
        ];
      }
      if (d === '/ws/packages/app1') {
        return [makeDirent('A.svelte', { isFile: true })];
      }
      if (d === '/ws/packages/app2') {
        return [makeDirent('B.svelte', { isFile: true })];
      }
      return [];
    }) as never);
    vi.mocked(execFileAsync).mockResolvedValue({ stdout: '', stderr: '' });

    await runSvelteCheckAllPackages('/ws', ['/ws/packages/app1/src/A.svelte']);
    expect(vi.mocked(execFileAsync)).toHaveBeenCalledTimes(1);
    const [call] = vi.mocked(execFileAsync).mock.calls;
    expect(call?.[2]).toMatchObject({ cwd: '/ws/packages/app1' });
  });

  it('runs no svelte-check calls when files are outside all svelte packages', async () => {
    vi.mocked(existsSync).mockImplementation((p: PathLike): boolean => {
      const s = String(p);
      if (s === '/ws/packages') {
        return true;
      }
      if (s === join('/ws/packages/app1', 'package.json')) {
        return true;
      }
      if (s === join('/ws/packages/app1', 'tsconfig.json')) {
        return true;
      }
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(((dir: PathLike, _opts?: unknown): unknown[] => {
      const d = String(dir);
      if (d === '/ws/packages') {
        return [makeDirent('app1', { isDirectory: true })];
      }
      if (d === '/ws/packages/app1') {
        return [makeDirent('A.svelte', { isFile: true })];
      }
      return [];
    }) as never);

    const results = await runSvelteCheckAllPackages('/ws', ['/elsewhere/foo.ts']);
    expect(results).toEqual([]);
    expect(vi.mocked(execFileAsync)).not.toHaveBeenCalled();
  });

  it('emits exactly one internal/tool-missing when svelte-check is not on PATH', async () => {
    /* Flip the global mock for this test: svelte-check binary not found.
     * The required-aware guard runs BEFORE any fs work, so no fs mocks needed. */
    vi.mocked(isCommandAvailable).mockReturnValueOnce(false);

    const results = await runSvelteCheckAllPackages('/ws');
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('internal/tool-missing');
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain("'svelte-check'");
    expect(results[0]?.message).toContain('not available on PATH');
    /* Must short-circuit: execFileSync never called, and no fs discovery. */
    expect(vi.mocked(execFileAsync)).not.toHaveBeenCalled();
    expect(vi.mocked(existsSync)).not.toHaveBeenCalled();
    expect(vi.mocked(readdirSync)).not.toHaveBeenCalled();
  });

  /* ---------- per-package cache integration ---------- */

  it('skips execFileAsync on cache hit for a Svelte package', async () => {
    vi.mocked(existsSync).mockImplementation((p: PathLike): boolean => {
      const s = String(p);
      if (s === '/ws/packages') {
        return true;
      }
      if (s === join('/ws/packages/app', 'package.json')) {
        return true;
      }
      if (s === join('/ws/packages/app', 'tsconfig.json')) {
        return true;
      }
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(((dir: PathLike): unknown[] => {
      const d = String(dir);
      if (d === '/ws/packages') {
        return [makeDirent('app', { isDirectory: true })];
      }
      if (d === '/ws/packages/app') {
        return [makeDirent('A.svelte', { isFile: true })];
      }
      return [];
    }) as never);

    const cachedResults = [
      {
        file: '/ws/packages/app/A.svelte',
        line: 5,
        column: 3,
        severity: 'warning' as const,
        message: 'cached diag',
        ruleId: 'svelte-check/warning',
        fix: { range: { start: 0, end: 0 }, text: '' },
      },
    ];
    const fakeCache = {
      getTool: vi.fn((): typeof cachedResults => cachedResults),
      setTool: vi.fn(),
    } as unknown as LintCache;

    const results = await runSvelteCheckAllPackages('/ws', [], fakeCache);
    expect(results).toEqual(cachedResults);
    expect(vi.mocked(execFileAsync)).not.toHaveBeenCalled();
    expect(
      vi.mocked((fakeCache as unknown as { getTool: ReturnType<typeof vi.fn> }).getTool),
    ).toHaveBeenCalledWith('svelte-check', '/ws/packages/app', expect.any(String));
  });

  it('runs execFileAsync on cache miss and stores result via setTool', async () => {
    vi.mocked(existsSync).mockImplementation((p: PathLike): boolean => {
      const s = String(p);
      if (s === '/ws/packages') {
        return true;
      }
      if (s === join('/ws/packages/app', 'package.json')) {
        return true;
      }
      if (s === join('/ws/packages/app', 'tsconfig.json')) {
        return true;
      }
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(((dir: PathLike): unknown[] => {
      const d = String(dir);
      if (d === '/ws/packages') {
        return [makeDirent('app', { isDirectory: true })];
      }
      if (d === '/ws/packages/app') {
        return [makeDirent('A.svelte', { isFile: true })];
      }
      return [];
    }) as never);
    vi.mocked(execFileAsync).mockResolvedValue({ stdout: '', stderr: '' });

    const setTool = vi.fn();
    const fakeCache = {
      getTool: vi.fn((): null => null),
      setTool,
    } as unknown as LintCache;

    await runSvelteCheckAllPackages('/ws', [], fakeCache);
    expect(vi.mocked(execFileAsync)).toHaveBeenCalledTimes(1);
    expect(setTool).toHaveBeenCalledWith(
      'svelte-check',
      '/ws/packages/app',
      expect.any(String),
      [],
    );
  });

  it('does not cache crash results (transient errors should re-run on next invocation)', async () => {
    vi.mocked(existsSync).mockImplementation((p: PathLike): boolean => {
      const s = String(p);
      if (s === '/ws/packages') {
        return true;
      }
      if (s === join('/ws/packages/app', 'package.json')) {
        return true;
      }
      if (s === join('/ws/packages/app', 'tsconfig.json')) {
        return true;
      }
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(((dir: PathLike): unknown[] => {
      const d = String(dir);
      if (d === '/ws/packages') {
        return [makeDirent('app', { isDirectory: true })];
      }
      if (d === '/ws/packages/app') {
        return [makeDirent('A.svelte', { isFile: true })];
      }
      return [];
    }) as never);
    vi.mocked(execFileAsync).mockRejectedValue(new Error('ENOENT: command not found'));

    const setTool = vi.fn();
    const fakeCache = {
      getTool: vi.fn((): null => null),
      setTool,
    } as unknown as LintCache;

    const results = await runSvelteCheckAllPackages('/ws', [], fakeCache);
    expect(results[0]?.ruleId).toBe('internal/tool-crash');
    expect(setTool).not.toHaveBeenCalled();
  });

  it('passes --incremental and --tsgo to svelte-check', async () => {
    vi.mocked(existsSync).mockImplementation((p: PathLike): boolean => {
      const s = String(p);
      if (s === '/ws/packages') {
        return true;
      }
      if (s === join('/ws/packages/app', 'package.json')) {
        return true;
      }
      if (s === join('/ws/packages/app', 'tsconfig.json')) {
        return true;
      }
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(((dir: PathLike): unknown[] => {
      const d = String(dir);
      if (d === '/ws/packages') {
        return [makeDirent('app', { isDirectory: true })];
      }
      if (d === '/ws/packages/app') {
        return [makeDirent('A.svelte', { isFile: true })];
      }
      return [];
    }) as never);
    vi.mocked(execFileAsync).mockResolvedValue({ stdout: '', stderr: '' });

    await runSvelteCheckAllPackages('/ws');
    const { calls } = vi.mocked(execFileAsync).mock;
    expect(calls.length).toBe(1);
    const [cmd, args] = calls[0]!;
    expect(cmd).toBe('svelte-check');
    expect(args).toContain('--incremental');
    expect(args).toContain('--tsgo');
    expect(args).toContain('--tsconfig');
  });
});
