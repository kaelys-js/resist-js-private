/**
 * Mocked tests for tsgo workspace tool.
 *
 * Tests scopeTsconfigDirsToFiles, discoverTsconfigDirs, and
 * runTsgoAllPackages with mocked fs and child_process to exercise all
 * branches without real I/O.
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { execFileAsync } from '@/lint/framework/exec.ts';
import type * as NodeFsModule from 'node:fs';
import { existsSync, readFileSync, readdirSync, type Dirent, type PathLike } from 'node:fs';
import { join } from 'node:path';
import * as ToolOrchestratorModule from '@/lint/framework/tool-orchestrator.ts';
import { runTsgoAllPackages, scopeTsconfigDirsToFiles, transformTsgoOutput } from './tsgo.ts';
import type { LintCache } from '@/lint/framework/cache.ts';

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
    readFileSync: vi.fn(),
  };
});

/* Force isCommandAvailable to return true so the required-aware guard
 * inside runTsgoAllPackages does not short-circuit these tests in
 * environments where tsgo is not on PATH. */
vi.mock('@/lint/framework/tool-orchestrator.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof ToolOrchestratorModule>();

  return {
    ...actual,
    isCommandAvailable: vi.fn((): boolean => true),
  };
});

/**
 * Helper to create a mock Dirent.
 *
 * @param name - Entry basename
 * @param opts - Flags controlling isFile/isDirectory
 * @returns Mock Dirent instance
 */
function makeDirent(name: string, opts: { isFile?: boolean; isDirectory?: boolean } = {}): Dirent {
  return {
    name,
    isFile: (): boolean => opts.isFile ?? false,
    isDirectory: (): boolean => opts.isDirectory ?? false,
    isBlockDevice: (): boolean => false,
    isCharacterDevice: (): boolean => false,
    isFIFO: (): boolean => false,
    isSocket: (): boolean => false,
    isSymbolicLink: (): boolean => false,
    parentPath: '',
  } as Dirent;
}

/* ---------- scopeTsconfigDirsToFiles ---------- */

describe('scopeTsconfigDirsToFiles', () => {
  it('returns all dirs when files is empty', () => {
    const dirs: string[] = ['/ws/packages/a', '/ws/packages/b'];
    expect(scopeTsconfigDirsToFiles(dirs, [])).toEqual(dirs);
  });

  it('returns owning dir for a single file', () => {
    const dirs: string[] = ['/ws/packages/a', '/ws/packages/b'];
    const result: string[] = scopeTsconfigDirsToFiles(dirs, ['/ws/packages/a/src/x.ts']);
    expect(result).toEqual(['/ws/packages/a']);
  });

  it('picks the deepest prefix when nested packages match', () => {
    const dirs: string[] = ['/ws/packages/outer', '/ws/packages/outer/inner'];
    const result: string[] = scopeTsconfigDirsToFiles(dirs, ['/ws/packages/outer/inner/src/x.ts']);
    expect(result).toEqual(['/ws/packages/outer/inner']);
  });

  it('excludes files not under any discovered dir', () => {
    const dirs: string[] = ['/ws/packages/a'];
    const result: string[] = scopeTsconfigDirsToFiles(dirs, ['/elsewhere/x.ts']);
    expect(result).toEqual([]);
  });

  it('unions owning dirs across multiple files', () => {
    const dirs: string[] = ['/ws/packages/a', '/ws/packages/b', '/ws/packages/c'];
    const result: string[] = scopeTsconfigDirsToFiles(dirs, [
      '/ws/packages/a/src/x.ts',
      '/ws/packages/c/src/y.ts',
    ]);
    expect(result.toSorted()).toEqual(['/ws/packages/a', '/ws/packages/c']);
  });

  it('matches when file path equals dir path exactly', () => {
    const dirs: string[] = ['/ws/packages/a'];
    const result: string[] = scopeTsconfigDirsToFiles(dirs, ['/ws/packages/a']);
    expect(result).toEqual(['/ws/packages/a']);
  });
});

/* ---------- transformTsgoOutput ---------- */

