/**
 * Tests for workspace lint rules.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import type { WorkspaceContext, WorkspacePackage } from '../../framework/rule-context.ts';
import type { LintResult } from '../../framework/types.ts';
import noBrokenSymlinks from './no-broken-symlinks.ts';
import noEmptyDirectories from './no-empty-directories.ts';
import noLeftoverSqlite from './no-leftover-sqlite.ts';
import noLockfileLocalLinks from './no-lockfile-local-links.ts';
import noUnpinnedGitDeps from './no-unpinned-git-deps.ts';
import noMergeConflicts from './no-merge-conflicts.ts';
import noUntrackedArtifacts from './no-untracked-artifacts.ts';
import requireGitRepo from './require-git-repo.ts';
import requireLockfile from './require-lockfile.ts';
import namesValid from '../package/names-valid.ts';
import noAbsoluteWorkspaceGlobs from './no-absolute-workspace-globs.ts';
import noDuplicateWorkspaceGlobs from './no-duplicate-workspace-globs.ts';
import noNodeModulesWorkspaceGlobs from './no-node-modules-workspace-globs.ts';
import noTestDirWorkspaceGlobs from './no-test-dir-workspace-globs.ts';
import noTrailingSlashGlobs from './no-trailing-slash-globs.ts';
import requireWorkspaceSchema from './require-workspace-schema.ts';
import workspaceValid from './workspace-valid.ts';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Create a mock WorkspaceContext for testing.
 *
 * @param overrides - Context overrides
 * @returns Mock WorkspaceContext
 */
function mockContext(
  overrides: { rootDir?: string; files?: Map<string, string>; packages?: WorkspacePackage[] } = {},
): WorkspaceContext {
  const files: Map<string, string> = overrides.files ?? new Map();
  const packages: WorkspacePackage[] = overrides.packages ?? [];

  return {
    allFiles: async function* (): AsyncIterable<string> {
      for (const path of files.keys()) {
        yield path;
      }
    },
    dirExists: (_path: string): Promise<boolean> =>
      new Promise<boolean>((resolve: (v: boolean) => void): void => {
        resolve(true);
      }),
    fileExists: (path: string): Promise<boolean> =>
      new Promise<boolean>((resolve: (v: boolean) => void): void => {
        resolve(files.has(path));
      }),
    getWorkspacePackages: (): Promise<WorkspacePackage[]> =>
      new Promise<WorkspacePackage[]>((resolve: (v: WorkspacePackage[]) => void): void => {
        resolve(packages);
      }),
    readFile: (path: string): Promise<string> =>
      new Promise<string>((resolve: (v: string) => void, reject: (e: Error) => void): void => {
        const content: string | undefined = files.get(path);
        if (content === undefined) {
          reject(new Error(`File not found: ${path}`));
          return;
        }
        resolve(content);
      }),
    rootDir: overrides.rootDir ?? '/workspace',
  };
}

// =============================================================================
// workspace/workspace-valid
// =============================================================================

describe('workspace/workspace-valid', () => {
  it('has correct rule metadata', () => {
    expect(workspaceValid.id).toBe('workspace/workspace-valid');
    expect(workspaceValid.scope).toBe('workspace');
    expect(typeof workspaceValid.check).toBe('function');
  });

  it('reports error when pnpm-workspace.yaml is missing', async () => {
    const ctx: WorkspaceContext = mockContext({ files: new Map() });
    const results: LintResult[] = await workspaceValid.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/workspace-valid');
    expect(results[0]!.message).toContain('Missing pnpm-workspace.yaml');
    expect(results[0]!.severity).toBe('error');
  });

  it('reports error when packages field is missing', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pnpm-workspace.yaml', 'catalogs:\n  default:\n    valibot: ^1.0.0\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await workspaceValid.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Missing "packages" field');
  });

  it('reports error when packages array is empty', async () => {
    const files: Map<string, string> = new Map([['/workspace/pnpm-workspace.yaml', 'packages:\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await workspaceValid.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('empty');
  });

  it('passes for valid workspace file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pnpm-workspace.yaml', 'packages:\n  - "packages/*"\n  - "apps/*"\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await workspaceValid.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports error for read failure', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      fileExists: (): Promise<boolean> =>
        new Promise<boolean>((resolve: (v: boolean) => void): void => {
          resolve(true);
        }),
      readFile: (): Promise<string> =>
        new Promise<string>((_resolve: (v: string) => void, reject: (e: Error) => void): void => {
          reject(new Error('Permission denied'));
        }),
    };
    const results: LintResult[] = await workspaceValid.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Cannot read');
  });
});

