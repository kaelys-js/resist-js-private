/**
 * Tests for workspace lint rules.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest';

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
import noHardcodedUrls from './no-hardcoded-urls.ts';
import noFixupCommits from './no-fixup-commits.ts';
import noEnvFiles from './no-env-files.ts';
import noNvmrc from './no-nvmrc.ts';
import noPackageLock from './no-package-lock.ts';
import noWranglerToml from './no-wrangler-toml.ts';
import noTestsDirectory from './no-tests-directory.ts';
import noBenchDirectory from './no-bench-directory.ts';
import noCoverageDirectory from './no-coverage-directory.ts';
import noEslintConfig from './no-eslint-config.ts';
import noPrettierConfig from './no-prettier-config.ts';
import noJestConfig from './no-jest-config.ts';
import noNestedNodeModules from './no-nested-node-modules.ts';
import noYarnFiles from './no-yarn-files.ts';
import noNpmFiles from './no-npm-files.ts';
import noStylelintConfig from './no-stylelint-config.ts';
import noCommitlintConfig from './no-commitlint-config.ts';
import noBabelConfig from './no-babel-config.ts';
import noTslintConfig from './no-tslint-config.ts';
import noHuskyrcConfig from './no-huskyrc-config.ts';
import noTsconfigOverrides from './no-tsconfig-overrides.ts';
import noBowerJson from './no-bower-json.ts';
import noWebpackConfig from './no-webpack-config.ts';
import noRollupConfig from './no-rollup-config.ts';
import noGulpConfig from './no-gulp-config.ts';
import noGruntConfig from './no-grunt-config.ts';
import noJsconfig from './no-jsconfig.ts';
import noNodemonConfig from './no-nodemon-config.ts';
import noSensitiveCertFiles from './no-sensitive-cert-files.ts';
import noEnvFileClones from './no-env-file-clones.ts';
import noGitSubmodules from './no-git-submodules.ts';
import noNestedGitFolders from './no-nested-git-folders.ts';
import noNonrootIgnoreFiles from './no-nonroot-ignore-files.ts';
import noSudoInScripts from './no-sudo-in-scripts.ts';
import noScssSass from './no-scss-sass.ts';
import noCypressConfig from './no-cypress-config.ts';
import noPuppeteerConfig from './no-puppeteer-config.ts';
import noPnpmfile from './no-pnpmfile.ts';
import noBrowserslist from './no-browserslist.ts';
import noSwcrc from './no-swcrc.ts';
import noParcelConfig from './no-parcel-config.ts';
import noPostinstallScripts from './no-postinstall-scripts.ts';
import noToolOverridesInPackageJson from './no-tool-overrides-in-package-json.ts';
import requireTsconfigStrict from './require-tsconfig-strict.ts';
import requireTsconfigTarget from './require-tsconfig-target.ts';
import requireTsconfigExtendsBase from './require-tsconfig-extends-base.ts';
import tsconfigExtendsResolves from './tsconfig-extends-resolves.ts';
import noTsconfigCircularExtends from './no-tsconfig-circular-extends.ts';
import noTsconfigDeprecatedOptions from './no-tsconfig-deprecated-options.ts';
import requireTsconfigModuleResolution from './require-tsconfig-module-resolution.ts';
import noTsconfigIncludeExcludeOverlap from './no-tsconfig-include-exclude-overlap.ts';
import requireTsconfigExcludeDefaults from './require-tsconfig-exclude-defaults.ts';
import tsconfigPathsResolve from './tsconfig-paths-resolve.ts';
import noTsconfigPathShadowing from './no-tsconfig-path-shadowing.ts';
import requireTsconfigSchema from './require-tsconfig-schema.ts';
import noTsconfigTypesDuplicates from './no-tsconfig-types-duplicates.ts';
import tsconfigReferencesResolve from './tsconfig-references-resolve.ts';
import noTsconfigImportInconsistency from './no-tsconfig-import-inconsistency.ts';

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

// =============================================================================
// workspace/no-eslint-config
// =============================================================================

describe('workspace/no-eslint-config', () => {
  it('has correct rule metadata', () => {
    expect(noEslintConfig.id).toBe('workspace/no-eslint-config');
    expect(noEslintConfig.scope).toBe('workspace');
    expect(noEslintConfig.fixable).toBe(false);
    expect(noEslintConfig.categories).toContain('tooling');
    expect(typeof noEslintConfig.check).toBe('function');
  });

  it('flags .eslintrc', async () => {
    const files: Map<string, string> = new Map([['/workspace/.eslintrc', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEslintConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-eslint-config');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('.eslintrc');
  });

  it('flags eslint.config.js', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/eslint.config.js', 'export default [];'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEslintConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-eslint-config');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('eslint.config.js');
  });

  it('flags eslint.config.ts', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/eslint.config.ts', 'export default [];'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEslintConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-eslint-config');
    expect(results[0]!.message).toContain('eslint.config.ts');
  });

  it('flags .eslintignore', async () => {
    const files: Map<string, string> = new Map([['/workspace/.eslintignore', 'dist/\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEslintConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-eslint-config');
    expect(results[0]!.message).toContain('.eslintignore');
  });

  it('flags .eslintrc.json', async () => {
    const files: Map<string, string> = new Map([['/workspace/.eslintrc.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEslintConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-eslint-config');
    expect(results[0]!.message).toContain('.eslintrc.json');
  });

  it('passes normal .ts file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEslintConfig.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-prettier-config
// =============================================================================

describe('workspace/no-prettier-config', () => {
  it('has correct rule metadata', () => {
    expect(noPrettierConfig.id).toBe('workspace/no-prettier-config');
    expect(noPrettierConfig.scope).toBe('workspace');
    expect(noPrettierConfig.fixable).toBe(false);
    expect(noPrettierConfig.categories).toContain('tooling');
    expect(typeof noPrettierConfig.check).toBe('function');
  });

  it('flags .prettierrc', async () => {
    const files: Map<string, string> = new Map([['/workspace/.prettierrc', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noPrettierConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-prettier-config');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('.prettierrc');
  });

  it('flags prettier.config.js', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/prettier.config.js', 'export default {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noPrettierConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-prettier-config');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('prettier.config.js');
  });

  it('flags .prettierignore', async () => {
    const files: Map<string, string> = new Map([['/workspace/.prettierignore', 'dist/\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noPrettierConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-prettier-config');
    expect(results[0]!.message).toContain('.prettierignore');
  });

  it('passes normal file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noPrettierConfig.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-jest-config
// =============================================================================

describe('workspace/no-jest-config', () => {
  it('has correct rule metadata', () => {
    expect(noJestConfig.id).toBe('workspace/no-jest-config');
    expect(noJestConfig.scope).toBe('workspace');
    expect(noJestConfig.fixable).toBe(false);
    expect(noJestConfig.categories).toContain('tooling');
    expect(typeof noJestConfig.check).toBe('function');
  });

  it('flags jest.config.js', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/jest.config.js', 'module.exports = {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noJestConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-jest-config');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('jest.config.js');
  });

  it('flags jest.config.ts', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/jest.config.ts', 'export default {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noJestConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-jest-config');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('jest.config.ts');
  });

  it('flags jest.setup.ts', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/jest.setup.ts', 'import "@testing-library/jest-dom";'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noJestConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-jest-config');
    expect(results[0]!.message).toContain('jest.setup.ts');
  });

  it('passes normal file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noJestConfig.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-nested-node-modules
// =============================================================================

describe('workspace/no-nested-node-modules', () => {
  it('has correct rule metadata', () => {
    expect(noNestedNodeModules.id).toBe('workspace/no-nested-node-modules');
    expect(noNestedNodeModules.scope).toBe('workspace');
    expect(noNestedNodeModules.fixable).toBe(false);
    expect(noNestedNodeModules.categories).toContain('safety');
    expect(typeof noNestedNodeModules.check).toBe('function');
  });

  it('flags nested node_modules in package dir', async () => {
    const packages: WorkspacePackage[] = [
      {
        name: '@/foo',
        path: '/workspace/packages/foo/package.json',
        dir: '/workspace/packages/foo',
        packageJson: { name: '@/foo' },
      },
    ];
    const ctx: WorkspaceContext = mockContext({ packages });
    (ctx as unknown as { dirExists: (path: string) => Promise<boolean> }).dirExists = (
      path: string,
    ): Promise<boolean> =>
      new Promise<boolean>((resolve: (v: boolean) => void): void => {
        resolve(path.includes('node_modules'));
      });
    const results: LintResult[] = await noNestedNodeModules.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-nested-node-modules');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('node_modules');
  });

  it('passes when no nested node_modules', async () => {
    const packages: WorkspacePackage[] = [
      {
        name: '@/foo',
        path: '/workspace/packages/foo/package.json',
        dir: '/workspace/packages/foo',
        packageJson: { name: '@/foo' },
      },
    ];
    const ctx: WorkspaceContext = mockContext({ packages });
    (ctx as unknown as { dirExists: (path: string) => Promise<boolean> }).dirExists = (
      _path: string,
    ): Promise<boolean> =>
      new Promise<boolean>((resolve: (v: boolean) => void): void => {
        resolve(false);
      });
    const results: LintResult[] = await noNestedNodeModules.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-wrangler-toml
// =============================================================================

describe('workspace/no-wrangler-toml', () => {
  it('has correct rule metadata', () => {
    expect(noWranglerToml.id).toBe('workspace/no-wrangler-toml');
    expect(noWranglerToml.scope).toBe('workspace');
    expect(noWranglerToml.fixable).toBe(false);
    expect(noWranglerToml.categories).toContain('safety');
    expect(typeof noWranglerToml.check).toBe('function');
  });

  it('flags wrangler.toml file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/api/wrangler.toml', 'name = "my-worker"\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWranglerToml.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-wrangler-toml');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('wrangler.toml');
  });

  it('flags wrangler.jsonc file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/api/wrangler.jsonc', '{ "name": "my-worker" }\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWranglerToml.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-wrangler-toml');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('wrangler.jsonc');
  });

  it('passes normal file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/api/index.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWranglerToml.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-tests-directory
// =============================================================================

describe('workspace/no-tests-directory', () => {
  it('has correct rule metadata', () => {
    expect(noTestsDirectory.id).toBe('workspace/no-tests-directory');
    expect(noTestsDirectory.scope).toBe('workspace');
    expect(noTestsDirectory.fixable).toBe(false);
    expect(noTestsDirectory.categories).toContain('testing');
    expect(typeof noTestsDirectory.check).toBe('function');
  });

  it('flags file in __tests__/ directory', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/__tests__/foo.test.ts', 'it("works", () => {});\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTestsDirectory.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-tests-directory');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('__tests__');
  });

  it('flags file in tests/ directory', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/tests/foo.test.ts', 'it("works", () => {});\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTestsDirectory.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-tests-directory');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('tests/');
  });

  it('passes colocated .test.ts file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/foo.test.ts', 'it("works", () => {});\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTestsDirectory.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes normal source file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/foo.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTestsDirectory.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-bench-directory
// =============================================================================

describe('workspace/no-bench-directory', () => {
  it('has correct rule metadata', () => {
    expect(noBenchDirectory.id).toBe('workspace/no-bench-directory');
    expect(noBenchDirectory.scope).toBe('workspace');
    expect(noBenchDirectory.fixable).toBe(false);
    expect(noBenchDirectory.categories).toContain('testing');
    expect(typeof noBenchDirectory.check).toBe('function');
  });

  it('flags file in __benchmarks__/ directory', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/__benchmarks__/foo.bench.ts', 'bench("runs", () => {});\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBenchDirectory.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-bench-directory');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('__benchmarks__');
  });

  it('flags file in benchmarks/ directory', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/benchmarks/foo.bench.ts', 'bench("runs", () => {});\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBenchDirectory.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-bench-directory');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('benchmarks/');
  });

  it('flags file in bench/ directory', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/bench/foo.bench.ts', 'bench("runs", () => {});\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBenchDirectory.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-bench-directory');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('bench/');
  });

  it('passes colocated .bench.ts file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/foo.bench.ts', 'bench("runs", () => {});\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBenchDirectory.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes normal file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/foo.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBenchDirectory.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-coverage-directory
// =============================================================================

describe('workspace/no-coverage-directory', () => {
  it('has correct rule metadata', () => {
    expect(noCoverageDirectory.id).toBe('workspace/no-coverage-directory');
    expect(noCoverageDirectory.scope).toBe('workspace');
    expect(noCoverageDirectory.fixable).toBe(false);
    expect(noCoverageDirectory.categories).toContain('safety');
    expect(typeof noCoverageDirectory.check).toBe('function');
  });

  it('flags when root coverage directory exists', async () => {
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    (ctx as unknown as { dirExists: (path: string) => Promise<boolean> }).dirExists = (
      path: string,
    ): Promise<boolean> =>
      new Promise<boolean>((resolve: (v: boolean) => void): void => {
        resolve(path.includes('coverage'));
      });
    const results: LintResult[] = await noCoverageDirectory.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-coverage-directory');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('coverage');
  });

  it('flags coverage directory in workspace package', async () => {
    const ctx: WorkspaceContext = mockContext({
      rootDir: '/workspace',
      packages: [
        {
          name: '@/my-pkg',
          path: '/workspace/packages/my-pkg/package.json',
          dir: '/workspace/packages/my-pkg',
          packageJson: { name: '@/my-pkg' },
        },
      ],
    });
    (ctx as unknown as { dirExists: (path: string) => Promise<boolean> }).dirExists = (
      path: string,
    ): Promise<boolean> =>
      new Promise<boolean>((resolve: (v: boolean) => void): void => {
        resolve(path === '/workspace/packages/my-pkg/coverage');
      });
    const results: LintResult[] = await noCoverageDirectory.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-coverage-directory');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('my-pkg');
  });

  it('passes when no coverage directory exists', async () => {
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    (ctx as unknown as { dirExists: (path: string) => Promise<boolean> }).dirExists = (
      _path: string,
    ): Promise<boolean> =>
      new Promise<boolean>((resolve: (v: boolean) => void): void => {
        resolve(false);
      });
    const results: LintResult[] = await noCoverageDirectory.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-hardcoded-urls
// =============================================================================

describe('workspace/no-hardcoded-urls', () => {
  it('has correct rule metadata', () => {
    expect(noHardcodedUrls.id).toBe('workspace/no-hardcoded-urls');
    expect(noHardcodedUrls.scope).toBe('workspace');
    expect(noHardcodedUrls.fixable).toBe(false);
    expect(typeof noHardcodedUrls.check).toBe('function');
  });

  it('flags file with hardcoded URL with explicit port', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/config.ts', 'const url = "http://myapp:3000/api";\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noHardcodedUrls.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-hardcoded-urls');
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('config.ts');
  });

  it('passes file with localhost URL', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/config.ts', 'const url = "http://localhost:3000/api";\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noHardcodedUrls.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes file with no URLs', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/utils.ts', 'export const add = (a: number, b: number): number => a + b;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noHardcodedUrls.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes file with example.com URL', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/api.md', 'See https://example.com:8080 for details.\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noHardcodedUrls.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-fixup-commits
// =============================================================================

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

describe('workspace/no-fixup-commits', () => {
  it('has correct rule metadata', () => {
    expect(noFixupCommits.id).toBe('workspace/no-fixup-commits');
    expect(noFixupCommits.scope).toBe('workspace');
    expect(noFixupCommits.fixable).toBe(false);
    expect(typeof noFixupCommits.check).toBe('function');
  });

  it('flags fixup! commit in git log', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('abc1234 fixup! fix the thing\ndef5678 normal commit\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noFixupCommits.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-fixup-commits');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('fixup!');
  });

  it('flags squash! commit in git log', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('abc1234 squash! refactor something\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noFixupCommits.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('squash!');
  });

  it('passes with clean git log', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue(
      'abc1234 feat: add new feature\ndef5678 fix: resolve bug\n',
    );
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noFixupCommits.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-env-files
// =============================================================================

describe('workspace/no-env-files', () => {
  it('has correct rule metadata', () => {
    expect(noEnvFiles.id).toBe('workspace/no-env-files');
    expect(noEnvFiles.scope).toBe('workspace');
    expect(noEnvFiles.fixable).toBe(false);
    expect(typeof noEnvFiles.check).toBe('function');
  });

  it('flags .env.local', async () => {
    const files: Map<string, string> = new Map([['/workspace/.env.local', 'SECRET=abc\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEnvFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-env-files');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('.env.local');
  });

  it('flags .env.production', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.env.production', 'DB_URL=postgres://prod\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEnvFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.env.production');
  });

  it('flags bare .env', async () => {
    const files: Map<string, string> = new Map([['/workspace/.env', 'API_KEY=secret\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEnvFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.env');
  });

  it('passes .env.example', async () => {
    const files: Map<string, string> = new Map([['/workspace/.env.example', 'API_KEY=\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEnvFiles.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes .env.template', async () => {
    const files: Map<string, string> = new Map([['/workspace/.env.template', 'API_KEY=\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEnvFiles.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-nvmrc
// =============================================================================

describe('workspace/no-nvmrc', () => {
  it('has correct rule metadata', () => {
    expect(noNvmrc.id).toBe('workspace/no-nvmrc');
    expect(noNvmrc.scope).toBe('workspace');
    expect(noNvmrc.fixable).toBe(false);
    expect(typeof noNvmrc.check).toBe('function');
  });

  it('flags .nvmrc', async () => {
    const files: Map<string, string> = new Map([['/workspace/.nvmrc', '20\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNvmrc.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-nvmrc');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('.nvmrc');
  });

  it('flags .node-version', async () => {
    const files: Map<string, string> = new Map([['/workspace/.node-version', '20.0.0\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNvmrc.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.node-version');
  });

  it('passes normal file', async () => {
    const files: Map<string, string> = new Map([['/workspace/package.json', '{"name":"test"}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNvmrc.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-package-lock
// =============================================================================

describe('workspace/no-package-lock', () => {
  it('has correct rule metadata', () => {
    expect(noPackageLock.id).toBe('workspace/no-package-lock');
    expect(noPackageLock.scope).toBe('workspace');
    expect(noPackageLock.fixable).toBe(false);
    expect(typeof noPackageLock.check).toBe('function');
  });

  it('flags package-lock.json', async () => {
    const files: Map<string, string> = new Map([['/workspace/package-lock.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noPackageLock.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-package-lock');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('package-lock.json');
  });

  it('passes pnpm-lock.yaml', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pnpm-lock.yaml', 'lockfileVersion: 9\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noPackageLock.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes normal file', async () => {
    const files: Map<string, string> = new Map([['/workspace/package.json', '{"name":"test"}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noPackageLock.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-yarn-files
// =============================================================================

describe('workspace/no-yarn-files', () => {
  it('has correct rule metadata', () => {
    expect(noYarnFiles.id).toBe('workspace/no-yarn-files');
    expect(noYarnFiles.scope).toBe('workspace');
    expect(noYarnFiles.fixable).toBe(false);
    expect(noYarnFiles.categories).toContain('safety');
    expect(typeof noYarnFiles.check).toBe('function');
  });

  it('flags yarn.lock', async () => {
    const files: Map<string, string> = new Map([['/workspace/yarn.lock', '# yarn lockfile']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noYarnFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-yarn-files');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('yarn.lock');
  });

  it('flags .yarnrc.yml', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.yarnrc.yml', 'nodeLinker: node-modules'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noYarnFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-yarn-files');
    expect(results[0]!.message).toContain('.yarnrc.yml');
  });

  it('flags install-state.gz', async () => {
    const files: Map<string, string> = new Map([['/workspace/install-state.gz', 'binary']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noYarnFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-yarn-files');
    expect(results[0]!.message).toContain('install-state.gz');
  });

  it('passes normal .ts file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noYarnFiles.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-npm-files
// =============================================================================

describe('workspace/no-npm-files', () => {
  it('has correct rule metadata', () => {
    expect(noNpmFiles.id).toBe('workspace/no-npm-files');
    expect(noNpmFiles.scope).toBe('workspace');
    expect(noNpmFiles.fixable).toBe(false);
    expect(noNpmFiles.categories).toContain('safety');
    expect(typeof noNpmFiles.check).toBe('function');
  });

  it('flags .npmrc', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.npmrc', 'registry=https://registry.npmjs.org'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNpmFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-npm-files');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('.npmrc');
  });

  it('flags .npmignore', async () => {
    const files: Map<string, string> = new Map([['/workspace/.npmignore', 'dist/\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNpmFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-npm-files');
    expect(results[0]!.message).toContain('.npmignore');
  });

  it('flags npm-debug.log', async () => {
    const files: Map<string, string> = new Map([['/workspace/npm-debug.log', 'error log']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNpmFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-npm-files');
    expect(results[0]!.message).toContain('npm-debug.log');
  });

  it('passes normal file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNpmFiles.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-stylelint-config
// =============================================================================

describe('workspace/no-stylelint-config', () => {
  it('has correct rule metadata', () => {
    expect(noStylelintConfig.id).toBe('workspace/no-stylelint-config');
    expect(noStylelintConfig.scope).toBe('workspace');
    expect(noStylelintConfig.fixable).toBe(false);
    expect(noStylelintConfig.categories).toContain('tooling');
    expect(typeof noStylelintConfig.check).toBe('function');
  });

  it('flags .stylelintrc', async () => {
    const files: Map<string, string> = new Map([['/workspace/.stylelintrc', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noStylelintConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-stylelint-config');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('.stylelintrc');
  });

  it('flags stylelint.config.js', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/stylelint.config.js', 'module.exports = {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noStylelintConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-stylelint-config');
    expect(results[0]!.message).toContain('stylelint.config.js');
  });

  it('passes normal file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noStylelintConfig.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-commitlint-config
// =============================================================================

describe('workspace/no-commitlint-config', () => {
  it('has correct rule metadata', () => {
    expect(noCommitlintConfig.id).toBe('workspace/no-commitlint-config');
    expect(noCommitlintConfig.scope).toBe('workspace');
    expect(noCommitlintConfig.fixable).toBe(false);
    expect(noCommitlintConfig.categories).toContain('tooling');
    expect(typeof noCommitlintConfig.check).toBe('function');
  });

  it('flags .commitlintrc', async () => {
    const files: Map<string, string> = new Map([['/workspace/.commitlintrc', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noCommitlintConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-commitlint-config');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('.commitlintrc');
  });

  it('flags commitlint.config.js', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/commitlint.config.js', 'module.exports = {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noCommitlintConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-commitlint-config');
    expect(results[0]!.message).toContain('commitlint.config.js');
  });

  it('passes normal file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noCommitlintConfig.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-babel-config
// =============================================================================

describe('workspace/no-babel-config', () => {
  it('has correct rule metadata', () => {
    expect(noBabelConfig.id).toBe('workspace/no-babel-config');
    expect(noBabelConfig.scope).toBe('workspace');
    expect(noBabelConfig.fixable).toBe(false);
    expect(noBabelConfig.categories).toContain('tooling');
    expect(typeof noBabelConfig.check).toBe('function');
  });

  it('flags .babelrc', async () => {
    const files: Map<string, string> = new Map([['/workspace/.babelrc', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBabelConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-babel-config');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('.babelrc');
  });

  it('flags babel.config.js', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/babel.config.js', 'module.exports = {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBabelConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-babel-config');
    expect(results[0]!.message).toContain('babel.config.js');
  });

  it('passes normal file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBabelConfig.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-tslint-config
// =============================================================================

describe('workspace/no-tslint-config', () => {
  it('has correct rule metadata', () => {
    expect(noTslintConfig.id).toBe('workspace/no-tslint-config');
    expect(noTslintConfig.scope).toBe('workspace');
    expect(noTslintConfig.fixable).toBe(false);
    expect(noTslintConfig.categories).toContain('tooling');
    expect(typeof noTslintConfig.check).toBe('function');
  });

  it('flags tslint.json', async () => {
    const files: Map<string, string> = new Map([['/workspace/tslint.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTslintConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-tslint-config');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('tslint.json');
  });

  it('passes tsconfig.json', async () => {
    const files: Map<string, string> = new Map([['/workspace/tsconfig.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTslintConfig.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes normal file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTslintConfig.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-huskyrc-config
// =============================================================================

describe('workspace/no-huskyrc-config', () => {
  it('has correct rule metadata', () => {
    expect(noHuskyrcConfig.id).toBe('workspace/no-huskyrc-config');
    expect(noHuskyrcConfig.scope).toBe('workspace');
    expect(noHuskyrcConfig.fixable).toBe(false);
    expect(noHuskyrcConfig.categories).toContain('tooling');
    expect(typeof noHuskyrcConfig.check).toBe('function');
  });

  it('flags .huskyrc', async () => {
    const files: Map<string, string> = new Map([['/workspace/.huskyrc', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noHuskyrcConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-huskyrc-config');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('.huskyrc');
  });

  it('flags .huskyrc.json', async () => {
    const files: Map<string, string> = new Map([['/workspace/.huskyrc.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noHuskyrcConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-huskyrc-config');
    expect(results[0]!.message).toContain('.huskyrc.json');
  });

  it('passes .husky/pre-commit', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.husky/pre-commit', '#!/bin/sh\npnpm lint'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noHuskyrcConfig.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes normal file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noHuskyrcConfig.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-tsconfig-overrides
// =============================================================================

describe('workspace/no-tsconfig-overrides', () => {
  it('has correct rule metadata', () => {
    expect(noTsconfigOverrides.id).toBe('workspace/no-tsconfig-overrides');
    expect(noTsconfigOverrides.scope).toBe('workspace');
    expect(noTsconfigOverrides.fixable).toBe(false);
    expect(noTsconfigOverrides.categories).toContain('tooling');
    expect(typeof noTsconfigOverrides.check).toBe('function');
  });

  it('flags tsconfig.test.json', async () => {
    const files: Map<string, string> = new Map([['/workspace/tsconfig.test.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigOverrides.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-tsconfig-overrides');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('tsconfig.test.json');
  });

  it('flags tsconfig.eslint.json', async () => {
    const files: Map<string, string> = new Map([['/workspace/tsconfig.eslint.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigOverrides.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-tsconfig-overrides');
    expect(results[0]!.message).toContain('tsconfig.eslint.json');
  });

  it('flags tsconfig.build.json', async () => {
    const files: Map<string, string> = new Map([['/workspace/tsconfig.build.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigOverrides.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-tsconfig-overrides');
    expect(results[0]!.message).toContain('tsconfig.build.json');
  });

  it('passes tsconfig.json', async () => {
    const files: Map<string, string> = new Map([['/workspace/tsconfig.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigOverrides.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes tsconfig.base.json', async () => {
    const files: Map<string, string> = new Map([['/workspace/tsconfig.base.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigOverrides.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes normal file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigOverrides.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-bower-json
// =============================================================================

describe('workspace/no-bower-json', () => {
  it('has correct rule metadata', () => {
    expect(noBowerJson.id).toBe('workspace/no-bower-json');
    expect(noBowerJson.scope).toBe('workspace');
    expect(noBowerJson.fixable).toBe(false);
    expect(noBowerJson.categories).toContain('tooling');
    expect(typeof noBowerJson.check).toBe('function');
  });

  it('flags bower.json', async () => {
    const files: Map<string, string> = new Map([['/workspace/bower.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBowerJson.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-bower-json');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('bower.json');
  });

  it('passes package.json', async () => {
    const files: Map<string, string> = new Map([['/workspace/package.json', '{"name":"test"}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBowerJson.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes normal file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBowerJson.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-webpack-config
// =============================================================================

describe('workspace/no-webpack-config', () => {
  it('has correct rule metadata', () => {
    expect(noWebpackConfig.id).toBe('workspace/no-webpack-config');
    expect(noWebpackConfig.scope).toBe('workspace');
    expect(noWebpackConfig.fixable).toBe(false);
    expect(noWebpackConfig.categories).toContain('tooling');
    expect(typeof noWebpackConfig.check).toBe('function');
  });

  it('flags webpack.config.js', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/webpack.config.js', 'module.exports = {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWebpackConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-webpack-config');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('webpack.config.js');
  });

  it('flags webpack.config.ts', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/webpack.config.ts', 'export default {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWebpackConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-webpack-config');
    expect(results[0]!.message).toContain('webpack.config.ts');
  });

  it('passes normal file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWebpackConfig.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-rollup-config
// =============================================================================

describe('workspace/no-rollup-config', () => {
  it('has correct rule metadata', () => {
    expect(noRollupConfig.id).toBe('workspace/no-rollup-config');
    expect(noRollupConfig.scope).toBe('workspace');
    expect(noRollupConfig.fixable).toBe(false);
    expect(noRollupConfig.categories).toContain('tooling');
    expect(typeof noRollupConfig.check).toBe('function');
  });

  it('flags rollup.config.js', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/rollup.config.js', 'export default {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noRollupConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-rollup-config');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('rollup.config.js');
  });

  it('flags rollup.config.ts', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/rollup.config.ts', 'export default {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noRollupConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-rollup-config');
    expect(results[0]!.message).toContain('rollup.config.ts');
  });

  it('passes normal file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noRollupConfig.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-gulp-config
// =============================================================================

describe('workspace/no-gulp-config', () => {
  it('has correct rule metadata', () => {
    expect(noGulpConfig.id).toBe('workspace/no-gulp-config');
    expect(noGulpConfig.scope).toBe('workspace');
    expect(noGulpConfig.fixable).toBe(false);
    expect(noGulpConfig.categories).toContain('tooling');
    expect(typeof noGulpConfig.check).toBe('function');
  });

  it('flags gulpfile.js', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/gulpfile.js', 'const gulp = require("gulp");'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noGulpConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-gulp-config');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('gulpfile.js');
  });

  it('flags gulpfile.ts', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/gulpfile.ts', 'import gulp from "gulp";'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noGulpConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-gulp-config');
    expect(results[0]!.message).toContain('gulpfile.ts');
  });

  it('passes normal file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noGulpConfig.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-grunt-config
// =============================================================================

describe('workspace/no-grunt-config', () => {
  it('has correct rule metadata', () => {
    expect(noGruntConfig.id).toBe('workspace/no-grunt-config');
    expect(noGruntConfig.scope).toBe('workspace');
    expect(noGruntConfig.fixable).toBe(false);
    expect(noGruntConfig.categories).toContain('tooling');
    expect(typeof noGruntConfig.check).toBe('function');
  });

  it('flags Gruntfile.js', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/Gruntfile.js', 'module.exports = function(grunt) {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noGruntConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-grunt-config');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Gruntfile.js');
  });

  it('flags Gruntfile.ts', async () => {
    const files: Map<string, string> = new Map([['/workspace/Gruntfile.ts', 'export default {};']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noGruntConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-grunt-config');
    expect(results[0]!.message).toContain('Gruntfile.ts');
  });

  it('passes normal file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noGruntConfig.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-jsconfig
// =============================================================================

describe('workspace/no-jsconfig', () => {
  it('has correct rule metadata', () => {
    expect(noJsconfig.id).toBe('workspace/no-jsconfig');
    expect(noJsconfig.scope).toBe('workspace');
    expect(noJsconfig.fixable).toBe(false);
    expect(noJsconfig.categories).toContain('tooling');
    expect(typeof noJsconfig.check).toBe('function');
  });

  it('flags jsconfig.json', async () => {
    const files: Map<string, string> = new Map([['/workspace/jsconfig.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noJsconfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-jsconfig');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('jsconfig.json');
  });

  it('passes tsconfig.json', async () => {
    const files: Map<string, string> = new Map([['/workspace/tsconfig.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noJsconfig.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes normal file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noJsconfig.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-nodemon-config
// =============================================================================

describe('workspace/no-nodemon-config', () => {
  it('has correct rule metadata', () => {
    expect(noNodemonConfig.id).toBe('workspace/no-nodemon-config');
    expect(noNodemonConfig.scope).toBe('workspace');
    expect(noNodemonConfig.fixable).toBe(false);
    expect(noNodemonConfig.categories).toContain('tooling');
    expect(typeof noNodemonConfig.check).toBe('function');
  });

  it('flags nodemon.json', async () => {
    const files: Map<string, string> = new Map([['/workspace/nodemon.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNodemonConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-nodemon-config');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('nodemon.json');
  });

  it('flags .nodemon.json', async () => {
    const files: Map<string, string> = new Map([['/workspace/.nodemon.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNodemonConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-nodemon-config');
    expect(results[0]!.message).toContain('.nodemon.json');
  });

  it('passes normal file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNodemonConfig.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 16 — Security, Hygiene & Advanced File Checks
// =============================================================================

describe('workspace/no-sensitive-cert-files', () => {
  it('has correct rule metadata', () => {
    expect(noSensitiveCertFiles.id).toBe('workspace/no-sensitive-cert-files');
    expect(noSensitiveCertFiles.scope).toBe('workspace');
    expect(noSensitiveCertFiles.fixable).toBe(false);
    expect(noSensitiveCertFiles.categories).toContain('safety');
    expect(typeof noSensitiveCertFiles.check).toBe('function');
  });

  it('flags .pem file', async () => {
    const files: Map<string, string> = new Map([['/workspace/certs/server.pem', 'cert content']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noSensitiveCertFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-sensitive-cert-files');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('server.pem');
  });

  it('flags .key file', async () => {
    const files: Map<string, string> = new Map([['/workspace/tls/private.key', 'key content']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noSensitiveCertFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('private.key');
  });

  it('flags .p12 file', async () => {
    const files: Map<string, string> = new Map([['/workspace/tls/cert.p12', 'p12 content']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noSensitiveCertFiles.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes normal .ts file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noSensitiveCertFiles.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-env-file-clones', () => {
  it('has correct rule metadata', () => {
    expect(noEnvFileClones.id).toBe('workspace/no-env-file-clones');
    expect(noEnvFileClones.scope).toBe('workspace');
    expect(noEnvFileClones.fixable).toBe(false);
    expect(noEnvFileClones.categories).toContain('safety');
    expect(typeof noEnvFileClones.check).toBe('function');
  });

  it('flags .env.bak', async () => {
    const files: Map<string, string> = new Map([['/workspace/.env.bak', 'SECRET=foo']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEnvFileClones.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-env-file-clones');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('.env.bak');
  });

  it('flags .env2', async () => {
    const files: Map<string, string> = new Map([['/workspace/.env2', 'SECRET=bar']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEnvFileClones.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.env2');
  });

  it('flags .env.copy', async () => {
    const files: Map<string, string> = new Map([['/workspace/.env.copy', 'SECRET=baz']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEnvFileClones.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes .env.local (not a clone)', async () => {
    const files: Map<string, string> = new Map([['/workspace/.env.local', 'SECRET=foo']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEnvFileClones.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes .env.example (not a clone)', async () => {
    const files: Map<string, string> = new Map([['/workspace/.env.example', 'SECRET=placeholder']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEnvFileClones.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-git-submodules', () => {
  it('has correct rule metadata', () => {
    expect(noGitSubmodules.id).toBe('workspace/no-git-submodules');
    expect(noGitSubmodules.scope).toBe('workspace');
    expect(noGitSubmodules.fixable).toBe(false);
    expect(noGitSubmodules.categories).toContain('safety');
    expect(typeof noGitSubmodules.check).toBe('function');
  });

  it('flags .gitmodules', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitmodules', '[submodule "vendor/lib"]'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noGitSubmodules.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-git-submodules');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('.gitmodules');
  });

  it('passes when no .gitmodules exists', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noGitSubmodules.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-nested-git-folders', () => {
  it('has correct rule metadata', () => {
    expect(noNestedGitFolders.id).toBe('workspace/no-nested-git-folders');
    expect(noNestedGitFolders.scope).toBe('workspace');
    expect(noNestedGitFolders.fixable).toBe(false);
    expect(noNestedGitFolders.categories).toContain('safety');
    expect(typeof noNestedGitFolders.check).toBe('function');
  });

  it('flags nested .git directory', async () => {
    const files: Map<string, string> = new Map([['/workspace/packages/foo/.git/config', '[core]']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNestedGitFolders.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-nested-git-folders');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('.git');
  });

  it('reports each nested .git only once', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/foo/.git/config', '[core]'],
      ['/workspace/packages/foo/.git/HEAD', 'ref: refs/heads/main'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNestedGitFolders.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes normal files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNestedGitFolders.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-nonroot-ignore-files', () => {
  it('has correct rule metadata', () => {
    expect(noNonrootIgnoreFiles.id).toBe('workspace/no-nonroot-ignore-files');
    expect(noNonrootIgnoreFiles.scope).toBe('workspace');
    expect(noNonrootIgnoreFiles.fixable).toBe(false);
    expect(noNonrootIgnoreFiles.categories).toContain('safety');
    expect(typeof noNonrootIgnoreFiles.check).toBe('function');
  });

  it('flags .gitignore in subdirectory', async () => {
    const files: Map<string, string> = new Map([['/workspace/packages/foo/.gitignore', 'dist/']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNonrootIgnoreFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-nonroot-ignore-files');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('.gitignore');
  });

  it('flags .dockerignore in subdirectory', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/apps/web/.dockerignore', 'node_modules'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNonrootIgnoreFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.dockerignore');
  });

  it('passes .gitignore at root', async () => {
    const files: Map<string, string> = new Map([['/workspace/.gitignore', 'node_modules/']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNonrootIgnoreFiles.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes normal file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNonrootIgnoreFiles.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-sudo-in-scripts', () => {
  it('has correct rule metadata', () => {
    expect(noSudoInScripts.id).toBe('workspace/no-sudo-in-scripts');
    expect(noSudoInScripts.scope).toBe('workspace');
    expect(noSudoInScripts.fixable).toBe(false);
    expect(noSudoInScripts.categories).toContain('safety');
    expect(typeof noSudoInScripts.check).toBe('function');
  });

  it('flags sudo usage in .sh file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/scripts/setup.sh', '#!/bin/bash\nsudo apt install -y curl\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noSudoInScripts.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-sudo-in-scripts');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.line).toBe(2);
    expect(results[0]!.message).toContain('sudo');
  });

  it('passes commented-out sudo', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/scripts/setup.sh', '#!/bin/bash\n# sudo apt install -y curl\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noSudoInScripts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes non-.sh file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export const x = 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noSudoInScripts.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-scss-sass', () => {
  it('has correct rule metadata', () => {
    expect(noScssSass.id).toBe('workspace/no-scss-sass');
    expect(noScssSass.scope).toBe('workspace');
    expect(noScssSass.fixable).toBe(false);
    expect(noScssSass.categories).toContain('tooling');
    expect(typeof noScssSass.check).toBe('function');
  });

  it('flags .scss file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/styles/main.scss', 'body { color: red; }'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noScssSass.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-scss-sass');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('main.scss');
  });

  it('flags .sass file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/components/app.sass', 'body\n  color: red'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noScssSass.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('app.sass');
  });

  it('passes .css file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/styles/main.css', 'body { color: red; }'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noScssSass.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-cypress-config', () => {
  it('has correct rule metadata', () => {
    expect(noCypressConfig.id).toBe('workspace/no-cypress-config');
    expect(noCypressConfig.scope).toBe('workspace');
    expect(noCypressConfig.fixable).toBe(false);
    expect(noCypressConfig.categories).toContain('tooling');
    expect(typeof noCypressConfig.check).toBe('function');
  });

  it('flags cypress.config.ts', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/cypress.config.ts', 'export default {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noCypressConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-cypress-config');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('cypress.config.ts');
  });

  it('flags cypress.json', async () => {
    const files: Map<string, string> = new Map([['/workspace/cypress.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noCypressConfig.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes playwright.config.ts', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/playwright.config.ts', 'export default {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noCypressConfig.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-puppeteer-config', () => {
  it('has correct rule metadata', () => {
    expect(noPuppeteerConfig.id).toBe('workspace/no-puppeteer-config');
    expect(noPuppeteerConfig.scope).toBe('workspace');
    expect(noPuppeteerConfig.fixable).toBe(false);
    expect(noPuppeteerConfig.categories).toContain('tooling');
    expect(typeof noPuppeteerConfig.check).toBe('function');
  });

  it('flags puppeteer.config.js', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/puppeteer.config.js', 'module.exports = {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noPuppeteerConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-puppeteer-config');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('puppeteer.config.js');
  });

  it('flags .puppeteerrc', async () => {
    const files: Map<string, string> = new Map([['/workspace/.puppeteerrc', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noPuppeteerConfig.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes playwright.config.ts', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/playwright.config.ts', 'export default {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noPuppeteerConfig.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-pnpmfile', () => {
  it('has correct rule metadata', () => {
    expect(noPnpmfile.id).toBe('workspace/no-pnpmfile');
    expect(noPnpmfile.scope).toBe('workspace');
    expect(noPnpmfile.fixable).toBe(false);
    expect(noPnpmfile.categories).toContain('safety');
    expect(typeof noPnpmfile.check).toBe('function');
  });

  it('flags pnpmfile.js', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pnpmfile.js', 'module.exports = { hooks: {} };'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noPnpmfile.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-pnpmfile');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('pnpmfile.js');
  });

  it('passes pnpm-workspace.yaml', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pnpm-workspace.yaml', 'packages:\n  - packages/*'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noPnpmfile.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-browserslist', () => {
  it('has correct rule metadata', () => {
    expect(noBrowserslist.id).toBe('workspace/no-browserslist');
    expect(noBrowserslist.scope).toBe('workspace');
    expect(noBrowserslist.fixable).toBe(false);
    expect(noBrowserslist.categories).toContain('tooling');
    expect(typeof noBrowserslist.check).toBe('function');
  });

  it('flags .browserslistrc', async () => {
    const files: Map<string, string> = new Map([['/workspace/.browserslistrc', 'last 2 versions']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBrowserslist.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-browserslist');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('.browserslistrc');
  });

  it('passes biome.json', async () => {
    const files: Map<string, string> = new Map([['/workspace/biome.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBrowserslist.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-swcrc', () => {
  it('has correct rule metadata', () => {
    expect(noSwcrc.id).toBe('workspace/no-swcrc');
    expect(noSwcrc.scope).toBe('workspace');
    expect(noSwcrc.fixable).toBe(false);
    expect(noSwcrc.categories).toContain('tooling');
    expect(typeof noSwcrc.check).toBe('function');
  });

  it('flags .swcrc', async () => {
    const files: Map<string, string> = new Map([['/workspace/.swcrc', '{"jsc":{}}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noSwcrc.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-swcrc');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('.swcrc');
  });

  it('passes tsconfig.json', async () => {
    const files: Map<string, string> = new Map([['/workspace/tsconfig.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noSwcrc.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-parcel-config', () => {
  it('has correct rule metadata', () => {
    expect(noParcelConfig.id).toBe('workspace/no-parcel-config');
    expect(noParcelConfig.scope).toBe('workspace');
    expect(noParcelConfig.fixable).toBe(false);
    expect(noParcelConfig.categories).toContain('tooling');
    expect(typeof noParcelConfig.check).toBe('function');
  });

  it('flags .parcelrc', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.parcelrc', '{"extends":"@parcel/config-default"}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noParcelConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-parcel-config');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('.parcelrc');
  });

  it('flags parcel.config.js', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/parcel.config.js', 'module.exports = {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noParcelConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('parcel.config.js');
  });

  it('passes vite.config.ts', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/vite.config.ts', 'export default {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noParcelConfig.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-postinstall-scripts', () => {
  it('has correct rule metadata', () => {
    expect(noPostinstallScripts.id).toBe('workspace/no-postinstall-scripts');
    expect(noPostinstallScripts.scope).toBe('workspace');
    expect(noPostinstallScripts.fixable).toBe(false);
    expect(noPostinstallScripts.categories).toContain('safety');
    expect(typeof noPostinstallScripts.check).toBe('function');
  });

  it('flags package.json with postinstall', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/foo/package.json',
        JSON.stringify({ name: 'foo', scripts: { postinstall: 'node setup.js' } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noPostinstallScripts.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-postinstall-scripts');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('postinstall');
  });

  it('passes package.json with build script only', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/foo/package.json',
        JSON.stringify({ name: 'foo', scripts: { build: 'tsc' } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noPostinstallScripts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes package.json with no scripts', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/foo/package.json', JSON.stringify({ name: 'foo' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noPostinstallScripts.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-tool-overrides-in-package-json', () => {
  it('has correct rule metadata', () => {
    expect(noToolOverridesInPackageJson.id).toBe('workspace/no-tool-overrides-in-package-json');
    expect(noToolOverridesInPackageJson.scope).toBe('workspace');
    expect(noToolOverridesInPackageJson.fixable).toBe(false);
    expect(noToolOverridesInPackageJson.categories).toContain('tooling');
    expect(typeof noToolOverridesInPackageJson.check).toBe('function');
  });

  it('flags eslintConfig in package.json', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/foo/package.json',
        JSON.stringify({ name: 'foo', eslintConfig: { rules: {} } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noToolOverridesInPackageJson.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-tool-overrides-in-package-json');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('eslintConfig');
  });

  it('flags prettier in package.json', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/foo/package.json',
        JSON.stringify({ name: 'foo', prettier: { semi: false } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noToolOverridesInPackageJson.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('prettier');
  });

  it('flags multiple disallowed keys', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/foo/package.json',
        JSON.stringify({ name: 'foo', biome: {}, prettier: {} }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noToolOverridesInPackageJson.check(ctx);
    expect(results.length).toBe(2);
  });

  it('passes clean package.json', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/foo/package.json', JSON.stringify({ name: 'foo', version: '1.0.0' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noToolOverridesInPackageJson.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 17 — tsconfig validation rules
// =============================================================================

describe('workspace/require-tsconfig-strict', () => {
  it('flags tsconfig with strict: false', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: { strict: false } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigStrict.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/require-tsconfig-strict');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('strict');
  });

  it('flags tsconfig with no strict field', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ES2022' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigStrict.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes tsconfig with strict: true', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: { strict: true } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigStrict.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-tsconfig JSON files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: 'test' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigStrict.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/require-tsconfig-target', () => {
  it('flags tsconfig with target ES2015', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ES2015' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigTarget.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('ES2015');
  });

  it('flags tsconfig with no target field', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: { strict: true } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigTarget.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes tsconfig with target ES2022', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ES2022' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigTarget.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes tsconfig with target ESNext', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ESNext' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigTarget.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-tsconfig files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: 'test' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigTarget.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/require-tsconfig-extends-base', () => {
  it('flags tsconfig.json with no extends', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: { strict: true } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigExtendsBase.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/require-tsconfig-extends-base');
    expect(results[0]!.severity).toBe('error');
  });

  it('flags tsconfig.json with non-base extends', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ extends: './some-random.json' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigExtendsBase.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes tsconfig.json with scoped package extends', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ extends: '@scope/tsconfig/base' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigExtendsBase.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes tsconfig.json with tsconfig.base.json extends', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ extends: '../../tsconfig.base.json' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigExtendsBase.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores tsconfig.base.json itself', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.base.json', JSON.stringify({ compilerOptions: { strict: true } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigExtendsBase.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/tsconfig-extends-resolves', () => {
  it('flags tsconfig with missing extends target', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ extends: './missing.json' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await tsconfigExtendsResolves.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes tsconfig with existing extends target', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ extends: './base.json' })],
      ['/workspace/base.json', JSON.stringify({ compilerOptions: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await tsconfigExtendsResolves.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips scoped package extends', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ extends: '@scope/tsconfig/base' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await tsconfigExtendsResolves.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips tsconfig with no extends', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await tsconfigExtendsResolves.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-tsconfig-circular-extends', () => {
  it('flags circular extends chain', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.a.json', JSON.stringify({ extends: './tsconfig.b.json' })],
      ['/workspace/tsconfig.b.json', JSON.stringify({ extends: './tsconfig.a.json' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigCircularExtends.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message.toLowerCase()).toContain('circular');
  });

  it('passes linear extends chain', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ extends: './tsconfig.base.json' })],
      ['/workspace/tsconfig.base.json', JSON.stringify({ compilerOptions: { strict: true } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigCircularExtends.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes single tsconfig with no extends', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigCircularExtends.check(ctx);
    expect(results.length).toBe(0);
  });

  it('flags self-referencing tsconfig', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ extends: './tsconfig.json' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigCircularExtends.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

describe('workspace/no-tsconfig-deprecated-options', () => {
  it('flags deprecated diagnostics option', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: { diagnostics: true } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigDeprecatedOptions.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('diagnostics');
  });

  it('flags multiple deprecated keys', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ compilerOptions: { charset: 'utf-8', listFiles: true } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigDeprecatedOptions.check(ctx);
    expect(results.length).toBe(2);
  });

  it('passes tsconfig with no deprecated keys', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: { strict: true } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigDeprecatedOptions.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-tsconfig files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: 'test' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigDeprecatedOptions.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/require-tsconfig-module-resolution', () => {
  it('flags ESNext module without bundler resolution', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ compilerOptions: { module: 'ESNext', moduleResolution: 'node' } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigModuleResolution.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('flags ESNext module with no moduleResolution', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: { module: 'ESNext' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigModuleResolution.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes ESNext module with bundler resolution', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ compilerOptions: { module: 'ESNext', moduleResolution: 'bundler' } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigModuleResolution.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes non-ESNext module regardless of moduleResolution', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: { module: 'CommonJS' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigModuleResolution.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-tsconfig-include-exclude-overlap', () => {
  it('flags overlapping entry in include and exclude', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ include: ['src', 'tests'], exclude: ['src', 'dist'] }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigIncludeExcludeOverlap.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('src');
  });

  it('flags multiple overlapping entries', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ include: ['src', 'lib'], exclude: ['src', 'lib'] }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigIncludeExcludeOverlap.check(ctx);
    expect(results.length).toBe(2);
  });

  it('passes tsconfig with no overlap', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ include: ['src'], exclude: ['dist'] })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigIncludeExcludeOverlap.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes tsconfig with only include, no exclude', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ include: ['src'] })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigIncludeExcludeOverlap.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/require-tsconfig-exclude-defaults', () => {
  it('flags tsconfig with empty exclude', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ exclude: [] })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigExcludeDefaults.check(ctx);
    expect(results.length).toBe(5);
    expect(results[0]!.severity).toBe('warning');
  });

  it('flags tsconfig with partial exclude', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ exclude: ['dist'] })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigExcludeDefaults.check(ctx);
    expect(results.length).toBe(4);
  });

  it('passes tsconfig with all defaults present', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ exclude: ['dist', 'build', 'coverage', 'tmp', 'node_modules'] }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigExcludeDefaults.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes tsconfig with defaults plus extras', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ exclude: ['dist', 'build', 'coverage', 'tmp', 'node_modules', '.cache'] }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigExcludeDefaults.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/tsconfig-paths-resolve', () => {
  it('flags unresolvable path alias', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ compilerOptions: { paths: { '@/utils/*': ['src/utils/*'] } } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    vi.spyOn(ctx, 'dirExists').mockImplementation(
      (): Promise<boolean> =>
        new Promise<boolean>((resolve) => {
          resolve(false);
        }),
    );
    const results: LintResult[] = await tsconfigPathsResolve.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes when path alias target exists as directory', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ compilerOptions: { paths: { '@/utils/*': ['src/utils/*'] } } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    vi.spyOn(ctx, 'dirExists').mockImplementation(
      (path: string): Promise<boolean> =>
        new Promise<boolean>((resolve) => {
          resolve(path === '/workspace/src/utils');
        }),
    );
    const results: LintResult[] = await tsconfigPathsResolve.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes tsconfig with no paths', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: { strict: true } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await tsconfigPathsResolve.check(ctx);
    expect(results.length).toBe(0);
  });

  it('flags multiple broken aliases', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ compilerOptions: { paths: { '@/a/*': ['a/*'], '@/b/*': ['b/*'] } } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    vi.spyOn(ctx, 'dirExists').mockImplementation(
      (): Promise<boolean> =>
        new Promise<boolean>((resolve) => {
          resolve(false);
        }),
    );
    const results: LintResult[] = await tsconfigPathsResolve.check(ctx);
    expect(results.length).toBe(2);
  });
});

describe('workspace/no-tsconfig-path-shadowing', () => {
  it('flags path alias shadowing react', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ compilerOptions: { paths: { react: ['./src/react'] } } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigPathShadowing.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message.toLowerCase()).toContain('shadow');
  });

  it('flags path alias shadowing vite', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ compilerOptions: { paths: { vite: ['./src/vite'] } } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigPathShadowing.check(ctx);
    expect(results.length).toBe(1);
  });

  it('flags path alias shadowing @types/*', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ compilerOptions: { paths: { '@types/*': ['./types/*'] } } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigPathShadowing.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes custom path alias', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ compilerOptions: { paths: { '@/utils/*': ['src/utils/*'] } } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigPathShadowing.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/require-tsconfig-schema', () => {
  it('flags tsconfig with no $schema', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: { strict: true } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigSchema.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('$schema');
  });

  it('flags tsconfig with wrong $schema URL', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ $schema: 'https://example.com/wrong' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigSchema.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes tsconfig with correct $schema', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ $schema: 'https://json.schemastore.org/tsconfig' }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigSchema.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-tsconfig JSON files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: 'test' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigSchema.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-tsconfig-types-duplicates', () => {
  it('flags duplicate type entry', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ compilerOptions: { types: ['vitest', 'vitest'] } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigTypesDuplicates.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('vitest');
  });

  it('flags multiple duplicate entries', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ compilerOptions: { types: ['vitest', 'node', 'vitest', 'node'] } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigTypesDuplicates.check(ctx);
    expect(results.length).toBe(2);
  });

  it('passes unique types', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ compilerOptions: { types: ['vitest', 'node'] } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigTypesDuplicates.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes tsconfig with no types array', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: { strict: true } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigTypesDuplicates.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/tsconfig-references-resolve', () => {
  it('flags unresolvable reference path', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ references: [{ path: '../missing' }] })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await tsconfigReferencesResolve.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes when referenced tsconfig.json exists', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ references: [{ path: './packages/lib' }] })],
      ['/workspace/packages/lib/tsconfig.json', JSON.stringify({ compilerOptions: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await tsconfigReferencesResolve.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes tsconfig with no references', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await tsconfigReferencesResolve.check(ctx);
    expect(results.length).toBe(0);
  });

  it('flags multiple broken references', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ references: [{ path: './a' }, { path: './b' }] }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await tsconfigReferencesResolve.check(ctx);
    expect(results.length).toBe(2);
  });

  it('passes reference to tsconfig file directly', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ references: [{ path: './tsconfig.build.json' }] }),
      ],
      ['/workspace/tsconfig.build.json', JSON.stringify({ compilerOptions: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await tsconfigReferencesResolve.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-tsconfig-import-inconsistency', () => {
  it('flags allowSyntheticDefaultImports without esModuleInterop', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({
          compilerOptions: { allowSyntheticDefaultImports: true, esModuleInterop: false },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigImportInconsistency.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('flags allowSyntheticDefaultImports with no esModuleInterop', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ compilerOptions: { allowSyntheticDefaultImports: true } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigImportInconsistency.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes when both are true', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({
          compilerOptions: { allowSyntheticDefaultImports: true, esModuleInterop: true },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigImportInconsistency.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when allowSyntheticDefaultImports is not set', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: { strict: true } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigImportInconsistency.check(ctx);
    expect(results.length).toBe(0);
  });
});
