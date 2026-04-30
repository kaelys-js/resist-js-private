/**
 * Tests for workspace lint rules — split 2/4.
 *
 * Auto-split from workspace-rules.test.ts to satisfy oxlint/max-dependencies.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest';
import type { WorkspaceContext, WorkspacePackage } from '../../framework/rule-context.ts';
import type { LintResult } from '../../framework/types.ts';
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

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

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
    allFiles: async (): Promise<readonly string[]> => [...files.keys()],
    filesByExtension: async (...exts: string[]): Promise<readonly string[]> =>
      [...files.keys()].filter((f: string): boolean =>
        exts.some((ext: string): boolean => f.endsWith(ext)),
      ),
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
        JSON.stringify({ compilerOptions: { charset: 'utf8', listFiles: true } }),
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
    vi.spyOn(ctx, 'fileExists').mockImplementation(async () => false);
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
    vi.spyOn(ctx, 'fileExists').mockImplementation(async () => false);
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
    vi.spyOn(ctx, 'fileExists').mockImplementation(async () => false);
    const results: LintResult[] = await validatePackageEntrypoints.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('./dist/index.mjs');
  });

  it('passes when main file exists', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/pkg/package.json', JSON.stringify({ main: './dist/index.js' })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    vi.spyOn(ctx, 'fileExists').mockImplementation(async () => true);
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
    const content: string = `${[
      '* text=auto',
      '*.ts text eol=lf',
      '*.js text eol=lf',
      'pnpm-lock.yaml -text',
      '*.png binary',
    ].join('\n')}\n`;
    const files: Map<string, string> = new Map([['/workspace/.gitattributes', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireGitattributes.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports error for duplicate glob rules', async () => {
    const content: string = `${[
      '* text=auto',
      '*.ts text eol=lf',
      '*.ts text eol=crlf',
      '*.js text eol=lf',
      'pnpm-lock.yaml -text',
      '*.png binary',
    ].join('\n')}\n`;
    const files: Map<string, string> = new Map([['/workspace/.gitattributes', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await requireGitattributes.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const messages: string = results.map((r: LintResult) => r.message).join(' ');
    expect(messages).toContain('Duplicate');
  });
});

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
      let scriptValue: string;

      if (name === 'build') {
        scriptValue = 'wrong command';
      } else if (name === 'prepare' || name === 'preinstall') {
        scriptValue = 'husky';
      } else {
        scriptValue = `pnpm -r run ${name}`;
      }
      scripts[name] = scriptValue;
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
// inputs() lifecycle coverage — packages.map((p) => p.path) callbacks
// =============================================================================

const STD_PACKAGES_FIXTURE_2: WorkspacePackage[] = [
  {
    name: '@/a',
    path: '/workspace/packages/a/package.json',
    dir: '/workspace/packages/a',
    packageJson: { name: '@/a' },
  },
  {
    name: '@/b',
    path: '/workspace/packages/b/package.json',
    dir: '/workspace/packages/b',
    packageJson: { name: '@/b' },
  },
];

function ctxWithRejectingPackages2(): WorkspaceContext {
  const base: WorkspaceContext = mockContext({ rootDir: '/workspace' });

  return {
    ...base,
    getWorkspacePackages: (): Promise<WorkspacePackage[]> =>
      new Promise<WorkspacePackage[]>(
        (_resolve: (v: WorkspacePackage[]) => void, reject: (e: Error) => void): void => {
          reject(new Error('boom'));
        },
      ),
  };
}

const RULES_WITH_PACKAGE_INPUTS_2: ReadonlyArray<{
  name: string;
  rule: { inputs?: (ctx: unknown) => Promise<readonly string[]> };
}> = [
  { name: 'workspace/enforce-peer-dependency-consistency', rule: enforcePeerDependencyConsistency },
  { name: 'workspace/enforce-workspace-version-alignment', rule: enforceWorkspaceVersionAlignment },
  { name: 'workspace/validate-product-scripts', rule: validateProductScripts },
];

for (const { name, rule } of RULES_WITH_PACKAGE_INPUTS_2) {
  describe(`${name} — inputs() lifecycle`, () => {
    it('returns package paths via packages.map((p) => p.path)', async () => {
      const ctx: WorkspaceContext = mockContext({
        rootDir: '/workspace',
        packages: [...STD_PACKAGES_FIXTURE_2],
      });
      expect(typeof rule.inputs).toBe('function');
      const inputs = await rule.inputs!(ctx);
      expect(Array.isArray(inputs)).toBe(true);
      expect(inputs).toEqual([
        '/workspace/packages/a/package.json',
        '/workspace/packages/b/package.json',
      ]);
    });

    it('returns [] when getWorkspacePackages rejects', async () => {
      const ctx: WorkspaceContext = ctxWithRejectingPackages2();
      const inputs = await rule.inputs!(ctx);
      expect(inputs).toEqual([]);
    });
  });
}

describe('workspace/require-workspace-protocol — inputs() lifecycle', () => {
  it('returns combined files + package paths', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/foo.ts', 'x'],
      ['/workspace/bar.ts', 'y'],
    ]);
    const ctx: WorkspaceContext = mockContext({
      rootDir: '/workspace',
      files,
      packages: [...STD_PACKAGES_FIXTURE_2],
    });
    expect(typeof requireWorkspaceProtocol.inputs).toBe('function');
    const inputs = await requireWorkspaceProtocol.inputs!(ctx);
    expect(Array.isArray(inputs)).toBe(true);
    expect(inputs).toEqual(
      expect.arrayContaining([
        '/workspace/foo.ts',
        '/workspace/bar.ts',
        '/workspace/packages/a/package.json',
        '/workspace/packages/b/package.json',
      ]),
    );
  });

  it('falls back to allFiles when getWorkspacePackages rejects', async () => {
    const files: Map<string, string> = new Map([['/workspace/only.ts', 'z']]);
    const base: WorkspaceContext = mockContext({ rootDir: '/workspace', files });
    const ctx: WorkspaceContext = {
      ...base,
      getWorkspacePackages: (): Promise<WorkspacePackage[]> =>
        new Promise<WorkspacePackage[]>(
          (_resolve: (v: WorkspacePackage[]) => void, reject: (e: Error) => void): void => {
            reject(new Error('boom'));
          },
        ),
    };
    const inputs = await requireWorkspaceProtocol.inputs!(ctx);
    expect(inputs).toEqual(['/workspace/only.ts']);
  });
});

// =============================================================================
// Bulk inputs() smoke-coverage for workspace-rules-2
// =============================================================================
const BULK_INPUTS_RULES_2: ReadonlyArray<{
  id: string;
  rule: { inputs?: (ctx: unknown) => Promise<readonly string[]> };
}> = [
  { id: 'no-tsconfig-deprecated-options', rule: noTsconfigDeprecatedOptions },
  { id: 'require-tsconfig-module-resolution', rule: requireTsconfigModuleResolution },
  { id: 'no-tsconfig-include-exclude-overlap', rule: noTsconfigIncludeExcludeOverlap },
  { id: 'require-tsconfig-exclude-defaults', rule: requireTsconfigExcludeDefaults },
  { id: 'tsconfig-paths-resolve', rule: tsconfigPathsResolve },
  { id: 'no-tsconfig-path-shadowing', rule: noTsconfigPathShadowing },
  { id: 'require-tsconfig-schema', rule: requireTsconfigSchema },
  { id: 'no-tsconfig-types-duplicates', rule: noTsconfigTypesDuplicates },
  { id: 'tsconfig-references-resolve', rule: tsconfigReferencesResolve },
  { id: 'no-tsconfig-import-inconsistency', rule: noTsconfigImportInconsistency },
  { id: 'no-wildcard-versions', rule: noWildcardVersions },
  { id: 'no-tarball-deps', rule: noTarballDeps },
  { id: 'no-optional-dependencies', rule: noOptionalDependencies },
  { id: 'validate-package-entrypoints', rule: validatePackageEntrypoints },
  { id: 'require-package-description', rule: requirePackageDescription },
  { id: 'require-package-name-version', rule: requirePackageNameVersion },
  { id: 'require-package-schema', rule: requirePackageSchema },
  { id: 'require-package-name-matches-path', rule: requirePackageNameMatchesPath },
  { id: 'no-invalid-package-version', rule: noInvalidPackageVersion },
  { id: 'require-package-metadata', rule: requirePackageMetadata },
  { id: 'no-script-conflicts', rule: noScriptConflicts },
  { id: 'require-package-author', rule: requirePackageAuthor },
  { id: 'no-duplicate-package-names', rule: noDuplicatePackageNames },
  { id: 'require-spdx-license', rule: requireSpdxLicense },
  { id: 'require-tsconfig-baseurl', rule: requireTsconfigBaseurl },
  { id: 'tsconfig-baseurl-resolves', rule: tsconfigBaseurlResolves },
  { id: 'no-tsconfig-conflicting-types', rule: noTsconfigConflictingTypes },
  { id: 'no-tsconfig-outdir-rootdir-overlap', rule: noTsconfigOutdirRootdirOverlap },
  { id: 'require-tsconfig-types', rule: requireTsconfigTypes },
  { id: 'no-tsconfig-unused-paths', rule: noTsconfigUnusedPaths },
  { id: 'no-multiple-tsconfig-base', rule: noMultipleTsconfigBase },
  { id: 'require-pnpm-scripts', rule: requirePnpmScripts },
  { id: 'require-private-internal-packages', rule: requirePrivateInternalPackages },
  { id: 'require-scoped-package-names', rule: requireScopedPackageNames },
  { id: 'no-duplicate-deps', rule: noDuplicateDeps },
  { id: 'no-custom-dependency-sources', rule: noCustomDependencySources },
  { id: 'no-sideeffects-true', rule: noSideeffectsTrue },
  { id: 'no-large-dependencies', rule: noLargeDependencies },
  { id: 'no-npmrc', rule: noNpmrc },
  { id: 'require-vscode-folder', rule: requireVscodeFolder },
  { id: 'no-extra-vscode-files', rule: noExtraVscodeFiles },
  { id: 'require-vscode-valid-json', rule: requireVscodeValidJson },
  { id: 'require-editorconfig', rule: requireEditorconfig },
  { id: 'require-gitignore', rule: requireGitignore },
  { id: 'require-dockerignore', rule: requireDockerignore },
  { id: 'require-gitattributes', rule: requireGitattributes },
  { id: 'require-biome-extends-root', rule: requireBiomeExtendsRoot },
  { id: 'require-oxlint-extends-root', rule: requireOxlintExtendsRoot },
  { id: 'no-linter-config-override', rule: noLinterConfigOverride },
  { id: 'no-cross-product-imports', rule: noCrossProductImports },
  { id: 'no-deep-relative-shared-imports', rule: noDeepRelativeSharedImports },
  { id: 'no-cross-layer-imports', rule: noCrossLayerImports },
  { id: 'no-empty-tests-directory', rule: noEmptyTestsDirectory },
  { id: 'no-empty-benchmarks-directory', rule: noEmptyBenchmarksDirectory },
  { id: 'validate-filename-casing', rule: validateFilenameCasing },
  { id: 'enforce-docs-naming', rule: enforceDocsNaming },
  { id: 'enforce-test-file-naming', rule: enforceTestFileNaming },
  { id: 'no-todo-in-docs', rule: noTodoInDocs },
  { id: 'no-broken-markdown-links', rule: noBrokenMarkdownLinks },
  { id: 'no-nextjs-artifacts', rule: noNextjsArtifacts },
  { id: 'no-gatsby-artifacts', rule: noGatsbyArtifacts },
  { id: 'no-hugo-configs', rule: noHugoConfigs },
  { id: 'no-unapproved-ssg', rule: noUnapprovedSsg },
  { id: 'validate-mjs-cjs-usage', rule: validateMjsCjsUsage },
  { id: 'no-exports-overlap', rule: noExportsOverlap },
  { id: 'validate-root-biome-json', rule: validateRootBiomeJson },
  { id: 'validate-root-oxlintrc-json', rule: validateRootOxlintrcJson },
  { id: 'enforce-benchmark-file-naming', rule: enforceBenchmarkFileNaming },
  { id: 'no-react-native-artifacts', rule: noReactNativeArtifacts },
  { id: 'no-docker-compose-v1', rule: noDockerComposeV1 },
  { id: 'detect-undeclared-dependencies', rule: detectUndeclaredDependencies },
  { id: 'warn-vscode-settings-conflicts', rule: warnVscodeSettingsConflicts },
  { id: 'validate-vscode-extensions', rule: validateVscodeExtensions },
  { id: 'no-sensitive-public-files', rule: noSensitivePublicFiles },
  { id: 'validate-root-package-config', rule: validateRootPackageConfig },
  { id: 'validate-script-descriptions', rule: validateScriptDescriptions },
  { id: 'validate-root-scripts-consistency', rule: validateRootScriptsConsistency },
  { id: 'no-deploy-scripts', rule: noDeployScripts },
  { id: 'no-lint-ignore-directives', rule: noLintIgnoreDirectives },
  { id: 'validate-package-tags', rule: validatePackageTags },
  { id: 'no-env-or-globals-in-shared-libs', rule: noEnvOrGlobalsInSharedLibs },
  { id: 'no-tsconfig-duplicate-extends', rule: noTsconfigDuplicateExtends },
  { id: 'validate-tsconfig-rootdir-layout', rule: validateTsconfigRootdirLayout },
  { id: 'no-tsconfig-outdir-rootdir-files', rule: noTsconfigOutdirRootdirFiles },
  { id: 'validate-tsconfig-include-patterns', rule: validateTsconfigIncludePatterns },
  { id: 'validate-wrangler-cron-syntax', rule: validateWranglerCronSyntax },
  { id: 'wrangler-name-matches-package', rule: wranglerNameMatchesPackage },
  { id: 'wrangler-main-entrypoint-exists', rule: wranglerMainEntrypointExists },
  { id: 'wrangler-binding-names-unique', rule: wranglerBindingNamesUnique },
  { id: 'no-forbidden-node-imports-in-workers', rule: noForbiddenNodeImportsInWorkers },
  { id: 'no-hardcoded-localhost-ports', rule: noHardcodedLocalhostPorts },
];

describe('workspace-rules-2 — bulk inputs() smoke-coverage', () => {
  for (const { id, rule } of BULK_INPUTS_RULES_2) {
    it(`workspace/${id}.inputs() runs without throwing`, async () => {
      if (typeof rule.inputs !== 'function') {
        return;
      }

      const ctx: WorkspaceContext = mockContext({
        rootDir: '/workspace',
        files: new Map([
          ['/workspace/foo.ts', 'export const a = 1;'],
          ['/workspace/tsconfig.json', '{"compilerOptions":{}}'],
          ['/workspace/package.json', '{"name":"x"}'],
          ['/workspace/.editorconfig', '[*]\nindent_style = space\n'],
          ['/workspace/.gitignore', 'node_modules\n'],
          ['/workspace/biome.json', '{}'],
          ['/workspace/.oxlintrc.json', '{}'],
          ['/workspace/wrangler.toml', 'name = "x"\n'],
        ]),
        packages: [
          {
            name: '@/a',
            path: '/workspace/packages/a/package.json',
            dir: '/workspace/packages/a',
            packageJson: { name: '@/a' },
          },
        ],
      });
      const inputs = await rule.inputs!(ctx);
      expect(Array.isArray(inputs)).toBe(true);
    });
  }
});
