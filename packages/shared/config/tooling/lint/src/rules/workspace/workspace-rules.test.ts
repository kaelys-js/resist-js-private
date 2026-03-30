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
import noWildcardVersions from './no-wildcard-versions.ts';
import noTarballDeps from './no-tarball-deps.ts';
import noOptionalDependencies from './no-optional-dependencies.ts';
import validatePackageEntrypoints from './validate-package-entrypoints.ts';
import requirePackageDescription from './require-package-description.ts';
import requirePackageNameVersion from './require-package-name-version.ts';
import requirePackageSchema from './require-package-schema.ts';
import requirePackageNameMatchesPath from './require-package-name-matches-path.ts';
import noInvalidPackageVersion from './no-invalid-package-version.ts';
import requirePackageMetadata from './require-package-metadata.ts';
import requireWorkspaceProtocol from './require-workspace-protocol.ts';
import noScriptConflicts from './no-script-conflicts.ts';
import requirePackageAuthor from './require-package-author.ts';
import noDuplicatePackageNames from './no-duplicate-package-names.ts';
import requireSpdxLicense from './require-spdx-license.ts';
import requireTsconfigBaseurl from './require-tsconfig-baseurl.ts';
import tsconfigBaseurlResolves from './tsconfig-baseurl-resolves.ts';
import noTsconfigConflictingTypes from './no-tsconfig-conflicting-types.ts';
import noTsconfigOutdirRootdirOverlap from './no-tsconfig-outdir-rootdir-overlap.ts';
import requireTsconfigTypes from './require-tsconfig-types.ts';
import noTsconfigUnusedPaths from './no-tsconfig-unused-paths.ts';
import noMultipleTsconfigBase from './no-multiple-tsconfig-base.ts';
import requirePnpmScripts from './require-pnpm-scripts.ts';
import requirePrivateInternalPackages from './require-private-internal-packages.ts';
import requireScopedPackageNames from './require-scoped-package-names.ts';
import noDuplicateDeps from './no-duplicate-deps.ts';
import noCustomDependencySources from './no-custom-dependency-sources.ts';
import noSideeffectsTrue from './no-sideeffects-true.ts';
import noLargeDependencies from './no-large-dependencies.ts';
import noNpmrc from './no-npmrc.ts';
import requireVscodeFolder from './require-vscode-folder.ts';
import noExtraVscodeFiles from './no-extra-vscode-files.ts';
import requireVscodeValidJson from './require-vscode-valid-json.ts';
import requireEditorconfig from './require-editorconfig.ts';
import requireGitignore from './require-gitignore.ts';
import requireDockerignore from './require-dockerignore.ts';
import requireGitattributes from './require-gitattributes.ts';
import requireBiomeExtendsRoot from './require-biome-extends-root.ts';
import requireOxlintExtendsRoot from './require-oxlint-extends-root.ts';
import noLinterConfigOverride from './no-linter-config-override.ts';
import noCrossProductImports from './no-cross-product-imports.ts';
import noDeepRelativeSharedImports from './no-deep-relative-shared-imports.ts';
import noCrossLayerImports from './no-cross-layer-imports.ts';
import noEmptyTestsDirectory from './no-empty-tests-directory.ts';
import noEmptyBenchmarksDirectory from './no-empty-benchmarks-directory.ts';
import validateFilenameCasing from './validate-filename-casing.ts';
import enforceDocsNaming from './enforce-docs-naming.ts';
import enforceTestFileNaming from './enforce-test-file-naming.ts';
import noTodoInDocs from './no-todo-in-docs.ts';
import noBrokenMarkdownLinks from './no-broken-markdown-links.ts';
import noNextjsArtifacts from './no-nextjs-artifacts.ts';
import noGatsbyArtifacts from './no-gatsby-artifacts.ts';
import noHugoConfigs from './no-hugo-configs.ts';
import noUnapprovedSsg from './no-unapproved-ssg.ts';
import validateMjsCjsUsage from './validate-mjs-cjs-usage.ts';
import noExportsOverlap from './no-exports-overlap.ts';
import enforceWorkspaceVersionAlignment from './enforce-workspace-version-alignment.ts';
import validateRootBiomeJson from './validate-root-biome-json.ts';
import validateRootOxlintrcJson from './validate-root-oxlintrc-json.ts';
import enforceBenchmarkFileNaming from './enforce-benchmark-file-naming.ts';
import noReactNativeArtifacts from './no-react-native-artifacts.ts';
import noDockerComposeV1 from './no-docker-compose-v1.ts';
import detectUndeclaredDependencies from './detect-undeclared-dependencies.ts';
import warnVscodeSettingsConflicts from './warn-vscode-settings-conflicts.ts';
import validateVscodeExtensions from './validate-vscode-extensions.ts';
import enforcePeerDependencyConsistency from './enforce-peer-dependency-consistency.ts';
import noSensitivePublicFiles from './no-sensitive-public-files.ts';
import validateRootPackageConfig from './validate-root-package-config.ts';
import validateScriptDescriptions from './validate-script-descriptions.ts';
import validateRootScriptsConsistency from './validate-root-scripts-consistency.ts';
import validateProductScripts from './validate-product-scripts.ts';
import noDeployScripts from './no-deploy-scripts.ts';
import noLintIgnoreDirectives from './no-lint-ignore-directives.ts';
import validatePackageTags from './validate-package-tags.ts';
import noEnvOrGlobalsInSharedLibs from './no-env-or-globals-in-shared-libs.ts';
import noTsconfigDuplicateExtends from './no-tsconfig-duplicate-extends.ts';
import validateTsconfigRootdirLayout from './validate-tsconfig-rootdir-layout.ts';
import noTsconfigOutdirRootdirFiles from './no-tsconfig-outdir-rootdir-files.ts';
import validateTsconfigIncludePatterns from './validate-tsconfig-include-patterns.ts';
import validateWranglerCronSyntax from './validate-wrangler-cron-syntax.ts';
import wranglerNameMatchesPackage from './wrangler-name-matches-package.ts';
import wranglerMainEntrypointExists from './wrangler-main-entrypoint-exists.ts';
import wranglerBindingNamesUnique from './wrangler-binding-names-unique.ts';
import noForbiddenNodeImportsInWorkers from './no-forbidden-node-imports-in-workers.ts';
import noHardcodedLocalhostPorts from './no-hardcoded-localhost-ports.ts';
import noMigrationTempfiles from './no-migration-tempfiles.ts';
import noNonpreferredImageFormats from './no-nonpreferred-image-formats.ts';
import validateFormattingConfigConsistency from './validate-formatting-config-consistency.ts';
import validateNanostoresSafety from './validate-nanostores-safety.ts';
import validateTsconfigPathsResolution from './validate-tsconfig-paths-resolution.ts';
import noOversizedCommits from './no-oversized-commits.ts';
import enforceDocsLocationRule from './enforce-docs-location.ts';
import validateMonorepoLayout from './validate-monorepo-layout.ts';
import validateYamlSchemaDirectives from './validate-yaml-schema-directives.ts';
import validateJsonSchemaFields from './validate-json-schema-fields.ts';
import validateMakefiles from './validate-makefiles.ts';
import noWorldWritableFiles from './no-world-writable-files.ts';
import noWranglerRouteCollisions from './no-wrangler-route-collisions.ts';
import wranglerBindingsConsistentEnvs from './wrangler-bindings-consistent-envs.ts';
import wranglerBindingNamingConventions from './wrangler-binding-naming-conventions.ts';
import validateWranglerEnvironments from './validate-wrangler-environments.ts';
import noHardcodedServiceUrls from './no-hardcoded-service-urls.ts';
import noMultipleEnvFiles from './no-multiple-env-files.ts';
import validateSqlMigrations from './validate-sql-migrations.ts';
import validateShellScripts from './validate-shell-scripts.ts';
import validateCiFolderStructure from './validate-ci-folder-structure.ts';
import requireVscodeSettings from './require-vscode-settings.ts';
import noEmptyVscodeSettings from './no-empty-vscode-settings.ts';
import validateAllContributorsrc from './validate-all-contributorsrc.ts';
import validateCodeowners from './validate-codeowners.ts';
import preferEnvBashShebang from './prefer-env-bash-shebang.ts';
import validateTsconfigPathAliases from './validate-tsconfig-path-aliases.ts';
import requireScriptDescriptions from './require-script-descriptions.ts';
import wranglerTailConsumersUnique from './wrangler-tail-consumers-unique.ts';
import noUnreferencedShellScripts from './no-unreferenced-shell-scripts.ts';
import validateEnvFileIntegrity from './validate-env-file-integrity.ts';
import validateWranglerConfig from './validate-wrangler-config.ts';
import validateDbNameSafety from './validate-db-name-safety.ts';
import validateMonorepoSchemaExample from './validate-monorepo-schema-example.ts';
import noUnlinkedWorkspaceDeps from './no-unlinked-workspace-deps.ts';

// Phase 26 — CI Configuration, Docs Frontmatter & Worker Safety
import noInlineCiScripts from './no-inline-ci-scripts.ts';
import warnUnusedGitignorePatterns from './warn-unused-gitignore-patterns.ts';
import noCiRecursiveTriggers from './no-ci-recursive-triggers.ts';
import requireCiJobConditions from './require-ci-job-conditions.ts';
import noDuplicateCiJobNames from './no-duplicate-ci-job-names.ts';
import requireCiJobTimeouts from './require-ci-job-timeouts.ts';
import noUnusedCiStages from './no-unused-ci-stages.ts';
import requireCodeownersCoverage from './require-codeowners-coverage.ts';
import validateDocsFrontmatter from './validate-docs-frontmatter.ts';
import requireMakefileHelpTarget from './require-makefile-help-target.ts';
import noOrphanedTsFiles from './no-orphaned-ts-files.ts';
import noDisallowedWorkerHeaders from './no-disallowed-worker-headers.ts';
import requireDockerComposeSchema from './require-docker-compose-schema.ts';
import validateLocaleKeyConsistency from './validate-locale-key-consistency.ts';
import validateImageOptimization from './validate-image-optimization.ts';

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
    allFiles: (): Promise<readonly string[]> => Promise.resolve([...files.keys()]),
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

// =============================================================================
// Phase 18 — package.json Validation Rules
// =============================================================================