// =============================================================================
// package/names-valid
// =============================================================================

describe('package/names-valid', () => {
  it('has correct rule metadata', () => {
    expect(namesValid.id).toBe('package/names-valid');
    expect(namesValid.scope).toBe('workspace');
    expect(typeof namesValid.check).toBe('function');
  });

  it('reports error for missing name field', async () => {
    const packages: WorkspacePackage[] = [
      {
        dir: '/workspace/packages/a',
        name: undefined,
        packageJson: {},
        path: '/workspace/packages/a/package.json',
      },
    ];
    const files: Map<string, string> = new Map([['/workspace/packages/a/package.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files, packages });
    const results: LintResult[] = await namesValid.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('package/names-valid');
    expect(results[0]!.message).toContain('Missing "name"');
    expect(results[0]!.severity).toBe('error');
  });

  it('reports error for non-string name', async () => {
    const packages: WorkspacePackage[] = [
      {
        dir: '/workspace/packages/a',
        name: undefined,
        packageJson: { name: 42 },
        path: '/workspace/packages/a/package.json',
      },
    ];
    const files: Map<string, string> = new Map([
      ['/workspace/packages/a/package.json', '{\n  "name": 42\n}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files, packages });
    const results: LintResult[] = await namesValid.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('must be a string');
  });

  it('reports error for empty name', async () => {
    const packages: WorkspacePackage[] = [
      {
        dir: '/workspace/packages/a',
        name: '  ',
        packageJson: { name: '  ' },
        path: '/workspace/packages/a/package.json',
      },
    ];
    const files: Map<string, string> = new Map([
      ['/workspace/packages/a/package.json', '{\n  "name": "  "\n}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files, packages });
    const results: LintResult[] = await namesValid.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('cannot be empty');
  });

  it('reports error for invalid npm name (uppercase)', async () => {
    const packages: WorkspacePackage[] = [
      {
        dir: '/workspace/packages/a',
        name: 'MyPackage',
        packageJson: { name: 'MyPackage' },
        path: '/workspace/packages/a/package.json',
      },
    ];
    const files: Map<string, string> = new Map([
      ['/workspace/packages/a/package.json', '{\n  "name": "MyPackage"\n}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files, packages });
    const results: LintResult[] = await namesValid.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Invalid package name');
    expect(results[0]!.message).toContain('must be lowercase');
  });

  it('reports error for name with spaces', async () => {
    const packages: WorkspacePackage[] = [
      {
        dir: '/workspace/packages/a',
        name: 'my package',
        packageJson: { name: 'my package' },
        path: '/workspace/packages/a/package.json',
      },
    ];
    const files: Map<string, string> = new Map([
      ['/workspace/packages/a/package.json', '{\n  "name": "my package"\n}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files, packages });
    const results: LintResult[] = await namesValid.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('cannot contain spaces');
  });

  it('detects duplicate package names', async () => {
    const packages: WorkspacePackage[] = [
      {
        dir: '/workspace/packages/a',
        name: '@test/shared',
        packageJson: { name: '@test/shared' },
        path: '/workspace/packages/a/package.json',
      },
      {
        dir: '/workspace/packages/b',
        name: '@test/shared',
        packageJson: { name: '@test/shared' },
        path: '/workspace/packages/b/package.json',
      },
    ];
    const files: Map<string, string> = new Map([
      ['/workspace/packages/a/package.json', '{\n  "name": "@test/shared"\n}'],
      ['/workspace/packages/b/package.json', '{\n  "name": "@test/shared"\n}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files, packages });
    const results: LintResult[] = await namesValid.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Duplicate package name');
    expect(results[0]!.file).toBe('/workspace/packages/b/package.json');
  });

  it('passes for valid scoped name', async () => {
    const packages: WorkspacePackage[] = [
      {
        dir: '/workspace/packages/a',
        name: '@resist/my-package',
        packageJson: { name: '@resist/my-package' },
        path: '/workspace/packages/a/package.json',
      },
    ];
    const files: Map<string, string> = new Map([
      ['/workspace/packages/a/package.json', '{\n  "name": "@resist/my-package"\n}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files, packages });
    const results: LintResult[] = await namesValid.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes for valid unscoped name', async () => {
    const packages: WorkspacePackage[] = [
      {
        dir: '/workspace/packages/a',
        name: 'my-valid-package',
        packageJson: { name: 'my-valid-package' },
        path: '/workspace/packages/a/package.json',
      },
    ];
    const files: Map<string, string> = new Map([
      ['/workspace/packages/a/package.json', '{\n  "name": "my-valid-package"\n}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files, packages });
    const results: LintResult[] = await namesValid.check(ctx);
    expect(results.length).toBe(0);
  });

  it('handles getWorkspacePackages failure gracefully', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      getWorkspacePackages: (): Promise<WorkspacePackage[]> =>
        new Promise<WorkspacePackage[]>(
          (_resolve: (v: WorkspacePackage[]) => void, reject: (e: Error) => void): void => {
            reject(new Error('failed'));
          },
        ),
    };
    const results: LintResult[] = await namesValid.check(ctx);
    expect(results.length).toBe(0);
  });

  it('handles unreadable package.json gracefully', async () => {
    const packages: WorkspacePackage[] = [
      {
        dir: '/workspace/packages/a',
        name: undefined,
        packageJson: {},
        path: '/workspace/packages/a/package.json',
      },
    ];
    const ctx: WorkspaceContext = mockContext({ packages });
    const results: LintResult[] = await namesValid.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Missing "name"');
  });
});

// =============================================================================
// workspace/no-merge-conflicts — regex precision
// =============================================================================

describe('workspace/no-merge-conflicts', () => {
  it('has correct rule metadata', () => {
    expect(noMergeConflicts.id).toBe('workspace/no-merge-conflicts');
    expect(noMergeConflicts.scope).toBe('workspace');
    expect(typeof noMergeConflicts.check).toBe('function');
  });

  it('detects real <<<<<<< conflict marker', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/src/file.ts',
        '<<<<<<< HEAD\nconst x = 1;\n=======\nconst x = 2;\n>>>>>>> branch\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMergeConflicts.check(ctx);
    expect(results.length).toBe(3);
    expect(results[0]!.message).toContain('<<<<<<<');
    expect(results[1]!.message).toContain('=======');
    expect(results[2]!.message).toContain('>>>>>>>');
  });

  it('detects ======= on its own line (no trailing text)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/file.ts', 'some code\n=======\nmore code\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMergeConflicts.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.line).toBe(2);
  });

  it('does NOT match long separator lines (e.g. ====...====)', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/src/file.ts',
        [
          '/**',
          ' * ============================================================ */',
          '============================================================',
          '================================================================',
          'const x = 1;',
          '',
        ].join('\n'),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMergeConflicts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('does NOT match >>>>>>>> with 8+ chars', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/file.ts', '>>>>>>>>>>>>>>\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMergeConflicts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('does NOT match <<<<<<<< with 8+ chars', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/file.ts', '<<<<<<<<<<<<<<\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMergeConflicts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('matches ======= followed by space (merge conflict)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/file.ts', '======= some marker\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMergeConflicts.check(ctx);
    expect(results.length).toBe(1);
  });

  it('matches <<<<<<< HEAD (standard conflict marker)', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/file.ts', '<<<<<<< HEAD\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMergeConflicts.check(ctx);
    expect(results.length).toBe(1);
  });

  it('matches >>>>>>> branch-name (standard conflict marker)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/file.ts', '>>>>>>> feature/my-branch\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMergeConflicts.check(ctx);
    expect(results.length).toBe(1);
  });

  it('returns no results for clean files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/clean.ts', 'export const x: number = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMergeConflicts.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-untracked-artifacts
// =============================================================================

describe('workspace/no-untracked-artifacts', () => {
  it('flags .DS_Store files', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/.DS_Store', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUntrackedArtifacts.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-untracked-artifacts');
    expect(results[0]!.severity).toBe('warning');
  });

  it('flags *.tmp files', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/data.tmp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUntrackedArtifacts.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-untracked-artifacts');
  });

  it('flags *.bak files', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/config.bak', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUntrackedArtifacts.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-untracked-artifacts');
  });

  it('ignores normal source files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export const x: number = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUntrackedArtifacts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('flags multiple artifacts in one scan', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/.DS_Store', ''],
      ['/workspace/lib/.DS_Store', ''],
      ['/workspace/src/old.bak', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUntrackedArtifacts.check(ctx);
    expect(results.length).toBe(3);
  });
});

// =============================================================================
// workspace/no-broken-symlinks
// =============================================================================

// =============================================================================
// workspace/no-leftover-sqlite
// =============================================================================

describe('workspace/no-leftover-sqlite', () => {
  it('flags .sqlite file in .wrangler/state/', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/products/app/.wrangler/state/d1.sqlite', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLeftoverSqlite.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-leftover-sqlite');
    expect(results[0]!.severity).toBe('warning');
  });

  it('flags .sqlite-wal file in .wrangler/state/', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/products/app/.wrangler/state/d1.sqlite-wal', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLeftoverSqlite.check(ctx);
    expect(results.length).toBe(1);
  });

  it('flags .sqlite-shm file in .wrangler/state/', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/products/app/.wrangler/state/d1.sqlite-shm', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLeftoverSqlite.check(ctx);
    expect(results.length).toBe(1);
  });

  it('ignores sqlite files outside .wrangler/state/', async () => {
    const files: Map<string, string> = new Map([['/workspace/data/local.sqlite', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLeftoverSqlite.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-sqlite files in .wrangler/state/', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/products/app/.wrangler/state/config.json', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLeftoverSqlite.check(ctx);
    expect(results.length).toBe(0);
  });

  it('flags multiple sqlite artifacts', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/products/app-a/.wrangler/state/d1.sqlite', ''],
      ['/workspace/packages/products/app-b/.wrangler/state/d1.sqlite-wal', ''],
      ['/workspace/packages/products/app-c/.wrangler/state/d1.sqlite-shm', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLeftoverSqlite.check(ctx);
    expect(results.length).toBe(3);
  });
});

// =============================================================================
// workspace/no-broken-symlinks
// =============================================================================

describe('workspace/no-broken-symlinks', () => {
  it('has correct rule metadata', () => {
    expect(noBrokenSymlinks.id).toBe('workspace/no-broken-symlinks');
    expect(noBrokenSymlinks.scope).toBe('workspace');
    expect(noBrokenSymlinks.fixable).toBe(false);
    expect(typeof noBrokenSymlinks.check).toBe('function');
  });

  it('returns empty when node_modules does not exist', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      dirExists: (_path: string): Promise<boolean> =>
        new Promise<boolean>((resolve: (v: boolean) => void): void => {
          resolve(false);
        }),
    };
    const results: LintResult[] = await noBrokenSymlinks.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/require-git-repo
// =============================================================================

describe('workspace/require-git-repo', () => {
  it('has correct rule metadata', () => {
    expect(requireGitRepo.id).toBe('workspace/require-git-repo');
    expect(requireGitRepo.scope).toBe('workspace');
    expect(requireGitRepo.fixable).toBe(false);
    expect(typeof requireGitRepo.check).toBe('function');
  });

  it('reports error when .git is missing', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      dirExists: (path: string): Promise<boolean> =>
        new Promise<boolean>((resolve: (v: boolean) => void): void => {
          resolve(!path.includes('.git'));
        }),
      fileExists: (path: string): Promise<boolean> =>
        new Promise<boolean>((resolve: (v: boolean) => void): void => {
          resolve(!path.includes('.git'));
        }),
    };
    const results: LintResult[] = await requireGitRepo.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.ruleId).toBe('workspace/require-git-repo');
  });

  it('passes when .git directory exists', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      dirExists: (path: string): Promise<boolean> =>
        new Promise<boolean>((resolve: (v: boolean) => void): void => {
          resolve(path.includes('.git'));
        }),
    };
    const results: LintResult[] = await requireGitRepo.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when .git is a file (worktree)', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      dirExists: (_path: string): Promise<boolean> =>
        new Promise<boolean>((resolve: (v: boolean) => void): void => {
          resolve(false);
        }),
      fileExists: (path: string): Promise<boolean> =>
        new Promise<boolean>((resolve: (v: boolean) => void): void => {
          resolve(path.includes('.git'));
        }),
    };
    const results: LintResult[] = await requireGitRepo.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-empty-directories
// =============================================================================

describe('workspace/no-empty-directories', () => {
  it('has correct rule metadata', () => {
    expect(noEmptyDirectories.id).toBe('workspace/no-empty-directories');
    expect(noEmptyDirectories.scope).toBe('workspace');
    expect(noEmptyDirectories.fixable).toBe(false);
    expect(typeof noEmptyDirectories.check).toBe('function');
  });

  it('returns empty results by default', () => {
    expect(noEmptyDirectories.categories).toContain('workspace');
    expect(noEmptyDirectories.categories).toContain('safety');
    expect(noEmptyDirectories.stages).toContain('lint');
    expect(noEmptyDirectories.stages).toContain('ci');
    expect(typeof noEmptyDirectories.check).toBe('function');
  });
});

// =============================================================================
// workspace/require-lockfile
// =============================================================================

describe('workspace/require-lockfile', () => {
  it('has correct rule metadata', () => {
    expect(requireLockfile.id).toBe('workspace/require-lockfile');
    expect(requireLockfile.scope).toBe('workspace');
    expect(requireLockfile.fixable).toBe(false);
    expect(typeof requireLockfile.check).toBe('function');
  });

  it('reports error when pnpm-lock.yaml is missing', async () => {
    const ctx: WorkspaceContext = mockContext({
      files: new Map(),
    });
    const results: LintResult[] = await requireLockfile.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Missing pnpm-lock.yaml');
  });

  it('reports error when lockfile is empty', async () => {
    const files: Map<string, string> = new Map([['/workspace/pnpm-lock.yaml', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireLockfile.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('malformed');
  });

  it('reports error when lockfile has no lockfileVersion', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pnpm-lock.yaml', 'importers:\n  .:\n    dependencies: {}\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireLockfile.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('malformed');
  });

  it('passes for valid lockfile', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/pnpm-lock.yaml',
        'lockfileVersion: "9.0"\nimporters:\n  .:\n    dependencies: {}\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireLockfile.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-lockfile-local-links
// =============================================================================

describe('workspace/no-lockfile-local-links', () => {
  it('has correct rule metadata', () => {
    expect(noLockfileLocalLinks.id).toBe('workspace/no-lockfile-local-links');
    expect(noLockfileLocalLinks.scope).toBe('workspace');
    expect(noLockfileLocalLinks.fixable).toBe(false);
    expect(typeof noLockfileLocalLinks.check).toBe('function');
  });

  it('flags file: dependency in lockfile', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/pnpm-lock.yaml',
        'lockfileVersion: "9.0"\nimporters:\n  .:\n    dependencies:\n      my-lib:\n        version: file:../lib\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLockfileLocalLinks.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('file:');
  });

  it('flags link: dependency in lockfile', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/pnpm-lock.yaml',
        'lockfileVersion: "9.0"\nimporters:\n  .:\n    dependencies:\n      my-utils:\n        version: link:../utils\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLockfileLocalLinks.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('link:');
  });

  it('ignores clean lockfile', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/pnpm-lock.yaml',
        'lockfileVersion: "9.0"\nimporters:\n  .:\n    dependencies:\n      valibot:\n        version: 1.0.0\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLockfileLocalLinks.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when lockfile missing', async () => {
    const ctx: WorkspaceContext = mockContext({ files: new Map() });
    const results: LintResult[] = await noLockfileLocalLinks.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-unpinned-git-deps
// =============================================================================

describe('workspace/no-unpinned-git-deps', () => {
  it('has correct rule metadata', () => {
    expect(noUnpinnedGitDeps.id).toBe('workspace/no-unpinned-git-deps');
    expect(noUnpinnedGitDeps.scope).toBe('workspace');
    expect(noUnpinnedGitDeps.fixable).toBe(false);
    expect(typeof noUnpinnedGitDeps.check).toBe('function');
  });

  it('flags github.com dep with #main', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/pnpm-lock.yaml',
        'lockfileVersion: "9.0"\npackages:\n  github.com/org/repo#main:\n    resolution: {}\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnpinnedGitDeps.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Unpinned');
  });

  it('flags github.com dep with #master', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/pnpm-lock.yaml',
        'lockfileVersion: "9.0"\npackages:\n  github.com/org/repo#master:\n    resolution: {}\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnpinnedGitDeps.check(ctx);
    expect(results.length).toBe(1);
  });

  it('flags github.com dep with #next', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/pnpm-lock.yaml',
        'lockfileVersion: "9.0"\npackages:\n  github.com/org/repo#next:\n    resolution: {}\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnpinnedGitDeps.check(ctx);
    expect(results.length).toBe(1);
  });

  it('ignores github.com dep with SHA', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/pnpm-lock.yaml',
        'lockfileVersion: "9.0"\npackages:\n  github.com/org/repo#a1b2c3d4e5f6:\n    resolution: {}\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnpinnedGitDeps.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when lockfile missing', async () => {
    const ctx: WorkspaceContext = mockContext({ files: new Map() });
    const results: LintResult[] = await noUnpinnedGitDeps.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-absolute-workspace-globs
// =============================================================================

describe('workspace/no-absolute-workspace-globs', () => {
  it('has correct rule metadata', () => {
    expect(noAbsoluteWorkspaceGlobs.id).toBe('workspace/no-absolute-workspace-globs');
    expect(noAbsoluteWorkspaceGlobs.scope).toBe('workspace');
    expect(noAbsoluteWorkspaceGlobs.fixable).toBe(false);
    expect(typeof noAbsoluteWorkspaceGlobs.check).toBe('function');
  });

  it('flags absolute glob starting with /', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pnpm-workspace.yaml', 'packages:\n  - "/apps/*"\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noAbsoluteWorkspaceGlobs.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('/apps/*');
  });

  it('passes for relative globs', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pnpm-workspace.yaml', 'packages:\n  - "packages/*"\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noAbsoluteWorkspaceGlobs.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when workspace file missing', async () => {
    const ctx: WorkspaceContext = mockContext({ files: new Map() });
    const results: LintResult[] = await noAbsoluteWorkspaceGlobs.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-trailing-slash-globs
// =============================================================================

describe('workspace/no-trailing-slash-globs', () => {
  it('has correct rule metadata', () => {
    expect(noTrailingSlashGlobs.id).toBe('workspace/no-trailing-slash-globs');
    expect(noTrailingSlashGlobs.scope).toBe('workspace');
    expect(noTrailingSlashGlobs.fixable).toBe(false);
    expect(typeof noTrailingSlashGlobs.check).toBe('function');
  });

  it('flags glob ending with /', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pnpm-workspace.yaml', 'packages:\n  - "packages/*/"\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTrailingSlashGlobs.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('trailing slash');
  });

  it('passes for globs without trailing slash', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pnpm-workspace.yaml', 'packages:\n  - "packages/*"\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTrailingSlashGlobs.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when workspace file missing', async () => {
    const ctx: WorkspaceContext = mockContext({ files: new Map() });
    const results: LintResult[] = await noTrailingSlashGlobs.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-duplicate-workspace-globs
// =============================================================================

describe('workspace/no-duplicate-workspace-globs', () => {
  it('has correct rule metadata', () => {
    expect(noDuplicateWorkspaceGlobs.id).toBe('workspace/no-duplicate-workspace-globs');
    expect(noDuplicateWorkspaceGlobs.scope).toBe('workspace');
    expect(noDuplicateWorkspaceGlobs.fixable).toBe(false);
    expect(typeof noDuplicateWorkspaceGlobs.check).toBe('function');
  });

  it('flags duplicate glob entries', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pnpm-workspace.yaml', 'packages:\n  - "packages/*"\n  - "packages/*"\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDuplicateWorkspaceGlobs.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Duplicate');
  });

  it('passes for unique globs', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pnpm-workspace.yaml', 'packages:\n  - "packages/*"\n  - "apps/*"\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDuplicateWorkspaceGlobs.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when workspace file missing', async () => {
    const ctx: WorkspaceContext = mockContext({ files: new Map() });
    const results: LintResult[] = await noDuplicateWorkspaceGlobs.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-test-dir-workspace-globs
// =============================================================================

describe('workspace/no-test-dir-workspace-globs', () => {
  it('has correct rule metadata', () => {
    expect(noTestDirWorkspaceGlobs.id).toBe('workspace/no-test-dir-workspace-globs');
    expect(noTestDirWorkspaceGlobs.scope).toBe('workspace');
    expect(noTestDirWorkspaceGlobs.fixable).toBe(false);
    expect(typeof noTestDirWorkspaceGlobs.check).toBe('function');
  });

  it('flags glob containing test/', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pnpm-workspace.yaml', 'packages:\n  - "test/*"\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTestDirWorkspaceGlobs.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('test');
  });

  it('flags glob containing fixtures/', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pnpm-workspace.yaml', 'packages:\n  - "packages/fixtures/*"\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTestDirWorkspaceGlobs.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes for normal package globs', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pnpm-workspace.yaml', 'packages:\n  - "packages/*"\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTestDirWorkspaceGlobs.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when workspace file missing', async () => {
    const ctx: WorkspaceContext = mockContext({ files: new Map() });
    const results: LintResult[] = await noTestDirWorkspaceGlobs.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-node-modules-workspace-globs
// =============================================================================

describe('workspace/no-node-modules-workspace-globs', () => {
  it('has correct rule metadata', () => {
    expect(noNodeModulesWorkspaceGlobs.id).toBe('workspace/no-node-modules-workspace-globs');
    expect(noNodeModulesWorkspaceGlobs.scope).toBe('workspace');
    expect(noNodeModulesWorkspaceGlobs.fixable).toBe(false);
    expect(typeof noNodeModulesWorkspaceGlobs.check).toBe('function');
  });

  it('flags glob containing node_modules', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pnpm-workspace.yaml', 'packages:\n  - "apps/**/node_modules/*"\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNodeModulesWorkspaceGlobs.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('node_modules');
  });

  it('passes for clean globs', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pnpm-workspace.yaml', 'packages:\n  - "packages/*"\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNodeModulesWorkspaceGlobs.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when workspace file missing', async () => {
    const ctx: WorkspaceContext = mockContext({ files: new Map() });
    const results: LintResult[] = await noNodeModulesWorkspaceGlobs.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/require-workspace-schema
// =============================================================================

describe('workspace/require-workspace-schema', () => {
  it('has correct rule metadata', () => {
    expect(requireWorkspaceSchema.id).toBe('workspace/require-workspace-schema');
    expect(requireWorkspaceSchema.scope).toBe('workspace');
    expect(requireWorkspaceSchema.fixable).toBe(false);
    expect(typeof requireWorkspaceSchema.check).toBe('function');
  });

  it('flags missing schema comment', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pnpm-workspace.yaml', 'packages:\n  - "packages/*"\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireWorkspaceSchema.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('$schema');
  });

  it('passes when schema comment present', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/pnpm-workspace.yaml',
        '# yaml-language-server: $schema=./schemas/pnpm-workspace.schema.json\npackages:\n  - "packages/*"\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireWorkspaceSchema.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when workspace file missing', async () => {
    const ctx: WorkspaceContext = mockContext({ files: new Map() });
    const results: LintResult[] = await requireWorkspaceSchema.check(ctx);
    expect(results.length).toBe(0);
  });
});