describe('transformTsgoOutput', () => {
  it('returns empty for empty output', () => {
    expect(transformTsgoOutput('')).toEqual([]);
    expect(transformTsgoOutput('   \n  ')).toEqual([]);
  });

  it('parses a single error diagnostic', () => {
    const output = 'src/foo.ts(10,5): error TS2322: Type mismatch.';
    const results = transformTsgoOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('tsgo/TS2322');
    expect(results[0]?.file).toBe('src/foo.ts');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.column).toBe(5);
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toBe('Type mismatch.');
  });

  it('parses warning severity', () => {
    const output = 'src/foo.ts(1,1): warning TS6133: Unused var.';
    const results = transformTsgoOutput(output);
    expect(results[0]?.severity).toBe('warning');
  });

  it('ignores non-matching lines', () => {
    const output = ['some context line', 'src/x.ts(1,1): error TS1: msg', '  indented'].join('\n');
    const results = transformTsgoOutput(output);
    expect(results).toHaveLength(1);
  });

  it('suppresses TS1005 from svelte.d.ts ambient files', () => {
    const output = 'pkg/svelte.d.ts(3,5): error TS1005: unexpected token.';
    const results = transformTsgoOutput(output);
    expect(results).toHaveLength(0);
  });
});

/* ---------- runTsgoAllPackages ---------- */