describe('workspace/no-wildcard-versions', () => {
  it('flags "latest" dep version', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ dependencies: { foo: 'latest' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWildcardVersions.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-wildcard-versions');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('latest');
  });

  it('flags "*" dep version', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ devDependencies: { bar: '*' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWildcardVersions.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('*');
  });

  it('flags empty dep version', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ dependencies: { baz: '' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWildcardVersions.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('(empty)');
  });

  it('passes valid semver versions', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ dependencies: { foo: '^1.2.3' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWildcardVersions.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-package.json files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ dependencies: { foo: 'latest' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWildcardVersions.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-tarball-deps', () => {
  it('flags .tgz dep in dependencies', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({ dependencies: { foo: 'https://example.com/foo-1.0.0.tgz' } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTarballDeps.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-tarball-deps');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('.tgz');
  });

  it('flags .tgz dep in devDependencies', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({ devDependencies: { bar: 'file:./bar-0.1.0.tgz' } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTarballDeps.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes normal registry versions', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ dependencies: { foo: '^1.0.0' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTarballDeps.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-package.json files', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/other.json',
        JSON.stringify({ dependencies: { foo: 'https://example.com/foo.tgz' } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTarballDeps.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-optional-dependencies', () => {
  it('flags package.json with optionalDependencies', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ optionalDependencies: { foo: '^1.0.0' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noOptionalDependencies.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-optional-dependencies');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('optionalDependencies');
  });

  it('passes package.json without optionalDependencies', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ dependencies: { foo: '^1.0.0' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noOptionalDependencies.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-package.json files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/other.json', JSON.stringify({ optionalDependencies: { foo: '^1.0.0' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noOptionalDependencies.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/validate-package-entrypoints', () => {
  it('flags missing main entry file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pkg/package.json', JSON.stringify({ main: './dist/index.js' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    vi.spyOn(ctx, 'fileExists').mockImplementation(() => Promise.resolve(false));
    const results: LintResult[] = await validatePackageEntrypoints.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/validate-package-entrypoints');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('main');
  });

  it('flags missing module entry file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pkg/package.json', JSON.stringify({ module: './dist/index.mjs' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    vi.spyOn(ctx, 'fileExists').mockImplementation(() => Promise.resolve(false));
    const results: LintResult[] = await validatePackageEntrypoints.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('module');
  });

  it('flags missing exports path', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/pkg/package.json',
        JSON.stringify({ exports: { '.': { import: './dist/index.mjs' } } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    vi.spyOn(ctx, 'fileExists').mockImplementation(() => Promise.resolve(false));
    const results: LintResult[] = await validatePackageEntrypoints.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('./dist/index.mjs');
  });

  it('passes when main file exists', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pkg/package.json', JSON.stringify({ main: './dist/index.js' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    vi.spyOn(ctx, 'fileExists').mockImplementation(() => Promise.resolve(true));
    const results: LintResult[] = await validatePackageEntrypoints.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when no entrypoints', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pkg/package.json', JSON.stringify({ name: '@scope/pkg' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validatePackageEntrypoints.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-package.json files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/other.json', JSON.stringify({ main: './missing.js' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validatePackageEntrypoints.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/require-package-description', () => {
  it('flags missing description', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: '@scope/pkg' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageDescription.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/require-package-description');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('description');
  });

  it('flags empty description', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ description: '' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageDescription.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes non-empty description', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ description: 'A useful package' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageDescription.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-package.json files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/other.json', JSON.stringify({ name: '@scope/pkg' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageDescription.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/require-package-name-version', () => {
  it('flags missing name', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ version: '1.0.0' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageNameVersion.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.ruleId).toBe('workspace/require-package-name-version');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('name');
  });

  it('flags missing version', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: '@scope/pkg' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageNameVersion.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r: LintResult) => r.message.includes('version'))).toBe(true);
  });

  it('flags empty name', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: '', version: '1.0.0' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageNameVersion.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('passes with both name and version', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: '@scope/pkg', version: '1.0.0' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageNameVersion.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-package.json files', async () => {
    const files: Map<string, string> = new Map([['/workspace/other.json', JSON.stringify({})]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageNameVersion.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/require-package-schema', () => {
  it('flags missing $schema', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: '@scope/pkg' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageSchema.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/require-package-schema');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('$schema');
  });

  it('flags wrong $schema value', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({ $schema: 'https://wrong.example.com/schema.json' }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageSchema.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Invalid');
  });

  it('passes correct $schema', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({ $schema: 'https://json.schemastore.org/package.json' }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageSchema.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-package.json files', async () => {
    const files: Map<string, string> = new Map([['/workspace/other.json', JSON.stringify({})]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageSchema.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/require-package-name-matches-path', () => {
  it('flags when name does not match directory', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/foo/package.json', JSON.stringify({ name: '@scope/bar' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageNameMatchesPath.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/require-package-name-matches-path');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('bar');
    expect(results[0]!.message).toContain('foo');
  });

  it('passes when scoped name matches directory', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/foo/package.json', JSON.stringify({ name: '@scope/foo' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageNameMatchesPath.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when unscoped name matches directory', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/foo/package.json', JSON.stringify({ name: 'foo' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageNameMatchesPath.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips package.json with no name', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/foo/package.json', JSON.stringify({})],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageNameMatchesPath.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-package.json files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/foo/other.json', JSON.stringify({ name: '@scope/bar' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageNameMatchesPath.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-invalid-package-version', () => {
  it('flags missing version', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: '@scope/pkg' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInvalidPackageVersion.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-invalid-package-version');
    expect(results[0]!.severity).toBe('error');
  });

  it('flags invalid version string', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ version: 'abc' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInvalidPackageVersion.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('abc');
  });

  it('flags workspace:* in non-private package', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ version: 'workspace:*' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInvalidPackageVersion.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('workspace:*');
  });

  it('passes valid semver', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ version: '1.2.3' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInvalidPackageVersion.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes workspace:* in private package', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ version: 'workspace:*', private: true })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInvalidPackageVersion.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes prerelease version', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ version: '0.1.0-beta.1' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInvalidPackageVersion.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/require-package-metadata', () => {
  it('flags inconsistent author', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({ author: { name: 'Root Author' }, homepage: 'https://example.com' }),
      ],
      ['/workspace/packages/foo/package.json', JSON.stringify({ author: { name: 'Other' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageMetadata.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.ruleId).toBe('workspace/require-package-metadata');
    expect(results[0]!.severity).toBe('warning');
  });

  it('flags missing homepage in child', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ homepage: 'https://example.com' })],
      ['/workspace/packages/foo/package.json', JSON.stringify({})],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageMetadata.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('passes when metadata matches root', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ homepage: 'https://example.com' })],
      ['/workspace/packages/foo/package.json', JSON.stringify({ homepage: 'https://example.com' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageMetadata.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips when root has no metadata', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: 'root' })],
      ['/workspace/packages/foo/package.json', JSON.stringify({})],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageMetadata.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-package.json files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ homepage: 'https://example.com' })],
      ['/workspace/other.json', JSON.stringify({})],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageMetadata.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/require-workspace-protocol', () => {
  it('flags internal dep without workspace: protocol', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/bar/package.json',
        JSON.stringify({ dependencies: { '@scope/foo': '^1.0.0' } }),
      ],
    ]);
    const packages: WorkspacePackage[] = [
      {
        name: '@scope/foo',
        path: '/workspace/packages/foo/package.json',
        dir: '/workspace/packages/foo',
        packageJson: {},
      },
      {
        name: '@scope/bar',
        path: '/workspace/packages/bar/package.json',
        dir: '/workspace/packages/bar',
        packageJson: {},
      },
    ];
    const ctx: WorkspaceContext = mockContext({ files, packages });
    const results: LintResult[] = await requireWorkspaceProtocol.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/require-workspace-protocol');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('@scope/foo');
  });

  it('flags internal dep in devDependencies', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/bar/package.json',
        JSON.stringify({ devDependencies: { '@scope/foo': '~2.0.0' } }),
      ],
    ]);
    const packages: WorkspacePackage[] = [
      {
        name: '@scope/foo',
        path: '/workspace/packages/foo/package.json',
        dir: '/workspace/packages/foo',
        packageJson: {},
      },
    ];
    const ctx: WorkspaceContext = mockContext({ files, packages });
    const results: LintResult[] = await requireWorkspaceProtocol.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes internal dep with workspace:*', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/bar/package.json',
        JSON.stringify({ dependencies: { '@scope/foo': 'workspace:*' } }),
      ],
    ]);
    const packages: WorkspacePackage[] = [
      {
        name: '@scope/foo',
        path: '/workspace/packages/foo/package.json',
        dir: '/workspace/packages/foo',
        packageJson: {},
      },
    ];
    const ctx: WorkspaceContext = mockContext({ files, packages });
    const results: LintResult[] = await requireWorkspaceProtocol.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes external dep with normal version', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/bar/package.json',
        JSON.stringify({ dependencies: { react: '^18.0.0' } }),
      ],
    ]);
    const packages: WorkspacePackage[] = [
      {
        name: '@scope/bar',
        path: '/workspace/packages/bar/package.json',
        dir: '/workspace/packages/bar',
        packageJson: {},
      },
    ];
    const ctx: WorkspaceContext = mockContext({ files, packages });
    const results: LintResult[] = await requireWorkspaceProtocol.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-package.json files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/other.json', JSON.stringify({ dependencies: { '@scope/foo': '^1.0.0' } })],
    ]);
    const packages: WorkspacePackage[] = [
      {
        name: '@scope/foo',
        path: '/workspace/packages/foo/package.json',
        dir: '/workspace/packages/foo',
        packageJson: {},
      },
    ];
    const ctx: WorkspaceContext = mockContext({ files, packages });
    const results: LintResult[] = await requireWorkspaceProtocol.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-script-conflicts', () => {
  it('flags conflicting scripts across packages', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/a/package.json', JSON.stringify({ scripts: { build: 'tsc' } })],
      ['/workspace/packages/b/package.json', JSON.stringify({ scripts: { build: 'vite build' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noScriptConflicts.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.ruleId).toBe('workspace/no-script-conflicts');
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('build');
  });

  it('passes same script values across packages', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/a/package.json', JSON.stringify({ scripts: { build: 'tsc' } })],
      ['/workspace/packages/b/package.json', JSON.stringify({ scripts: { build: 'tsc' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noScriptConflicts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes single package', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ scripts: { build: 'tsc' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noScriptConflicts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-package.json files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/other.json', JSON.stringify({ scripts: { build: 'tsc' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noScriptConflicts.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/require-package-author', () => {
  it('flags missing author', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: '@scope/pkg' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageAuthor.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/require-package-author');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('author');
  });

  it('flags null author', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ author: null })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageAuthor.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes string author', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ author: 'Some Author' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageAuthor.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes object author with name', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ author: { name: 'Some Author' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePackageAuthor.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-duplicate-package-names', () => {
  it('flags duplicate package names', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/a/package.json', JSON.stringify({ name: '@scope/same' })],
      ['/workspace/packages/b/package.json', JSON.stringify({ name: '@scope/same' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDuplicatePackageNames.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.ruleId).toBe('workspace/no-duplicate-package-names');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('@scope/same');
  });

  it('passes unique package names', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/a/package.json', JSON.stringify({ name: '@scope/a' })],
      ['/workspace/packages/b/package.json', JSON.stringify({ name: '@scope/b' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDuplicatePackageNames.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips packages with no name', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/a/package.json', JSON.stringify({})],
      ['/workspace/packages/b/package.json', JSON.stringify({})],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDuplicatePackageNames.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-package.json files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/other.json', JSON.stringify({ name: '@scope/same' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDuplicatePackageNames.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/require-spdx-license', () => {
  it('flags missing license', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: '@scope/pkg' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireSpdxLicense.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/require-spdx-license');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('license');
  });

  it('flags invalid SPDX license', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ license: 'INVALID-LICENSE' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireSpdxLicense.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('INVALID-LICENSE');
  });

  it('passes MIT license', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ license: 'MIT' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireSpdxLicense.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes Apache-2.0 license', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ license: 'Apache-2.0' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireSpdxLicense.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-package.json files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/other.json', JSON.stringify({ license: 'INVALID' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireSpdxLicense.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/require-tsconfig-baseurl
// =============================================================================

describe('workspace/require-tsconfig-baseurl', () => {
  it('has correct rule metadata', () => {
    expect(requireTsconfigBaseurl.id).toBe('workspace/require-tsconfig-baseurl');
    expect(requireTsconfigBaseurl.scope).toBe('workspace');
  });

  it('reports warning when baseUrl is missing', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigBaseurl.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/require-tsconfig-baseurl');
    expect(results[0]!.message).toContain('baseUrl');
    expect(results[0]!.severity).toBe('warning');
  });

  it('reports warning when baseUrl is invalid', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ compilerOptions: { baseUrl: '/absolute/path' } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigBaseurl.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Invalid baseUrl');
  });

  it('passes when baseUrl is "."', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: { baseUrl: '.' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigBaseurl.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when baseUrl is "src"', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: { baseUrl: 'src' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigBaseurl.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-tsconfig files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ compilerOptions: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigBaseurl.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/tsconfig-baseurl-resolves
// =============================================================================

describe('workspace/tsconfig-baseurl-resolves', () => {
  it('has correct rule metadata', () => {
    expect(tsconfigBaseurlResolves.id).toBe('workspace/tsconfig-baseurl-resolves');
    expect(tsconfigBaseurlResolves.scope).toBe('workspace');
  });

  it('reports error when baseUrl directory does not exist', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: { baseUrl: 'src' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    vi.spyOn(ctx, 'dirExists').mockImplementation(
      (): Promise<boolean> =>
        new Promise<boolean>((resolve: (v: boolean) => void): void => {
          resolve(false);
        }),
    );
    const results: LintResult[] = await tsconfigBaseurlResolves.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/tsconfig-baseurl-resolves');
    expect(results[0]!.message).toContain('does not resolve');
    expect(results[0]!.severity).toBe('error');
  });

  it('passes when baseUrl directory exists', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: { baseUrl: 'src' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await tsconfigBaseurlResolves.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips when no baseUrl defined', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await tsconfigBaseurlResolves.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-tsconfig files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ compilerOptions: { baseUrl: 'src' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await tsconfigBaseurlResolves.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-tsconfig-conflicting-types
// =============================================================================

describe('workspace/no-tsconfig-conflicting-types', () => {
  it('has correct rule metadata', () => {
    expect(noTsconfigConflictingTypes.id).toBe('workspace/no-tsconfig-conflicting-types');
    expect(noTsconfigConflictingTypes.scope).toBe('workspace');
  });

  it('reports warning when types includes node and other types', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ compilerOptions: { types: ['node', 'jest'] } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigConflictingTypes.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-tsconfig-conflicting-types');
    expect(results[0]!.message).toContain('Conflicting');
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when types only includes node', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: { types: ['node'] } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigConflictingTypes.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when types does not include node', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ compilerOptions: { types: ['jest', 'vitest'] } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigConflictingTypes.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips when no types defined', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigConflictingTypes.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-tsconfig files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ compilerOptions: { types: ['node', 'jest'] } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigConflictingTypes.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-tsconfig-outdir-rootdir-overlap
// =============================================================================

describe('workspace/no-tsconfig-outdir-rootdir-overlap', () => {
  it('has correct rule metadata', () => {
    expect(noTsconfigOutdirRootdirOverlap.id).toBe('workspace/no-tsconfig-outdir-rootdir-overlap');
    expect(noTsconfigOutdirRootdirOverlap.scope).toBe('workspace');
  });

  it('reports error when outDir equals rootDir', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ compilerOptions: { outDir: 'src', rootDir: 'src' } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigOutdirRootdirOverlap.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-tsconfig-outdir-rootdir-overlap');
    expect(results[0]!.message).toContain('outDir must not match rootDir');
    expect(results[0]!.severity).toBe('error');
  });

  it('reports error when outDir is "."', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: { outDir: '.' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigOutdirRootdirOverlap.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('outDir must not match rootDir');
  });

  it('passes when outDir is "dist"', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ compilerOptions: { outDir: 'dist', rootDir: 'src' } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigOutdirRootdirOverlap.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips when no outDir', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: { rootDir: 'src' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigOutdirRootdirOverlap.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-tsconfig files', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({ compilerOptions: { outDir: '.', rootDir: '.' } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigOutdirRootdirOverlap.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/require-tsconfig-types
// =============================================================================

describe('workspace/require-tsconfig-types', () => {
  it('has correct rule metadata', () => {
    expect(requireTsconfigTypes.id).toBe('workspace/require-tsconfig-types');
    expect(requireTsconfigTypes.scope).toBe('workspace');
  });

  it('reports warning for unresolvable type', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: { types: ['nonexistent'] } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    vi.spyOn(ctx, 'dirExists').mockImplementation(
      (): Promise<boolean> =>
        new Promise<boolean>((resolve: (v: boolean) => void): void => {
          resolve(false);
        }),
    );
    const results: LintResult[] = await requireTsconfigTypes.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/require-tsconfig-types');
    expect(results[0]!.message).toContain('Unresolvable');
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when type resolves locally', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: { types: ['node'] } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigTypes.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips when no types defined', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigTypes.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-tsconfig files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ compilerOptions: { types: ['nonexistent'] } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireTsconfigTypes.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-tsconfig-unused-paths
// =============================================================================

describe('workspace/no-tsconfig-unused-paths', () => {
  it('has correct rule metadata', () => {
    expect(noTsconfigUnusedPaths.id).toBe('workspace/no-tsconfig-unused-paths');
    expect(noTsconfigUnusedPaths.scope).toBe('workspace');
  });

  it('reports warning for unused path alias', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({
          compilerOptions: {
            paths: { '@/utils/*': ['src/utils/*'], '@/unused/*': ['src/unused/*'] },
          },
        }),
      ],
      ['/workspace/src/main.ts', 'import { foo } from "@/utils/foo";'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigUnusedPaths.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-tsconfig-unused-paths');
    expect(results[0]!.message).toContain('Unused path alias');
    expect(results[0]!.message).toContain('@/unused');
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when all aliases are used', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ compilerOptions: { paths: { '@/utils/*': ['src/utils/*'] } } }),
      ],
      ['/workspace/src/main.ts', 'import { foo } from "@/utils/foo";'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigUnusedPaths.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips when no paths defined', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigUnusedPaths.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-tsconfig files for path collection', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({ compilerOptions: { paths: { '@/unused/*': ['src/unused/*'] } } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigUnusedPaths.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-multiple-tsconfig-base
// =============================================================================

describe('workspace/no-multiple-tsconfig-base', () => {
  it('has correct rule metadata', () => {
    expect(noMultipleTsconfigBase.id).toBe('workspace/no-multiple-tsconfig-base');
    expect(noMultipleTsconfigBase.scope).toBe('workspace');
  });

  it('passes when only canonical tsconfig.base.json exists', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/config/typescript/tsconfig.base.json', JSON.stringify({})],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMultipleTsconfigBase.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports error for tsconfig.base.json outside canonical location', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/config/typescript/tsconfig.base.json', JSON.stringify({})],
      ['/workspace/packages/app/tsconfig.base.json', JSON.stringify({})],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMultipleTsconfigBase.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-multiple-tsconfig-base');
    expect(results[0]!.message).toContain('Disallowed');
    expect(results[0]!.severity).toBe('error');
  });

  it('reports error when canonical is missing', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/tsconfig.base.json', JSON.stringify({})],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMultipleTsconfigBase.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const messages: string = results.map((r: LintResult) => r.message).join(' ');
    expect(messages).toContain('canonical');
  });

  it('reports error when no tsconfig.base.json files exist (canonical missing)', async () => {
    const files: Map<string, string> = new Map([['/workspace/tsconfig.json', JSON.stringify({})]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMultipleTsconfigBase.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('canonical');
  });
});

// =============================================================================
// workspace/require-pnpm-scripts
// =============================================================================

describe('workspace/require-pnpm-scripts', () => {
  it('has correct rule metadata', () => {
    expect(requirePnpmScripts.id).toBe('workspace/require-pnpm-scripts');
    expect(requirePnpmScripts.scope).toBe('workspace');
  });

  it('reports error when script uses npm', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ scripts: { build: 'npm run compile' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePnpmScripts.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/require-pnpm-scripts');
    expect(results[0]!.message).toContain('Disallowed package manager');
    expect(results[0]!.severity).toBe('error');
  });

  it('reports error when script uses yarn', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ scripts: { test: 'yarn test' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePnpmScripts.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Disallowed package manager');
  });

  it('passes when scripts use pnpm', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({ scripts: { build: 'pnpm run compile', test: 'pnpm vitest' } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePnpmScripts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips when no scripts', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: 'test' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePnpmScripts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-package.json files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ scripts: { build: 'npm run compile' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePnpmScripts.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/require-private-internal-packages
// =============================================================================

describe('workspace/require-private-internal-packages', () => {
  it('has correct rule metadata', () => {
    expect(requirePrivateInternalPackages.id).toBe('workspace/require-private-internal-packages');
    expect(requirePrivateInternalPackages.scope).toBe('workspace');
  });

  it('reports error when internal package missing private:true', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/lib/package.json', JSON.stringify({ name: '@scope/lib' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePrivateInternalPackages.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/require-private-internal-packages');
    expect(results[0]!.message).toContain('private');
    expect(results[0]!.severity).toBe('error');
  });

  it('passes when internal package has private:true', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/lib/package.json',
        JSON.stringify({ name: '@scope/lib', private: true }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePrivateInternalPackages.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips root package.json (not in /packages/)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: 'root' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePrivateInternalPackages.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports error when private is false', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/lib/package.json',
        JSON.stringify({ name: '@scope/lib', private: false }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requirePrivateInternalPackages.check(ctx);
    expect(results.length).toBe(1);
  });
});

// =============================================================================
// workspace/require-scoped-package-names
// =============================================================================

describe('workspace/require-scoped-package-names', () => {
  it('has correct rule metadata', () => {
    expect(requireScopedPackageNames.id).toBe('workspace/require-scoped-package-names');
    expect(requireScopedPackageNames.scope).toBe('workspace');
  });

  it('reports error for unscoped name', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: 'my-lib' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireScopedPackageNames.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/require-scoped-package-names');
    expect(results[0]!.message).toContain('Unscoped');
    expect(results[0]!.severity).toBe('error');
  });

  it('reports error for missing name', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ version: '1.0.0' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireScopedPackageNames.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Missing');
  });

  it('passes for scoped name', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: '@scope/my-lib' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireScopedPackageNames.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports error for invalid scope format', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: '@scope/' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireScopedPackageNames.check(ctx);
    expect(results.length).toBe(1);
  });

  it('ignores non-package.json files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ name: 'unscoped' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireScopedPackageNames.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-duplicate-deps
// =============================================================================

describe('workspace/no-duplicate-deps', () => {
  it('has correct rule metadata', () => {
    expect(noDuplicateDeps.id).toBe('workspace/no-duplicate-deps');
    expect(noDuplicateDeps.scope).toBe('workspace');
  });

  it('reports error when dep appears in multiple fields', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({
          dependencies: { lodash: '4.0.0' },
          devDependencies: { lodash: '4.0.0' },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDuplicateDeps.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-duplicate-deps');
    expect(results[0]!.message).toContain('Duplicate');
    expect(results[0]!.message).toContain('lodash');
    expect(results[0]!.severity).toBe('error');
  });

  it('passes when deps are in separate fields', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({
          dependencies: { react: '18.0.0' },
          devDependencies: { vitest: '1.0.0' },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDuplicateDeps.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips when no deps', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: 'test' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDuplicateDeps.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-package.json files', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({ dependencies: { foo: '1.0' }, devDependencies: { foo: '1.0' } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDuplicateDeps.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-custom-dependency-sources
// =============================================================================

describe('workspace/no-custom-dependency-sources', () => {
  it('has correct rule metadata', () => {
    expect(noCustomDependencySources.id).toBe('workspace/no-custom-dependency-sources');
    expect(noCustomDependencySources.scope).toBe('workspace');
  });

  it('reports error for banned dependency', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ dependencies: { 'node-sass': '7.0.0' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noCustomDependencySources.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-custom-dependency-sources');
    expect(results[0]!.message).toContain('Disallowed');
    expect(results[0]!.message).toContain('node-sass');
    expect(results[0]!.severity).toBe('error');
  });

  it('passes for allowed dependencies', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ dependencies: { react: '18.0.0' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noCustomDependencySources.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips when no deps', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: 'test' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noCustomDependencySources.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-package.json files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ dependencies: { 'node-sass': '7.0.0' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noCustomDependencySources.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-sideeffects-true
// =============================================================================

describe('workspace/no-sideeffects-true', () => {
  it('has correct rule metadata', () => {
    expect(noSideeffectsTrue.id).toBe('workspace/no-sideeffects-true');
    expect(noSideeffectsTrue.scope).toBe('workspace');
  });

  it('reports warning when sideEffects is true', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ sideEffects: true })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noSideeffectsTrue.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-sideeffects-true');
    expect(results[0]!.message).toContain('Tree-shaking');
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when sideEffects is false', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ sideEffects: false })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noSideeffectsTrue.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when sideEffects is an array', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ sideEffects: ['./src/polyfills.ts'] })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noSideeffectsTrue.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips when sideEffects not present', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: 'test' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noSideeffectsTrue.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-large-dependencies
// =============================================================================

describe('workspace/no-large-dependencies', () => {
  it('has correct rule metadata', () => {
    expect(noLargeDependencies.id).toBe('workspace/no-large-dependencies');
    expect(noLargeDependencies.scope).toBe('workspace');
  });

  it('reports warning for heavy dependency', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ dependencies: { moment: '2.29.0' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLargeDependencies.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-large-dependencies');
    expect(results[0]!.message).toContain('moment');
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes for normal dependencies', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ dependencies: { react: '18.0.0' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLargeDependencies.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips when no deps', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: 'test' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLargeDependencies.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-package.json files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ dependencies: { moment: '2.29.0' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLargeDependencies.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-npmrc
// =============================================================================

describe('workspace/no-npmrc', () => {
  it('has correct rule metadata', () => {
    expect(noNpmrc.id).toBe('workspace/no-npmrc');
    expect(noNpmrc.scope).toBe('workspace');
  });

  it('reports error when .npmrc file found', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.npmrc', 'registry=https://registry.npmjs.org/'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNpmrc.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-npmrc');
    expect(results[0]!.message).toContain('.npmrc');
    expect(results[0]!.severity).toBe('error');
  });

  it('passes when no .npmrc files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: 'test' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNpmrc.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports multiple .npmrc files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.npmrc', 'registry=https://registry.npmjs.org/'],
      ['/workspace/packages/app/.npmrc', 'save-exact=true'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNpmrc.check(ctx);
    expect(results.length).toBe(2);
  });
});

// =============================================================================
// workspace/require-vscode-folder
// =============================================================================

describe('workspace/require-vscode-folder', () => {
  it('has correct rule metadata', () => {
    expect(requireVscodeFolder.id).toBe('workspace/require-vscode-folder');
    expect(requireVscodeFolder.scope).toBe('workspace');
  });

  it('reports warning when .vscode directory is missing', async () => {
    const ctx: WorkspaceContext = mockContext({});
    vi.spyOn(ctx, 'dirExists').mockImplementation(
      (): Promise<boolean> =>
        new Promise<boolean>((resolve: (v: boolean) => void): void => {
          resolve(false);
        }),
    );
    const results: LintResult[] = await requireVscodeFolder.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/require-vscode-folder');
    expect(results[0]!.message).toContain('.vscode');
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when .vscode directory exists', async () => {
    const ctx: WorkspaceContext = mockContext({});
    const results: LintResult[] = await requireVscodeFolder.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-extra-vscode-files
// =============================================================================

describe('workspace/no-extra-vscode-files', () => {
  it('has correct rule metadata', () => {
    expect(noExtraVscodeFiles.id).toBe('workspace/no-extra-vscode-files');
    expect(noExtraVscodeFiles.scope).toBe('workspace');
  });

  it('reports error for disallowed file in .vscode', async () => {
    const files: Map<string, string> = new Map([['/workspace/.vscode/launch.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noExtraVscodeFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-extra-vscode-files');
    expect(results[0]!.message).toContain('launch.json');
    expect(results[0]!.severity).toBe('error');
  });

  it('passes for allowed files in .vscode', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.vscode/settings.json', '{}'],
      ['/workspace/.vscode/extensions.json', '{}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noExtraVscodeFiles.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores files not in .vscode', async () => {
    const files: Map<string, string> = new Map([['/workspace/launch.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noExtraVscodeFiles.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/require-vscode-valid-json
// =============================================================================

describe('workspace/require-vscode-valid-json', () => {
  it('has correct rule metadata', () => {
    expect(requireVscodeValidJson.id).toBe('workspace/require-vscode-valid-json');
    expect(requireVscodeValidJson.scope).toBe('workspace');
  });

  it('reports error for invalid JSON in settings.json', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.vscode/settings.json', '{invalid json}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireVscodeValidJson.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/require-vscode-valid-json');
    expect(results[0]!.message).toContain('Invalid JSON');
    expect(results[0]!.severity).toBe('error');
  });

  it('passes for valid JSON settings.json', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.vscode/settings.json', '{"editor.tabSize": 2}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireVscodeValidJson.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-settings files', async () => {
    const files: Map<string, string> = new Map([['/workspace/settings.json', '{bad}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireVscodeValidJson.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/require-editorconfig
// =============================================================================

describe('workspace/require-editorconfig', () => {
  it('has correct rule metadata', () => {
    expect(requireEditorconfig.id).toBe('workspace/require-editorconfig');
    expect(requireEditorconfig.scope).toBe('workspace');
  });

  it('reports error when .editorconfig is missing', async () => {
    const files: Map<string, string> = new Map([['/workspace/package.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireEditorconfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.editorconfig');
    expect(results[0]!.severity).toBe('error');
  });

  it('reports error when .editorconfig is empty', async () => {
    const files: Map<string, string> = new Map([['/workspace/.editorconfig', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireEditorconfig.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const messages: string = results.map((r: LintResult) => r.message).join(' ');
    expect(messages).toContain('empty');
  });

  it('passes for valid .editorconfig', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.editorconfig', 'root = true\n\n[*]\nindent_style = space\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireEditorconfig.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports warning when root = true is missing', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.editorconfig', '[*]\nindent_style = space\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireEditorconfig.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const warns: LintResult[] = results.filter((r: LintResult) => r.severity === 'warning');
    expect(warns.length).toBeGreaterThanOrEqual(1);
  });

  it('reports error for duplicate sections', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/.editorconfig',
        'root = true\n[*]\nindent_style = space\n[*]\ncharset = utf-8\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireEditorconfig.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const messages: string = results.map((r: LintResult) => r.message).join(' ');
    expect(messages).toContain('Duplicate');
  });
});

// =============================================================================
// workspace/require-gitignore
// =============================================================================

describe('workspace/require-gitignore', () => {
  it('has correct rule metadata', () => {
    expect(requireGitignore.id).toBe('workspace/require-gitignore');
    expect(requireGitignore.scope).toBe('workspace');
  });

  it('reports error when .gitignore is missing', async () => {
    const files: Map<string, string> = new Map([['/workspace/package.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireGitignore.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.gitignore');
    expect(results[0]!.severity).toBe('error');
  });

  it('passes for valid .gitignore', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitignore', 'node_modules/\ndist/\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireGitignore.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports error for duplicate patterns', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitignore', 'node_modules/\ndist/\nnode_modules/\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireGitignore.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const messages: string = results.map((r: LintResult) => r.message).join(' ');
    expect(messages).toContain('Duplicate');
  });

  it('ignores non-root .gitignore', async () => {
    const files: Map<string, string> = new Map([['/workspace/packages/app/.gitignore', 'dist/\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireGitignore.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.message).toContain('Missing');
  });
});

// =============================================================================
// workspace/require-dockerignore
// =============================================================================

describe('workspace/require-dockerignore', () => {
  it('has correct rule metadata', () => {
    expect(requireDockerignore.id).toBe('workspace/require-dockerignore');
    expect(requireDockerignore.scope).toBe('workspace');
  });

  it('reports error when .dockerignore is missing', async () => {
    const files: Map<string, string> = new Map([['/workspace/package.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireDockerignore.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.dockerignore');
    expect(results[0]!.severity).toBe('error');
  });

  it('passes for valid .dockerignore', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.dockerignore', 'node_modules\ndist\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireDockerignore.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports error for duplicate patterns', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.dockerignore', 'node_modules\ndist\nnode_modules\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireDockerignore.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const messages: string = results.map((r: LintResult) => r.message).join(' ');
    expect(messages).toContain('Duplicate');
  });
});

// =============================================================================
// workspace/require-gitattributes
// =============================================================================

describe('workspace/require-gitattributes', () => {
  it('has correct rule metadata', () => {
    expect(requireGitattributes.id).toBe('workspace/require-gitattributes');
    expect(requireGitattributes.scope).toBe('workspace');
  });

  it('reports error when .gitattributes is missing', async () => {
    const files: Map<string, string> = new Map([['/workspace/package.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireGitattributes.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.gitattributes');
    expect(results[0]!.severity).toBe('error');
  });

  it('reports error for missing required patterns', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitattributes', '*.md text eol=lf\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireGitattributes.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const messages: string = results.map((r: LintResult) => r.message).join(' ');
    expect(messages).toContain('Missing required');
  });

  it('passes for valid .gitattributes with required patterns', async () => {
    const content: string =
      [
        '* text=auto',
        '*.ts text eol=lf',
        '*.js text eol=lf',
        'pnpm-lock.yaml -text',
        '*.png binary',
      ].join('\n') + '\n';
    const files: Map<string, string> = new Map([['/workspace/.gitattributes', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireGitattributes.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports error for duplicate glob rules', async () => {
    const content: string =
      [
        '* text=auto',
        '*.ts text eol=lf',
        '*.ts text eol=crlf',
        '*.js text eol=lf',
        'pnpm-lock.yaml -text',
        '*.png binary',
      ].join('\n') + '\n';
    const files: Map<string, string> = new Map([['/workspace/.gitattributes', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireGitattributes.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const messages: string = results.map((r: LintResult) => r.message).join(' ');
    expect(messages).toContain('Duplicate');
  });
});

// =============================================================================
// workspace/require-biome-extends-root
// =============================================================================

describe('workspace/require-biome-extends-root', () => {
  it('has correct rule metadata', () => {
    expect(requireBiomeExtendsRoot.id).toBe('workspace/require-biome-extends-root');
    expect(requireBiomeExtendsRoot.scope).toBe('workspace');
  });

  it('reports error when nested biome.json missing extends', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/biome.json', JSON.stringify({ formatter: {} })],
      ['/workspace/packages/app/biome.json', JSON.stringify({ formatter: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireBiomeExtendsRoot.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/require-biome-extends-root');
    expect(results[0]!.message).toContain('extends');
    expect(results[0]!.severity).toBe('error');
  });

  it('passes when nested biome.json has extends', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/biome.json', JSON.stringify({ formatter: {} })],
      ['/workspace/packages/app/biome.json', JSON.stringify({ extends: '../../biome.json' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireBiomeExtendsRoot.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips root biome.json', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/biome.json', JSON.stringify({ formatter: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireBiomeExtendsRoot.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/require-oxlint-extends-root
// =============================================================================

describe('workspace/require-oxlint-extends-root', () => {
  it('has correct rule metadata', () => {
    expect(requireOxlintExtendsRoot.id).toBe('workspace/require-oxlint-extends-root');
    expect(requireOxlintExtendsRoot.scope).toBe('workspace');
  });

  it('reports error when nested .oxlintrc.json missing extends', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.oxlintrc.json', JSON.stringify({ rules: {} })],
      ['/workspace/packages/app/.oxlintrc.json', JSON.stringify({ rules: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireOxlintExtendsRoot.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('extends');
    expect(results[0]!.severity).toBe('error');
  });

  it('passes when nested .oxlintrc.json has extends', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.oxlintrc.json', JSON.stringify({ rules: {} })],
      [
        '/workspace/packages/app/.oxlintrc.json',
        JSON.stringify({ extends: '../../.oxlintrc.json' }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireOxlintExtendsRoot.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips root .oxlintrc.json', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.oxlintrc.json', JSON.stringify({ rules: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireOxlintExtendsRoot.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-linter-config-override
// =============================================================================

describe('workspace/no-linter-config-override', () => {
  it('has correct rule metadata', () => {
    expect(noLinterConfigOverride.id).toBe('workspace/no-linter-config-override');
    expect(noLinterConfigOverride.scope).toBe('workspace');
  });

  it('reports error for nested config without override permission', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/biome.json', JSON.stringify({})],
      ['/workspace/packages/app/biome.json', JSON.stringify({ formatter: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLinterConfigOverride.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-linter-config-override');
    expect(results[0]!.message).toContain('override');
    expect(results[0]!.severity).toBe('error');
  });

  it('passes when nested config has override permission', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/biome.json', JSON.stringify({})],
      [
        '/workspace/packages/app/biome.json',
        JSON.stringify({ '// override': 'allowed', formatter: {} }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLinterConfigOverride.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips root config files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/biome.json', JSON.stringify({})],
      ['/workspace/.oxlintrc.json', JSON.stringify({})],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLinterConfigOverride.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-cross-product-imports
// =============================================================================

describe('workspace/no-cross-product-imports', () => {
  it('has correct rule metadata', () => {
    expect(noCrossProductImports.id).toBe('workspace/no-cross-product-imports');
    expect(noCrossProductImports.scope).toBe('workspace');
  });

  it('reports error for cross-product relative import', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/products/myapp/api/src/handler.ts',
        'import { foo } from "../../web/utils";',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noCrossProductImports.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-cross-product-imports');
    expect(results[0]!.severity).toBe('error');
  });

  it('passes for alias imports', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/products/myapp/api/src/handler.ts',
        'import { foo } from "@/shared/utils";',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noCrossProductImports.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores files not under packages/products', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/lib.ts', 'import { foo } from "../../products/web/utils";'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noCrossProductImports.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-deep-relative-shared-imports
// =============================================================================

describe('workspace/no-deep-relative-shared-imports', () => {
  it('has correct rule metadata', () => {
    expect(noDeepRelativeSharedImports.id).toBe('workspace/no-deep-relative-shared-imports');
    expect(noDeepRelativeSharedImports.scope).toBe('workspace');
  });

  it('reports error for deep relative import to shared/', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/products/myapp/src/page.ts',
        'import { util } from "../../../shared/utils/helper";',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDeepRelativeSharedImports.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-deep-relative-shared-imports');
    expect(results[0]!.message).toContain('shared');
    expect(results[0]!.severity).toBe('error');
  });

  it('passes for alias imports to shared', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/products/myapp/src/page.ts',
        'import { util } from "@/shared/utils/helper";',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDeepRelativeSharedImports.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-source files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/README.md', 'See ../../shared/utils for details'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDeepRelativeSharedImports.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-cross-layer-imports
// =============================================================================

describe('workspace/no-cross-layer-imports', () => {
  it('has correct rule metadata', () => {
    expect(noCrossLayerImports.id).toBe('workspace/no-cross-layer-imports');
    expect(noCrossLayerImports.scope).toBe('workspace');
  });

  it('reports error for cross-layer import', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/products/myapp/api/src/handler.ts',
        'import { page } from "../../web/pages/home";',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noCrossLayerImports.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-cross-layer-imports');
    expect(results[0]!.severity).toBe('error');
  });

  it('passes for same-layer imports', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/products/myapp/api/src/handler.ts', 'import { util } from "./utils";'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noCrossLayerImports.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores files not under packages/products', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/lib.ts', 'import { foo } from "../../web/utils";'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noCrossLayerImports.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-empty-tests-directory
// =============================================================================

describe('workspace/no-empty-tests-directory', () => {
  it('has correct rule metadata', () => {
    expect(noEmptyTestsDirectory.id).toBe('workspace/no-empty-tests-directory');
    expect(noEmptyTestsDirectory.scope).toBe('workspace');
  });

  it('reports error for empty __tests__ directory', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/__tests__/.gitkeep', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEmptyTestsDirectory.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-empty-tests-directory');
    expect(results[0]!.message).toContain('__tests__');
    expect(results[0]!.severity).toBe('error');
  });

  it('passes when __tests__ has test files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/__tests__/app.test.ts', 'test("works", () => {});'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEmptyTestsDirectory.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips when no __tests__ directories exist', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/src/index.ts', 'export const foo = 1;'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEmptyTestsDirectory.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-empty-benchmarks-directory
// =============================================================================

describe('workspace/no-empty-benchmarks-directory', () => {
  it('has correct rule metadata', () => {
    expect(noEmptyBenchmarksDirectory.id).toBe('workspace/no-empty-benchmarks-directory');
    expect(noEmptyBenchmarksDirectory.scope).toBe('workspace');
  });

  it('reports error for empty __benchmarks__ directory', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/__benchmarks__/.gitkeep', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEmptyBenchmarksDirectory.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-empty-benchmarks-directory');
    expect(results[0]!.message).toContain('__benchmarks__');
    expect(results[0]!.severity).toBe('error');
  });

  it('passes when __benchmarks__ has benchmark files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/__benchmarks__/perf.benchmark.ts', 'bench("fast", () => {});'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEmptyBenchmarksDirectory.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips when no __benchmarks__ directories exist', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/src/index.ts', 'export const foo = 1;'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEmptyBenchmarksDirectory.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/validate-filename-casing
// =============================================================================

describe('workspace/validate-filename-casing', () => {
  it('has correct rule metadata', () => {
    expect(validateFilenameCasing.id).toBe('workspace/validate-filename-casing');
    expect(validateFilenameCasing.scope).toBe('workspace');
  });

  it('passes for valid kebab-case filenames', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/utils/my-helper.ts', ''],
      ['/workspace/packages/products/app/src/index.ts', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateFilenameCasing.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports error for uppercase filenames in packages', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/utils/MyHelper.ts', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateFilenameCasing.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/validate-filename-casing');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('MyHelper.ts');
  });

  it('ignores files outside scoped directories', async () => {
    const files: Map<string, string> = new Map([['/workspace/scripts/MyScript.sh', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateFilenameCasing.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/enforce-docs-naming
// =============================================================================

describe('workspace/enforce-docs-naming', () => {
  it('has correct rule metadata', () => {
    expect(enforceDocsNaming.id).toBe('workspace/enforce-docs-naming');
    expect(enforceDocsNaming.scope).toBe('workspace');
  });

  it('passes for valid lowercase markdown files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/getting-started.md', ''],
      ['/workspace/docs/api_reference.md', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await enforceDocsNaming.check(ctx);
    expect(results.length).toBe(0);
  });

  it('allows standard uppercase files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/README.md', ''],
      ['/workspace/docs/CHANGELOG.md', ''],
      ['/workspace/docs/LICENSE', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await enforceDocsNaming.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports error for non-markdown files in docs', async () => {
    const files: Map<string, string> = new Map([['/workspace/docs/notes.txt', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await enforceDocsNaming.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Non-markdown');
  });

  it('reports error for uppercase markdown filenames', async () => {
    const files: Map<string, string> = new Map([['/workspace/docs/MyGuide.md', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await enforceDocsNaming.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('casing');
  });

  it('ignores files not under /docs/', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/MyFile.ts', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await enforceDocsNaming.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/enforce-test-file-naming
// =============================================================================

describe('workspace/enforce-test-file-naming', () => {
  it('has correct rule metadata', () => {
    expect(enforceTestFileNaming.id).toBe('workspace/enforce-test-file-naming');
    expect(enforceTestFileNaming.scope).toBe('workspace');
  });

  it('passes for test files in __tests__ with correct naming', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/__tests__/utils.test.ts', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await enforceTestFileNaming.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports error for test files outside __tests__', async () => {
    const files: Map<string, string> = new Map([['/workspace/packages/app/src/utils.test.ts', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await enforceTestFileNaming.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('not in __tests__');
  });

  it('reports error for non-test files in __tests__', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/__tests__/helpers.ts', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await enforceTestFileNaming.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.test.ts(x) naming');
  });

  it('ignores non-source files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/__tests__/fixture.json', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await enforceTestFileNaming.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-todo-in-docs
// =============================================================================

describe('workspace/no-todo-in-docs', () => {
  it('has correct rule metadata', () => {
    expect(noTodoInDocs.id).toBe('workspace/no-todo-in-docs');
    expect(noTodoInDocs.scope).toBe('workspace');
  });

  it('passes for clean documentation', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/guide.md', '# Guide\n\nThis is a complete guide.'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTodoInDocs.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports warning for TODO in docs', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/guide.md', '# Guide\n\nTODO: finish this section'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTodoInDocs.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('Placeholder');
  });

  it('reports warning for FIXME in docs', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/api.md', '# API\n\nFIXME: broken link'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTodoInDocs.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('ignores markdown files not in /docs/', async () => {
    const files: Map<string, string> = new Map([['/workspace/README.md', 'TODO: update readme']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTodoInDocs.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-broken-markdown-links
// =============================================================================

describe('workspace/no-broken-markdown-links', () => {
  it('has correct rule metadata', () => {
    expect(noBrokenMarkdownLinks.id).toBe('workspace/no-broken-markdown-links');
    expect(noBrokenMarkdownLinks.scope).toBe('workspace');
  });

  it('passes when local links resolve', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/guide.md', 'See [other](./other.md) for details.'],
      ['/workspace/docs/other.md', '# Other'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBrokenMarkdownLinks.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports warning for broken local links', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/guide.md', 'See [missing](./nonexistent.md) for details.'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBrokenMarkdownLinks.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('nonexistent.md');
  });

  it('skips external links', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/guide.md', 'See [docs](https://example.com) and [mail](mailto:a@b.com).'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBrokenMarkdownLinks.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips anchor-only links', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/guide.md', 'See [section](#overview) for details.'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBrokenMarkdownLinks.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-nextjs-artifacts
// =============================================================================

describe('workspace/no-nextjs-artifacts', () => {
  it('has correct rule metadata', () => {
    expect(noNextjsArtifacts.id).toBe('workspace/no-nextjs-artifacts');
    expect(noNextjsArtifacts.scope).toBe('workspace');
  });

  it('reports error for next.config.js', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/next.config.js', 'module.exports = {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNextjsArtifacts.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Next.js');
  });

  it('reports error for next-env.d.ts', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/next-env.d.ts', '/// <reference types="next" />'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNextjsArtifacts.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes for normal files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/src/index.ts', 'export const foo = 1;'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNextjsArtifacts.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-gatsby-artifacts
// =============================================================================

describe('workspace/no-gatsby-artifacts', () => {
  it('has correct rule metadata', () => {
    expect(noGatsbyArtifacts.id).toBe('workspace/no-gatsby-artifacts');
    expect(noGatsbyArtifacts.scope).toBe('workspace');
  });

  it('reports error for gatsby-config.js', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/gatsby-config.js', 'module.exports = {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noGatsbyArtifacts.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Gatsby');
  });

  it('passes for normal files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/src/index.ts', 'export const foo = 1;'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noGatsbyArtifacts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports error for gatsby-node.js', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/gatsby-node.js', 'exports.onCreateNode = () => {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noGatsbyArtifacts.check(ctx);
    expect(results.length).toBe(1);
  });
});

// =============================================================================
// workspace/no-hugo-configs
// =============================================================================

describe('workspace/no-hugo-configs', () => {
  it('has correct rule metadata', () => {
    expect(noHugoConfigs.id).toBe('workspace/no-hugo-configs');
    expect(noHugoConfigs.scope).toBe('workspace');
  });

  it('reports error for root config.toml', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/config.toml', 'baseURL = "https://example.com"'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noHugoConfigs.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Hugo');
  });

  it('ignores config.toml in subdirectories', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/config.toml', '[server]\nport = 8080'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noHugoConfigs.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports error for files in archetypes directory', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/archetypes/default.md', '---\ntitle: ""\n---'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noHugoConfigs.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes for normal files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/src/index.ts', 'export const foo = 1;'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noHugoConfigs.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-unapproved-ssg
// =============================================================================

describe('workspace/no-unapproved-ssg', () => {
  it('has correct rule metadata', () => {
    expect(noUnapprovedSsg.id).toBe('workspace/no-unapproved-ssg');
    expect(noUnapprovedSsg.scope).toBe('workspace');
  });

  it('reports error for mkdocs.yml', async () => {
    const files: Map<string, string> = new Map([['/workspace/mkdocs.yml', 'site_name: My Docs']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnapprovedSsg.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('static site generator');
  });

  it('reports error for docusaurus.config.js', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docusaurus.config.js', 'module.exports = {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnapprovedSsg.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes for normal files', async () => {
    const files: Map<string, string> = new Map([['/workspace/packages/app/src/index.ts', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnapprovedSsg.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/validate-mjs-cjs-usage
// =============================================================================

describe('workspace/validate-mjs-cjs-usage', () => {
  it('has correct rule metadata', () => {
    expect(validateMjsCjsUsage.id).toBe('workspace/validate-mjs-cjs-usage');
    expect(validateMjsCjsUsage.scope).toBe('workspace');
  });

  it('passes for .mjs with type=module', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/src/utils.mjs', 'export const x = 1;'],
      ['/workspace/packages/app/package.json', '{"name": "@app/core", "type": "module"}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateMjsCjsUsage.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports error for .mjs without type=module', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/src/utils.mjs', 'export const x = 1;'],
      ['/workspace/packages/app/package.json', '{"name": "@app/core"}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateMjsCjsUsage.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('.mjs');
  });

  it('passes for .cjs with type=commonjs', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/src/utils.cjs', 'module.exports = {};'],
      ['/workspace/packages/app/package.json', '{"name": "@app/core", "type": "commonjs"}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateMjsCjsUsage.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports error for .cjs without type=commonjs', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/src/utils.cjs', 'module.exports = {};'],
      ['/workspace/packages/app/package.json', '{"name": "@app/core", "type": "module"}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateMjsCjsUsage.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.cjs');
  });

  it('ignores non-mjs-cjs files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/src/index.ts', 'export const x = 1;'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateMjsCjsUsage.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-exports-overlap
// =============================================================================

describe('workspace/no-exports-overlap', () => {
  it('has correct rule metadata', () => {
    expect(noExportsOverlap.id).toBe('workspace/no-exports-overlap');
    expect(noExportsOverlap.scope).toBe('workspace');
  });

  it('passes when no export overlap exists', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/a/package.json',
        '{"name": "@app/a", "exports": {"./utils": "./src/utils.ts"}}',
      ],
      [
        '/workspace/packages/b/package.json',
        '{"name": "@app/b", "exports": {"./helpers": "./src/helpers.ts"}}',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noExportsOverlap.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports error when two packages export same subpath', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/a/package.json',
        '{"name": "@app/a", "exports": {"./utils": "./src/utils.ts"}}',
      ],
      [
        '/workspace/packages/b/package.json',
        '{"name": "@app/a", "exports": {"./utils": "./src/other.ts"}}',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noExportsOverlap.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('conflict');
  });

  it('passes when packages have no exports field', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/a/package.json', '{"name": "@app/a"}'],
      ['/workspace/packages/b/package.json', '{"name": "@app/b"}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noExportsOverlap.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/enforce-workspace-version-alignment
// =============================================================================

describe('workspace/enforce-workspace-version-alignment', () => {
  it('has correct rule metadata', () => {
    expect(enforceWorkspaceVersionAlignment.id).toBe(
      'workspace/enforce-workspace-version-alignment',
    );
    expect(enforceWorkspaceVersionAlignment.scope).toBe('workspace');
  });

  it('passes when versions are aligned', async () => {
    const packages: WorkspacePackage[] = [
      {
        path: '/workspace/packages/a/package.json',
        dir: '/workspace/packages/a',
        packageJson: { name: '@app/a', version: '2.0.0' },
        name: '@app/a',
      },
      {
        path: '/workspace/packages/b/package.json',
        dir: '/workspace/packages/b',
        packageJson: { name: '@app/b', version: '1.0.0', dependencies: { '@app/a': '^2.0.0' } },
        name: '@app/b',
      },
    ];
    const ctx: WorkspaceContext = mockContext({ packages });
    const results: LintResult[] = await enforceWorkspaceVersionAlignment.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports error for misaligned major versions', async () => {
    const packages: WorkspacePackage[] = [
      {
        path: '/workspace/packages/a/package.json',
        dir: '/workspace/packages/a',
        packageJson: { name: '@app/a', version: '2.0.0' },
        name: '@app/a',
      },
      {
        path: '/workspace/packages/b/package.json',
        dir: '/workspace/packages/b',
        packageJson: { name: '@app/b', version: '1.0.0', dependencies: { '@app/a': '^1.0.0' } },
        name: '@app/b',
      },
    ];
    const ctx: WorkspaceContext = mockContext({ packages });
    const results: LintResult[] = await enforceWorkspaceVersionAlignment.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('@app/a');
  });

  it('skips workspace: protocol dependencies', async () => {
    const packages: WorkspacePackage[] = [
      {
        path: '/workspace/packages/a/package.json',
        dir: '/workspace/packages/a',
        packageJson: { name: '@app/a', version: '2.0.0' },
        name: '@app/a',
      },
      {
        path: '/workspace/packages/b/package.json',
        dir: '/workspace/packages/b',
        packageJson: {
          name: '@app/b',
          version: '1.0.0',
          dependencies: { '@app/a': 'workspace:*' },
        },
        name: '@app/b',
      },
    ];
    const ctx: WorkspaceContext = mockContext({ packages });
    const results: LintResult[] = await enforceWorkspaceVersionAlignment.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips external dependencies', async () => {
    const packages: WorkspacePackage[] = [
      {
        path: '/workspace/packages/a/package.json',
        dir: '/workspace/packages/a',
        packageJson: { name: '@app/a', version: '1.0.0', dependencies: { lodash: '^4.0.0' } },
        name: '@app/a',
      },
    ];
    const ctx: WorkspaceContext = mockContext({ packages });
    const results: LintResult[] = await enforceWorkspaceVersionAlignment.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/validate-root-biome-json
// =============================================================================

describe('workspace/validate-root-biome-json', () => {
  it('has correct rule metadata', () => {
    expect(validateRootBiomeJson.id).toBe('workspace/validate-root-biome-json');
    expect(validateRootBiomeJson.scope).toBe('workspace');
  });

  it('passes for valid biome.json with only $schema and extends', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/biome.json',
        '{"$schema": "https://biomejs.dev/schemas/1.0.0/schema.json", "extends": "./biome.base.json"}',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateRootBiomeJson.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports error when biome.json is missing', async () => {
    const files: Map<string, string> = new Map([['/workspace/packages/app/src/index.ts', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateRootBiomeJson.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Missing');
  });

  it('reports error when extends field is missing', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/biome.json', '{"$schema": "https://biomejs.dev/schemas/1.0.0/schema.json"}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateRootBiomeJson.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('extends');
  });

  it('reports error for unexpected top-level keys', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/biome.json', '{"$schema": "x", "extends": "y", "linter": {}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateRootBiomeJson.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('linter');
  });
});

// =============================================================================
// workspace/validate-root-oxlintrc-json
// =============================================================================

describe('workspace/validate-root-oxlintrc-json', () => {
  it('has correct rule metadata', () => {
    expect(validateRootOxlintrcJson.id).toBe('workspace/validate-root-oxlintrc-json');
    expect(validateRootOxlintrcJson.scope).toBe('workspace');
  });

  it('passes for valid .oxlintrc.json with only $schema and extends', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/.oxlintrc.json',
        '{"$schema": "https://oxc-project.github.io/oxlint/schema.json", "extends": "./oxlintrc.base.json"}',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateRootOxlintrcJson.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports error when .oxlintrc.json is missing', async () => {
    const files: Map<string, string> = new Map([['/workspace/packages/app/src/index.ts', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateRootOxlintrcJson.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Missing');
  });

  it('reports error when extends field is missing', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/.oxlintrc.json',
        '{"$schema": "https://oxc-project.github.io/oxlint/schema.json"}',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateRootOxlintrcJson.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('extends');
  });

  it('reports error for unexpected top-level keys', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.oxlintrc.json', '{"$schema": "x", "extends": "y", "rules": {}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateRootOxlintrcJson.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('rules');
  });
});

// =============================================================================
// workspace/enforce-benchmark-file-naming
// =============================================================================

describe('workspace/enforce-benchmark-file-naming', () => {
  it('has correct rule metadata', () => {
    expect(enforceBenchmarkFileNaming.id).toBe('workspace/enforce-benchmark-file-naming');
    expect(enforceBenchmarkFileNaming.scope).toBe('workspace');
  });

  it('passes for benchmark files in __benchmarks__ with correct naming', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/__benchmarks__/parser.benchmark.ts', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await enforceBenchmarkFileNaming.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports error for benchmark files outside __benchmarks__', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/src/parser.benchmark.ts', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await enforceBenchmarkFileNaming.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('not in __benchmarks__');
  });

  it('reports error for non-benchmark files in __benchmarks__', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/__benchmarks__/helpers.ts', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await enforceBenchmarkFileNaming.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.benchmark.ts(x) naming');
  });

  it('ignores non-ts files in __benchmarks__', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/__benchmarks__/config.json', '{}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await enforceBenchmarkFileNaming.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 22 — no-react-native-artifacts
// =============================================================================

describe('workspace/no-react-native-artifacts', () => {
  it('reports error for metro.config.js', async () => {
    const files: Map<string, string> = new Map([['/workspace/metro.config.js', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noReactNativeArtifacts.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('React Native artifact');
  });

  it('reports error for metro.config.ts', async () => {
    const files: Map<string, string> = new Map([['/workspace/metro.config.ts', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noReactNativeArtifacts.check(ctx);
    expect(results.length).toBe(1);
  });

  it('reports error for files inside /android/ directory', async () => {
    const files: Map<string, string> = new Map([['/workspace/android/app/build.gradle', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noReactNativeArtifacts.check(ctx);
    expect(results.length).toBe(1);
  });

  it('reports error for files inside /ios/ directory', async () => {
    const files: Map<string, string> = new Map([['/workspace/ios/AppDelegate.swift', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noReactNativeArtifacts.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes for normal files', async () => {
    const files: Map<string, string> = new Map([['/workspace/packages/app/src/index.ts', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noReactNativeArtifacts.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 22 — no-docker-compose-v1
// =============================================================================

describe('workspace/no-docker-compose-v1', () => {
  it('reports error for docker-compose.yml with version 1', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docker-compose.yml', 'version: "1"\nservices:\n  app:\n    image: node'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDockerComposeV1.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Deprecated Docker Compose');
  });

  it('reports error for docker-compose.yml with version 2', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docker-compose.yml', 'version: "2.4"\nservices:\n  app:\n    image: node'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDockerComposeV1.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes for docker-compose.yml with version 3', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docker-compose.yml', 'version: "3.9"\nservices:\n  app:\n    image: node'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDockerComposeV1.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when no docker-compose file exists', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/index.ts', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDockerComposeV1.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 22 — detect-undeclared-dependencies
// =============================================================================

describe('workspace/detect-undeclared-dependencies', () => {
  it('reports error for undeclared import', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/src/index.ts', 'import { foo } from "lodash";'],
    ]);
    const ctx: WorkspaceContext = mockContext({
      files,
      packages: [
        {
          path: '/workspace/packages/app/package.json',
          dir: '/workspace/packages/app',
          packageJson: { name: '@test/app', dependencies: {}, devDependencies: {} },
          name: '@test/app',
        },
      ],
    });
    const results: LintResult[] = await detectUndeclaredDependencies.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('lodash');
  });

  it('passes for declared dependency', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/src/index.ts', 'import { foo } from "lodash";'],
    ]);
    const ctx: WorkspaceContext = mockContext({
      files,
      packages: [
        {
          path: '/workspace/packages/app/package.json',
          dir: '/workspace/packages/app',
          packageJson: { name: '@test/app', dependencies: { lodash: '^4.0.0' } },
          name: '@test/app',
        },
      ],
    });
    const results: LintResult[] = await detectUndeclaredDependencies.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores relative imports', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/src/index.ts', 'import { foo } from "./utils";'],
    ]);
    const ctx: WorkspaceContext = mockContext({
      files,
      packages: [
        {
          path: '/workspace/packages/app/package.json',
          dir: '/workspace/packages/app',
          packageJson: { name: '@test/app' },
          name: '@test/app',
        },
      ],
    });
    const results: LintResult[] = await detectUndeclaredDependencies.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores Node.js builtins', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/src/index.ts', 'import { readFile } from "fs";'],
    ]);
    const ctx: WorkspaceContext = mockContext({
      files,
      packages: [
        {
          path: '/workspace/packages/app/package.json',
          dir: '/workspace/packages/app',
          packageJson: { name: '@test/app' },
          name: '@test/app',
        },
      ],
    });
    const results: LintResult[] = await detectUndeclaredDependencies.check(ctx);
    expect(results.length).toBe(0);
  });

  it('handles scoped packages correctly', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/src/index.ts', 'import { foo } from "@scope/lib/utils";'],
    ]);
    const ctx: WorkspaceContext = mockContext({
      files,
      packages: [
        {
          path: '/workspace/packages/app/package.json',
          dir: '/workspace/packages/app',
          packageJson: { name: '@test/app', dependencies: { '@scope/lib': '^1.0.0' } },
          name: '@test/app',
        },
      ],
    });
    const results: LintResult[] = await detectUndeclaredDependencies.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 22 — warn-vscode-settings-conflicts
// =============================================================================

describe('workspace/warn-vscode-settings-conflicts', () => {
  it('warns when tabSize conflicts with editorconfig indent_size', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.vscode/settings.json', '{"editor.tabSize": 4}'],
      ['/workspace/.editorconfig', 'indent_size = 2\nindent_style = space'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await warnVscodeSettingsConflicts.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('tabSize');
  });

  it('warns when insertSpaces conflicts with editorconfig indent_style', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.vscode/settings.json', '{"editor.insertSpaces": false}'],
      ['/workspace/.editorconfig', 'indent_style = space'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await warnVscodeSettingsConflicts.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r: LintResult): boolean => r.message.includes('insertSpaces'))).toBe(true);
  });

  it('passes when settings are aligned', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.vscode/settings.json', '{"editor.tabSize": 2, "editor.insertSpaces": true}'],
      ['/workspace/.editorconfig', 'indent_size = 2\nindent_style = space'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await warnVscodeSettingsConflicts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when no vscode settings exist', async () => {
    const files: Map<string, string> = new Map([['/workspace/.editorconfig', 'indent_size = 2']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await warnVscodeSettingsConflicts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('warns when tabSize conflicts with biome indentWidth', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.vscode/settings.json', '{"editor.tabSize": 4}'],
      ['/workspace/biome.json', '{"formatter": {"indentWidth": 2}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await warnVscodeSettingsConflicts.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r: LintResult): boolean => r.message.includes('biome'))).toBe(true);
  });
});

// =============================================================================
// Phase 22 — validate-vscode-extensions
// =============================================================================

describe('workspace/validate-vscode-extensions', () => {
  it('reports error when extensions.json is missing', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/index.ts', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateVscodeExtensions.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Missing');
  });

  it('reports error for invalid JSON', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.vscode/extensions.json', '{invalid json}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateVscodeExtensions.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Invalid JSON');
  });

  it('reports missing approved extensions', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.vscode/extensions.json', '{"recommendations": []}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateVscodeExtensions.check(ctx);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.message).toContain('Missing approved extension');
  });

  it('reports unapproved extra extensions', async () => {
    const approved: string[] = [
      'aaron-bond.better-comments',
      'astro-build.astro-vscode',
      'anysphere.cpptools',
      'biomejs.biome',
      'bradlc.vscode-tailwindcss',
      'donjayamanne.githistory',
      'ecmel.vscode-html-css',
      'GitLab.gitlab-workflow',
      'Gruntfuggly.todo-tree',
      'mhutchie.git-graph',
      'mikestead.dotenv',
      'ms-azuretools.vscode-docker',
      'ms-kubernetes-tools.vscode-kubernetes-tools',
      'ms-python.python',
      'ms-vscode.makefile-tools',
      'oxc.oxc-vscode',
      'pflannery.vscode-versionlens',
      'redhat.vscode-yaml',
      'semanticdiff.semanticdiff',
      'shd101wyy.markdown-preview-enhanced',
      'streetsidesoftware.code-spell-checker',
      'svelte.svelte-vscode',
      'tamasfe.even-better-toml',
      'usernamehw.errorlens',
      'vitest.explorer',
      'WallabyJs.console-ninja',
      'yzhang.markdown-all-in-one',
      'YoavBls.pretty-ts-errors',
      'some.unapproved-extension',
    ];
    const files: Map<string, string> = new Map([
      ['/workspace/.vscode/extensions.json', JSON.stringify({ recommendations: approved })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateVscodeExtensions.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('Unapproved'))).toBe(true);
  });

  it('passes when extensions match exactly', async () => {
    const approved: string[] = [
      'aaron-bond.better-comments',
      'astro-build.astro-vscode',
      'anysphere.cpptools',
      'biomejs.biome',
      'bradlc.vscode-tailwindcss',
      'donjayamanne.githistory',
      'ecmel.vscode-html-css',
      'GitLab.gitlab-workflow',
      'Gruntfuggly.todo-tree',
      'mhutchie.git-graph',
      'mikestead.dotenv',
      'ms-azuretools.vscode-docker',
      'ms-kubernetes-tools.vscode-kubernetes-tools',
      'ms-python.python',
      'ms-vscode.makefile-tools',
      'oxc.oxc-vscode',
      'pflannery.vscode-versionlens',
      'redhat.vscode-yaml',
      'semanticdiff.semanticdiff',
      'shd101wyy.markdown-preview-enhanced',
      'streetsidesoftware.code-spell-checker',
      'svelte.svelte-vscode',
      'tamasfe.even-better-toml',
      'usernamehw.errorlens',
      'vitest.explorer',
      'WallabyJs.console-ninja',
      'yzhang.markdown-all-in-one',
      'YoavBls.pretty-ts-errors',
    ];
    const files: Map<string, string> = new Map([
      ['/workspace/.vscode/extensions.json', JSON.stringify({ recommendations: approved })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateVscodeExtensions.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 22 — enforce-peer-dependency-consistency
// =============================================================================

describe('workspace/enforce-peer-dependency-consistency', () => {
  it('reports error for inconsistent peerDep versions', async () => {
    const ctx: WorkspaceContext = mockContext({
      packages: [
        {
          path: '/workspace/packages/a/package.json',
          dir: '/workspace/packages/a',
          packageJson: { name: '@test/a', peerDependencies: { react: '^17.0.0' } },
          name: '@test/a',
        },
        {
          path: '/workspace/packages/b/package.json',
          dir: '/workspace/packages/b',
          packageJson: { name: '@test/b', peerDependencies: { react: '^18.0.0' } },
          name: '@test/b',
        },
      ],
    });
    const results: LintResult[] = await enforcePeerDependencyConsistency.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results[0]!.message).toContain('Inconsistent');
  });

  it('reports error for dep in both dependencies and peerDependencies', async () => {
    const ctx: WorkspaceContext = mockContext({
      packages: [
        {
          path: '/workspace/packages/a/package.json',
          dir: '/workspace/packages/a',
          packageJson: {
            name: '@test/a',
            dependencies: { react: '^18.0.0' },
            peerDependencies: { react: '^18.0.0' },
          },
          name: '@test/a',
        },
      ],
    });
    const results: LintResult[] = await enforcePeerDependencyConsistency.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('both dependencies and peerDependencies');
  });

  it('passes for consistent peerDeps', async () => {
    const ctx: WorkspaceContext = mockContext({
      packages: [
        {
          path: '/workspace/packages/a/package.json',
          dir: '/workspace/packages/a',
          packageJson: { name: '@test/a', peerDependencies: { react: '^18.0.0' } },
          name: '@test/a',
        },
        {
          path: '/workspace/packages/b/package.json',
          dir: '/workspace/packages/b',
          packageJson: { name: '@test/b', peerDependencies: { react: '^18.0.0' } },
          name: '@test/b',
        },
      ],
    });
    const results: LintResult[] = await enforcePeerDependencyConsistency.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 22 — no-sensitive-public-files
// =============================================================================

describe('workspace/no-sensitive-public-files', () => {
  it('reports error for .env in public directory', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/public/.env', 'SECRET=123'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noSensitivePublicFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Sensitive file');
  });

  it('reports error for .sql in public directory', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/public/dump.sql', 'SELECT * FROM users;'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noSensitivePublicFiles.check(ctx);
    expect(results.length).toBe(1);
  });

  it('reports error for .bak in public directory', async () => {
    const files: Map<string, string> = new Map([['/workspace/public/data.bak', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noSensitivePublicFiles.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes for normal files in public', async () => {
    const files: Map<string, string> = new Map([['/workspace/public/index.html', '<html></html>']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noSensitivePublicFiles.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes for .env outside public', async () => {
    const files: Map<string, string> = new Map([['/workspace/.env', 'SECRET=123']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noSensitivePublicFiles.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 22 — validate-root-package-config
// =============================================================================

describe('workspace/validate-root-package-config', () => {
  it('reports error when root package.json is missing', async () => {
    const files: Map<string, string> = new Map([['/workspace/packages/app/package.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateRootPackageConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Missing root package.json');
  });

  it('reports error for missing devDependency', async () => {
    const rootPkg: Record<string, unknown> = {
      devDependencies: { husky: '^9.0.0' },
      'lint-staged': { '*.ts': 'biome check && oxlint' },
      packageManager: 'pnpm@10.12.0',
      engines: { node: '^24.0.0' },
    };
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify(rootPkg)],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateRootPackageConfig.check(ctx);
    expect(
      results.some((r: LintResult): boolean =>
        r.message.includes('Missing required devDependency'),
      ),
    ).toBe(true);
  });

  it('reports error for missing lint-staged', async () => {
    const rootPkg: Record<string, unknown> = {
      devDependencies: {
        '@biomejs/biome': '1',
        oxlint: '1',
        husky: '1',
        'lint-staged': '1',
        tsx: '1',
        wrangler: '1',
        '@cloudflare/workers-types': '1',
        '@types/ua-parser-js': '1',
      },
      packageManager: 'pnpm@10.12.0',
      engines: { node: '^24.0.0' },
    };
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify(rootPkg)],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateRootPackageConfig.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('lint-staged'))).toBe(true);
  });

  it('reports error for low pnpm version', async () => {
    const rootPkg: Record<string, unknown> = {
      devDependencies: {
        '@biomejs/biome': '1',
        oxlint: '1',
        husky: '1',
        'lint-staged': '1',
        tsx: '1',
        wrangler: '1',
        '@cloudflare/workers-types': '1',
        '@types/ua-parser-js': '1',
      },
      'lint-staged': { '*.ts': 'biome check && oxlint' },
      packageManager: 'pnpm@9.0.0',
      engines: { node: '^24.0.0' },
    };
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify(rootPkg)],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateRootPackageConfig.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('pnpm version'))).toBe(true);
  });

  it('passes for valid root config', async () => {
    const rootPkg: Record<string, unknown> = {
      devDependencies: {
        '@biomejs/biome': '1',
        oxlint: '1',
        husky: '1',
        'lint-staged': '1',
        tsx: '1',
        wrangler: '1',
        '@cloudflare/workers-types': '1',
        '@types/ua-parser-js': '1',
      },
      'lint-staged': { '*.ts': 'biome check && oxlint' },
      packageManager: 'pnpm@10.12.0',
      engines: { node: '^24.0.0' },
    };
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify(rootPkg)],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateRootPackageConfig.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 22 — validate-script-descriptions
// =============================================================================

describe('workspace/validate-script-descriptions', () => {
  it('reports error for missing meta.scripts.description block', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/package.json', JSON.stringify({ scripts: { build: 'tsc' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateScriptDescriptions.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('meta.scripts.description');
  });

  it('reports error for script missing description', async () => {
    const pkg: Record<string, unknown> = {
      scripts: { build: 'tsc', test: 'vitest' },
      meta: { scripts: { description: { build: 'Compile' } } },
    };
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/package.json', JSON.stringify(pkg)],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateScriptDescriptions.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("'test'");
  });

  it('passes when all scripts have descriptions', async () => {
    const pkg: Record<string, unknown> = {
      scripts: { build: 'tsc' },
      meta: { scripts: { description: { build: 'Compile the project' } } },
    };
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/package.json', JSON.stringify(pkg)],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateScriptDescriptions.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips package.json without scripts', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/package.json', JSON.stringify({ name: '@test/app' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateScriptDescriptions.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 22 — validate-root-scripts-consistency
// =============================================================================

describe('workspace/validate-root-scripts-consistency', () => {
  it('reports error for missing expected script', async () => {
    const rootPkg: Record<string, unknown> = {
      scripts: { build: 'pnpm -r run build' },
      meta: { scripts: { description: { build: 'Build all' } } },
    };
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify(rootPkg)],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateRootScriptsConsistency.check(ctx);
    expect(
      results.some((r: LintResult): boolean => r.message.includes('Missing root script')),
    ).toBe(true);
  });

  it('reports error for wrong script format', async () => {
    const scripts: Record<string, string> = {};
    const descs: Record<string, string> = {};
    const expected: string[] = [
      'benchmark',
      'bootstrap',
      'build',
      'check',
      'clean',
      'deploy',
      'dev',
      'format',
      'lint',
      'logs',
      'prepare',
      'preview',
      'preinstall',
      'test',
    ];
    for (const name of expected) {
      scripts[name] =
        name === 'build'
          ? 'wrong command'
          : name === 'prepare' || name === 'preinstall'
            ? 'husky'
            : `pnpm -r run ${name}`;
      descs[name] = `Does ${name}`;
    }
    const rootPkg: Record<string, unknown> = {
      scripts,
      meta: { scripts: { description: descs } },
    };
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify(rootPkg)],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateRootScriptsConsistency.check(ctx);
    expect(
      results.some(
        (r: LintResult): boolean =>
          r.message.includes("'build'") && r.message.includes('pnpm -r run'),
      ),
    ).toBe(true);
  });

  it('reports error for unexpected extra script', async () => {
    const scripts: Record<string, string> = { extra: 'echo hello' };
    const descs: Record<string, string> = { extra: 'Extra' };
    const expected: string[] = [
      'benchmark',
      'bootstrap',
      'build',
      'check',
      'clean',
      'deploy',
      'dev',
      'format',
      'lint',
      'logs',
      'prepare',
      'preview',
      'preinstall',
      'test',
    ];
    for (const name of expected) {
      scripts[name] = name === 'prepare' || name === 'preinstall' ? 'husky' : `pnpm -r run ${name}`;
      descs[name] = `Does ${name}`;
    }
    const rootPkg: Record<string, unknown> = {
      scripts,
      meta: { scripts: { description: descs } },
    };
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify(rootPkg)],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateRootScriptsConsistency.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('Unexpected'))).toBe(true);
  });

  it('passes for valid root scripts', async () => {
    const scripts: Record<string, string> = {};
    const descs: Record<string, string> = {};
    const expected: string[] = [
      'benchmark',
      'bootstrap',
      'build',
      'check',
      'clean',
      'deploy',
      'dev',
      'format',
      'lint',
      'logs',
      'prepare',
      'preview',
      'preinstall',
      'test',
    ];
    for (const name of expected) {
      scripts[name] = name === 'prepare' || name === 'preinstall' ? 'husky' : `pnpm -r run ${name}`;
      descs[name] = `Does ${name}`;
    }
    const rootPkg: Record<string, unknown> = {
      scripts,
      meta: { scripts: { description: descs } },
    };
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify(rootPkg)],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateRootScriptsConsistency.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 22 — validate-product-scripts
// =============================================================================

describe('workspace/validate-product-scripts', () => {
  it('reports error for missing product script', async () => {
    const ctx: WorkspaceContext = mockContext({
      packages: [
        {
          path: '/workspace/packages/products/myapp/web/package.json',
          dir: '/workspace/packages/products/myapp/web',
          packageJson: { name: '@test/web', scripts: { build: 'tsc' } },
          name: '@test/web',
        },
      ],
    });
    const results: LintResult[] = await validateProductScripts.check(ctx);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.message).toContain('Missing script');
  });

  it('passes when all product scripts are present', async () => {
    const product: string = 'web';
    const scripts: Record<string, string> = {
      [`build:${product}`]: 'cmd',
      build: 'cmd',
      [`dev:${product}`]: 'cmd',
      [`logs:${product}`]: 'cmd',
      [`test:${product}`]: 'cmd',
      [`benchmark:${product}`]: 'cmd',
      [`logs:${product}:dev`]: 'cmd',
      [`logs:${product}:preview`]: 'cmd',
      [`logs:${product}:prod`]: 'cmd',
      [`logs:${product}:staging`]: 'cmd',
    };
    const ctx: WorkspaceContext = mockContext({
      packages: [
        {
          path: '/workspace/packages/products/myapp/web/package.json',
          dir: '/workspace/packages/products/myapp/web',
          packageJson: { name: '@test/web', scripts },
          name: '@test/web',
        },
      ],
    });
    const results: LintResult[] = await validateProductScripts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-product packages', async () => {
    const ctx: WorkspaceContext = mockContext({
      packages: [
        {
          path: '/workspace/packages/shared/utils/package.json',
          dir: '/workspace/packages/shared/utils',
          packageJson: { name: '@test/utils', scripts: {} },
          name: '@test/utils',
        },
      ],
    });
    const results: LintResult[] = await validateProductScripts.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 22 — no-deploy-scripts
// =============================================================================

describe('workspace/no-deploy-scripts', () => {
  it('reports error for deploy:prod script', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/app/package.json',
        JSON.stringify({ scripts: { 'deploy:prod': 'wrangler deploy' } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDeployScripts.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('deploy:');
  });

  it('reports error for deploy:staging script', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/app/package.json',
        JSON.stringify({ scripts: { 'deploy:staging': 'cmd' } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDeployScripts.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes for non-deploy scripts', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/app/package.json',
        JSON.stringify({ scripts: { 'build:prod': 'tsc' } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDeployScripts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes for package.json without scripts', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/package.json', JSON.stringify({ name: '@test/app' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDeployScripts.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 22 — no-lint-ignore-directives
// =============================================================================

describe('workspace/no-lint-ignore-directives', () => {
  it('warns on eslint-disable directive', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', '// eslint-disable-next-line\nconst x = 1;'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLintIgnoreDirectives.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('eslint-disable');
  });

  it('warns on @ts-ignore directive', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', '// @ts-ignore\nconst x: any = 1;'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLintIgnoreDirectives.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('@ts-ignore'))).toBe(true);
  });

  it('warns on biome-ignore directive', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', '// biome-ignore lint: reason\nconst x = 1;'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLintIgnoreDirectives.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('biome-ignore'))).toBe(true);
  });

  it('passes for clean code', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'const x: number = 1;\nexport { x };'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLintIgnoreDirectives.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-scannable extensions', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/data.json', '{"eslint-disable": true}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLintIgnoreDirectives.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 22 — validate-package-tags
// =============================================================================

describe('workspace/validate-package-tags', () => {
  it('reports error for missing tags field', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/package.json', JSON.stringify({ name: '@test/app' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validatePackageTags.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("Missing 'tags'");
  });

  it('reports error for empty tags array', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/package.json', JSON.stringify({ name: '@test/app', tags: [] })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validatePackageTags.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("Empty 'tags'");
  });

  it('reports error for invalid tag format', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/app/package.json',
        JSON.stringify({ name: '@test/app', tags: ['INVALID_TAG'] }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validatePackageTags.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Invalid tag format');
  });

  it('reports error for unapproved tag', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/app/package.json',
        JSON.stringify({ name: '@test/app', tags: ['not-a-real-tag'] }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validatePackageTags.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Unknown tag');
  });

  it('passes for valid tags', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/app/package.json',
        JSON.stringify({ name: '@test/app', tags: ['lib', 'shared'] }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validatePackageTags.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips package.json outside packages/', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: 'root' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validatePackageTags.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 22 — no-env-or-globals-in-shared-libs
// =============================================================================

describe('workspace/no-env-or-globals-in-shared-libs', () => {
  it('reports error for process.env access in shared lib', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/utils/src/config.ts', 'const key = process.env.API_KEY;'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEnvOrGlobalsInSharedLibs.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.message).toContain('process.env');
  });

  it('reports error for globalThis access in shared lib', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/utils/src/global.ts', 'const w = globalThis.window;'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEnvOrGlobalsInSharedLibs.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('globalThis'))).toBe(true);
  });

  it('skips test files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/utils/src/__tests__/config.test.ts', 'process.env.TEST = "1";'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEnvOrGlobalsInSharedLibs.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-shared packages', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/products/app/src/config.ts', 'const key = process.env.API_KEY;'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEnvOrGlobalsInSharedLibs.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes for clean shared lib code', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/shared/utils/src/helpers.ts',
        'export function add(a: number, b: number): number { return a + b; }',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEnvOrGlobalsInSharedLibs.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 23 — no-tsconfig-duplicate-extends
// =============================================================================

describe('workspace/no-tsconfig-duplicate-extends', () => {
  it('has correct rule metadata', () => {
    expect(noTsconfigDuplicateExtends.id).toBe('workspace/no-tsconfig-duplicate-extends');
    expect(noTsconfigDuplicateExtends.scope).toBe('workspace');
  });

  it('detects circular self-extends', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', '{"extends": "./tsconfig.json"}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigDuplicateExtends.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.message).toContain('Circular');
  });

  it('detects circular extends chain between two files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.a.json', '{"extends": "./tsconfig.b.json"}'],
      ['/workspace/tsconfig.b.json', '{"extends": "./tsconfig.a.json"}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigDuplicateExtends.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r: LintResult) => r.message.includes('Circular'))).toBe(true);
  });

  it('passes for clean extends chain', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', '{"extends": "./tsconfig.base.json"}'],
      ['/workspace/tsconfig.base.json', '{"compilerOptions": {"strict": true}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigDuplicateExtends.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes for tsconfig with no extends', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', '{"compilerOptions": {"strict": true}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigDuplicateExtends.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 23 — validate-tsconfig-rootdir-layout
// =============================================================================

describe('workspace/validate-tsconfig-rootdir-layout', () => {
  it('has correct rule metadata', () => {
    expect(validateTsconfigRootdirLayout.id).toBe('workspace/validate-tsconfig-rootdir-layout');
    expect(validateTsconfigRootdirLayout.scope).toBe('workspace');
  });

  it('warns on non-standard rootDir', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', '{"compilerOptions": {"rootDir": "lib"}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateTsconfigRootdirLayout.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('lib');
  });

  it('passes for rootDir set to src/', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', '{"compilerOptions": {"rootDir": "src"}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateTsconfigRootdirLayout.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes for rootDir set to ./', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', '{"compilerOptions": {"rootDir": "./"}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateTsconfigRootdirLayout.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when no rootDir is set', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', '{"compilerOptions": {"strict": true}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateTsconfigRootdirLayout.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 23 — no-tsconfig-outdir-rootdir-files
// =============================================================================

describe('workspace/no-tsconfig-outdir-rootdir-files', () => {
  it('has correct rule metadata', () => {
    expect(noTsconfigOutdirRootdirFiles.id).toBe('workspace/no-tsconfig-outdir-rootdir-files');
    expect(noTsconfigOutdirRootdirFiles.scope).toBe('workspace');
  });

  it('warns on outDir in monorepo tsconfig', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/tsconfig.json', '{"compilerOptions": {"outDir": "dist"}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigOutdirRootdirFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('outDir');
  });

  it('warns on rootDir in monorepo tsconfig', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/tsconfig.json', '{"compilerOptions": {"rootDir": "src"}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigOutdirRootdirFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('rootDir');
  });

  it('warns on files field in monorepo tsconfig', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/tsconfig.json', '{"files": ["src/index.ts"]}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigOutdirRootdirFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('files');
  });

  it('skips root tsconfig', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', '{"compilerOptions": {"outDir": "dist"}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigOutdirRootdirFiles.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes for clean monorepo tsconfig', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/app/tsconfig.json',
        '{"compilerOptions": {"strict": true}, "include": ["src"]}',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noTsconfigOutdirRootdirFiles.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 23 — validate-tsconfig-include-patterns
// =============================================================================

describe('workspace/validate-tsconfig-include-patterns', () => {
  it('has correct rule metadata', () => {
    expect(validateTsconfigIncludePatterns.id).toBe('workspace/validate-tsconfig-include-patterns');
    expect(validateTsconfigIncludePatterns.scope).toBe('workspace');
  });

  it('detects empty include pattern', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', '{"include": ["src", ""]}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateTsconfigIncludePatterns.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Empty include');
  });

  it('detects absolute path in exclude', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', '{"exclude": ["/usr/local/lib"]}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateTsconfigIncludePatterns.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Absolute path');
  });

  it('detects empty exclude pattern', async () => {
    const files: Map<string, string> = new Map([['/workspace/tsconfig.json', '{"exclude": [""]}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateTsconfigIncludePatterns.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Empty exclude');
  });

  it('passes for valid patterns', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', '{"include": ["src/**/*.ts"], "exclude": ["node_modules"]}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateTsconfigIncludePatterns.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when no include/exclude is set', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', '{"compilerOptions": {"strict": true}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateTsconfigIncludePatterns.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 23 — validate-wrangler-cron-syntax
// =============================================================================

describe('workspace/validate-wrangler-cron-syntax', () => {
  it('has correct rule metadata', () => {
    expect(validateWranglerCronSyntax.id).toBe('workspace/validate-wrangler-cron-syntax');
    expect(validateWranglerCronSyntax.scope).toBe('workspace');
  });

  it('passes for valid cron expression', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/wrangler.json', '{"triggers": {"cron": ["0 0 * * *"]}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateWranglerCronSyntax.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes for cron with step notation', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/wrangler.json', '{"triggers": {"cron": ["*/10 * * * *"]}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateWranglerCronSyntax.check(ctx);
    expect(results.length).toBe(0);
  });

  it('detects invalid field count', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/wrangler.json', '{"triggers": {"cron": ["0 0 *"]}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateWranglerCronSyntax.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('expected 5 fields');
  });

  it('detects out-of-range minute value', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/wrangler.json', '{"triggers": {"cron": ["60 0 * * *"]}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateWranglerCronSyntax.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('minute');
  });

  it('detects out-of-range hour value', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/wrangler.json', '{"triggers": {"cron": ["0 25 * * *"]}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateWranglerCronSyntax.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('hour');
  });

  it('passes when no wrangler.json exists', async () => {
    const files: Map<string, string> = new Map([['/workspace/package.json', '{"name": "app"}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateWranglerCronSyntax.check(ctx);
    expect(results.length).toBe(0);
  });

  it('checks env-level cron triggers', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/wrangler.json',
        '{"env": {"production": {"triggers": {"cron": ["60 0 * * *"]}}}}',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateWranglerCronSyntax.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('minute');
  });
});

// =============================================================================
// Phase 23 — wrangler-name-matches-package
// =============================================================================

describe('workspace/wrangler-name-matches-package', () => {
  it('has correct rule metadata', () => {
    expect(wranglerNameMatchesPackage.id).toBe('workspace/wrangler-name-matches-package');
    expect(wranglerNameMatchesPackage.scope).toBe('workspace');
  });

  it('passes when names match', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/workers/api/wrangler.json', '{"name": "api"}'],
      ['/workspace/workers/api/package.json', '{"name": "@scope/api"}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await wranglerNameMatchesPackage.check(ctx);
    expect(results.length).toBe(0);
  });

  it('detects name mismatch', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/workers/api/wrangler.json', '{"name": "worker-api"}'],
      ['/workspace/workers/api/package.json', '{"name": "@scope/api"}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await wranglerNameMatchesPackage.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('does not match');
  });

  it('passes when no wrangler.json exists', async () => {
    const files: Map<string, string> = new Map([['/workspace/package.json', '{"name": "app"}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await wranglerNameMatchesPackage.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes for unscoped package name match', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/workers/api/wrangler.json', '{"name": "api"}'],
      ['/workspace/workers/api/package.json', '{"name": "api"}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await wranglerNameMatchesPackage.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 23 — wrangler-main-entrypoint-exists
// =============================================================================

describe('workspace/wrangler-main-entrypoint-exists', () => {
  it('has correct rule metadata', () => {
    expect(wranglerMainEntrypointExists.id).toBe('workspace/wrangler-main-entrypoint-exists');
    expect(wranglerMainEntrypointExists.scope).toBe('workspace');
  });

  it('passes when main entrypoint exists', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/workers/api/wrangler.json', '{"main": "src/index.ts"}'],
      ['/workspace/workers/api/src/index.ts', 'export default {}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await wranglerMainEntrypointExists.check(ctx);
    expect(results.length).toBe(0);
  });

  it('detects missing main entrypoint', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/workers/api/wrangler.json', '{"main": "src/index.ts"}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await wranglerMainEntrypointExists.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('does not exist');
  });

  it('passes when no main field is set', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/workers/api/wrangler.json', '{"name": "api"}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await wranglerMainEntrypointExists.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when no wrangler.json exists', async () => {
    const files: Map<string, string> = new Map([['/workspace/package.json', '{"name": "app"}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await wranglerMainEntrypointExists.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 23 — wrangler-binding-names-unique
// =============================================================================

describe('workspace/wrangler-binding-names-unique', () => {
  it('has correct rule metadata', () => {
    expect(wranglerBindingNamesUnique.id).toBe('workspace/wrangler-binding-names-unique');
    expect(wranglerBindingNamesUnique.scope).toBe('workspace');
  });

  it('detects duplicate KV binding names across files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/workers/a/wrangler.json', '{"kv_namespaces": [{"binding": "MY_KV"}]}'],
      ['/workspace/workers/b/wrangler.json', '{"kv_namespaces": [{"binding": "MY_KV"}]}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await wranglerBindingNamesUnique.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Duplicate binding');
    expect(results[0]!.message).toContain('MY_KV');
  });

  it('passes for unique binding names', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/workers/a/wrangler.json', '{"kv_namespaces": [{"binding": "KV_A"}]}'],
      ['/workspace/workers/b/wrangler.json', '{"kv_namespaces": [{"binding": "KV_B"}]}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await wranglerBindingNamesUnique.check(ctx);
    expect(results.length).toBe(0);
  });

  it('checks multiple binding types', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/wrangler.json',
        '{"kv_namespaces": [{"binding": "STORE"}], "r2_buckets": [{"binding": "BUCKET"}], "d1_databases": [{"binding": "DB"}]}',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await wranglerBindingNamesUnique.check(ctx);
    expect(results.length).toBe(0);
  });

  it('detects duplicate durable object bindings', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/workers/a/wrangler.json',
        '{"durable_objects": {"bindings": [{"name": "DO_COUNTER"}]}}',
      ],
      [
        '/workspace/workers/b/wrangler.json',
        '{"durable_objects": {"bindings": [{"name": "DO_COUNTER"}]}}',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await wranglerBindingNamesUnique.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('DO_COUNTER');
  });
});

// =============================================================================
// Phase 23 — no-forbidden-node-imports-in-workers
// =============================================================================

describe('workspace/no-forbidden-node-imports-in-workers', () => {
  it('has correct rule metadata', () => {
    expect(noForbiddenNodeImportsInWorkers.id).toBe(
      'workspace/no-forbidden-node-imports-in-workers',
    );
    expect(noForbiddenNodeImportsInWorkers.scope).toBe('workspace');
  });

  it('detects fs import in worker', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/workers/api/wrangler.json', '{"name": "api"}'],
      [
        '/workspace/workers/api/src/index.ts',
        'import { readFileSync } from "node:fs";\nexport default {};',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noForbiddenNodeImportsInWorkers.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('node:fs');
  });

  it('detects path import in worker', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/workers/api/wrangler.json', '{"name": "api"}'],
      ['/workspace/workers/api/src/index.ts', 'import { join } from "path";\nexport default {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noForbiddenNodeImportsInWorkers.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('path');
  });

  it('skips non-worker files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/src/index.ts', 'import fs from "node:fs";\nexport default {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noForbiddenNodeImportsInWorkers.check(ctx);
    expect(results.length).toBe(0);
  });

  it('allows non-forbidden modules in workers', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/workers/api/wrangler.json', '{"name": "api"}'],
      [
        '/workspace/workers/api/src/index.ts',
        'import { Buffer } from "node:buffer";\nexport default {};',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noForbiddenNodeImportsInWorkers.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes for clean worker code', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/workers/api/wrangler.json', '{"name": "api"}'],
      [
        '/workspace/workers/api/src/index.ts',
        'export default { fetch() { return new Response("ok"); } };',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noForbiddenNodeImportsInWorkers.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 23 — no-hardcoded-localhost-ports
// =============================================================================

describe('workspace/no-hardcoded-localhost-ports', () => {
  it('has correct rule metadata', () => {
    expect(noHardcodedLocalhostPorts.id).toBe('workspace/no-hardcoded-localhost-ports');
    expect(noHardcodedLocalhostPorts.scope).toBe('workspace');
  });

  it('detects localhost:3000', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/src/api.ts', 'const url = "http://localhost:3000/api";'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noHardcodedLocalhostPorts.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('localhost:3000');
  });

  it('detects 127.0.0.1', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/src/api.ts', 'const url = "http://127.0.0.1:8080/api";'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noHardcodedLocalhostPorts.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('127.0.0.1');
  });

  it('excludes test files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/src/api.test.ts', 'const url = "http://localhost:3000/api";'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noHardcodedLocalhostPorts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes for clean source code', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/src/api.ts', 'const url = process.env.API_URL;'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noHardcodedLocalhostPorts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-source files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/README.md', 'Visit http://localhost:3000 to test'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noHardcodedLocalhostPorts.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 23 — no-migration-tempfiles
// =============================================================================

describe('workspace/no-migration-tempfiles', () => {
  it('has correct rule metadata', () => {
    expect(noMigrationTempfiles.id).toBe('workspace/no-migration-tempfiles');
    expect(noMigrationTempfiles.scope).toBe('workspace');
  });

  it('detects .bak file in migrations', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/db/migrations/001_init.sql.bak', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMigrationTempfiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.bak');
  });

  it('detects .tmp file in migrations', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/db/migrations/temp.tmp', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMigrationTempfiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.tmp');
  });

  it('detects tilde backup in migrations', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/db/migrations/001_init.sql~', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMigrationTempfiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('~');
  });

  it('passes for normal .sql in migrations', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/db/migrations/001_init.sql', 'CREATE TABLE users;'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMigrationTempfiles.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes for temp file outside migrations', async () => {
    const files: Map<string, string> = new Map([['/workspace/packages/app/src/temp.bak', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMigrationTempfiles.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 23 — no-nonpreferred-image-formats
// =============================================================================

describe('workspace/no-nonpreferred-image-formats', () => {
  it('has correct rule metadata', () => {
    expect(noNonpreferredImageFormats.id).toBe('workspace/no-nonpreferred-image-formats');
    expect(noNonpreferredImageFormats.scope).toBe('workspace');
  });

  it('detects .png file', async () => {
    const files: Map<string, string> = new Map([['/workspace/packages/app/assets/logo.png', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNonpreferredImageFormats.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.png');
  });

  it('detects .jpg file', async () => {
    const files: Map<string, string> = new Map([['/workspace/packages/app/assets/photo.jpg', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNonpreferredImageFormats.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.jpg');
  });

  it('detects .gif file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/assets/animation.gif', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNonpreferredImageFormats.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.gif');
  });

  it('passes for .webp file', async () => {
    const files: Map<string, string> = new Map([['/workspace/packages/app/assets/logo.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNonpreferredImageFormats.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes for .svg file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/assets/icon.svg', '<svg></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNonpreferredImageFormats.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes for .ico file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/public/favicon.ico', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noNonpreferredImageFormats.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 23 — validate-formatting-config-consistency
// =============================================================================

describe('workspace/validate-formatting-config-consistency', () => {
  it('has correct rule metadata', () => {
    expect(validateFormattingConfigConsistency.id).toBe(
      'workspace/validate-formatting-config-consistency',
    );
    expect(validateFormattingConfigConsistency.scope).toBe('workspace');
  });

  it('detects indent size mismatch between editorconfig and biome', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.editorconfig', 'root = true\n\n[*]\nindent_size = 2\nindent_style = space'],
      ['/workspace/biome.base.json', '{"formatter": {"indentWidth": 4, "indentStyle": "space"}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateFormattingConfigConsistency.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r: LintResult) => r.message.includes('Indent size'))).toBe(true);
  });

  it('detects indent style mismatch', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.editorconfig', 'root = true\n\n[*]\nindent_style = tab'],
      ['/workspace/biome.base.json', '{"formatter": {"indentStyle": "space"}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateFormattingConfigConsistency.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r: LintResult) => r.message.includes('Indent style'))).toBe(true);
  });

  it('passes when all configs align', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.editorconfig', 'root = true\n\n[*]\nindent_size = 2\nindent_style = space'],
      ['/workspace/biome.base.json', '{"formatter": {"indentWidth": 2, "indentStyle": "space"}}'],
      ['/workspace/.vscode/settings.json', '{"editor.tabSize": 2, "editor.insertSpaces": true}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateFormattingConfigConsistency.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when only one config exists', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.editorconfig', 'root = true\n\n[*]\nindent_size = 2'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateFormattingConfigConsistency.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 23 — validate-nanostores-safety
// =============================================================================

describe('workspace/validate-nanostores-safety', () => {
  it('has correct rule metadata', () => {
    expect(validateNanostoresSafety.id).toBe('workspace/validate-nanostores-safety');
    expect(validateNanostoresSafety.scope).toBe('workspace');
  });

  it('detects atom + set mutation', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/app/src/store.ts',
        'import { atom } from "nanostores";\nconst count = atom(0);\ncount.set(1);',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateNanostoresSafety.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r: LintResult) => r.message.includes('Writable mutation'))).toBe(true);
  });

  it('detects process.env in store file', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/app/src/store.ts',
        'import { atom } from "nanostores";\nconst apiUrl = atom(process.env.API_URL);',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateNanostoresSafety.check(ctx);
    expect(results.some((r: LintResult) => r.message.includes('environment access'))).toBe(true);
  });

  it('warns on side effects in store file', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/app/src/store.ts',
        'import { atom } from "nanostores";\nconst data = atom(localStorage.getItem("key"));',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateNanostoresSafety.check(ctx);
    expect(results.some((r: LintResult) => r.severity === 'warning')).toBe(true);
    expect(results.some((r: LintResult) => r.message.includes('side effect'))).toBe(true);
  });

  it('detects invalid persistentAtom key', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/app/src/store.ts',
        'import { persistentAtom } from "@nanostores/persistent";\nconst theme = persistentAtom("THEME_KEY", "dark");',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateNanostoresSafety.check(ctx);
    expect(results.some((r: LintResult) => r.message.includes('Invalid persistentAtom key'))).toBe(
      true,
    );
  });

  it('passes for valid store code', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/app/src/store.ts',
        'import { writable } from "nanostores";\nconst count = writable(0);\nexport { count };',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateNanostoresSafety.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-store files', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/app/src/utils.ts',
        'export function add(a: number, b: number) { return a + b; }',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateNanostoresSafety.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 23 — validate-tsconfig-paths-resolution
// =============================================================================

describe('workspace/validate-tsconfig-paths-resolution', () => {
  it('has correct rule metadata', () => {
    expect(validateTsconfigPathsResolution.id).toBe('workspace/validate-tsconfig-paths-resolution');
    expect(validateTsconfigPathsResolution.scope).toBe('workspace');
  });

  it('detects empty paths array', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', '{"compilerOptions": {"paths": {"@/*": []}}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateTsconfigPathsResolution.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('empty targets');
  });

  it('detects empty string target', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', '{"compilerOptions": {"paths": {"@/*": [""]}}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateTsconfigPathsResolution.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('empty string');
  });

  it('passes for valid paths', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', '{"compilerOptions": {"paths": {"@/*": ["./src/*"]}}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateTsconfigPathsResolution.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when no paths field exists', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', '{"compilerOptions": {"strict": true}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateTsconfigPathsResolution.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes for multiple valid path entries', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        '{"compilerOptions": {"paths": {"@/*": ["./src/*"], "@/utils/*": ["./src/utils/*"]}}}',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateTsconfigPathsResolution.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 24 — no-oversized-commits
// =============================================================================

describe('workspace/no-oversized-commits', () => {
  it('has correct rule metadata', () => {
    expect(noOversizedCommits.id).toBe('workspace/no-oversized-commits');
    expect(noOversizedCommits.scope).toBe('workspace');
  });

  it('warns when file count exceeds 50', async () => {
    const files: Map<string, string> = new Map();
    for (let i: number = 0; i < 55; i++) {
      files.set(`/workspace/src/file${String(i)}.ts`, '');
    }
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noOversizedCommits.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('55');
  });

  it('passes when file count is within limit', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', ''],
      ['/workspace/src/utils.ts', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noOversizedCommits.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 24 — enforce-docs-location
// =============================================================================

describe('workspace/enforce-docs-location', () => {
  it('has correct rule metadata', () => {
    expect(enforceDocsLocationRule.id).toBe('workspace/enforce-docs-location');
    expect(enforceDocsLocationRule.scope).toBe('workspace');
  });

  it('flags .md file in packages directory', async () => {
    const files: Map<string, string> = new Map([['/workspace/packages/app/NOTES.md', '# Notes']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await enforceDocsLocationRule.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('NOTES.md');
  });

  it('passes for .md at root', async () => {
    const files: Map<string, string> = new Map([['/workspace/ARCHITECTURE.md', '# Arch']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await enforceDocsLocationRule.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes for .md under docs/', async () => {
    const files: Map<string, string> = new Map([['/workspace/docs/guide.md', '# Guide']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await enforceDocsLocationRule.check(ctx);
    expect(results.length).toBe(0);
  });

  it('allows README.md anywhere', async () => {
    const files: Map<string, string> = new Map([['/workspace/packages/app/README.md', '# App']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await enforceDocsLocationRule.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 24 — validate-monorepo-layout
// =============================================================================

describe('workspace/validate-monorepo-layout', () => {
  it('has correct rule metadata', () => {
    expect(validateMonorepoLayout.id).toBe('workspace/validate-monorepo-layout');
    expect(validateMonorepoLayout.scope).toBe('workspace');
  });

  it('flags missing required directory', async () => {
    const ctx: WorkspaceContext = mockContext();
    const dirExistsSpy = vi.spyOn(ctx, 'dirExists');
    dirExistsSpy.mockResolvedValue(false);
    const results: LintResult[] = await validateMonorepoLayout.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.message).toContain('missing');
    dirExistsSpy.mockRestore();
  });

  it('passes when all required dirs exist', async () => {
    const ctx: WorkspaceContext = mockContext();
    const results: LintResult[] = await validateMonorepoLayout.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 24 — validate-yaml-schema-directives
// =============================================================================

describe('workspace/validate-yaml-schema-directives', () => {
  it('has correct rule metadata', () => {
    expect(validateYamlSchemaDirectives.id).toBe('workspace/validate-yaml-schema-directives');
    expect(validateYamlSchemaDirectives.scope).toBe('workspace');
  });

  it('flags malformed schema URL', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/config.yml', '# yaml-language-server: $schema=not-a-url\nkey: value'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateYamlSchemaDirectives.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('not-a-url');
  });

  it('passes for valid schema URL', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/config.yml',
        '# yaml-language-server: $schema=https://json-schema.org/draft/2020-12/schema\nkey: value',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateYamlSchemaDirectives.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when no directive exists', async () => {
    const files: Map<string, string> = new Map([['/workspace/config.yml', 'key: value']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateYamlSchemaDirectives.check(ctx);
    expect(results.length).toBe(0);
  });

  it('flags empty schema URL', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/config.yml', '# yaml-language-server: $schema=\nkey: value'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateYamlSchemaDirectives.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Empty');
  });
});

// =============================================================================
// Phase 24 — validate-json-schema-fields
// =============================================================================

describe('workspace/validate-json-schema-fields', () => {
  it('has correct rule metadata', () => {
    expect(validateJsonSchemaFields.id).toBe('workspace/validate-json-schema-fields');
    expect(validateJsonSchemaFields.scope).toBe('workspace');
  });

  it('flags invalid $schema URL', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/config.json', '{"$schema": "not-a-url", "key": "value"}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateJsonSchemaFields.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('not-a-url');
  });

  it('passes for valid $schema URL', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/config.json', '{"$schema": "https://json-schema.org/draft/2020-12/schema"}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateJsonSchemaFields.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when no $schema field', async () => {
    const files: Map<string, string> = new Map([['/workspace/config.json', '{"key": "value"}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateJsonSchemaFields.check(ctx);
    expect(results.length).toBe(0);
  });

  it('flags empty $schema', async () => {
    const files: Map<string, string> = new Map([['/workspace/config.json', '{"$schema": ""}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateJsonSchemaFields.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Empty');
  });
});

// =============================================================================
// Phase 24 — validate-makefiles
// =============================================================================

describe('workspace/validate-makefiles', () => {
  it('has correct rule metadata', () => {
    expect(validateMakefiles.id).toBe('workspace/validate-makefiles');
    expect(validateMakefiles.scope).toBe('workspace');
  });

  it('detects CRLF line endings', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/Makefile', 'all:\r\n\techo hello\r\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateMakefiles.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r: LintResult) => r.message.includes('CRLF'))).toBe(true);
  });

  it('detects spaces instead of tabs in recipes', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/Makefile', 'build:\n    echo hello\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateMakefiles.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r: LintResult) => r.message.includes('spaces'))).toBe(true);
  });

  it('passes for valid Makefile with tabs', async () => {
    const files: Map<string, string> = new Map([['/workspace/Makefile', 'build:\n\techo hello\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateMakefiles.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 24 — no-world-writable-files
// =============================================================================

describe('workspace/no-world-writable-files', () => {
  it('has correct rule metadata', () => {
    expect(noWorldWritableFiles.id).toBe('workspace/no-world-writable-files');
    expect(noWorldWritableFiles.scope).toBe('workspace');
  });

  it('detects chmod 777', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/scripts/setup.sh', '#!/bin/bash\nchmod 777 /tmp/dir\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWorldWritableFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('chmod 777');
  });

  it('passes for chmod 755', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/scripts/setup.sh', '#!/bin/bash\nchmod 755 /tmp/dir\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWorldWritableFiles.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes for files without chmod', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/scripts/setup.sh', '#!/bin/bash\necho hello\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWorldWritableFiles.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 24 — no-wrangler-route-collisions
// =============================================================================

describe('workspace/no-wrangler-route-collisions', () => {
  it('has correct rule metadata', () => {
    expect(noWranglerRouteCollisions.id).toBe('workspace/no-wrangler-route-collisions');
    expect(noWranglerRouteCollisions.scope).toBe('workspace');
  });

  it('detects duplicate routes', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/workers/a/wrangler.json', '{"routes": ["example.com/*"]}'],
      ['/workspace/workers/b/wrangler.json', '{"routes": ["example.com/*"]}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWranglerRouteCollisions.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Duplicate route');
  });

  it('passes for unique routes', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/workers/a/wrangler.json', '{"routes": ["api.example.com/*"]}'],
      ['/workspace/workers/b/wrangler.json', '{"routes": ["app.example.com/*"]}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWranglerRouteCollisions.check(ctx);
    expect(results.length).toBe(0);
  });

  it('checks route objects with pattern field', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/workers/a/wrangler.json', '{"routes": [{"pattern": "example.com/*"}]}'],
      ['/workspace/workers/b/wrangler.json', '{"routes": [{"pattern": "example.com/*"}]}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWranglerRouteCollisions.check(ctx);
    expect(results.length).toBe(1);
  });
});

// =============================================================================
// Phase 24 — wrangler-bindings-consistent-envs
// =============================================================================

describe('workspace/wrangler-bindings-consistent-envs', () => {
  it('has correct rule metadata', () => {
    expect(wranglerBindingsConsistentEnvs.id).toBe('workspace/wrangler-bindings-consistent-envs');
    expect(wranglerBindingsConsistentEnvs.scope).toBe('workspace');
  });

  it('detects missing binding in env', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/wrangler.json',
        '{"kv_namespaces": [{"binding": "MY_KV"}], "env": {"production": {"kv_namespaces": [{"binding": "OTHER_KV"}]}}}',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await wranglerBindingsConsistentEnvs.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('MY_KV');
  });

  it('passes for consistent bindings', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/wrangler.json',
        '{"kv_namespaces": [{"binding": "MY_KV"}], "env": {"production": {"kv_namespaces": [{"binding": "MY_KV"}]}}}',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await wranglerBindingsConsistentEnvs.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when no envs defined', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/wrangler.json', '{"kv_namespaces": [{"binding": "MY_KV"}]}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await wranglerBindingsConsistentEnvs.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 24 — wrangler-binding-naming-conventions
// =============================================================================

describe('workspace/wrangler-binding-naming-conventions', () => {
  it('has correct rule metadata', () => {
    expect(wranglerBindingNamingConventions.id).toBe(
      'workspace/wrangler-binding-naming-conventions',
    );
    expect(wranglerBindingNamingConventions.scope).toBe('workspace');
  });

  it('flags invalid binding name', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/wrangler.json', '{"kv_namespaces": [{"binding": "123_invalid"}]}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await wranglerBindingNamingConventions.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('123_invalid');
  });

  it('passes for valid binding name', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/wrangler.json', '{"kv_namespaces": [{"binding": "MY_KV_STORE"}]}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await wranglerBindingNamingConventions.check(ctx);
    expect(results.length).toBe(0);
  });

  it('checks env-level binding names too', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/wrangler.json',
        '{"env": {"production": {"kv_namespaces": [{"binding": "!bad"}]}}}',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await wranglerBindingNamingConventions.check(ctx);
    expect(results.length).toBe(1);
  });
});

// =============================================================================
// Phase 24 — validate-wrangler-environments
// =============================================================================

describe('workspace/validate-wrangler-environments', () => {
  it('has correct rule metadata', () => {
    expect(validateWranglerEnvironments.id).toBe('workspace/validate-wrangler-environments');
    expect(validateWranglerEnvironments.scope).toBe('workspace');
  });

  it('flags staging environment', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/wrangler.json', '{"env": {"staging": {}}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateWranglerEnvironments.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('staging');
  });

  it('flags custom environment', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/wrangler.json', '{"env": {"dev": {}}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateWranglerEnvironments.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('dev');
  });

  it('passes for production and preview', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/wrangler.json', '{"env": {"production": {}, "preview": {}}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateWranglerEnvironments.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when no env section', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/wrangler.json', '{"name": "worker"}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateWranglerEnvironments.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 24 — no-hardcoded-service-urls
// =============================================================================

describe('workspace/no-hardcoded-service-urls', () => {
  it('has correct rule metadata', () => {
    expect(noHardcodedServiceUrls.id).toBe('workspace/no-hardcoded-service-urls');
    expect(noHardcodedServiceUrls.scope).toBe('workspace');
  });

  it('warns on private IP', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/src/api.ts', 'const url = "http://192.168.1.100:8080";'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noHardcodedServiceUrls.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('192.168');
  });

  it('warns on api.cloudflare.com', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/app/src/api.ts',
        'const url = "https://api.cloudflare.com/v4/accounts";',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noHardcodedServiceUrls.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('api.cloudflare.com');
  });

  it('passes for clean source', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/src/api.ts', 'const url = process.env.API_URL;'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noHardcodedServiceUrls.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips test files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/src/api.test.ts', 'const url = "http://192.168.1.1";'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noHardcodedServiceUrls.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 24 — no-multiple-env-files
// =============================================================================

describe('workspace/no-multiple-env-files', () => {
  it('has correct rule metadata', () => {
    expect(noMultipleEnvFiles.id).toBe('workspace/no-multiple-env-files');
    expect(noMultipleEnvFiles.scope).toBe('workspace');
  });

  it('flags .env.local at root', async () => {
    const files: Map<string, string> = new Map([['/workspace/.env.local', 'KEY=value']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMultipleEnvFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('.env.local');
  });

  it('passes for .env.example', async () => {
    const files: Map<string, string> = new Map([['/workspace/.env.example', 'KEY=']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMultipleEnvFiles.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes for .env at root', async () => {
    const files: Map<string, string> = new Map([['/workspace/.env', 'KEY=value']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMultipleEnvFiles.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores nested .env files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/.env.local', 'KEY=value'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMultipleEnvFiles.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 24 — validate-sql-migrations
// =============================================================================

describe('workspace/validate-sql-migrations', () => {
  it('has correct rule metadata', () => {
    expect(validateSqlMigrations.id).toBe('workspace/validate-sql-migrations');
    expect(validateSqlMigrations.scope).toBe('workspace');
  });

  it('flags non-.sql file in migrations', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/db/migrations/notes.txt', 'some notes'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateSqlMigrations.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Non-SQL');
  });

  it('flags duplicate migration filenames', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/db/migrations/001_init.sql', 'CREATE TABLE a;'],
      ['/workspace/other/migrations/001_init.sql', 'CREATE TABLE b;'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateSqlMigrations.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Duplicate');
  });

  it('flags BOM in migration file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/db/migrations/001_init.sql', '\uFEFFCREATE TABLE users;'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateSqlMigrations.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('BOM');
  });

  it('passes for valid .sql migration', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/db/migrations/001_init.sql', 'CREATE TABLE users (id INT);'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateSqlMigrations.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 24 — validate-shell-scripts
// =============================================================================

describe('workspace/validate-shell-scripts', () => {
  it('has correct rule metadata', () => {
    expect(validateShellScripts.id).toBe('workspace/validate-shell-scripts');
    expect(validateShellScripts.scope).toBe('workspace');
  });

  it('flags missing strict mode', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/scripts/deploy.sh', '#!/bin/bash\necho hello\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateShellScripts.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('set -euo pipefail');
  });

  it('passes for script with strict mode', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/scripts/deploy.sh', '#!/bin/bash\nset -euo pipefail\necho hello\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateShellScripts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-.sh files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/scripts/config.ts', 'export const x = 1;'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateShellScripts.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 25 — Config Integrity, Contributor Validation & Script Safety
// =============================================================================

// =============================================================================
// workspace/validate-ci-folder-structure
// =============================================================================

describe('workspace/validate-ci-folder-structure', () => {
  it('has correct rule metadata', () => {
    expect(validateCiFolderStructure.id).toBe('workspace/validate-ci-folder-structure');
    expect(validateCiFolderStructure.scope).toBe('workspace');
    expect(typeof validateCiFolderStructure.check).toBe('function');
  });

  it('passes when CI dirs contain only valid files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.github/workflows/ci.yml', 'name: CI'],
      ['/workspace/.github/PULL_REQUEST_TEMPLATE.md', '## PR'],
      ['/workspace/.gitlab/ci/deploy.yaml', 'deploy:'],
      ['/workspace/.github/settings.json', '{}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateCiFolderStructure.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors on invalid file extension in .github/', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.github/scripts/deploy.sh', '#!/bin/bash'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateCiFolderStructure.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/validate-ci-folder-structure');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('.github/scripts/deploy.sh');
  });

  it('errors on invalid file extension in .gitlab/', async () => {
    const files: Map<string, string> = new Map([['/workspace/.gitlab/config.toml', 'key = "val"']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateCiFolderStructure.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('ignores files outside CI directories', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export {}'],
      ['/workspace/scripts/deploy.sh', '#!/bin/bash'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateCiFolderStructure.check(ctx);
    expect(results.length).toBe(0);
  });

  it('allows .jsonc files', async () => {
    const files: Map<string, string> = new Map([['/workspace/.github/renovate.jsonc', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateCiFolderStructure.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/require-vscode-settings
// =============================================================================

describe('workspace/require-vscode-settings', () => {
  it('has correct rule metadata', () => {
    expect(requireVscodeSettings.id).toBe('workspace/require-vscode-settings');
    expect(requireVscodeSettings.scope).toBe('workspace');
    expect(typeof requireVscodeSettings.check).toBe('function');
  });

  it('passes when .vscode/settings.json exists', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.vscode/settings.json', '{ "editor.formatOnSave": true }'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireVscodeSettings.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when .vscode/settings.json is missing', async () => {
    const files: Map<string, string> = new Map();
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireVscodeSettings.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/require-vscode-settings');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('.vscode/settings.json');
  });
});

// =============================================================================
// workspace/no-empty-vscode-settings
// =============================================================================

describe('workspace/no-empty-vscode-settings', () => {
  it('has correct rule metadata', () => {
    expect(noEmptyVscodeSettings.id).toBe('workspace/no-empty-vscode-settings');
    expect(noEmptyVscodeSettings.scope).toBe('workspace');
    expect(typeof noEmptyVscodeSettings.check).toBe('function');
  });

  it('passes when .vscode/settings.json has content', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.vscode/settings.json', '{ "editor.tabSize": 2 }'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEmptyVscodeSettings.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when .vscode/settings.json is empty', async () => {
    const files: Map<string, string> = new Map([['/workspace/.vscode/settings.json', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEmptyVscodeSettings.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-empty-vscode-settings');
    expect(results[0]!.severity).toBe('error');
  });

  it('errors when .vscode/settings.json is only whitespace', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.vscode/settings.json', '   \n  \n  '],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEmptyVscodeSettings.check(ctx);
    expect(results.length).toBe(1);
  });

  it('skips when .vscode/settings.json does not exist', async () => {
    const files: Map<string, string> = new Map();
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noEmptyVscodeSettings.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/validate-all-contributorsrc
// =============================================================================

describe('workspace/validate-all-contributorsrc', () => {
  it('has correct rule metadata', () => {
    expect(validateAllContributorsrc.id).toBe('workspace/validate-all-contributorsrc');
    expect(validateAllContributorsrc.scope).toBe('workspace');
    expect(typeof validateAllContributorsrc.check).toBe('function');
  });

  it('passes with valid .all-contributorsrc', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/.all-contributorsrc',
        JSON.stringify({
          $schema: 'https://example.com/schema.json',
          projectName: 'test',
          contributors: [{ login: 'alice', contributions: ['code'] }],
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateAllContributorsrc.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips when file is missing', async () => {
    const files: Map<string, string> = new Map();
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateAllContributorsrc.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors on invalid JSON', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.all-contributorsrc', '{ invalid json'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateAllContributorsrc.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('errors when $schema is missing', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/.all-contributorsrc',
        JSON.stringify({
          projectName: 'test',
          contributors: [{ login: 'alice', contributions: ['code'] }],
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateAllContributorsrc.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r: LintResult) => r.message.includes('$schema'))).toBe(true);
  });

  it('errors when contributor has no login', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/.all-contributorsrc',
        JSON.stringify({
          $schema: 'https://example.com/schema.json',
          projectName: 'test',
          contributors: [{ contributions: ['code'] }],
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateAllContributorsrc.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r: LintResult) => r.message.includes('login'))).toBe(true);
  });

  it('errors when contributor has empty contributions', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/.all-contributorsrc',
        JSON.stringify({
          $schema: 'https://example.com/schema.json',
          projectName: 'test',
          contributors: [{ login: 'alice', contributions: [] }],
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateAllContributorsrc.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r: LintResult) => r.message.includes('contributions'))).toBe(true);
  });
});

// =============================================================================
// workspace/validate-codeowners
// =============================================================================

describe('workspace/validate-codeowners', () => {
  it('has correct rule metadata', () => {
    expect(validateCodeowners.id).toBe('workspace/validate-codeowners');
    expect(validateCodeowners.scope).toBe('workspace');
    expect(typeof validateCodeowners.check).toBe('function');
  });

  it('passes with valid CODEOWNERS entries', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.github/CODEOWNERS', '# Team assignments\n/src/ @team-core\n/docs/ @team-docs'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateCodeowners.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips when no CODEOWNERS file exists', async () => {
    const files: Map<string, string> = new Map();
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateCodeowners.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when CODEOWNERS is empty', async () => {
    const files: Map<string, string> = new Map([['/workspace/.github/CODEOWNERS', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateCodeowners.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('empty');
  });

  it('errors when entry has no owner', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.github/CODEOWNERS', '/src/\n/docs/ @team-docs'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateCodeowners.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('owner');
  });

  it('skips comment lines and blank lines', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.github/CODEOWNERS', '# This is a comment\n\n/src/ @team-core\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateCodeowners.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/prefer-env-bash-shebang
// =============================================================================

describe('workspace/prefer-env-bash-shebang', () => {
  it('has correct rule metadata', () => {
    expect(preferEnvBashShebang.id).toBe('workspace/prefer-env-bash-shebang');
    expect(preferEnvBashShebang.scope).toBe('workspace');
    expect(typeof preferEnvBashShebang.check).toBe('function');
  });

  it('passes when script uses #!/usr/bin/env bash', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/scripts/deploy.sh', '#!/usr/bin/env bash\nset -euo pipefail'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await preferEnvBashShebang.check(ctx);
    expect(results.length).toBe(0);
  });

  it('warns when script uses #!/bin/bash', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/scripts/deploy.sh', '#!/bin/bash\nset -euo pipefail'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await preferEnvBashShebang.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/prefer-env-bash-shebang');
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('#!/bin/bash');
  });

  it('ignores non-.sh files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', '#!/bin/bash\nconsole.log()'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await preferEnvBashShebang.check(ctx);
    expect(results.length).toBe(0);
  });

  it('does not warn when shebang is something else', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/scripts/run.sh', '#!/usr/bin/env sh\necho hello'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await preferEnvBashShebang.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/validate-tsconfig-path-aliases
// =============================================================================

describe('workspace/validate-tsconfig-path-aliases', () => {
  it('has correct rule metadata', () => {
    expect(validateTsconfigPathAliases.id).toBe('workspace/validate-tsconfig-path-aliases');
    expect(validateTsconfigPathAliases.scope).toBe('workspace');
    expect(typeof validateTsconfigPathAliases.check).toBe('function');
  });

  it('passes when path aliases resolve', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({
          compilerOptions: { paths: { '@/utils/*': ['./src/utils/*'] } },
        }),
      ],
      ['/workspace/src/utils', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateTsconfigPathAliases.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when path alias target does not exist', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({
          compilerOptions: { paths: { '@/missing/*': ['./src/missing/*'] } },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateTsconfigPathAliases.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/validate-tsconfig-path-aliases');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('@/missing/*');
  });

  it('skips tsconfig without paths', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tsconfig.json', JSON.stringify({ compilerOptions: { strict: true } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateTsconfigPathAliases.check(ctx);
    expect(results.length).toBe(0);
  });

  it('handles tsconfig.build.json files', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.build.json',
        JSON.stringify({
          compilerOptions: { paths: { '@/lib/*': ['./lib/*'] } },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateTsconfigPathAliases.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('@/lib/*');
  });
});

// =============================================================================
// workspace/require-script-descriptions
// =============================================================================

describe('workspace/require-script-descriptions', () => {
  it('has correct rule metadata', () => {
    expect(requireScriptDescriptions.id).toBe('workspace/require-script-descriptions');
    expect(requireScriptDescriptions.scope).toBe('workspace');
    expect(typeof requireScriptDescriptions.check).toBe('function');
  });

  it('passes when all scripts have descriptions', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({
          scripts: { dev: 'vite dev', build: 'vite build' },
          meta: { scripts: { description: { dev: 'Start dev server', build: 'Build project' } } },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireScriptDescriptions.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when script has no description', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({
          scripts: { dev: 'vite dev', build: 'vite build' },
          meta: { scripts: { description: { dev: 'Start dev server' } } },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireScriptDescriptions.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('build');
  });

  it('errors when meta.scripts.description is missing entirely', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({
          scripts: { dev: 'vite dev' },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireScriptDescriptions.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('dev');
  });

  it('skips package.json without scripts', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: 'test' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireScriptDescriptions.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/wrangler-tail-consumers-unique
// =============================================================================

describe('workspace/wrangler-tail-consumers-unique', () => {
  it('has correct rule metadata', () => {
    expect(wranglerTailConsumersUnique.id).toBe('workspace/wrangler-tail-consumers-unique');
    expect(wranglerTailConsumersUnique.scope).toBe('workspace');
    expect(typeof wranglerTailConsumersUnique.check).toBe('function');
  });

  it('passes with unique tail consumer services', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/apps/a/wrangler.json',
        JSON.stringify({ tail_consumers: [{ service: 'logger-a' }] }),
      ],
      [
        '/workspace/apps/b/wrangler.json',
        JSON.stringify({ tail_consumers: [{ service: 'logger-b' }] }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await wranglerTailConsumersUnique.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors on duplicate tail consumer services across files', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/apps/a/wrangler.json',
        JSON.stringify({ tail_consumers: [{ service: 'logger' }] }),
      ],
      [
        '/workspace/apps/b/wrangler.json',
        JSON.stringify({ tail_consumers: [{ service: 'logger' }] }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await wranglerTailConsumersUnique.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('logger');
  });

  it('skips wrangler.json without tail_consumers', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/wrangler.json', JSON.stringify({ name: 'my-worker' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await wranglerTailConsumersUnique.check(ctx);
    expect(results.length).toBe(0);
  });

  it('checks env-level tail_consumers too', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/wrangler.json',
        JSON.stringify({
          tail_consumers: [{ service: 'logger' }],
          env: { production: { tail_consumers: [{ service: 'logger' }] } },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await wranglerTailConsumersUnique.check(ctx);
    expect(results.length).toBe(1);
  });
});

// =============================================================================
// workspace/no-unreferenced-shell-scripts
// =============================================================================

describe('workspace/no-unreferenced-shell-scripts', () => {
  it('has correct rule metadata', () => {
    expect(noUnreferencedShellScripts.id).toBe('workspace/no-unreferenced-shell-scripts');
    expect(noUnreferencedShellScripts.scope).toBe('workspace');
    expect(typeof noUnreferencedShellScripts.check).toBe('function');
  });

  it('passes when script is referenced in package.json', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/scripts/deploy.sh', '#!/usr/bin/env bash\necho deploy'],
      ['/workspace/package.json', JSON.stringify({ scripts: { deploy: './scripts/deploy.sh' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnreferencedShellScripts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('warns when script is not referenced anywhere', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/scripts/orphan.sh', '#!/usr/bin/env bash\necho orphan'],
      ['/workspace/package.json', JSON.stringify({ scripts: { build: 'vite build' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnreferencedShellScripts.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('orphan.sh');
  });

  it('passes when script is referenced in README', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/scripts/setup.sh', '#!/usr/bin/env bash'],
      ['/workspace/README.md', '# Setup\n\nRun `./scripts/setup.sh` to start.'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnreferencedShellScripts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores .sh files not under scripts/ directory', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/tools/run.sh', '#!/usr/bin/env bash'],
      ['/workspace/package.json', '{}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnreferencedShellScripts.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/validate-env-file-integrity
// =============================================================================

describe('workspace/validate-env-file-integrity', () => {
  it('has correct rule metadata', () => {
    expect(validateEnvFileIntegrity.id).toBe('workspace/validate-env-file-integrity');
    expect(validateEnvFileIntegrity.scope).toBe('workspace');
    expect(typeof validateEnvFileIntegrity.check).toBe('function');
  });

  it('passes with valid .env file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.env', 'NODE_ENV=development\nPORT=3000\nAPI_KEY="secret"'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateEnvFileIntegrity.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors on duplicate keys', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.env', 'NODE_ENV=development\nPORT=3000\nNODE_ENV=production'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateEnvFileIntegrity.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Duplicate key');
    expect(results[0]!.message).toContain('NODE_ENV');
  });

  it('errors on tab characters', async () => {
    const files: Map<string, string> = new Map([['/workspace/.env', 'API_KEY=\tsecret']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateEnvFileIntegrity.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Tab');
  });

  it('errors on merge conflict markers', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.env', '<<<<<<< HEAD\n=======\n>>>>>>> branch'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateEnvFileIntegrity.check(ctx);
    expect(results.length).toBe(3);
    expect(results.every((r: LintResult) => r.message.includes('Merge conflict'))).toBe(true);
  });

  it('errors on unclosed quotes', async () => {
    const files: Map<string, string> = new Map([['/workspace/.env', 'SECRET="unclosed value']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateEnvFileIntegrity.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Unclosed quote');
  });

  it('skips comment lines', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.env', '# This is a comment\nNODE_ENV=dev'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateEnvFileIntegrity.check(ctx);
    expect(results.length).toBe(0);
  });

  it('ignores non-.env files', async () => {
    const files: Map<string, string> = new Map([['/workspace/config.json', '{"key": "value"}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateEnvFileIntegrity.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/validate-wrangler-config
// =============================================================================

describe('workspace/validate-wrangler-config', () => {
  it('has correct rule metadata', () => {
    expect(validateWranglerConfig.id).toBe('workspace/validate-wrangler-config');
    expect(validateWranglerConfig.scope).toBe('workspace');
    expect(typeof validateWranglerConfig.check).toBe('function');
  });

  it('passes with valid bindings', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/wrangler.json',
        JSON.stringify({
          kv_namespaces: [{ binding: 'KV_STORE' }],
          r2_buckets: [{ binding: 'R2_BUCKET' }],
          durable_objects: { bindings: [{ name: 'DO_COUNTER', class_name: 'Counter' }] },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateWranglerConfig.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors on missing class_name for DO binding', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/wrangler.json',
        JSON.stringify({
          durable_objects: { bindings: [{ name: 'DO_COUNTER' }] },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateWranglerConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('class_name');
  });

  it('errors on placeholder class_name', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/wrangler.json',
        JSON.stringify({
          durable_objects: { bindings: [{ name: 'DO_THING', class_name: 'Example' }] },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateWranglerConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Placeholder');
  });

  it('errors on duplicate binding names across types', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/wrangler.json',
        JSON.stringify({
          kv_namespaces: [{ binding: 'STORE' }],
          r2_buckets: [{ binding: 'STORE' }],
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateWranglerConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Duplicate binding name');
  });

  it('skips non-wrangler files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: 'test' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateWranglerConfig.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/validate-db-name-safety
// =============================================================================

describe('workspace/validate-db-name-safety', () => {
  it('has correct rule metadata', () => {
    expect(validateDbNameSafety.id).toBe('workspace/validate-db-name-safety');
    expect(validateDbNameSafety.scope).toBe('workspace');
    expect(typeof validateDbNameSafety.check).toBe('function');
  });

  it('passes with valid database names', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/wrangler.json',
        JSON.stringify({
          d1_databases: [{ database_name: 'analytics-prod', binding: 'DB' }],
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDbNameSafety.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors on invalid database name', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/wrangler.json',
        JSON.stringify({
          d1_databases: [{ database_name: '123-invalid', binding: 'DB' }],
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDbNameSafety.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('123-invalid');
  });

  it('errors on database name with special characters', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/wrangler.json',
        JSON.stringify({
          d1_databases: [{ database_name: 'db name!', binding: 'DB' }],
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDbNameSafety.check(ctx);
    expect(results.length).toBe(1);
  });

  it('checks env-level d1_databases', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/wrangler.json',
        JSON.stringify({
          env: { production: { d1_databases: [{ database_name: '$bad', binding: 'DB' }] } },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDbNameSafety.check(ctx);
    expect(results.length).toBe(1);
  });

  it('skips when no d1_databases present', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/wrangler.json', JSON.stringify({ name: 'worker' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDbNameSafety.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/validate-monorepo-schema-example
// =============================================================================

describe('workspace/validate-monorepo-schema-example', () => {
  it('has correct rule metadata', () => {
    expect(validateMonorepoSchemaExample.id).toBe('workspace/validate-monorepo-schema-example');
    expect(validateMonorepoSchemaExample.scope).toBe('workspace');
    expect(typeof validateMonorepoSchemaExample.check).toBe('function');
  });

  it('passes when both schema and example exist and example is non-empty', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/monorepo-layout.schema.yaml', 'root:\n  packages: true'],
      [
        '/workspace/packages/shared/schemas/monorepo-layout.example.yaml',
        'root:\n  packages: true',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateMonorepoSchemaExample.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips when canonical schema does not exist', async () => {
    const files: Map<string, string> = new Map();
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateMonorepoSchemaExample.check(ctx);
    expect(results.length).toBe(0);
  });

  it('warns when canonical exists but example is missing', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/monorepo-layout.schema.yaml', 'root:\n  packages: true'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateMonorepoSchemaExample.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('example');
  });

  it('warns when example is empty', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/monorepo-layout.schema.yaml', 'root:\n  packages: true'],
      ['/workspace/packages/shared/schemas/monorepo-layout.example.yaml', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateMonorepoSchemaExample.check(ctx);
    expect(results.length).toBe(1);
  });
});

// =============================================================================
// workspace/no-unlinked-workspace-deps
// =============================================================================

describe('workspace/no-unlinked-workspace-deps', () => {
  it('has correct rule metadata', () => {
    expect(noUnlinkedWorkspaceDeps.id).toBe('workspace/no-unlinked-workspace-deps');
    expect(noUnlinkedWorkspaceDeps.scope).toBe('workspace');
    expect(typeof noUnlinkedWorkspaceDeps.check).toBe('function');
  });

  it('passes when all workspace deps match real packages', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/apps/web/package.json',
        JSON.stringify({
          dependencies: { '@/utils': 'workspace:*', '@/ui': 'workspace:*' },
        }),
      ],
    ]);
    const packages: WorkspacePackage[] = [
      {
        path: '/workspace/packages/utils/package.json',
        dir: '/workspace/packages/utils',
        packageJson: {},
        name: '@/utils',
      },
      {
        path: '/workspace/packages/ui/package.json',
        dir: '/workspace/packages/ui',
        packageJson: {},
        name: '@/ui',
      },
    ];
    const ctx: WorkspaceContext = mockContext({ files, packages });
    const results: LintResult[] = await noUnlinkedWorkspaceDeps.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when workspace dep does not match any package', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/apps/web/package.json',
        JSON.stringify({
          dependencies: { '@/nonexistent': 'workspace:*' },
        }),
      ],
    ]);
    const packages: WorkspacePackage[] = [
      {
        path: '/workspace/packages/utils/package.json',
        dir: '/workspace/packages/utils',
        packageJson: {},
        name: '@/utils',
      },
    ];
    const ctx: WorkspaceContext = mockContext({ files, packages });
    const results: LintResult[] = await noUnlinkedWorkspaceDeps.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('@/nonexistent');
  });

  it('ignores non-workspace deps', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/apps/web/package.json',
        JSON.stringify({
          dependencies: { react: '^19.0.0', typescript: '^5.0.0' },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files, packages: [] });
    const results: LintResult[] = await noUnlinkedWorkspaceDeps.check(ctx);
    expect(results.length).toBe(0);
  });

  it('checks devDependencies too', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/apps/web/package.json',
        JSON.stringify({
          devDependencies: { '@/missing-dev': 'workspace:*' },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files, packages: [] });
    const results: LintResult[] = await noUnlinkedWorkspaceDeps.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('@/missing-dev');
  });

  it('skips package.json without dependencies', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ name: 'root' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files, packages: [] });
    const results: LintResult[] = await noUnlinkedWorkspaceDeps.check(ctx);
    expect(results.length).toBe(0);
  });
});

/* ─── Phase 26 — CI Configuration, Docs Frontmatter & Worker Safety ─── */

describe('workspace/no-inline-ci-scripts', () => {
  it('has correct metadata', () => {
    expect(noInlineCiScripts.id).toBe('workspace/no-inline-ci-scripts');
    expect(noInlineCiScripts.scope).toBe('workspace');
  });

  it('passes when CI YAML uses external script references', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.github/workflows/ci.yml', 'jobs:\n  build:\n    run: ./scripts/build.sh\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInlineCiScripts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors on inline multi-line script blocks', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/.github/workflows/ci.yml',
        'jobs:\n  build:\n    run: |\n      npm install\n      npm test\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInlineCiScripts.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-inline-ci-scripts');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.line).toBe(3);
  });

  it('errors on GitLab script: | blocks', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab/ci.yml', 'test:\n  script: |\n    echo hello\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInlineCiScripts.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('skips non-CI files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/build.yml', 'jobs:\n  build:\n    run: |\n      npm test\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInlineCiScripts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-YAML files in CI dirs', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.github/workflows/config.json', '{"run": "|"}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInlineCiScripts.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/warn-unused-gitignore-patterns', () => {
  it('has correct metadata', () => {
    expect(warnUnusedGitignorePatterns.id).toBe('workspace/warn-unused-gitignore-patterns');
    expect(warnUnusedGitignorePatterns.scope).toBe('workspace');
  });

  it('passes when all patterns match files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitignore', 'node_modules\ndist\n'],
      ['/workspace/node_modules/pkg/index.js', ''],
      ['/workspace/dist/bundle.js', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await warnUnusedGitignorePatterns.check(ctx);
    expect(results.length).toBe(0);
  });

  it('warns on patterns that match no files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitignore', 'node_modules\nstale_pattern_xyz\n'],
      ['/workspace/node_modules/pkg/index.js', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await warnUnusedGitignorePatterns.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('stale_pattern_xyz');
  });

  it('skips comments and blank lines', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitignore', '# comment\n\n!negation\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await warnUnusedGitignorePatterns.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips when .gitignore does not exist', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/index.ts', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await warnUnusedGitignorePatterns.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-ci-recursive-triggers', () => {
  it('has correct metadata', () => {
    expect(noCiRecursiveTriggers.id).toBe('workspace/no-ci-recursive-triggers');
    expect(noCiRecursiveTriggers.scope).toBe('workspace');
  });

  it('passes on clean CI files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.github/workflows/ci.yml', 'on: push\njobs:\n  build:\n    run: npm test\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noCiRecursiveTriggers.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors on git push in CI scripts', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.github/workflows/ci.yml', 'jobs:\n  deploy:\n    run: git push origin main\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noCiRecursiveTriggers.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('git push');
  });

  it('errors on CI_JOB_TOKEN', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab/ci.yml', 'deploy:\n  script: curl -H "JOB-Token: $CI_JOB_TOKEN"\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noCiRecursiveTriggers.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('CI_JOB_TOKEN');
  });

  it('errors on trigger: keyword', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab/ci.yml', 'downstream:\n  trigger: other-project\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noCiRecursiveTriggers.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('trigger:');
  });

  it('skips non-CI files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/scripts/deploy.yml', 'run: git push origin main\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noCiRecursiveTriggers.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/require-ci-job-conditions', () => {
  it('has correct metadata', () => {
    expect(requireCiJobConditions.id).toBe('workspace/require-ci-job-conditions');
    expect(requireCiJobConditions.scope).toBe('workspace');
  });

  it('passes when CI file has trigger conditions', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.github/workflows/ci.yml', 'on: push\njobs:\n  build:\n    runs-on: ubuntu\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireCiJobConditions.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when CI file has no trigger conditions', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/.github/workflows/ci.yml',
        'jobs:\n  build:\n    image: ubuntu\n    steps:\n      - name: test\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireCiJobConditions.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('no trigger conditions');
  });

  it('passes with rules: keyword', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab/ci.yml', 'deploy:\n  rules: [{if: "$CI_COMMIT_BRANCH == main"}]\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireCiJobConditions.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-CI files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/config/deploy.yml', 'jobs:\n  build:\n    steps:\n      - run: test\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireCiJobConditions.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-duplicate-ci-job-names', () => {
  it('has correct metadata', () => {
    expect(noDuplicateCiJobNames.id).toBe('workspace/no-duplicate-ci-job-names');
    expect(noDuplicateCiJobNames.scope).toBe('workspace');
  });

  it('passes with unique job names', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.github/workflows/ci.yml', 'build:\n  script: npm build\n'],
      ['/workspace/.github/workflows/deploy.yml', 'deploy:\n  script: npm deploy\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDuplicateCiJobNames.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors on duplicate job names across files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.github/workflows/ci.yml', 'build:\n  script: npm build\n'],
      ['/workspace/.github/workflows/deploy.yml', 'build:\n  script: npm deploy\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDuplicateCiJobNames.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('build');
  });

  it('skips reserved YAML keys', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.github/workflows/ci.yml', 'name: CI\non: push\njobs:\n  build: {}\n'],
      ['/workspace/.github/workflows/deploy.yml', 'name: Deploy\non: push\njobs:\n  deploy: {}\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDuplicateCiJobNames.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-CI files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/config/a.yml', 'build:\n  script: test\n'],
      ['/workspace/config/b.yml', 'build:\n  script: test\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDuplicateCiJobNames.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/require-ci-job-timeouts', () => {
  it('has correct metadata', () => {
    expect(requireCiJobTimeouts.id).toBe('workspace/require-ci-job-timeouts');
    expect(requireCiJobTimeouts.scope).toBe('workspace');
  });

  it('passes when timeout is within limits', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.github/workflows/ci.yml', 'jobs:\n  build:\n    timeout-minutes: 30\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireCiJobTimeouts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when timeout-minutes exceeds 60', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.github/workflows/ci.yml', 'jobs:\n  build:\n    timeout-minutes: 120\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireCiJobTimeouts.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('120');
  });

  it('errors when GitLab timeout exceeds 60', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab/ci.yml', 'deploy:\n  timeout: 90\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireCiJobTimeouts.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('90');
  });

  it('passes at exactly 60 minutes', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.github/workflows/ci.yml', 'jobs:\n  build:\n    timeout-minutes: 60\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireCiJobTimeouts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-CI files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/config.yml', 'timeout-minutes: 120\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireCiJobTimeouts.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-unused-ci-stages', () => {
  it('has correct metadata', () => {
    expect(noUnusedCiStages.id).toBe('workspace/no-unused-ci-stages');
    expect(noUnusedCiStages.scope).toBe('workspace');
  });

  it('passes when all declared stages are referenced', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/.gitlab/ci.yml',
        'stages:\n  - build\n  - test\nbuild-job:\n  stage: build\ntest-job:\n  stage: test\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnusedCiStages.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors on declared but unused stages', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab/ci.yml', 'stages:\n  - build\n  - deploy\nbuild-job:\n  stage: build\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnusedCiStages.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('deploy');
  });

  it('skips files without stages block', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.github/workflows/ci.yml', 'on: push\njobs:\n  build:\n    runs-on: ubuntu\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnusedCiStages.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-CI files', async () => {
    const files: Map<string, string> = new Map([['/workspace/config.yml', 'stages:\n  - build\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnusedCiStages.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/require-codeowners-coverage', () => {
  it('has correct metadata', () => {
    expect(requireCodeownersCoverage.id).toBe('workspace/require-codeowners-coverage');
    expect(requireCodeownersCoverage.scope).toBe('workspace');
  });

  it('passes when all critical paths are covered', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/CODEOWNERS',
        'packages/ @org/team\nscripts/ @org/team\n.github/ @org/team\n.vscode/ @org/team\ndocs/ @org/team\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireCodeownersCoverage.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when critical paths are missing', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/CODEOWNERS', 'packages/ @org/team\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireCodeownersCoverage.check(ctx);
    expect(results.length).toBe(4);
    expect(results.every((r: LintResult): boolean => r.severity === 'error')).toBe(true);
  });

  it('skips when no CODEOWNERS file exists', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/index.ts', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireCodeownersCoverage.check(ctx);
    expect(results.length).toBe(0);
  });

  it('finds CODEOWNERS in .github/ location', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/.github/CODEOWNERS',
        'packages/ @org/team\nscripts/ @org/team\n.github/ @org/team\n.vscode/ @org/team\ndocs/ @org/team\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireCodeownersCoverage.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/validate-docs-frontmatter', () => {
  it('has correct metadata', () => {
    expect(validateDocsFrontmatter.id).toBe('workspace/validate-docs-frontmatter');
    expect(validateDocsFrontmatter.scope).toBe('workspace');
  });

  it('passes with valid frontmatter', async () => {
    const content: string =
      '---\ntitle: My Page\ndescription: A detailed description of this page\nslug: my-page\ncategory: guides\nupdated: 2024-01-15\n---\n\n# Content\n';
    const files: Map<string, string> = new Map([['/workspace/docs/guide.md', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDocsFrontmatter.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors on missing required fields', async () => {
    const content: string = '---\ntitle: My Page\n---\n\n# Content\n';
    const files: Map<string, string> = new Map([['/workspace/docs/guide.md', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDocsFrontmatter.check(ctx);
    expect(results.length).toBe(4);
    expect(results.every((r: LintResult): boolean => r.severity === 'error')).toBe(true);
  });

  it('errors on short description', async () => {
    const content: string =
      '---\ntitle: My Page\ndescription: Short\nslug: my-page\ncategory: guides\nupdated: 2024-01-15\n---\n';
    const files: Map<string, string> = new Map([['/workspace/docs/guide.md', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDocsFrontmatter.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('at least 10 characters');
  });

  it('errors on non-kebab-case slug', async () => {
    const content: string =
      '---\ntitle: My Page\ndescription: A detailed description of this page\nslug: My_Page_Here\ncategory: guides\nupdated: 2024-01-15\n---\n';
    const files: Map<string, string> = new Map([['/workspace/docs/guide.md', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDocsFrontmatter.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('kebab-case');
  });

  it('errors on invalid date format', async () => {
    const content: string =
      '---\ntitle: My Page\ndescription: A detailed description of this page\nslug: my-page\ncategory: guides\nupdated: Jan 15, 2024\n---\n';
    const files: Map<string, string> = new Map([['/workspace/docs/guide.md', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDocsFrontmatter.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('YYYY-MM-DD');
  });

  it('skips non-docs markdown files', async () => {
    const content: string = '---\ntitle: README\n---\n\n# Hello\n';
    const files: Map<string, string> = new Map([['/workspace/README.md', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDocsFrontmatter.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips docs files without frontmatter', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/guide.md', '# No Frontmatter\n\nJust content.\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDocsFrontmatter.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/require-makefile-help-target', () => {
  it('has correct metadata', () => {
    expect(requireMakefileHelpTarget.id).toBe('workspace/require-makefile-help-target');
    expect(requireMakefileHelpTarget.scope).toBe('workspace');
  });

  it('passes when Makefile has help: target', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/Makefile',
        '.PHONY: build help\n\nbuild:\n\techo build\n\nhelp:\n\techo available targets\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireMakefileHelpTarget.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when Makefile is missing help: target', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/Makefile', '.PHONY: build\n\nbuild:\n\techo build\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireMakefileHelpTarget.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('help:');
  });

  it('skips non-Makefile files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/makefile.txt', 'build:\n\techo build\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireMakefileHelpTarget.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-orphaned-ts-files', () => {
  it('has correct metadata', () => {
    expect(noOrphanedTsFiles.id).toBe('workspace/no-orphaned-ts-files');
    expect(noOrphanedTsFiles.scope).toBe('workspace');
  });

  it('passes when all .ts files are under a tsconfig directory', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/tsconfig.json', '{}'],
      ['/workspace/packages/app/src/index.ts', 'export {}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noOrphanedTsFiles.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors on .ts files not under any tsconfig directory', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/tsconfig.json', '{}'],
      ['/workspace/orphan/util.ts', 'export {}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noOrphanedTsFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('orphan/util.ts');
  });

  it('skips .d.ts files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/tsconfig.json', '{}'],
      ['/workspace/orphan/types.d.ts', 'declare module "x" {}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noOrphanedTsFiles.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips when no tsconfig files exist', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/index.ts', 'export {}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noOrphanedTsFiles.check(ctx);
    expect(results.length).toBe(0);
  });

  it('handles .tsx files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/tsconfig.json', '{}'],
      ['/workspace/orphan/Component.tsx', 'export default () => <div/>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noOrphanedTsFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('orphan/Component.tsx');
  });
});

describe('workspace/no-disallowed-worker-headers', () => {
  it('has correct metadata', () => {
    expect(noDisallowedWorkerHeaders.id).toBe('workspace/no-disallowed-worker-headers');
    expect(noDisallowedWorkerHeaders.scope).toBe('workspace');
  });

  it('passes when worker code uses allowed headers', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/workers/api/worker.ts', "headers.set('Content-Type', 'application/json');\n"],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDisallowedWorkerHeaders.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors on Transfer-Encoding header in worker files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/workers/api/worker.ts', "headers.set('Transfer-Encoding', 'chunked');\n"],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDisallowedWorkerHeaders.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Transfer-Encoding');
  });

  it('errors on Connection header (case-insensitive)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/workers/api/worker.ts', "headers.append('connection', 'close');\n"],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDisallowedWorkerHeaders.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Connection');
  });

  it('skips non-worker files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/api/index.ts', "headers.set('Transfer-Encoding', 'chunked');\n"],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDisallowedWorkerHeaders.check(ctx);
    expect(results.length).toBe(0);
  });

  it('detects multiple disallowed headers', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/workers/api/worker.ts',
        "headers.set('Transfer-Encoding', 'chunked');\nheaders.set('Connection', 'close');\n",
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noDisallowedWorkerHeaders.check(ctx);
    expect(results.length).toBe(2);
  });
});

describe('workspace/require-docker-compose-schema', () => {
  it('has correct metadata', () => {
    expect(requireDockerComposeSchema.id).toBe('workspace/require-docker-compose-schema');
    expect(requireDockerComposeSchema.scope).toBe('workspace');
  });

  it('passes when docker-compose has schema annotation', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/docker-compose.yml',
        '# yaml-language-server: $schema=https://json.schemastore.org/docker-compose\nservices:\n  app:\n    image: node\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireDockerComposeSchema.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes with shorthand $schema annotation', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/docker-compose.yml',
        '# $schema=https://json.schemastore.org/docker-compose\nservices:\n  app:\n    image: node\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireDockerComposeSchema.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when schema annotation is missing', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docker-compose.yml', 'services:\n  app:\n    image: node\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireDockerComposeSchema.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('checks compose.yaml variant', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/compose.yaml', 'services:\n  db:\n    image: postgres\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireDockerComposeSchema.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('skips non-compose files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/config.yml', 'services:\n  app:\n    image: node\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireDockerComposeSchema.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/validate-locale-key-consistency', () => {
  it('has correct metadata', () => {
    expect(validateLocaleKeyConsistency.id).toBe('workspace/validate-locale-key-consistency');
    expect(validateLocaleKeyConsistency.scope).toBe('workspace');
  });

  it('passes when all locale files have consistent keys', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/locales/en.json', JSON.stringify({ hello: 'Hello', bye: 'Goodbye' })],
      ['/workspace/locales/fr.json', JSON.stringify({ hello: 'Bonjour', bye: 'Au revoir' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateLocaleKeyConsistency.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors on missing keys in a locale file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/locales/en.json', JSON.stringify({ hello: 'Hello', bye: 'Goodbye' })],
      ['/workspace/locales/fr.json', JSON.stringify({ hello: 'Bonjour' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateLocaleKeyConsistency.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('missing keys');
    expect(results[0]!.message).toContain('bye');
  });

  it('errors on extra keys in a locale file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/locales/en.json', JSON.stringify({ hello: 'Hello' })],
      ['/workspace/locales/fr.json', JSON.stringify({ hello: 'Bonjour', extra: 'Suppl' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateLocaleKeyConsistency.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('extra keys');
    expect(results[0]!.message).toContain('extra');
  });

  it('skips groups with only one locale file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/locales/en.json', JSON.stringify({ hello: 'Hello' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateLocaleKeyConsistency.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-locale directories', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/config/en.json', JSON.stringify({ hello: 'Hello' })],
      ['/workspace/config/fr.json', JSON.stringify({ bye: 'Au revoir' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateLocaleKeyConsistency.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/validate-image-optimization', () => {
  it('has correct metadata', () => {
    expect(validateImageOptimization.id).toBe('workspace/validate-image-optimization');
    expect(validateImageOptimization.scope).toBe('workspace');
  });

  it('passes on small image files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/assets/logo.webp', 'x'.repeat(1000)],
      ['/workspace/assets/icon.svg', '<svg><circle/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateImageOptimization.check(ctx);
    expect(results.length).toBe(0);
  });

  it('warns on .webp files exceeding 300KB', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/assets/large.webp', 'x'.repeat(400000)],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateImageOptimization.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('300KB');
  });

  it('warns on .svg files exceeding 100KB', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/assets/huge.svg', '<svg>' + 'x'.repeat(110000) + '</svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateImageOptimization.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('100KB');
  });

  it('warns on unminified SVG with excessive indentation', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/assets/unminified.svg',
        '<svg>\n        <circle cx="50" cy="50" r="40"/>\n</svg>',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateImageOptimization.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('unminified');
  });

  it('warns on SVG with multiple consecutive blank lines', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/assets/spacey.svg', '<svg>\n\n\n<circle/>\n</svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateImageOptimization.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('unminified');
  });

  it('skips non-image files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/assets/data.json', 'x'.repeat(400000)],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateImageOptimization.check(ctx);
    expect(results.length).toBe(0);
  });
});
