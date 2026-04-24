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

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
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

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

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
    expect(result.sort()).toEqual(['/ws/packages/a', '/ws/packages/c']);
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
    vi.mocked(execFileSync).mockReset();
  });

  it('returns empty when no packages discovered', () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const results = runTsgoAllPackages('/ws');
    expect(results).toEqual([]);
    expect(vi.mocked(execFileSync)).not.toHaveBeenCalled();
  });

  it('runs tsgo in every discovered package when files is empty', () => {
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
    vi.mocked(execFileSync).mockReturnValue('');

    const results = runTsgoAllPackages('/ws');
    expect(results).toEqual([]);
    expect(vi.mocked(execFileSync)).toHaveBeenCalledTimes(2);
  });

  it('scopes execFileSync to a single package when one file is passed', () => {
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
    vi.mocked(execFileSync).mockReturnValue('');

    const results = runTsgoAllPackages('/ws', ['/ws/packages/a/src/x.ts']);
    expect(results).toEqual([]);
    expect(vi.mocked(execFileSync)).toHaveBeenCalledTimes(1);
    const call = vi.mocked(execFileSync).mock.calls[0];
    expect(call?.[2]).toMatchObject({ cwd: '/ws/packages/a' });
  });

  it('runs tsgo once per owning package for files in multiple packages', () => {
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
    vi.mocked(execFileSync).mockReturnValue('');

    runTsgoAllPackages('/ws', ['/ws/packages/a/src/x.ts', '/ws/packages/c/src/y.ts']);
    expect(vi.mocked(execFileSync)).toHaveBeenCalledTimes(2);
    const cwds: string[] = vi
      .mocked(execFileSync)
      .mock.calls.map((c): string => (c[2] as { cwd: string }).cwd);
    expect(cwds.sort()).toEqual(['/ws/packages/a', '/ws/packages/c']);
  });

  it('runs no tsgo calls when files list does not overlap any package', () => {
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

    const results = runTsgoAllPackages('/ws', ['/elsewhere/foo.ts']);
    expect(results).toEqual([]);
    expect(vi.mocked(execFileSync)).not.toHaveBeenCalled();
  });

  it('captures stdout when tsgo exits non-zero', () => {
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
    vi.mocked(execFileSync).mockImplementation((): never => {
      throw err;
    });

    const results = runTsgoAllPackages('/ws');
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('tsgo/TS2322');
    expect(results[0]?.message).toBe('boom.');
  });

  it('emits internal/tool-crash when tsgo throws without stdout', () => {
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
    vi.mocked(execFileSync).mockImplementation((): never => {
      throw new Error('ENOENT: command not found');
    });

    const results = runTsgoAllPackages('/ws');
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('internal/tool-crash');
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain('tsgo crashed');
    expect(results[0]?.message).toContain('ENOENT');
  });
});
