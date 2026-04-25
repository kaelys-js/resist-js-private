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

vi.mock('@/lint/framework/exec.ts', () => ({
  execFileAsync: vi.fn(),
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
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
  const actual = await importOriginal<typeof import('@/lint/framework/tool-orchestrator.ts')>();
  return {
    ...actual,
    isCommandAvailable: vi.fn((): boolean => true),
  };
});

import { execFileAsync } from '@/lint/framework/exec.ts';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';

import { runTsgoAllPackages, scopeTsconfigDirsToFiles, transformTsgoOutput } from './tsgo.ts';

/**
 * Helper to create a mock Dirent.
 *
 * @param name - Entry basename
 * @param opts - Flags controlling isFile/isDirectory
 * @returns Mock Dirent instance
 */
function makeDirent(
  name: string,
  opts: { isFile?: boolean; isDirectory?: boolean } = {},
): import('node:fs').Dirent {
  return {
    name,
    isFile: (): boolean => opts.isFile ?? false,
    isDirectory: (): boolean => opts.isDirectory ?? false,
    isBlockDevice: (): boolean => false,
    isCharacterDevice: (): boolean => false,
    isFIFO: (): boolean => false,
    isSocket: (): boolean => false,
    isSymbolicLink: (): boolean => false,
    path: '',
    parentPath: '',
  };
}

/* ---------- scopeTsconfigDirsToFiles ---------- */

describe('scopeTsconfigDirsToFiles', () => {
  it('returns all dirs when files is empty', async () => {
    const dirs: string[] = ['/ws/packages/a', '/ws/packages/b'];
    expect(scopeTsconfigDirsToFiles(dirs, [])).toEqual(dirs);
  });

  it('returns owning dir for a single file', async () => {
    const dirs: string[] = ['/ws/packages/a', '/ws/packages/b'];
    const result: string[] = scopeTsconfigDirsToFiles(dirs, ['/ws/packages/a/src/x.ts']);
    expect(result).toEqual(['/ws/packages/a']);
  });

  it('picks the deepest prefix when nested packages match', async () => {
    const dirs: string[] = ['/ws/packages/outer', '/ws/packages/outer/inner'];
    const result: string[] = scopeTsconfigDirsToFiles(dirs, ['/ws/packages/outer/inner/src/x.ts']);
    expect(result).toEqual(['/ws/packages/outer/inner']);
  });

  it('excludes files not under any discovered dir', async () => {
    const dirs: string[] = ['/ws/packages/a'];
    const result: string[] = scopeTsconfigDirsToFiles(dirs, ['/elsewhere/x.ts']);
    expect(result).toEqual([]);
  });

  it('unions owning dirs across multiple files', async () => {
    const dirs: string[] = ['/ws/packages/a', '/ws/packages/b', '/ws/packages/c'];
    const result: string[] = scopeTsconfigDirsToFiles(dirs, [
      '/ws/packages/a/src/x.ts',
      '/ws/packages/c/src/y.ts',
    ]);
    expect(result.sort()).toEqual(['/ws/packages/a', '/ws/packages/c']);
  });

  it('matches when file path equals dir path exactly', async () => {
    const dirs: string[] = ['/ws/packages/a'];
    const result: string[] = scopeTsconfigDirsToFiles(dirs, ['/ws/packages/a']);
    expect(result).toEqual(['/ws/packages/a']);
  });
});

/* ---------- transformTsgoOutput ---------- */

describe('transformTsgoOutput', () => {
  it('returns empty for empty output', async () => {
    expect(transformTsgoOutput('')).toEqual([]);
    expect(transformTsgoOutput('   \n  ')).toEqual([]);
  });

  it('parses a single error diagnostic', async () => {
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

  it('parses warning severity', async () => {
    const output = 'src/foo.ts(1,1): warning TS6133: Unused var.';
    const results = transformTsgoOutput(output);
    expect(results[0]?.severity).toBe('warning');
  });

  it('ignores non-matching lines', async () => {
    const output = ['some context line', 'src/x.ts(1,1): error TS1: msg', '  indented'].join('\n');
    const results = transformTsgoOutput(output);
    expect(results).toHaveLength(1);
  });

  it('suppresses TS1005 from svelte.d.ts ambient files', async () => {
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
    vi.mocked(existsSync).mockImplementation((p: import('node:fs').PathLike): boolean => {
      const s = String(p);
      if (s === '/ws/packages') return true;
      if (s === join('/ws/packages/a', 'tsconfig.json')) return true;
      if (s === join('/ws/packages/b', 'tsconfig.json')) return true;
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(
      (dir: import('node:fs').PathLike, _opts?: unknown): unknown[] => {
        const d = String(dir);
        if (d === '/ws/packages') {
          return [makeDirent('a', { isDirectory: true }), makeDirent('b', { isDirectory: true })];
        }
        return [];
      },
    );
    /* Not sveltekit */
    vi.mocked(readFileSync).mockReturnValue('{}');
    vi.mocked(execFileAsync).mockResolvedValue({ stdout: '', stderr: '' });

    const results = await runTsgoAllPackages('/ws');
    expect(results).toEqual([]);
    expect(vi.mocked(execFileAsync)).toHaveBeenCalledTimes(2);
  });

  it('scopes execFileSync to a single package when one file is passed', async () => {
    vi.mocked(existsSync).mockImplementation((p: import('node:fs').PathLike): boolean => {
      const s = String(p);
      if (s === '/ws/packages') return true;
      if (s === join('/ws/packages/a', 'tsconfig.json')) return true;
      if (s === join('/ws/packages/b', 'tsconfig.json')) return true;
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(
      (dir: import('node:fs').PathLike, _opts?: unknown): unknown[] => {
        const d = String(dir);
        if (d === '/ws/packages') {
          return [makeDirent('a', { isDirectory: true }), makeDirent('b', { isDirectory: true })];
        }
        return [];
      },
    );
    vi.mocked(readFileSync).mockReturnValue('{}');
    vi.mocked(execFileAsync).mockResolvedValue({ stdout: '', stderr: '' });

    const results = await runTsgoAllPackages('/ws', ['/ws/packages/a/src/x.ts']);
    expect(results).toEqual([]);
    expect(vi.mocked(execFileAsync)).toHaveBeenCalledTimes(1);
    const call = vi.mocked(execFileAsync).mock.calls[0];
    expect(call?.[2]).toMatchObject({ cwd: '/ws/packages/a' });
  });

  it('runs tsgo once per owning package for files in multiple packages', async () => {
    vi.mocked(existsSync).mockImplementation((p: import('node:fs').PathLike): boolean => {
      const s = String(p);
      if (s === '/ws/packages') return true;
      if (s === join('/ws/packages/a', 'tsconfig.json')) return true;
      if (s === join('/ws/packages/b', 'tsconfig.json')) return true;
      if (s === join('/ws/packages/c', 'tsconfig.json')) return true;
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(
      (dir: import('node:fs').PathLike, _opts?: unknown): unknown[] => {
        const d = String(dir);
        if (d === '/ws/packages') {
          return [
            makeDirent('a', { isDirectory: true }),
            makeDirent('b', { isDirectory: true }),
            makeDirent('c', { isDirectory: true }),
          ];
        }
        return [];
      },
    );
    vi.mocked(readFileSync).mockReturnValue('{}');
    vi.mocked(execFileAsync).mockResolvedValue({ stdout: '', stderr: '' });

    await runTsgoAllPackages('/ws', ['/ws/packages/a/src/x.ts', '/ws/packages/c/src/y.ts']);
    expect(vi.mocked(execFileAsync)).toHaveBeenCalledTimes(2);
    const cwds: string[] = vi
      .mocked(execFileAsync)
      .mock.calls.map((c): string => (c[2] as { cwd: string }).cwd);
    expect(cwds.sort()).toEqual(['/ws/packages/a', '/ws/packages/c']);
  });

  it('runs no tsgo calls when files list does not overlap any package', async () => {
    vi.mocked(existsSync).mockImplementation((p: import('node:fs').PathLike): boolean => {
      const s = String(p);
      if (s === '/ws/packages') return true;
      if (s === join('/ws/packages/a', 'tsconfig.json')) return true;
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(
      (dir: import('node:fs').PathLike, _opts?: unknown): unknown[] => {
        const d = String(dir);
        if (d === '/ws/packages') return [makeDirent('a', { isDirectory: true })];
        return [];
      },
    );
    vi.mocked(readFileSync).mockReturnValue('{}');

    const results = await runTsgoAllPackages('/ws', ['/elsewhere/foo.ts']);
    expect(results).toEqual([]);
    expect(vi.mocked(execFileAsync)).not.toHaveBeenCalled();
  });

  it('captures stdout when tsgo exits non-zero', async () => {
    vi.mocked(existsSync).mockImplementation((p: import('node:fs').PathLike): boolean => {
      const s = String(p);
      if (s === '/ws/packages') return true;
      if (s === join('/ws/packages/a', 'tsconfig.json')) return true;
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(
      (dir: import('node:fs').PathLike, _opts?: unknown): unknown[] => {
        const d = String(dir);
        if (d === '/ws/packages') return [makeDirent('a', { isDirectory: true })];
        return [];
      },
    );
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
    vi.mocked(existsSync).mockImplementation((p: import('node:fs').PathLike): boolean => {
      const s = String(p);
      if (s === '/ws/packages') return true;
      if (s === join('/ws/packages/a', 'tsconfig.json')) return true;
      return false;
    });
    vi.mocked(readdirSync).mockImplementation(
      (dir: import('node:fs').PathLike, _opts?: unknown): unknown[] => {
        const d = String(dir);
        if (d === '/ws/packages') return [makeDirent('a', { isDirectory: true })];
        return [];
      },
    );
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
});