describe('runTsgoAllPackages', () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReset();
    vi.mocked(readdirSync).mockReset();
    vi.mocked(readFileSync).mockReset();
    vi.mocked(execFileAsync).mockReset();
  });

  it('returns empty when no packages discovered', async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const results = await runTsgoAllPackages('/ws');
    expect(results).toEqual([]);
    expect(vi.mocked(execFileAsync)).not.toHaveBeenCalled();
  });

  it('runs tsgo in every discovered package when files is empty', async () => {
    /* Two packages discovered */
    vi.mocked(existsSync).mockImplementation((p: PathLike): boolean => {
      const s = String(p);

      if (s === '/ws/packages') {
        return true;
      }
      if (s === join('/ws/packages/a', 'tsconfig.json')) {
        return true;
      }
      if (s === join('/ws/packages/b', 'tsconfig.json')) {
        return true;
      }
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(((dir: PathLike): unknown[] => {
      const d = String(dir);

      if (d === '/ws/packages') {
        return [makeDirent('a', { isDirectory: true }), makeDirent('b', { isDirectory: true })];
      }
      return [];
    }) as never);
    /* Not sveltekit */
    vi.mocked(readFileSync).mockReturnValue('{}');
    vi.mocked(execFileAsync).mockResolvedValue({ stdout: '', stderr: '' });

    const results = await runTsgoAllPackages('/ws');
    expect(results).toEqual([]);
    expect(vi.mocked(execFileAsync)).toHaveBeenCalledTimes(2);
  });

  it('scopes execFileSync to a single package when one file is passed', async () => {
    vi.mocked(existsSync).mockImplementation((p: PathLike): boolean => {
      const s = String(p);

      if (s === '/ws/packages') {
        return true;
      }
      if (s === join('/ws/packages/a', 'tsconfig.json')) {
        return true;
      }
      if (s === join('/ws/packages/b', 'tsconfig.json')) {
        return true;
      }
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(((dir: PathLike): unknown[] => {
      const d = String(dir);

      if (d === '/ws/packages') {
        return [makeDirent('a', { isDirectory: true }), makeDirent('b', { isDirectory: true })];
      }
      return [];
    }) as never);
    vi.mocked(readFileSync).mockReturnValue('{}');
    vi.mocked(execFileAsync).mockResolvedValue({ stdout: '', stderr: '' });

    const results = await runTsgoAllPackages('/ws', ['/ws/packages/a/src/x.ts']);
    expect(results).toEqual([]);
    expect(vi.mocked(execFileAsync)).toHaveBeenCalledTimes(1);
    const [call] = vi.mocked(execFileAsync).mock.calls;
    expect(call?.[2]).toMatchObject({ cwd: '/ws/packages/a' });
  });

  it('runs tsgo once per owning package for files in multiple packages', async () => {
    vi.mocked(existsSync).mockImplementation((p: PathLike): boolean => {
      const s = String(p);

      if (s === '/ws/packages') {
        return true;
      }
      if (s === join('/ws/packages/a', 'tsconfig.json')) {
        return true;
      }
      if (s === join('/ws/packages/b', 'tsconfig.json')) {
        return true;
      }
      if (s === join('/ws/packages/c', 'tsconfig.json')) {
        return true;
      }
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(((dir: PathLike): unknown[] => {
      const d = String(dir);

      if (d === '/ws/packages') {
        return [
          makeDirent('a', { isDirectory: true }),
          makeDirent('b', { isDirectory: true }),
          makeDirent('c', { isDirectory: true }),
        ];
      }
      return [];
    }) as never);
    vi.mocked(readFileSync).mockReturnValue('{}');
    vi.mocked(execFileAsync).mockResolvedValue({ stdout: '', stderr: '' });

    await runTsgoAllPackages('/ws', ['/ws/packages/a/src/x.ts', '/ws/packages/c/src/y.ts']);
    expect(vi.mocked(execFileAsync)).toHaveBeenCalledTimes(2);
    const mocked = vi.mocked(execFileAsync);
    const cwds: string[] = mocked.mock.calls.map((c): string => (c[2] as { cwd: string }).cwd);
    expect(cwds.toSorted()).toEqual(['/ws/packages/a', '/ws/packages/c']);
  });

  it('runs no tsgo calls when files list does not overlap any package', async () => {
    vi.mocked(existsSync).mockImplementation((p: PathLike): boolean => {
      const s = String(p);

      if (s === '/ws/packages') {
        return true;
      }
      if (s === join('/ws/packages/a', 'tsconfig.json')) {
        return true;
      }
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(((dir: PathLike): unknown[] => {
      const d = String(dir);

      if (d === '/ws/packages') {
        return [makeDirent('a', { isDirectory: true })];
      }
      return [];
    }) as never);
    vi.mocked(readFileSync).mockReturnValue('{}');

    const results = await runTsgoAllPackages('/ws', ['/elsewhere/foo.ts']);
    expect(results).toEqual([]);
    expect(vi.mocked(execFileAsync)).not.toHaveBeenCalled();
  });

  it('captures stdout when tsgo exits non-zero', async () => {
    vi.mocked(existsSync).mockImplementation((p: PathLike): boolean => {
      const s = String(p);

      if (s === '/ws/packages') {
        return true;
      }
      if (s === join('/ws/packages/a', 'tsconfig.json')) {
        return true;
      }
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(((dir: PathLike): unknown[] => {
      const d = String(dir);

      if (d === '/ws/packages') {
        return [makeDirent('a', { isDirectory: true })];
      }
      return [];
    }) as never);
    vi.mocked(readFileSync).mockReturnValue('{}');

    const err = new Error('exit 1') as Error & { stdout: string };
    err.stdout = 'src/x.ts(2,3): error TS2322: boom.';
    vi.mocked(execFileAsync).mockRejectedValue(err);

    const results = await runTsgoAllPackages('/ws');
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('tsgo/TS2322');
    expect(results[0]?.message).toBe('boom.');
  });

  it('emits internal/tool-crash when tsgo throws without stdout', async () => {
    vi.mocked(existsSync).mockImplementation((p: PathLike): boolean => {
      const s = String(p);

      if (s === '/ws/packages') {
        return true;
      }
      if (s === join('/ws/packages/a', 'tsconfig.json')) {
        return true;
      }
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(((dir: PathLike): unknown[] => {
      const d = String(dir);

      if (d === '/ws/packages') {
        return [makeDirent('a', { isDirectory: true })];
      }
      return [];
    }) as never);
    vi.mocked(readFileSync).mockReturnValue('{}');
    vi.mocked(execFileAsync).mockRejectedValue(new Error('ENOENT: command not found'));

    const results = await runTsgoAllPackages('/ws');
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('internal/tool-crash');
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain('tsgo crashed');
    expect(results[0]?.message).toContain('ENOENT');
  });

  it('emits exactly one internal/tool-missing when tsgo is not on PATH', async () => {
    /* Flip the global mock for this test: tsgo binary not found.
     * The required-aware guard runs BEFORE any fs work, so no fs mocks needed. */
    vi.mocked(isCommandAvailable).mockReturnValueOnce(false);

    const results = await runTsgoAllPackages('/ws');
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('internal/tool-missing');
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain("'tsgo'");
    expect(results[0]?.message).toContain('not available on PATH');
    /* Must short-circuit: execFileSync never called, and no fs discovery. */
    expect(vi.mocked(execFileAsync)).not.toHaveBeenCalled();
    expect(vi.mocked(existsSync)).not.toHaveBeenCalled();
    expect(vi.mocked(readdirSync)).not.toHaveBeenCalled();
  });

  /* ---------- per-package cache integration ---------- */

  it('skips execFileAsync on cache hit for a package', async () => {
    vi.mocked(existsSync).mockImplementation((p: PathLike): boolean => {
      const s = String(p);

      if (s === '/ws/packages') {
        return true;
      }
      if (s === join('/ws/packages/a', 'tsconfig.json')) {
        return true;
      }
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(((dir: PathLike): unknown[] => {
      const d = String(dir);

      if (d === '/ws/packages') {
        return [makeDirent('a', { isDirectory: true })];
      }
      return [];
    }) as never);
    vi.mocked(readFileSync).mockReturnValue('{}');

    const cachedResults = [
      {
        file: '/ws/packages/a/src/x.ts',
        line: 9,
        column: 1,
        severity: 'warning' as const,
        message: 'cached',
        ruleId: 'tsgo/TS9999',
        fix: { range: { start: 0, end: 0 }, text: '' },
      },
    ];
    const fakeCache = {
      getTool: vi.fn((): typeof cachedResults => cachedResults),
      setTool: vi.fn(),
    } as unknown as LintCache;

    const results = await runTsgoAllPackages('/ws', [], fakeCache);
    expect(results).toEqual(cachedResults);
    expect(vi.mocked(execFileAsync)).not.toHaveBeenCalled();
    expect(
      vi.mocked((fakeCache as unknown as { getTool: ReturnType<typeof vi.fn> }).getTool),
    ).toHaveBeenCalledWith('tsgo', '/ws/packages/a', expect.any(String));
  });

  it('runs execFileAsync on cache miss and stores result via setTool', async () => {
    vi.mocked(existsSync).mockImplementation((p: PathLike): boolean => {
      const s = String(p);

      if (s === '/ws/packages') {
        return true;
      }
      if (s === join('/ws/packages/a', 'tsconfig.json')) {
        return true;
      }
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(((dir: PathLike): unknown[] => {
      const d = String(dir);

      if (d === '/ws/packages') {
        return [makeDirent('a', { isDirectory: true })];
      }
      return [];
    }) as never);
    vi.mocked(readFileSync).mockReturnValue('{}');
    vi.mocked(execFileAsync).mockResolvedValue({ stdout: '', stderr: '' });

    const setTool = vi.fn();
    const fakeCache = {
      getTool: vi.fn((): null => null),
      setTool,
    } as unknown as LintCache;

    await runTsgoAllPackages('/ws', [], fakeCache);
    expect(vi.mocked(execFileAsync)).toHaveBeenCalledTimes(1);
    expect(setTool).toHaveBeenCalledWith('tsgo', '/ws/packages/a', expect.any(String), []);
  });

  it('does not cache crash results (transient errors should re-run on next invocation)', async () => {
    vi.mocked(existsSync).mockImplementation((p: PathLike): boolean => {
      const s = String(p);

      if (s === '/ws/packages') {
        return true;
      }
      if (s === join('/ws/packages/a', 'tsconfig.json')) {
        return true;
      }
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(((dir: PathLike): unknown[] => {
      const d = String(dir);

      if (d === '/ws/packages') {
        return [makeDirent('a', { isDirectory: true })];
      }
      return [];
    }) as never);
    vi.mocked(readFileSync).mockReturnValue('{}');
    vi.mocked(execFileAsync).mockRejectedValue(new Error('ENOENT: command not found'));

    const setTool = vi.fn();
    const fakeCache = {
      getTool: vi.fn((): null => null),
      setTool,
    } as unknown as LintCache;

    const results = await runTsgoAllPackages('/ws', [], fakeCache);
    expect(results[0]?.ruleId).toBe('internal/tool-crash');
    expect(setTool).not.toHaveBeenCalled();
  });

  it('passes --incremental and --tsBuildInfoFile to tsgo', async () => {
    vi.mocked(existsSync).mockImplementation((p: PathLike): boolean => {
      const s = String(p);

      if (s === '/ws/packages') {
        return true;
      }
      if (s === join('/ws/packages/a', 'tsconfig.json')) {
        return true;
      }
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(((dir: PathLike): unknown[] => {
      const d = String(dir);

      if (d === '/ws/packages') {
        return [makeDirent('a', { isDirectory: true })];
      }
      return [];
    }) as never);
    vi.mocked(readFileSync).mockReturnValue('{}');
    vi.mocked(execFileAsync).mockResolvedValue({ stdout: '', stderr: '' });

    await runTsgoAllPackages('/ws');
    const { calls } = vi.mocked(execFileAsync).mock;
    expect(calls.length).toBe(1);
    const [cmd, args] = calls[0]!;
    expect(cmd).toBe('tsgo');
    expect(args).toContain('--noEmit');
    expect(args).toContain('--incremental');
    expect(args).toContain('--tsBuildInfoFile');
    /* The path arg follows --tsBuildInfoFile and points under node_modules/.cache */
    const buildInfoIdx: number = (args as string[]).indexOf('--tsBuildInfoFile');
    expect((args as string[])[buildInfoIdx + 1]).toContain('node_modules/.cache/tsgo.tsbuildinfo');
  });
});
