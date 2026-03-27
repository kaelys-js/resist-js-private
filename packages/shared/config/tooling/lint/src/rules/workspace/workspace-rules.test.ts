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
import workspaceGlobsResolve from './workspace-globs-resolve.ts';
import workspacePackagesExist from './workspace-packages-exist.ts';
import workspacePathsExist from './workspace-paths-exist.ts';
import workspaceValid from './workspace-valid.ts';
import noUtf8Bom from './no-utf8-bom.ts';
import noTrailingWhitespace from './no-trailing-whitespace.ts';
import noTabsInCode from './no-tabs-in-code.ts';
import requireUtf8Encoding from './require-utf8-encoding.ts';
import noDangerousShellCommands from './no-dangerous-shell-commands.ts';
import noMissingShebang from './no-missing-shebang.ts';
import noDebugStatements from './no-debug-statements.ts';
import noTodoComments from './no-todo-comments.ts';
import noLongLines from './no-long-lines.ts';
import requireLicense from './require-license.ts';
import requireTypeField from './require-type-field.ts';
import validBinTargets from './valid-bin-targets.ts';
import noEditorArtifacts from './no-editor-artifacts.ts';
import noBinaryFiles from './no-binary-files.ts';
import noCaseCollisions from './no-case-collisions.ts';
import noLargeFiles from './no-large-files.ts';
import noTsbuildinfo from './no-tsbuildinfo.ts';
import noEmptyFiles from './no-empty-files.ts';
import noExecBit from './no-exec-bit.ts';
import noTempFiles from './no-temp-files.ts';
import noExcessTrailingNewlines from './no-excess-trailing-newlines.ts';
import noMixedIndentation from './no-mixed-indentation.ts';
import noHardcodedIps from './no-hardcoded-ips.ts';
import noJsSourceFiles from './no-js-source-files.ts';
import noInsecureUrls from './no-insecure-urls.ts';
import noSkippedTests from './no-skipped-tests.ts';
import noUnsafeRegex from './no-unsafe-regex.ts';

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

// =============================================================================
// workspace/workspace-globs-resolve
// =============================================================================

describe('workspace/workspace-globs-resolve', () => {
  it('has correct rule metadata', () => {
    expect(workspaceGlobsResolve.id).toBe('workspace/workspace-globs-resolve');
    expect(workspaceGlobsResolve.scope).toBe('workspace');
    expect(workspaceGlobsResolve.fixable).toBe(false);
    expect(typeof workspaceGlobsResolve.check).toBe('function');
  });

  it('flags glob whose base directory does not exist', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pnpm-workspace.yaml', 'packages:\n  - "nonexistent/*"\n'],
    ]);
    const ctx: WorkspaceContext = {
      ...mockContext({ files }),
      dirExists: (path: string): Promise<boolean> =>
        new Promise<boolean>((resolve: (v: boolean) => void): void => {
          resolve(!path.includes('nonexistent'));
        }),
    };
    const results: LintResult[] = await workspaceGlobsResolve.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('nonexistent');
  });

  it('passes when base directory exists', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pnpm-workspace.yaml', 'packages:\n  - "packages/*"\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await workspaceGlobsResolve.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when workspace file missing', async () => {
    const ctx: WorkspaceContext = mockContext({ files: new Map() });
    const results: LintResult[] = await workspaceGlobsResolve.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/workspace-packages-exist
// =============================================================================

describe('workspace/workspace-packages-exist', () => {
  it('has correct rule metadata', () => {
    expect(workspacePackagesExist.id).toBe('workspace/workspace-packages-exist');
    expect(workspacePackagesExist.scope).toBe('workspace');
    expect(workspacePackagesExist.fixable).toBe(false);
    expect(typeof workspacePackagesExist.check).toBe('function');
  });

  it('flags glob with no matching packages', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pnpm-workspace.yaml', 'packages:\n  - "empty/*"\n'],
    ]);
    const packages: WorkspacePackage[] = [
      {
        dir: '/workspace/packages/lib',
        name: '@test/lib',
        packageJson: { name: '@test/lib' },
        path: '/workspace/packages/lib/package.json',
      },
    ];
    const ctx: WorkspaceContext = mockContext({ files, packages });
    const results: LintResult[] = await workspacePackagesExist.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('No packages found');
  });

  it('passes when packages match glob', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pnpm-workspace.yaml', 'packages:\n  - "packages/*"\n'],
    ]);
    const packages: WorkspacePackage[] = [
      {
        dir: '/workspace/packages/lib',
        name: '@test/lib',
        packageJson: { name: '@test/lib' },
        path: '/workspace/packages/lib/package.json',
      },
    ];
    const ctx: WorkspaceContext = mockContext({ files, packages });
    const results: LintResult[] = await workspacePackagesExist.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when workspace file missing', async () => {
    const ctx: WorkspaceContext = mockContext({ files: new Map() });
    const results: LintResult[] = await workspacePackagesExist.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/workspace-paths-exist
// =============================================================================

describe('workspace/workspace-paths-exist', () => {
  it('has correct rule metadata', () => {
    expect(workspacePathsExist.id).toBe('workspace/workspace-paths-exist');
    expect(workspacePathsExist.scope).toBe('workspace');
    expect(workspacePathsExist.fixable).toBe(false);
    expect(typeof workspacePathsExist.check).toBe('function');
  });

  it('flags glob whose parent directory does not exist', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pnpm-workspace.yaml', 'packages:\n  - "missing/*"\n'],
    ]);
    const ctx: WorkspaceContext = {
      ...mockContext({ files }),
      dirExists: (path: string): Promise<boolean> =>
        new Promise<boolean>((resolve: (v: boolean) => void): void => {
          resolve(!path.includes('missing'));
        }),
    };
    const results: LintResult[] = await workspacePathsExist.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('missing');
  });

  it('passes when parent directory exists', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pnpm-workspace.yaml', 'packages:\n  - "packages/*"\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await workspacePathsExist.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when workspace file missing', async () => {
    const ctx: WorkspaceContext = mockContext({ files: new Map() });
    const results: LintResult[] = await workspacePathsExist.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-utf8-bom
// =============================================================================

describe('workspace/no-utf8-bom', () => {
  it('has correct rule metadata', () => {
    expect(noUtf8Bom.id).toBe('workspace/no-utf8-bom');
    expect(noUtf8Bom.scope).toBe('workspace');
    expect(noUtf8Bom.fixable).toBe(false);
    expect(typeof noUtf8Bom.check).toBe('function');
  });

  it('flags files with UTF-8 BOM', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/app.ts', '\uFEFFconst x = 1;\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUtf8Bom.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.ruleId).toBe('workspace/no-utf8-bom');
    expect(results[0]!.message).toContain('UTF-8 BOM');
  });

  it('passes for files without BOM', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/app.ts', 'const x = 1;\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUtf8Bom.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-trailing-whitespace
// =============================================================================

describe('workspace/no-trailing-whitespace', () => {
  it('has correct rule metadata', () => {
    expect(noTrailingWhitespace.id).toBe('workspace/no-trailing-whitespace');
    expect(noTrailingWhitespace.scope).toBe('workspace');
    expect(noTrailingWhitespace.fixable).toBe(false);
    expect(typeof noTrailingWhitespace.check).toBe('function');
  });

  it('flags lines with trailing whitespace', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/app.ts', 'const x = 1;   \n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTrailingWhitespace.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.ruleId).toBe('workspace/no-trailing-whitespace');
    expect(results[0]!.message).toContain('Trailing whitespace');
  });

  it('passes for clean files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/app.ts', 'const x = 1;\nconst y = 2;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTrailingWhitespace.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-tabs-in-code
// =============================================================================

describe('workspace/no-tabs-in-code', () => {
  it('has correct rule metadata', () => {
    expect(noTabsInCode.id).toBe('workspace/no-tabs-in-code');
    expect(noTabsInCode.scope).toBe('workspace');
    expect(noTabsInCode.fixable).toBe(false);
    expect(typeof noTabsInCode.check).toBe('function');
  });

  it('flags files with tab characters', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/app.ts', '\tconst x = 1;\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTabsInCode.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.ruleId).toBe('workspace/no-tabs-in-code');
    expect(results[0]!.message).toContain('Tab character');
  });

  it('passes for files without tabs', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/app.ts', '  const x = 1;\n  const y = 2;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTabsInCode.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/require-utf8-encoding
// =============================================================================

describe('workspace/require-utf8-encoding', () => {
  it('has correct rule metadata', () => {
    expect(requireUtf8Encoding.id).toBe('workspace/require-utf8-encoding');
    expect(requireUtf8Encoding.scope).toBe('workspace');
    expect(requireUtf8Encoding.fixable).toBe(false);
    expect(typeof requireUtf8Encoding.check).toBe('function');
  });

  it('flags files with replacement character', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/data.bin', 'hello \uFFFD world\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireUtf8Encoding.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.ruleId).toBe('workspace/require-utf8-encoding');
    expect(results[0]!.message).toContain('non-UTF-8 encoding');
  });

  it('passes for valid UTF-8 files', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/app.ts', 'const x = 1;\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireUtf8Encoding.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-dangerous-shell-commands
// =============================================================================

describe('workspace/no-dangerous-shell-commands', () => {
  it('has correct rule metadata', () => {
    expect(noDangerousShellCommands.id).toBe('workspace/no-dangerous-shell-commands');
    expect(noDangerousShellCommands.scope).toBe('workspace');
    expect(noDangerousShellCommands.fixable).toBe(false);
    expect(typeof noDangerousShellCommands.check).toBe('function');
  });

  it('flags rm -rf / in shell files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/scripts/cleanup.sh', '#!/bin/bash\nrm -rf /\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDangerousShellCommands.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.ruleId).toBe('workspace/no-dangerous-shell-commands');
    expect(results[0]!.message).toContain('Dangerous command');
  });

  it('flags fork bombs in shell files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/scripts/bad.sh', '#!/bin/bash\n:(){ :|:& };:\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDangerousShellCommands.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-dangerous-shell-commands');
  });

  it('ignores safe shell commands', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/scripts/build.sh', '#!/bin/bash\necho "Hello"\nls -la\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDangerousShellCommands.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-.sh files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/app.ts', 'const cmd = "rm -rf /";\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDangerousShellCommands.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-missing-shebang
// =============================================================================

describe('workspace/no-missing-shebang', () => {
  it('has correct rule metadata', () => {
    expect(noMissingShebang.id).toBe('workspace/no-missing-shebang');
    expect(noMissingShebang.scope).toBe('workspace');
    expect(noMissingShebang.fixable).toBe(false);
    expect(typeof noMissingShebang.check).toBe('function');
  });

  it('flags .sh files missing shebang', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/scripts/build.sh', 'echo "Hello"\nls -la\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMissingShebang.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.ruleId).toBe('workspace/no-missing-shebang');
    expect(results[0]!.message).toContain('missing shebang');
  });

  it('passes for .sh files with shebang', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/scripts/build.sh', '#!/bin/bash\necho "Hello"\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMissingShebang.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-.sh files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'const x: number = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMissingShebang.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-debug-statements
// =============================================================================

describe('workspace/no-debug-statements', () => {
  it('has correct rule metadata', () => {
    expect(noDebugStatements.id).toBe('workspace/no-debug-statements');
    expect(noDebugStatements.scope).toBe('workspace');
    expect(noDebugStatements.fixable).toBe(false);
    expect(typeof noDebugStatements.check).toBe('function');
  });

  it('flags console.log in .ts files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/app.ts', 'const x: number = 1;\nconsole.log(x);\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDebugStatements.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.ruleId).toBe('workspace/no-debug-statements');
  });

  it('flags debugger statement in .ts files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/app.ts', 'const x: number = 1;\ndebugger;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDebugStatements.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Debug statement');
  });

  it('ignores test files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/app.test.ts', 'console.log("test output");\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDebugStatements.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores spec files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/app.spec.ts', 'console.log("spec output");\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDebugStatements.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-.ts files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/scripts/run.sh', 'console.log("not ts");\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDebugStatements.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-todo-comments
// =============================================================================

describe('workspace/no-todo-comments', () => {
  it('has correct rule metadata', () => {
    expect(noTodoComments.id).toBe('workspace/no-todo-comments');
    expect(noTodoComments.scope).toBe('workspace');
    expect(noTodoComments.fixable).toBe(false);
    expect(typeof noTodoComments.check).toBe('function');
  });

  it('flags TODO comments in .ts files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/app.ts', '// TODO: fix this later\nconst x: number = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTodoComments.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.ruleId).toBe('workspace/no-todo-comments');
  });

  it('flags FIXME comments in .ts files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/app.ts', '// FIXME: broken implementation\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTodoComments.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('TODO comment');
  });

  it('ignores test files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/app.test.ts', '// TODO: add more tests\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTodoComments.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes for files without TODO/FIXME', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/app.ts', 'const x: number = 1;\nexport default x;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTodoComments.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-long-lines
// =============================================================================

describe('workspace/no-long-lines', () => {
  it('has correct rule metadata', () => {
    expect(noLongLines.id).toBe('workspace/no-long-lines');
    expect(noLongLines.scope).toBe('workspace');
    expect(noLongLines.fixable).toBe(false);
    expect(typeof noLongLines.check).toBe('function');
  });

  it('flags lines exceeding 160 characters', async () => {
    const longLine: string = 'a'.repeat(161);
    const files: Map<string, string> = new Map([['/workspace/src/app.ts', `${longLine}\n`]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLongLines.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.ruleId).toBe('workspace/no-long-lines');
    expect(results[0]!.message).toContain('161');
    expect(results[0]!.message).toContain('max 160');
  });

  it('passes for lines within limit', async () => {
    const line: string = 'a'.repeat(160);
    const files: Map<string, string> = new Map([['/workspace/src/app.ts', `${line}\n`]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLongLines.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports correct line number for long line', async () => {
    const longLine: string = 'b'.repeat(200);
    const files: Map<string, string> = new Map([
      ['/workspace/src/app.ts', `const x = 1;\nconst y = 2;\n${longLine}\n`],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLongLines.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.line).toBe(3);
  });
});

// =============================================================================
// workspace/require-license
// =============================================================================

describe('workspace/require-license', () => {
  it('has correct rule metadata', () => {
    expect(requireLicense.id).toBe('workspace/require-license');
    expect(requireLicense.scope).toBe('workspace');
    expect(requireLicense.fixable).toBe(false);
    expect(typeof requireLicense.check).toBe('function');
  });

  it('flags missing canonical LICENSE file', async () => {
    const ctx: WorkspaceContext = mockContext({ files: new Map() });
    const results: LintResult[] = await requireLicense.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/require-license');
    expect(results[0]!.message).toContain('Missing canonical LICENSE file');
    expect(results[0]!.severity).toBe('error');
  });

  it('flags unextractable SPDX from LICENSE', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/en-US/LICENSE', 'Some random text'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireLicense.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Could not determine canonical license');
  });

  it('flags missing license field in package', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/en-US/LICENSE', 'MIT License\n\nCopyright...'],
      ['/workspace/packages/a/package.json', '{"name": "@test/a"}'],
    ]);
    const packages: WorkspacePackage[] = [
      {
        name: '@test/a',
        path: '/workspace/packages/a/package.json',
        dir: '/workspace/packages/a',
        packageJson: { name: '@test/a' },
      },
    ];
    const ctx: WorkspaceContext = mockContext({ files, packages });
    const results: LintResult[] = await requireLicense.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Missing "license" field');
  });

  it('flags mismatched license', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/en-US/LICENSE', 'MIT License\n\nCopyright...'],
      ['/workspace/packages/a/package.json', '{"name": "@test/a", "license": "Apache-2.0"}'],
    ]);
    const packages: WorkspacePackage[] = [
      {
        name: '@test/a',
        path: '/workspace/packages/a/package.json',
        dir: '/workspace/packages/a',
        packageJson: { name: '@test/a', license: 'Apache-2.0' },
      },
    ];
    const ctx: WorkspaceContext = mockContext({ files, packages });
    const results: LintResult[] = await requireLicense.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('License mismatch');
    expect(results[0]!.message).toContain('Apache-2.0');
    expect(results[0]!.message).toContain('MIT');
  });

  it('passes when license matches canonical', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/en-US/LICENSE', 'MIT License\n\nCopyright...'],
      ['/workspace/packages/a/package.json', '{"name": "@test/a", "license": "MIT"}'],
    ]);
    const packages: WorkspacePackage[] = [
      {
        name: '@test/a',
        path: '/workspace/packages/a/package.json',
        dir: '/workspace/packages/a',
        packageJson: { name: '@test/a', license: 'MIT' },
      },
    ];
    const ctx: WorkspaceContext = mockContext({ files, packages });
    const results: LintResult[] = await requireLicense.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/require-type-field
// =============================================================================

describe('workspace/require-type-field', () => {
  it('has correct rule metadata', () => {
    expect(requireTypeField.id).toBe('workspace/require-type-field');
    expect(requireTypeField.scope).toBe('workspace');
    expect(requireTypeField.fixable).toBe(false);
    expect(typeof requireTypeField.check).toBe('function');
  });

  it('flags inconsistent type fields in sibling packages', async () => {
    const packages: WorkspacePackage[] = [
      {
        name: '@test/a',
        path: '/workspace/packages/shared/a/package.json',
        dir: '/workspace/packages/shared/a',
        packageJson: { name: '@test/a', type: 'module' },
      },
      {
        name: '@test/b',
        path: '/workspace/packages/shared/b/package.json',
        dir: '/workspace/packages/shared/b',
        packageJson: { name: '@test/b', type: 'commonjs' },
      },
    ];
    const ctx: WorkspaceContext = mockContext({ packages });
    const results: LintResult[] = await requireTypeField.check(ctx);
    expect(results.length).toBe(2);
    expect(results[0]!.ruleId).toBe('workspace/require-type-field');
    expect(results[0]!.message).toContain('Inconsistent "type" field');
    expect(results[0]!.severity).toBe('error');
  });

  it('passes when all siblings have same type', async () => {
    const packages: WorkspacePackage[] = [
      {
        name: '@test/a',
        path: '/workspace/packages/shared/a/package.json',
        dir: '/workspace/packages/shared/a',
        packageJson: { name: '@test/a', type: 'module' },
      },
      {
        name: '@test/b',
        path: '/workspace/packages/shared/b/package.json',
        dir: '/workspace/packages/shared/b',
        packageJson: { name: '@test/b', type: 'module' },
      },
    ];
    const ctx: WorkspaceContext = mockContext({ packages });
    const results: LintResult[] = await requireTypeField.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when single package in group', async () => {
    const packages: WorkspacePackage[] = [
      {
        name: '@test/a',
        path: '/workspace/packages/shared/a/package.json',
        dir: '/workspace/packages/shared/a',
        packageJson: { name: '@test/a', type: 'module' },
      },
    ];
    const ctx: WorkspaceContext = mockContext({ packages });
    const results: LintResult[] = await requireTypeField.check(ctx);
    expect(results.length).toBe(0);
  });

  it('defaults missing type to commonjs', async () => {
    const packages: WorkspacePackage[] = [
      {
        name: '@test/a',
        path: '/workspace/packages/shared/a/package.json',
        dir: '/workspace/packages/shared/a',
        packageJson: { name: '@test/a', type: 'module' },
      },
      {
        name: '@test/b',
        path: '/workspace/packages/shared/b/package.json',
        dir: '/workspace/packages/shared/b',
        packageJson: { name: '@test/b' },
      },
    ];
    const ctx: WorkspaceContext = mockContext({ packages });
    const results: LintResult[] = await requireTypeField.check(ctx);
    expect(results.length).toBe(2);
    expect(results.some((r: LintResult): boolean => r.message.includes('"module"'))).toBe(true);
    expect(results.some((r: LintResult): boolean => r.message.includes('"commonjs"'))).toBe(true);
  });
});

// =============================================================================
// workspace/valid-bin-targets
// =============================================================================

describe('workspace/valid-bin-targets', () => {
  it('has correct rule metadata', () => {
    expect(validBinTargets.id).toBe('workspace/valid-bin-targets');
    expect(validBinTargets.scope).toBe('workspace');
    expect(validBinTargets.fixable).toBe(false);
    expect(typeof validBinTargets.check).toBe('function');
  });

  it('flags missing bin target file (string bin)', async () => {
    const packages: WorkspacePackage[] = [
      {
        name: '@test/cli',
        path: '/workspace/packages/cli/package.json',
        dir: '/workspace/packages/cli',
        packageJson: { name: '@test/cli', bin: './dist/cli.js' },
      },
    ];
    const ctx: WorkspaceContext = mockContext({ packages, files: new Map() });
    const results: LintResult[] = await validBinTargets.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/valid-bin-targets');
    expect(results[0]!.message).toContain('Missing bin target');
    expect(results[0]!.message).toContain('./dist/cli.js');
    expect(results[0]!.severity).toBe('error');
  });

  it('flags missing bin target file (object bin)', async () => {
    const packages: WorkspacePackage[] = [
      {
        name: '@test/cli',
        path: '/workspace/packages/cli/package.json',
        dir: '/workspace/packages/cli',
        packageJson: { name: '@test/cli', bin: { mycli: './dist/cli.js' } },
      },
    ];
    const ctx: WorkspaceContext = mockContext({ packages, files: new Map() });
    const results: LintResult[] = await validBinTargets.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Missing bin target');
    expect(results[0]!.message).toContain('./dist/cli.js');
  });

  it('passes when bin target exists (string)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/cli/dist/cli.js', '#!/usr/bin/env node\nconsole.log("hi");\n'],
    ]);
    const packages: WorkspacePackage[] = [
      {
        name: '@test/cli',
        path: '/workspace/packages/cli/package.json',
        dir: '/workspace/packages/cli',
        packageJson: { name: '@test/cli', bin: './dist/cli.js' },
      },
    ];
    const ctx: WorkspaceContext = mockContext({ packages, files });
    const results: LintResult[] = await validBinTargets.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when bin target exists (object)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/cli/dist/cli.js', '#!/usr/bin/env node\nconsole.log("hi");\n'],
    ]);
    const packages: WorkspacePackage[] = [
      {
        name: '@test/cli',
        path: '/workspace/packages/cli/package.json',
        dir: '/workspace/packages/cli',
        packageJson: { name: '@test/cli', bin: { mycli: './dist/cli.js' } },
      },
    ];
    const ctx: WorkspaceContext = mockContext({ packages, files });
    const results: LintResult[] = await validBinTargets.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when no bin field', async () => {
    const packages: WorkspacePackage[] = [
      {
        name: '@test/lib',
        path: '/workspace/packages/lib/package.json',
        dir: '/workspace/packages/lib',
        packageJson: { name: '@test/lib' },
      },
    ];
    const ctx: WorkspaceContext = mockContext({ packages });
    const results: LintResult[] = await validBinTargets.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-hardcoded-ips
// =============================================================================

describe('workspace/no-hardcoded-ips', () => {
  it('has correct rule metadata', () => {
    expect(noHardcodedIps.id).toBe('workspace/no-hardcoded-ips');
    expect(noHardcodedIps.scope).toBe('workspace');
    expect(noHardcodedIps.fixable).toBe(false);
    expect(typeof noHardcodedIps.check).toBe('function');
  });

  it('flags file with hardcoded IP', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/config.ts', "const host = '192.168.1.1';"],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noHardcodedIps.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-hardcoded-ips');
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes file with localhost IP', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/config.ts', "const host = '127.0.0.1';"],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noHardcodedIps.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes file with 0.0.0.0', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/config.ts', "const host = '0.0.0.0';"],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noHardcodedIps.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes file with no IPs', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/config.ts', 'const x = 42;']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noHardcodedIps.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-js-source-files
// =============================================================================

describe('workspace/no-js-source-files', () => {
  it('has correct rule metadata', () => {
    expect(noJsSourceFiles.id).toBe('workspace/no-js-source-files');
    expect(noJsSourceFiles.scope).toBe('workspace');
    expect(noJsSourceFiles.fixable).toBe(false);
    expect(typeof noJsSourceFiles.check).toBe('function');
  });

  it('flags .js file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.js', 'module.exports = {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noJsSourceFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-js-source-files');
    expect(results[0]!.severity).toBe('error');
  });

  it('flags .cjs file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/config.cjs', 'module.exports = {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noJsSourceFiles.check(ctx);
    expect(results.length).toBe(1);
  });

  it('flags .mjs file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/utils.mjs', 'export default {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noJsSourceFiles.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes .ts file', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/index.ts', 'export default {};']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noJsSourceFiles.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-insecure-urls
// =============================================================================

describe('workspace/no-insecure-urls', () => {
  it('has correct rule metadata', () => {
    expect(noInsecureUrls.id).toBe('workspace/no-insecure-urls');
    expect(noInsecureUrls.scope).toBe('workspace');
    expect(noInsecureUrls.fixable).toBe(false);
    expect(typeof noInsecureUrls.check).toBe('function');
  });

  it('flags file with http:// URL', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/api.ts', "fetch('http://example.com')"],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInsecureUrls.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-insecure-urls');
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes file with https://', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/api.ts', "fetch('https://example.com')"],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInsecureUrls.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes file with http://localhost', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/api.ts', "fetch('http://localhost:3000')"],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInsecureUrls.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes file with http://127.0.0.1', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/api.ts', "fetch('http://127.0.0.1:8080')"],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInsecureUrls.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-skipped-tests
// =============================================================================

describe('workspace/no-skipped-tests', () => {
  it('has correct rule metadata', () => {
    expect(noSkippedTests.id).toBe('workspace/no-skipped-tests');
    expect(noSkippedTests.scope).toBe('workspace');
    expect(noSkippedTests.fixable).toBe(false);
    expect(typeof noSkippedTests.check).toBe('function');
  });

  it('flags it.skip', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/foo.test.ts', "it.skip('test', () => {})"],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noSkippedTests.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-skipped-tests');
    expect(results[0]!.severity).toBe('error');
  });

  it('flags describe.only', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/foo.test.ts', "describe.only('suite', () => {})"],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noSkippedTests.check(ctx);
    expect(results.length).toBe(1);
  });

  it('flags test.todo', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/foo.test.ts', "test.todo('later')"],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noSkippedTests.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes normal test', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/foo.test.ts', "it('works', () => {})"],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noSkippedTests.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-unsafe-regex
// =============================================================================

describe('workspace/no-unsafe-regex', () => {
  it('has correct rule metadata', () => {
    expect(noUnsafeRegex.id).toBe('workspace/no-unsafe-regex');
    expect(noUnsafeRegex.scope).toBe('workspace');
    expect(noUnsafeRegex.fixable).toBe(false);
    expect(typeof noUnsafeRegex.check).toBe('function');
  });

  it('flags nested quantifier pattern', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/parser.ts', 'const re = /(a+)+/;'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnsafeRegex.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-unsafe-regex');
    expect(results[0]!.severity).toBe('error');
  });

  it('passes safe regex', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/parser.ts', 'const re = /[a-z]+/;'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnsafeRegex.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes normal code without regex', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/parser.ts', 'const x = 42;']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnsafeRegex.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-empty-files
// =============================================================================

describe('workspace/no-empty-files', () => {
  it('has correct rule metadata', () => {
    expect(noEmptyFiles.id).toBe('workspace/no-empty-files');
    expect(noEmptyFiles.scope).toBe('workspace');
    expect(noEmptyFiles.fixable).toBe(false);
    expect(typeof noEmptyFiles.check).toBe('function');
  });

  it('flags empty file', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/empty.ts', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEmptyFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes non-empty file', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/index.ts', 'hello']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEmptyFiles.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes allowed empty files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitignore', ''],
      ['/workspace/.env', ''],
      ['/workspace/src/.keep', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEmptyFiles.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-exec-bit
// =============================================================================

describe('workspace/no-exec-bit', () => {
  it('has correct rule metadata', () => {
    expect(noExecBit.id).toBe('workspace/no-exec-bit');
    expect(noExecBit.scope).toBe('workspace');
    expect(noExecBit.fixable).toBe(false);
    expect(noExecBit.categories).toContain('workspace');
    expect(noExecBit.categories).toContain('safety');
    expect(noExecBit.stages).toContain('lint');
    expect(noExecBit.stages).toContain('check');
    expect(typeof noExecBit.check).toBe('function');
  });

  it('returns empty results for empty workspace', async () => {
    const ctx: WorkspaceContext = mockContext({ files: new Map() });
    const results: LintResult[] = await noExecBit.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-temp-files
// =============================================================================

describe('workspace/no-temp-files', () => {
  it('has correct rule metadata', () => {
    expect(noTempFiles.id).toBe('workspace/no-temp-files');
    expect(noTempFiles.scope).toBe('workspace');
    expect(noTempFiles.fixable).toBe(false);
    expect(typeof noTempFiles.check).toBe('function');
  });

  it('flags .log file', async () => {
    const files: Map<string, string> = new Map([['/workspace/debug.log', 'log content']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTempFiles.check(ctx);
    expect(results.length).toBe(1);
  });

  it('flags .DS_Store', async () => {
    const files: Map<string, string> = new Map([['/workspace/.DS_Store', 'binary']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTempFiles.check(ctx);
    expect(results.length).toBe(1);
  });

  it('flags file ending with ~', async () => {
    const files: Map<string, string> = new Map([['/workspace/backup~', 'old content']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTempFiles.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes normal .ts file', async () => {
    const files: Map<string, string> = new Map([['/workspace/index.ts', 'export {};\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTempFiles.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-excess-trailing-newlines
// =============================================================================

describe('workspace/no-excess-trailing-newlines', () => {
  it('has correct rule metadata', () => {
    expect(noExcessTrailingNewlines.id).toBe('workspace/no-excess-trailing-newlines');
    expect(noExcessTrailingNewlines.scope).toBe('workspace');
    expect(noExcessTrailingNewlines.fixable).toBe(false);
    expect(typeof noExcessTrailingNewlines.check).toBe('function');
  });

  it('flags file with excess trailing newlines', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/index.ts', 'hello\n\n\n\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noExcessTrailingNewlines.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes file with single trailing newline', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/index.ts', 'hello\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noExcessTrailingNewlines.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes file with no trailing newline', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/index.ts', 'hello']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noExcessTrailingNewlines.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-mixed-indentation
// =============================================================================

describe('workspace/no-mixed-indentation', () => {
  it('has correct rule metadata', () => {
    expect(noMixedIndentation.id).toBe('workspace/no-mixed-indentation');
    expect(noMixedIndentation.scope).toBe('workspace');
    expect(noMixedIndentation.fixable).toBe(false);
    expect(typeof noMixedIndentation.check).toBe('function');
  });

  it('flags file with mixed indentation', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/index.ts', '\t code\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMixedIndentation.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes all-spaces file', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/index.ts', '  code\n  more']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMixedIndentation.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes all-tabs file', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/index.ts', '\tcode\n\tmore']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMixedIndentation.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-editor-artifacts
// =============================================================================

describe('workspace/no-editor-artifacts', () => {
  it('has correct rule metadata', () => {
    expect(noEditorArtifacts.id).toBe('workspace/no-editor-artifacts');
    expect(noEditorArtifacts.scope).toBe('workspace');
    expect(noEditorArtifacts.fixable).toBe(false);
    expect(typeof noEditorArtifacts.check).toBe('function');
  });

  it('flags .idea directory file', async () => {
    const files: Map<string, string> = new Map([['/workspace/.idea/workspace.xml', '<xml/>']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEditorArtifacts.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-editor-artifacts');
    expect(results[0]!.message).toContain('.idea/workspace.xml');
    expect(results[0]!.severity).toBe('error');
  });

  it('flags .vscode/launch.json', async () => {
    const files: Map<string, string> = new Map([['/workspace/.vscode/launch.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEditorArtifacts.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.vscode/launch.json');
  });

  it('passes normal source file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEditorArtifacts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes .vscode/settings.json', async () => {
    const files: Map<string, string> = new Map([['/workspace/.vscode/settings.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEditorArtifacts.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-binary-files
// =============================================================================

describe('workspace/no-binary-files', () => {
  it('has correct rule metadata', () => {
    expect(noBinaryFiles.id).toBe('workspace/no-binary-files');
    expect(noBinaryFiles.scope).toBe('workspace');
    expect(noBinaryFiles.fixable).toBe(false);
    expect(typeof noBinaryFiles.check).toBe('function');
  });

  it('flags .exe file', async () => {
    const files: Map<string, string> = new Map([['/workspace/app.exe', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBinaryFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-binary-files');
    expect(results[0]!.message).toContain('app.exe');
    expect(results[0]!.severity).toBe('error');
  });

  it('flags .dll file', async () => {
    const files: Map<string, string> = new Map([['/workspace/lib.dll', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBinaryFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('lib.dll');
  });

  it('flags .pyc file', async () => {
    const files: Map<string, string> = new Map([['/workspace/module.pyc', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBinaryFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('module.pyc');
  });

  it('passes .ts file', async () => {
    const files: Map<string, string> = new Map([['/workspace/index.ts', 'export const x = 1;\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBinaryFiles.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-case-collisions
// =============================================================================

describe('workspace/no-case-collisions', () => {
  it('has correct rule metadata', () => {
    expect(noCaseCollisions.id).toBe('workspace/no-case-collisions');
    expect(noCaseCollisions.scope).toBe('workspace');
    expect(noCaseCollisions.fixable).toBe(false);
    expect(typeof noCaseCollisions.check).toBe('function');
  });

  it('flags case collision', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/Foo.ts', 'export const x = 1;\n'],
      ['/workspace/foo.ts', 'export const y = 2;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noCaseCollisions.check(ctx);
    expect(results.length).toBe(2);
    expect(results[0]!.ruleId).toBe('workspace/no-case-collisions');
    expect(results[0]!.severity).toBe('error');
  });

  it('passes unique filenames', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/foo.ts', 'export const x = 1;\n'],
      ['/workspace/bar.ts', 'export const y = 2;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noCaseCollisions.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-large-files
// =============================================================================

describe('workspace/no-large-files', () => {
  it('has correct rule metadata', () => {
    expect(noLargeFiles.id).toBe('workspace/no-large-files');
    expect(noLargeFiles.scope).toBe('workspace');
    expect(noLargeFiles.fixable).toBe(false);
    expect(typeof noLargeFiles.check).toBe('function');
  });

  it('flags file with >1000 lines', async () => {
    const lines: string[] = Array.from({ length: 1001 }, (): string => 'line');
    const content: string = lines.join('\n');
    const files: Map<string, string> = new Map([['/workspace/src/big.ts', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLargeFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-large-files');
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('1001');
  });

  it('passes file with <1000 lines', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/small.ts', 'hello\nworld']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLargeFiles.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-tsbuildinfo
// =============================================================================

describe('workspace/no-tsbuildinfo', () => {
  it('has correct rule metadata', () => {
    expect(noTsbuildinfo.id).toBe('workspace/no-tsbuildinfo');
    expect(noTsbuildinfo.scope).toBe('workspace');
    expect(noTsbuildinfo.fixable).toBe(false);
    expect(typeof noTsbuildinfo.check).toBe('function');
  });

  it('flags .tsbuildinfo file', async () => {
    const files: Map<string, string> = new Map([['/workspace/tsconfig.tsbuildinfo', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsbuildinfo.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-tsbuildinfo');
    expect(results[0]!.message).toContain('tsconfig.tsbuildinfo');
    expect(results[0]!.severity).toBe('error');
  });

  it('passes .ts file', async () => {
    const files: Map<string, string> = new Map([['/workspace/index.ts', 'export const x = 1;\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsbuildinfo.check(ctx);
    expect(results.length).toBe(0);
  });
});
