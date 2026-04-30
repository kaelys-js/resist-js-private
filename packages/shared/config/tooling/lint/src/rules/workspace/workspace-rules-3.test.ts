/**
 * Tests for workspace lint rules — split 3/4.
 *
 * Auto-split from workspace-rules.test.ts to satisfy oxlint/max-dependencies.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest';
import type { WorkspaceContext, WorkspacePackage } from '../../framework/rule-context.ts';
import type { LintResult } from '../../framework/types.ts';
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
import noDetachedHead from './no-detached-head.ts';
import enforceBranchNaming from './enforce-branch-naming.ts';
import enforceConventionalCommits from './enforce-conventional-commits.ts';
import noMergeCommitsOnMain from './no-merge-commits-on-main.ts';
import noRebaseInProgress from './no-rebase-in-progress.ts';
import noStaleIndexLock from './no-stale-index-lock.ts';
import enforceGitConfig from './enforce-git-config.ts';
import noSparseCheckout from './no-sparse-checkout.ts';
import noUnsafeMainPush from './no-unsafe-main-push.ts';
import noProtectedBranchPush from './no-protected-branch-push.ts';
import noOversizedCommitBody from './no-oversized-commit-body.ts';
import noDirtyWorkingTree from './no-dirty-working-tree.ts';
import noBrokenGitRefs from './no-broken-git-refs.ts';
import noBrokenGitHead from './no-broken-git-head.ts';
import noUnsafeGlobalGitconfig from './no-unsafe-global-gitconfig.ts';
import noOrphanedGitRefs from './no-orphaned-git-refs.ts';
import noGitObjectReuse from './no-git-object-reuse.ts';
import noGitAlternateObjects from './no-git-alternate-objects.ts';
import noEmptyCommitDiff from './no-empty-commit-diff.ts';
import noInconsistentWorktrees from './no-inconsistent-worktrees.ts';
import noFsmonitorInCi from './no-fsmonitor-in-ci.ts';
import noOversizedRepo from './no-oversized-repo.ts';
import noBloatedCommits from './no-bloated-commits.ts';
import noCommitDateSkew from './no-commit-date-skew.ts';
import noGitStdinInCi from './no-git-stdin-in-ci.ts';
import noReflogInCi from './no-reflog-in-ci.ts';
import noSparseIndexDisabled from './no-sparse-index-disabled.ts';
import noUntaggedReleases from './no-untagged-releases.ts';
import noUncommittedPatches from './no-uncommitted-patches.ts';
import noCommitScopeMismatch from './no-commit-scope-mismatch.ts';
import noTrackedEnvFiles from './no-tracked-env-files.ts';
import noMetadataOnlyCommits from './no-metadata-only-commits.ts';
import validateStatelessUtils from './validate-stateless-utils.ts';
import validateDocsLocale from './validate-docs-locale.ts';
import validateDocsWorkspace from './validate-docs-workspace.ts';
import validateBiomeRules from './validate-biome-rules.ts';
import noBiomeDisable from './no-biome-disable.ts';
import noLegacyImageFormats from './no-legacy-image-formats.ts';
import noUnreferencedImages from './no-unreferenced-images.ts';
import noMissingImageRefs from './no-missing-image-refs.ts';
import svgRequiresTitleOrDesc from './svg-requires-title-or-desc.ts';
import svgNoInlineStyle from './svg-no-inline-style.ts';
import svgRequiresViewbox from './svg-requires-viewbox.ts';
import svgRequiresDimensions from './svg-requires-dimensions.ts';
import svgNoBlackFill from './svg-no-black-fill.ts';

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
      ['/workspace/assets/large.webp', 'x'.repeat(400_000)],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateImageOptimization.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('300KB');
  });

  it('warns on .svg files exceeding 100KB', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/assets/huge.svg', `<svg>${'x'.repeat(110_000)}</svg>`],
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
      ['/workspace/assets/data.json', 'x'.repeat(400_000)],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateImageOptimization.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-detached-head', () => {
  it('has correct rule metadata', () => {
    expect(noDetachedHead.id).toBe('workspace/no-detached-head');
    expect(noDetachedHead.scope).toBe('workspace');
    expect(noDetachedHead.fixable).toBe(false);
    expect(typeof noDetachedHead.check).toBe('function');
  });

  it('warns when HEAD is detached', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('fatal: ref HEAD is not a symbolic ref');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noDetachedHead.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-detached-head');
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('detached');
  });

  it('passes when on a branch', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('main\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noDetachedHead.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/enforce-branch-naming', () => {
  it('has correct rule metadata', () => {
    expect(enforceBranchNaming.id).toBe('workspace/enforce-branch-naming');
    expect(enforceBranchNaming.scope).toBe('workspace');
    expect(enforceBranchNaming.fixable).toBe(false);
    expect(typeof enforceBranchNaming.check).toBe('function');
  });

  it('passes for valid branch name', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('feature/add-auth\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await enforceBranchNaming.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors on invalid branch name', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('my-random-branch\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await enforceBranchNaming.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/enforce-branch-naming');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('my-random-branch');
  });

  it('exempts main branch', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('main\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await enforceBranchNaming.check(ctx);
    expect(results.length).toBe(0);
  });

  it('exempts master branch', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('master\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await enforceBranchNaming.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips detached HEAD', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('HEAD\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await enforceBranchNaming.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes for all valid prefixes', async () => {
    const { execSync } = await import('node:child_process');
    const prefixes: string[] = ['feature', 'fix', 'hotfix', 'chore', 'release', 'test', 'docs'];

    for (const prefix of prefixes) {
      vi.mocked(execSync).mockReturnValue(`${prefix}/something\n`);
      const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
      const results: LintResult[] = await enforceBranchNaming.check(ctx);
      expect(results.length).toBe(0);
    }
  });
});

describe('workspace/enforce-conventional-commits', () => {
  it('has correct rule metadata', () => {
    expect(enforceConventionalCommits.id).toBe('workspace/enforce-conventional-commits');
    expect(enforceConventionalCommits.scope).toBe('workspace');
    expect(enforceConventionalCommits.fixable).toBe(false);
    expect(typeof enforceConventionalCommits.check).toBe('function');
  });

  it('passes for valid conventional commits', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue(
      'abc1234 feat: add new feature\ndef5678 fix(auth): resolve bug\n',
    );
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await enforceConventionalCommits.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors on invalid commit message', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('abc1234 this is not conventional\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await enforceConventionalCommits.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/enforce-conventional-commits');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('abc1234');
  });

  it('handles mixed valid and invalid commits', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue(
      'abc1234 feat: valid\ndef5678 invalid message\nghi9012 fix: also valid\njkl3456 bad again\n',
    );
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await enforceConventionalCommits.check(ctx);
    expect(results.length).toBe(2);
    expect(results[0]!.message).toContain('def5678');
    expect(results[1]!.message).toContain('jkl3456');
  });

  it('returns empty on git failure', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not a git repository');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await enforceConventionalCommits.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-merge-commits-on-main', () => {
  it('has correct rule metadata', () => {
    expect(noMergeCommitsOnMain.id).toBe('workspace/no-merge-commits-on-main');
    expect(noMergeCommitsOnMain.scope).toBe('workspace');
    expect(noMergeCommitsOnMain.fixable).toBe(false);
    expect(typeof noMergeCommitsOnMain.check).toBe('function');
  });

  it('skips when not on main', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('feature/foo\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noMergeCommitsOnMain.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors on merge commits when on main', async () => {
    const { execSync } = await import('node:child_process');
    let callCount: number = 0;
    vi.mocked(execSync).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return 'main\n';
      }
      return 'abc1234 Merge branch feature/x into main\n';
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noMergeCommitsOnMain.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-merge-commits-on-main');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Merge');
  });

  it('passes when on main with no merge commits', async () => {
    const { execSync } = await import('node:child_process');
    let callCount: number = 0;
    vi.mocked(execSync).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return 'main\n';
      }
      return '';
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noMergeCommitsOnMain.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty on git failure', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('fatal');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noMergeCommitsOnMain.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-rebase-in-progress', () => {
  it('has correct rule metadata', () => {
    expect(noRebaseInProgress.id).toBe('workspace/no-rebase-in-progress');
    expect(noRebaseInProgress.scope).toBe('workspace');
    expect(noRebaseInProgress.fixable).toBe(false);
    expect(typeof noRebaseInProgress.check).toBe('function');
  });

  it('errors when rebase-merge exists', async () => {
    const { existsSync } = await import('node:fs');
    vi.mocked(existsSync).mockImplementation((path: unknown) => {
      return String(path).includes('rebase-merge');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noRebaseInProgress.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-rebase-in-progress');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('rebase-merge');
  });

  it('errors when rebase-apply exists', async () => {
    const { existsSync } = await import('node:fs');
    vi.mocked(existsSync).mockImplementation((path: unknown) => {
      return String(path).includes('rebase-apply');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noRebaseInProgress.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('rebase-apply');
  });

  it('errors for both rebase-merge and rebase-apply', async () => {
    const { existsSync } = await import('node:fs');
    vi.mocked(existsSync).mockReturnValue(true);
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noRebaseInProgress.check(ctx);
    expect(results.length).toBe(2);
  });

  it('passes when neither exists', async () => {
    const { existsSync } = await import('node:fs');
    vi.mocked(existsSync).mockReturnValue(false);
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noRebaseInProgress.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-stale-index-lock', () => {
  it('has correct rule metadata', () => {
    expect(noStaleIndexLock.id).toBe('workspace/no-stale-index-lock');
    expect(noStaleIndexLock.scope).toBe('workspace');
    expect(noStaleIndexLock.fixable).toBe(false);
    expect(typeof noStaleIndexLock.check).toBe('function');
  });

  it('errors when index.lock exists', async () => {
    const { existsSync } = await import('node:fs');
    vi.mocked(existsSync).mockReturnValue(true);
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noStaleIndexLock.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-stale-index-lock');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('index.lock');
  });

  it('passes when index.lock does not exist', async () => {
    const { existsSync } = await import('node:fs');
    vi.mocked(existsSync).mockReturnValue(false);
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noStaleIndexLock.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/enforce-git-config', () => {
  it('has correct rule metadata', () => {
    expect(enforceGitConfig.id).toBe('workspace/enforce-git-config');
    expect(enforceGitConfig.scope).toBe('workspace');
    expect(enforceGitConfig.fixable).toBe(false);
    expect(typeof enforceGitConfig.check).toBe('function');
  });

  it('passes when all config values are correct', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: unknown) => {
      const command: string = String(cmd);

      if (command.includes('core.autocrlf')) {
        return 'input\n';
      }
      if (command.includes('pull.rebase')) {
        return 'false\n';
      }
      if (command.includes('push.default')) {
        return 'simple\n';
      }
      return '';
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await enforceGitConfig.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors on wrong config value', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: unknown) => {
      const command: string = String(cmd);

      if (command.includes('core.autocrlf')) {
        return 'true\n';
      }
      if (command.includes('pull.rebase')) {
        return 'false\n';
      }
      if (command.includes('push.default')) {
        return 'simple\n';
      }
      return '';
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await enforceGitConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/enforce-git-config');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('core.autocrlf');
    expect(results[0]!.message).toContain('input');
  });

  it('errors on unset config value', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: unknown) => {
      const command: string = String(cmd);

      if (command.includes('core.autocrlf')) {
        throw new Error('unset');
      }
      if (command.includes('pull.rebase')) {
        return 'false\n';
      }
      if (command.includes('push.default')) {
        return 'simple\n';
      }
      return '';
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await enforceGitConfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('<unset>');
  });

  it('reports multiple mismatches', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('unset');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await enforceGitConfig.check(ctx);
    expect(results.length).toBe(3);
  });
});

describe('workspace/no-sparse-checkout', () => {
  it('has correct rule metadata', () => {
    expect(noSparseCheckout.id).toBe('workspace/no-sparse-checkout');
    expect(noSparseCheckout.scope).toBe('workspace');
    expect(noSparseCheckout.fixable).toBe(false);
    expect(typeof noSparseCheckout.check).toBe('function');
  });

  it('errors when sparse checkout is enabled', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('true\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noSparseCheckout.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-sparse-checkout');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Sparse checkout');
  });

  it('passes when sparse checkout is disabled', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('false\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noSparseCheckout.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when sparse checkout is unset', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('key not found');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noSparseCheckout.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-unsafe-main-push', () => {
  it('has correct rule metadata', () => {
    expect(noUnsafeMainPush.id).toBe('workspace/no-unsafe-main-push');
    expect(noUnsafeMainPush.scope).toBe('workspace');
    expect(noUnsafeMainPush.fixable).toBe(false);
    expect(typeof noUnsafeMainPush.check).toBe('function');
  });

  it('errors on unsafe push.default on main', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: unknown) => {
      const command: string = String(cmd);

      if (command.includes('symbolic-ref')) {
        return 'main\n';
      }
      if (command.includes('push.default')) {
        return 'force\n';
      }
      if (command.includes('git log')) {
        return 'feat: normal commit\n';
      }
      return '';
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noUnsafeMainPush.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-unsafe-main-push');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('force');
  });

  it('errors on matching push.default on master', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: unknown) => {
      const command: string = String(cmd);

      if (command.includes('symbolic-ref')) {
        return 'master\n';
      }
      if (command.includes('push.default')) {
        return 'matching\n';
      }
      if (command.includes('git log')) {
        return 'feat: normal commit\n';
      }
      return '';
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noUnsafeMainPush.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('matching');
  });

  it('errors on fixup commit on main', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: unknown) => {
      const command: string = String(cmd);

      if (command.includes('symbolic-ref')) {
        return 'main\n';
      }
      if (command.includes('push.default')) {
        return 'simple\n';
      }
      if (command.includes('git log')) {
        return 'fixup! something\n';
      }
      return '';
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noUnsafeMainPush.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('fixup');
  });

  it('errors on squash commit on main', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: unknown) => {
      const command: string = String(cmd);

      if (command.includes('symbolic-ref')) {
        return 'main\n';
      }
      if (command.includes('push.default')) {
        return 'simple\n';
      }
      if (command.includes('git log')) {
        return 'squash! something\n';
      }
      return '';
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noUnsafeMainPush.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('squash');
  });

  it('passes on feature branch', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: unknown) => {
      const command: string = String(cmd);

      if (command.includes('symbolic-ref')) {
        return 'feature/my-feature\n';
      }
      return '';
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noUnsafeMainPush.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when git fails', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not a git repo');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noUnsafeMainPush.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-protected-branch-push', () => {
  it('has correct rule metadata', () => {
    expect(noProtectedBranchPush.id).toBe('workspace/no-protected-branch-push');
    expect(noProtectedBranchPush.scope).toBe('workspace');
    expect(noProtectedBranchPush.fixable).toBe(false);
    expect(typeof noProtectedBranchPush.check).toBe('function');
  });

  it('errors on main branch', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('main\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noProtectedBranchPush.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-protected-branch-push');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('main');
  });

  it('errors on master branch', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('master\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noProtectedBranchPush.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('master');
  });

  it('errors on production branch', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('production\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noProtectedBranchPush.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('production');
  });

  it('errors on release branch', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('release\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noProtectedBranchPush.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('release');
  });

  it('errors on prod branch', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('prod\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noProtectedBranchPush.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('prod');
  });

  it('passes on feature branch', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('feature/my-work\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noProtectedBranchPush.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when git fails', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not a git repo');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noProtectedBranchPush.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-oversized-commit-body', () => {
  it('has correct rule metadata', () => {
    expect(noOversizedCommitBody.id).toBe('workspace/no-oversized-commit-body');
    expect(noOversizedCommitBody.scope).toBe('workspace');
    expect(noOversizedCommitBody.fixable).toBe(false);
    expect(typeof noOversizedCommitBody.check).toBe('function');
  });

  it('warns on commit body exceeding 20 lines', async () => {
    const { execSync } = await import('node:child_process');
    const longBody: string = Array.from(
      { length: 25 },
      (_: unknown, i: number) => `line ${String(i)}`,
    ).join('\n');
    vi.mocked(execSync).mockReturnValue(`abc1234\n${longBody}\n---COMMIT-END---`);
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noOversizedCommitBody.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-oversized-commit-body');
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('abc1234');
  });

  it('warns on commit body exceeding 1000 characters', async () => {
    const { execSync } = await import('node:child_process');
    const longLine: string = 'x'.repeat(1100);
    vi.mocked(execSync).mockReturnValue(`def5678\n${longLine}\n---COMMIT-END---`);
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noOversizedCommitBody.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('def5678');
  });

  it('passes on normal commit body', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('abc1234\nShort body\n---COMMIT-END---');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noOversizedCommitBody.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when git fails', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not a git repo');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noOversizedCommitBody.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-dirty-working-tree', () => {
  it('has correct rule metadata', () => {
    expect(noDirtyWorkingTree.id).toBe('workspace/no-dirty-working-tree');
    expect(noDirtyWorkingTree.scope).toBe('workspace');
    expect(noDirtyWorkingTree.fixable).toBe(false);
    expect(typeof noDirtyWorkingTree.check).toBe('function');
  });

  it('errors on dirty working tree', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: unknown) => {
      const command: string = String(cmd);

      if (command.includes('git diff --quiet') && !command.includes('--cached')) {
        throw new Error('exit code 1');
      }
      return '';
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noDirtyWorkingTree.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-dirty-working-tree');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Uncommitted');
  });

  it('errors on dirty index', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: unknown) => {
      const command: string = String(cmd);

      if (command.includes('--cached')) {
        throw new Error('exit code 1');
      }
      return '';
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noDirtyWorkingTree.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Uncommitted');
  });

  it('passes on clean tree', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noDirtyWorkingTree.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports dirty when both diff commands fail', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('exit code 1');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noDirtyWorkingTree.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Uncommitted');
  });
});

describe('workspace/no-broken-git-refs', () => {
  it('has correct rule metadata', () => {
    expect(noBrokenGitRefs.id).toBe('workspace/no-broken-git-refs');
    expect(noBrokenGitRefs.scope).toBe('workspace');
    expect(noBrokenGitRefs.fixable).toBe(false);
    expect(typeof noBrokenGitRefs.check).toBe('function');
  });

  it('errors when HEAD does not resolve', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: unknown) => {
      const command: string = String(cmd);

      if (command.includes('rev-parse --verify HEAD')) {
        throw new Error('fatal: not a valid ref');
      }
      if (command.includes('fsck')) {
        return '';
      }
      return '';
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noBrokenGitRefs.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-broken-git-refs');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('HEAD');
  });

  it('errors on fsck issues', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: unknown) => {
      const command: string = String(cmd);

      if (command.includes('rev-parse')) {
        return 'abc123\n';
      }
      if (command.includes('fsck')) {
        return 'broken link from tree abc123\nmissing blob def456\n';
      }
      return '';
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noBrokenGitRefs.check(ctx);
    expect(results.length).toBe(2);
    expect(results[0]!.message).toContain('broken');
    expect(results[1]!.message).toContain('missing');
  });

  it('passes when HEAD resolves and fsck clean', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: unknown) => {
      const command: string = String(cmd);

      if (command.includes('rev-parse')) {
        return 'abc123\n';
      }
      if (command.includes('fsck')) {
        return 'Checking object directories: 100% done.\n';
      }
      return '';
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noBrokenGitRefs.check(ctx);
    expect(results.length).toBe(0);
  });

  it('detects dangling objects from fsck', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: unknown) => {
      const command: string = String(cmd);

      if (command.includes('rev-parse')) {
        return 'abc123\n';
      }
      if (command.includes('fsck')) {
        return 'dangling commit abc456\n';
      }
      return '';
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noBrokenGitRefs.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('dangling');
  });
});

describe('workspace/no-broken-git-head', () => {
  it('has correct rule metadata', () => {
    expect(noBrokenGitHead.id).toBe('workspace/no-broken-git-head');
    expect(noBrokenGitHead.scope).toBe('workspace');
    expect(noBrokenGitHead.fixable).toBe(false);
    expect(typeof noBrokenGitHead.check).toBe('function');
  });

  it('errors when .git/HEAD is missing', async () => {
    const { existsSync } = await import('node:fs');
    vi.mocked(existsSync).mockReturnValue(false);
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noBrokenGitHead.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-broken-git-head');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Missing .git/HEAD');
  });

  it('passes when HEAD points to valid ref', async () => {
    const { existsSync, readFileSync } = await import('node:fs');
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue('ref: refs/heads/main\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noBrokenGitHead.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when HEAD ref file is missing', async () => {
    const { existsSync, readFileSync } = await import('node:fs');
    vi.mocked(existsSync).mockImplementation((p: unknown) => {
      const path: string = String(p);

      if (path.endsWith('HEAD')) {
        return true;
      }
      return false;
    });
    vi.mocked(readFileSync).mockReturnValue('ref: refs/heads/missing-branch\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noBrokenGitHead.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('non-existent ref');
  });

  it('passes when detached HEAD points to valid commit', async () => {
    const { existsSync, readFileSync } = await import('node:fs');
    const { execSync } = await import('node:child_process');
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue('abc123def456\n');
    vi.mocked(execSync).mockReturnValue('');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noBrokenGitHead.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when detached HEAD points to invalid commit', async () => {
    const { existsSync, readFileSync } = await import('node:fs');
    const { execSync } = await import('node:child_process');
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue('deadbeef123\n');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('bad object');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noBrokenGitHead.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('invalid commit');
  });
});

describe('workspace/no-unsafe-global-gitconfig', () => {
  it('has correct rule metadata', () => {
    expect(noUnsafeGlobalGitconfig.id).toBe('workspace/no-unsafe-global-gitconfig');
    expect(noUnsafeGlobalGitconfig.scope).toBe('workspace');
    expect(noUnsafeGlobalGitconfig.fixable).toBe(false);
    expect(typeof noUnsafeGlobalGitconfig.check).toBe('function');
  });

  it('warns on push.default=matching', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: unknown) => {
      const command: string = String(cmd);

      if (command.includes('push.default')) {
        return 'matching\n';
      }
      throw new Error('unset');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noUnsafeGlobalGitconfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-unsafe-global-gitconfig');
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('push.default');
  });

  it('warns on core.autocrlf=true', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: unknown) => {
      const command: string = String(cmd);

      if (command.includes('core.autocrlf')) {
        return 'true\n';
      }
      throw new Error('unset');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noUnsafeGlobalGitconfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('core.autocrlf');
  });

  it('warns on core.ignorecase=true', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: unknown) => {
      const command: string = String(cmd);

      if (command.includes('core.ignorecase')) {
        return 'true\n';
      }
      throw new Error('unset');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noUnsafeGlobalGitconfig.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('core.ignorecase');
  });

  it('reports multiple unsafe settings', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: unknown) => {
      const command: string = String(cmd);

      if (command.includes('push.default')) {
        return 'matching\n';
      }
      if (command.includes('core.autocrlf')) {
        return 'true\n';
      }
      if (command.includes('core.ignorecase')) {
        return 'true\n';
      }
      return '';
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noUnsafeGlobalGitconfig.check(ctx);
    expect(results.length).toBe(3);
  });

  it('passes when all configs are safe', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('unset');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noUnsafeGlobalGitconfig.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-orphaned-git-refs', () => {
  it('has correct rule metadata', () => {
    expect(noOrphanedGitRefs.id).toBe('workspace/no-orphaned-git-refs');
    expect(noOrphanedGitRefs.scope).toBe('workspace');
    expect(noOrphanedGitRefs.fixable).toBe(false);
    expect(typeof noOrphanedGitRefs.check).toBe('function');
  });

  it('errors on broken ref', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: unknown) => {
      const command: string = String(cmd);

      if (command.includes('for-each-ref')) {
        return 'refs/heads/broken abc123\n';
      }
      if (command.includes('cat-file')) {
        throw new Error('bad object');
      }
      return '';
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noOrphanedGitRefs.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-orphaned-git-refs');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Broken git ref');
  });

  it('passes when all refs are valid', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: unknown) => {
      const command: string = String(cmd);

      if (command.includes('for-each-ref')) {
        return 'refs/heads/main abc123\n';
      }
      return '';
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noOrphanedGitRefs.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when git fails', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not a git repo');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noOrphanedGitRefs.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-git-object-reuse', () => {
  it('has correct rule metadata', () => {
    expect(noGitObjectReuse.id).toBe('workspace/no-git-object-reuse');
    expect(noGitObjectReuse.scope).toBe('workspace');
    expect(noGitObjectReuse.fixable).toBe(false);
    expect(typeof noGitObjectReuse.check).toBe('function');
  });

  it('errors when alternates file exists', async () => {
    const { existsSync } = await import('node:fs');
    vi.mocked(existsSync).mockReturnValue(true);
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noGitObjectReuse.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-git-object-reuse');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('alternates');
  });

  it('passes when alternates file does not exist', async () => {
    const { existsSync } = await import('node:fs');
    vi.mocked(existsSync).mockReturnValue(false);
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noGitObjectReuse.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-git-alternate-objects', () => {
  it('has correct rule metadata', () => {
    expect(noGitAlternateObjects.id).toBe('workspace/no-git-alternate-objects');
    expect(noGitAlternateObjects.scope).toBe('workspace');
    expect(noGitAlternateObjects.fixable).toBe(false);
    expect(typeof noGitAlternateObjects.check).toBe('function');
  });

  it('errors when env var is set', async () => {
    const original: string | undefined = process.env['GIT_ALTERNATE_OBJECT_DIRECTORIES'];
    process.env['GIT_ALTERNATE_OBJECT_DIRECTORIES'] = '/some/path';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noGitAlternateObjects.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-git-alternate-objects');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('GIT_ALTERNATE_OBJECT_DIRECTORIES');
    if (original === undefined) {
      delete process.env['GIT_ALTERNATE_OBJECT_DIRECTORIES'];
    } else {
      process.env['GIT_ALTERNATE_OBJECT_DIRECTORIES'] = original;
    }
  });

  it('passes when env var is not set', async () => {
    const original: string | undefined = process.env['GIT_ALTERNATE_OBJECT_DIRECTORIES'];
    delete process.env['GIT_ALTERNATE_OBJECT_DIRECTORIES'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noGitAlternateObjects.check(ctx);
    expect(results.length).toBe(0);
    if (original !== undefined) {
      process.env['GIT_ALTERNATE_OBJECT_DIRECTORIES'] = original;
    }
  });
});

describe('workspace/no-empty-commit-diff', () => {
  it('has correct rule metadata', () => {
    expect(noEmptyCommitDiff.id).toBe('workspace/no-empty-commit-diff');
    expect(noEmptyCommitDiff.scope).toBe('workspace');
    expect(noEmptyCommitDiff.fixable).toBe(false);
    expect(typeof noEmptyCommitDiff.check).toBe('function');
  });

  it('errors on empty diff commit', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noEmptyCommitDiff.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-empty-commit-diff');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('no file changes');
  });

  it('passes when commit has file changes', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('src/main.ts\nREADME.md\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noEmptyCommitDiff.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when git fails', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not a git repo');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noEmptyCommitDiff.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-inconsistent-worktrees', () => {
  it('has correct rule metadata', () => {
    expect(noInconsistentWorktrees.id).toBe('workspace/no-inconsistent-worktrees');
    expect(noInconsistentWorktrees.scope).toBe('workspace');
    expect(noInconsistentWorktrees.fixable).toBe(false);
    expect(typeof noInconsistentWorktrees.check).toBe('function');
  });

  it('errors when no valid worktree found', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('bare\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noInconsistentWorktrees.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-inconsistent-worktrees');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('No valid Git worktree');
  });

  it('passes when worktree is valid', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue(
      'worktree /workspace\nHEAD abc123\nbranch refs/heads/main\n',
    );
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noInconsistentWorktrees.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when git fails', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not a git repo');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noInconsistentWorktrees.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-fsmonitor-in-ci', () => {
  it('has correct rule metadata', () => {
    expect(noFsmonitorInCi.id).toBe('workspace/no-fsmonitor-in-ci');
    expect(noFsmonitorInCi.scope).toBe('workspace');
    expect(noFsmonitorInCi.fixable).toBe(false);
    expect(typeof noFsmonitorInCi.check).toBe('function');
  });

  it('warns when fsmonitor is set', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('true\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noFsmonitorInCi.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-fsmonitor-in-ci');
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('fsmonitor');
  });

  it('passes when fsmonitor is unset', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('key not found');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noFsmonitorInCi.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when fsmonitor returns empty', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noFsmonitorInCi.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-oversized-repo', () => {
  it('has correct rule metadata', () => {
    expect(noOversizedRepo.id).toBe('workspace/no-oversized-repo');
    expect(noOversizedRepo.scope).toBe('workspace');
    expect(noOversizedRepo.fixable).toBe(false);
    expect(typeof noOversizedRepo.check).toBe('function');
  });

  it('warns when .git exceeds 500MB', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('600000\t.git/objects\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noOversizedRepo.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-oversized-repo');
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('600000');
  });

  it('passes when .git is small', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('50000\t.git/objects\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noOversizedRepo.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when du fails', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('du failed');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noOversizedRepo.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-bloated-commits', () => {
  it('has correct rule metadata', () => {
    expect(noBloatedCommits.id).toBe('workspace/no-bloated-commits');
    expect(noBloatedCommits.scope).toBe('workspace');
    expect(noBloatedCommits.fixable).toBe(false);
    expect(typeof noBloatedCommits.check).toBe('function');
  });

  it('warns when commit touches >100 files', async () => {
    const { execSync } = await import('node:child_process');
    const files: string = Array.from(
      { length: 120 },
      (_: unknown, i: number) => `file${String(i)}.ts`,
    ).join('\n');
    vi.mocked(execSync).mockReturnValue(`${files}\n`);
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noBloatedCommits.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-bloated-commits');
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('120');
  });

  it('passes when commit touches ≤100 files', async () => {
    const { execSync } = await import('node:child_process');
    const files: string = Array.from(
      { length: 50 },
      (_: unknown, i: number) => `file${String(i)}.ts`,
    ).join('\n');
    vi.mocked(execSync).mockReturnValue(`${files}\n`);
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noBloatedCommits.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when git fails', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not a git repo');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noBloatedCommits.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-commit-date-skew', () => {
  it('has correct rule metadata', () => {
    expect(noCommitDateSkew.id).toBe('workspace/no-commit-date-skew');
    expect(noCommitDateSkew.scope).toBe('workspace');
    expect(noCommitDateSkew.fixable).toBe(false);
    expect(typeof noCommitDateSkew.check).toBe('function');
  });

  it('warns on future commit date', async () => {
    const { execSync } = await import('node:child_process');
    const futureTs: number = Math.floor(Date.now() / 1000) + 7200;
    vi.mocked(execSync).mockReturnValue(`${String(futureTs)}\n`);
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noCommitDateSkew.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-commit-date-skew');
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('future');
  });

  it('warns on very old commit date', async () => {
    const { execSync } = await import('node:child_process');
    const oldTs: number = Math.floor(Date.now() / 1000) - 63_072_000;
    vi.mocked(execSync).mockReturnValue(`${String(oldTs)}\n`);
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noCommitDateSkew.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('year old');
  });

  it('passes on recent commit', async () => {
    const { execSync } = await import('node:child_process');
    const recentTs: number = Math.floor(Date.now() / 1000) - 3600;
    vi.mocked(execSync).mockReturnValue(`${String(recentTs)}\n`);
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noCommitDateSkew.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when git fails', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not a git repo');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noCommitDateSkew.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-git-stdin-in-ci', () => {
  it('has correct rule metadata', () => {
    expect(noGitStdinInCi.id).toBe('workspace/no-git-stdin-in-ci');
    expect(noGitStdinInCi.scope).toBe('workspace');
    expect(noGitStdinInCi.fixable).toBe(false);
    expect(typeof noGitStdinInCi.check).toBe('function');
  });

  it('warns when core.editor is vim', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes('core.editor')) {
        return 'vim\n';
      }
      throw new Error('not set');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noGitStdinInCi.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-git-stdin-in-ci');
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('core.editor');
    expect(results[0]!.message).toContain('vim');
  });

  it('warns when sequence.editor is nano', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes('sequence.editor')) {
        return 'nano\n';
      }
      throw new Error('not set');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noGitStdinInCi.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('sequence.editor');
    expect(results[0]!.message).toContain('nano');
  });

  it('warns on both editors set to interactive', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes('core.editor')) {
        return 'vim\n';
      }
      if (typeof cmd === 'string' && cmd.includes('sequence.editor')) {
        return 'nano\n';
      }
      throw new Error('not set');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noGitStdinInCi.check(ctx);
    expect(results.length).toBe(2);
  });

  it('passes when editors are non-interactive', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('code --wait\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noGitStdinInCi.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when no editors are set', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('key not set');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noGitStdinInCi.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-reflog-in-ci', () => {
  it('has correct rule metadata', () => {
    expect(noReflogInCi.id).toBe('workspace/no-reflog-in-ci');
    expect(noReflogInCi.scope).toBe('workspace');
    expect(noReflogInCi.fixable).toBe(false);
    expect(typeof noReflogInCi.check).toBe('function');
  });

  it('errors when core.logallrefupdates is true', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('true\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noReflogInCi.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-reflog-in-ci');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('reflog');
  });

  it('passes when core.logallrefupdates is false', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('false\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noReflogInCi.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when config key is not set', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('key not set');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noReflogInCi.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-sparse-index-disabled', () => {
  it('has correct rule metadata', () => {
    expect(noSparseIndexDisabled.id).toBe('workspace/no-sparse-index-disabled');
    expect(noSparseIndexDisabled.scope).toBe('workspace');
    expect(noSparseIndexDisabled.fixable).toBe(false);
    expect(typeof noSparseIndexDisabled.check).toBe('function');
  });

  it('warns when index.sparse is not set', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('key not set');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noSparseIndexDisabled.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-sparse-index-disabled');
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('Sparse index');
  });

  it('warns when index.sparse is false', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('false\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noSparseIndexDisabled.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when index.sparse is true', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('true\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noSparseIndexDisabled.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-untagged-releases', () => {
  it('has correct rule metadata', () => {
    expect(noUntaggedReleases.id).toBe('workspace/no-untagged-releases');
    expect(noUntaggedReleases.scope).toBe('workspace');
    expect(noUntaggedReleases.fixable).toBe(false);
    expect(typeof noUntaggedReleases.check).toBe('function');
  });

  it('warns when release commit has no tag', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes('--pretty=%s')) {
        return 'release(v1.0.0): bump version\n';
      }
      if (typeof cmd === 'string' && cmd.includes('tag --points-at')) {
        return '\n';
      }
      return '';
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noUntaggedReleases.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-untagged-releases');
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('no git tag');
  });

  it('passes when release commit has a tag', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes('--pretty=%s')) {
        return 'release(v1.0.0): bump version\n';
      }
      if (typeof cmd === 'string' && cmd.includes('tag --points-at')) {
        return 'v1.0.0\n';
      }
      return '';
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noUntaggedReleases.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes for non-release commit', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('fix(auth): repair login\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noUntaggedReleases.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes for version() prefix commit with tag', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes('--pretty=%s')) {
        return 'version(2.0.0): update\n';
      }
      if (typeof cmd === 'string' && cmd.includes('tag --points-at')) {
        return 'v2.0.0\n';
      }
      return '';
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noUntaggedReleases.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when git log fails', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not a git repo');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noUntaggedReleases.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when git tag fails', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes('--pretty=%s')) {
        return 'release(v1.0.0): bump\n';
      }
      throw new Error('git tag failed');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noUntaggedReleases.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-uncommitted-patches', () => {
  it('has correct rule metadata', () => {
    expect(noUncommittedPatches.id).toBe('workspace/no-uncommitted-patches');
    expect(noUncommittedPatches.scope).toBe('workspace');
    expect(noUncommittedPatches.fixable).toBe(false);
    expect(typeof noUncommittedPatches.check).toBe('function');
  });

  it('warns on .patch files', async () => {
    const files: Map<string, string> = new Map([
      ['src/fix.patch', 'diff content'],
      ['src/index.ts', 'code'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUncommittedPatches.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-uncommitted-patches');
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('fix.patch');
  });

  it('warns on .diff files', async () => {
    const files: Map<string, string> = new Map([['changes.diff', 'diff content']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUncommittedPatches.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('changes.diff');
  });

  it('warns on multiple patch/diff files', async () => {
    const files: Map<string, string> = new Map([
      ['a.patch', ''],
      ['b.diff', ''],
      ['c.patch', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUncommittedPatches.check(ctx);
    expect(results.length).toBe(3);
  });

  it('passes when no patch or diff files exist', async () => {
    const files: Map<string, string> = new Map([
      ['src/index.ts', 'code'],
      ['README.md', 'docs'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUncommittedPatches.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-commit-scope-mismatch', () => {
  it('has correct rule metadata', () => {
    expect(noCommitScopeMismatch.id).toBe('workspace/no-commit-scope-mismatch');
    expect(noCommitScopeMismatch.scope).toBe('workspace');
    expect(noCommitScopeMismatch.fixable).toBe(false);
    expect(typeof noCommitScopeMismatch.check).toBe('function');
  });

  it('warns when scope does not match branch', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes('rev-parse')) {
        return 'feature/auth\n';
      }
      if (typeof cmd === 'string' && cmd.includes('--pretty=%s')) {
        return 'fix(payments): update logic\n';
      }
      return '';
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noCommitScopeMismatch.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-commit-scope-mismatch');
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('payments');
    expect(results[0]!.message).toContain('feature/auth');
  });

  it('passes when scope matches branch', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes('rev-parse')) {
        return 'feature/auth\n';
      }
      if (typeof cmd === 'string' && cmd.includes('--pretty=%s')) {
        return 'fix(auth): repair login\n';
      }
      return '';
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noCommitScopeMismatch.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips main branch', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('main\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noCommitScopeMismatch.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips master branch', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('master\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noCommitScopeMismatch.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips HEAD (detached)', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('HEAD\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noCommitScopeMismatch.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when commit has no scope', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes('rev-parse')) {
        return 'feature/auth\n';
      }
      if (typeof cmd === 'string' && cmd.includes('--pretty=%s')) {
        return 'fix: general repair\n';
      }
      return '';
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noCommitScopeMismatch.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when git rev-parse fails', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not a git repo');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noCommitScopeMismatch.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when git log fails', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes('rev-parse')) {
        return 'feature/auth\n';
      }
      throw new Error('git log failed');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noCommitScopeMismatch.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-tracked-env-files', () => {
  it('has correct rule metadata', () => {
    expect(noTrackedEnvFiles.id).toBe('workspace/no-tracked-env-files');
    expect(noTrackedEnvFiles.scope).toBe('workspace');
    expect(noTrackedEnvFiles.fixable).toBe(false);
    expect(typeof noTrackedEnvFiles.check).toBe('function');
  });

  it('errors on tracked .env file', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('.env\npackage.json\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noTrackedEnvFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-tracked-env-files');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('.env');
  });

  it('errors on tracked .env.local file', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('.env.local\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noTrackedEnvFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.env.local');
  });

  it('errors on tracked .env.production file', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('.env.production\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noTrackedEnvFiles.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('.env.production');
  });

  it('allows .env.example', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('.env.example\npackage.json\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noTrackedEnvFiles.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors on multiple .env files', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('.env\n.env.local\n.env.production\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noTrackedEnvFiles.check(ctx);
    expect(results.length).toBe(3);
  });

  it('passes when no env files are tracked', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('package.json\nsrc/index.ts\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noTrackedEnvFiles.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when git ls-files fails', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not a git repo');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noTrackedEnvFiles.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-metadata-only-commits', () => {
  it('has correct rule metadata', () => {
    expect(noMetadataOnlyCommits.id).toBe('workspace/no-metadata-only-commits');
    expect(noMetadataOnlyCommits.scope).toBe('workspace');
    expect(noMetadataOnlyCommits.fixable).toBe(false);
    expect(typeof noMetadataOnlyCommits.check).toBe('function');
  });

  it('errors when last commit has no file changes', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noMetadataOnlyCommits.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/no-metadata-only-commits');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('no file changes');
  });

  it('passes when commit has file changes', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('src/index.ts\npackage.json\n');
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noMetadataOnlyCommits.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when git log fails', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not a git repo');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await noMetadataOnlyCommits.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/validate-stateless-utils', () => {
  it('has correct rule metadata', () => {
    expect(validateStatelessUtils.id).toBe('workspace/validate-stateless-utils');
    expect(validateStatelessUtils.scope).toBe('workspace');
    expect(typeof validateStatelessUtils.check).toBe('function');
  });

  it('returns empty for no files', async () => {
    const files: Map<string, string> = new Map();
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateStatelessUtils.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-.ts files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/utils.js', '/** @stateless */\nconsole.log("hi");\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateStatelessUtils.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips .ts files not in packages/shared', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/app/utils.ts', '/** @stateless */\nconsole.log("hi");\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateStatelessUtils.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips packages/shared .ts files without @stateless annotation', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/utils.ts', 'export const x = process.env.FOO;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateStatelessUtils.check(ctx);
    expect(results.length).toBe(0);
  });

  it('continues on readFile failure', async () => {
    const files: Map<string, string> = new Map([['/workspace/packages/shared/utils.ts', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    ctx.readFile = async (): Promise<string> => {
      await Promise.resolve();
      throw new Error('fail');
    };
    const results: LintResult[] = await validateStatelessUtils.check(ctx);
    expect(results.length).toBe(0);
  });

  it('detects global state (process.env)', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/shared/config.ts',
        '/** @stateless */\nconst env = process.env.NODE_ENV;\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateStatelessUtils.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Global state');
  });

  it('detects global state (globalThis)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/g.ts', '/** @stateless */\nconst g = globalThis;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateStatelessUtils.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Global state');
  });

  it('detects global state (window)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/w.ts', '/** @stateless */\nconst w = window.location;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateStatelessUtils.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Global state');
  });

  it('detects global state (document)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/d.ts', '/** @stateless */\nconst el = document.body;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateStatelessUtils.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Global state');
  });

  it('detects global state (localStorage)', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/shared/ls.ts',
        '/** @stateless */\nconst v = localStorage.getItem("k");\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateStatelessUtils.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Global state');
  });

  it('detects global state (sessionStorage)', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/shared/ss.ts',
        '/** @stateless */\nconst v = sessionStorage.getItem("k");\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateStatelessUtils.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Global state');
  });

  it('detects global state (navigator)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/nav.ts', '/** @stateless */\nconst ua = navigator.userAgent;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateStatelessUtils.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Global state');
  });

  it('detects side-effectful APIs (console.log)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/log.ts', '/** @stateless */\nconsole.log("debug");\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateStatelessUtils.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Side-effectful API');
  });

  it('detects side-effectful APIs (console.warn)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/warn.ts', '/** @stateless */\nconsole.warn("oops");\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateStatelessUtils.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Side-effectful API');
  });

  it('detects side-effectful APIs (console.error)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/err.ts', '/** @stateless */\nconsole.error("bad");\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateStatelessUtils.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Side-effectful API');
  });

  it('detects side-effectful APIs (console.info)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/info.ts', '/** @stateless */\nconsole.info("info");\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateStatelessUtils.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Side-effectful API');
  });

  it('detects side-effectful APIs (fetch)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/api.ts', '/** @stateless */\nconst res = fetch("/api");\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateStatelessUtils.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Side-effectful API');
  });

  it('detects side-effectful APIs (setTimeout)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/timer.ts', '/** @stateless */\nsetTimeout(() => {}, 100);\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateStatelessUtils.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Side-effectful API');
  });

  it('detects side-effectful APIs (setInterval)', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/shared/interval.ts',
        '/** @stateless */\nsetInterval(() => {}, 1000);\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateStatelessUtils.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Side-effectful API');
  });

  it('detects non-deterministic calls (Date.now)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/time.ts', '/** @stateless */\nconst ts = Date.now();\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateStatelessUtils.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Non-deterministic');
  });

  it('detects non-deterministic calls (new Date)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/date.ts', '/** @stateless */\nconst d = new Date();\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateStatelessUtils.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Non-deterministic');
  });

  it('detects non-deterministic calls (Math.random)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/rand.ts', '/** @stateless */\nconst r = Math.random();\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateStatelessUtils.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Non-deterministic');
  });

  it('produces up to 3 results for file with all violations', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/shared/bad.ts',
        '/** @stateless */\nconst e = process.env.X;\nconsole.log("x");\nconst d = Date.now();\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateStatelessUtils.check(ctx);
    expect(results.length).toBe(3);
    expect(results[0]!.message).toContain('Global state');
    expect(results[1]!.message).toContain('Side-effectful API');
    expect(results[2]!.message).toContain('Non-deterministic');
  });

  it('passes for clean @stateless file', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/packages/shared/pure.ts',
        '/** @stateless */\nexport const add = (a: number, b: number): number => a + b;\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateStatelessUtils.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/validate-docs-locale', () => {
  it('has correct rule metadata', () => {
    expect(validateDocsLocale.id).toBe('workspace/validate-docs-locale');
    expect(validateDocsLocale.scope).toBe('workspace');
    expect(typeof validateDocsLocale.check).toBe('function');
  });

  it('returns empty when no docs files exist', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/index.ts', 'export default {};']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDocsLocale.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when only en-US files exist (no other locales)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/en-US/guide.md', '# Guide'],
      ['/workspace/docs/en-US/api.md', '# API'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDocsLocale.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports missing canonical files in other locales', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/en-US/guide.md', '# Guide'],
      ['/workspace/docs/en-US/api.md', '# API'],
      ['/workspace/docs/fr-FR/guide.md', '# Guide FR'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDocsLocale.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Missing locale file');
    expect(results[0]!.message).toContain('fr-FR');
    expect(results[0]!.message).toContain('api.md');
  });

  it('reports extra files in other locales', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/en-US/guide.md', '# Guide'],
      ['/workspace/docs/fr-FR/guide.md', '# Guide FR'],
      ['/workspace/docs/fr-FR/extra.md', '# Extra FR'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDocsLocale.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('Extra file');
    expect(results[0]!.message).toContain('fr-FR');
    expect(results[0]!.message).toContain('extra.md');
  });

  it('reports both missing and extra files for a locale', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/en-US/guide.md', '# Guide'],
      ['/workspace/docs/en-US/api.md', '# API'],
      ['/workspace/docs/de-DE/guide.md', '# Guide DE'],
      ['/workspace/docs/de-DE/bonus.md', '# Bonus DE'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDocsLocale.check(ctx);
    expect(results.length).toBe(2);
    const errors: LintResult[] = results.filter((r: LintResult): boolean => r.severity === 'error');
    const warnings: LintResult[] = results.filter(
      (r: LintResult): boolean => r.severity === 'warning',
    );
    expect(errors.length).toBe(1);
    expect(errors[0]!.message).toContain('api.md');
    expect(warnings.length).toBe(1);
    expect(warnings[0]!.message).toContain('bonus.md');
  });

  it('handles multiple locales independently', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/en-US/guide.md', '# Guide'],
      ['/workspace/docs/fr-FR/guide.md', '# Guide FR'],
      ['/workspace/docs/ja-JP/guide.md', '# Guide JP'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDocsLocale.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports missing files for multiple locales', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/en-US/guide.md', '# Guide'],
      ['/workspace/docs/en-US/api.md', '# API'],
      ['/workspace/docs/fr-FR/guide.md', '# Guide FR'],
      ['/workspace/docs/ja-JP/api.md', '# API JP'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDocsLocale.check(ctx);
    expect(results.length).toBe(2);
    const messages: string[] = results.map((r: LintResult): string => r.message);
    expect(messages.some((m: string): boolean => m.includes('fr-FR') && m.includes('api.md'))).toBe(
      true,
    );
    expect(
      messages.some((m: string): boolean => m.includes('ja-JP') && m.includes('guide.md')),
    ).toBe(true);
  });

  it('ignores files not matching locale pattern', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/en-US/guide.md', '# Guide'],
      ['/workspace/docs/readme.md', '# Readme'],
      ['/workspace/docs/changelog.txt', 'v1.0'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDocsLocale.check(ctx);
    expect(results.length).toBe(0);
  });

  it('handles nested canonical files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/en-US/guides/setup.md', '# Setup'],
      ['/workspace/docs/fr-FR/guides/setup.md', '# Configuration'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDocsLocale.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/validate-docs-workspace', () => {
  it('has correct rule metadata', () => {
    expect(validateDocsWorkspace.id).toBe('workspace/validate-docs-workspace');
    expect(validateDocsWorkspace.scope).toBe('workspace');
    expect(typeof validateDocsWorkspace.check).toBe('function');
  });

  it('reports error when docs/en-US/ folder is missing', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/ui/package.json', '{}'],
      ['/workspace/src/index.ts', 'export default {};'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDocsWorkspace.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toBe('Missing docs folder');
  });

  it('returns empty when no packages exist but docs folder exists', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/en-US/overview.md', '# Overview'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDocsWorkspace.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when each package has corresponding docs', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/ui/package.json', '{}'],
      ['/workspace/packages/core/package.json', '{}'],
      ['/workspace/docs/en-US/ui/readme.md', '# UI docs'],
      ['/workspace/docs/en-US/core/readme.md', '# Core docs'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDocsWorkspace.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports error for package without docs', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/ui/package.json', '{}'],
      ['/workspace/packages/core/package.json', '{}'],
      ['/workspace/docs/en-US/ui/readme.md', '# UI docs'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDocsWorkspace.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Missing documentation');
    expect(results[0]!.message).toContain('packages/core');
  });

  it('reports errors for multiple packages without docs', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/ui/package.json', '{}'],
      ['/workspace/packages/core/package.json', '{}'],
      ['/workspace/packages/utils/package.json', '{}'],
      ['/workspace/docs/en-US/overview.md', '# Overview'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDocsWorkspace.check(ctx);
    expect(results.length).toBe(3);
    const messages: string[] = results.map((r: LintResult): string => r.message);
    expect(messages.some((m: string): boolean => m.includes('packages/ui'))).toBe(true);
    expect(messages.some((m: string): boolean => m.includes('packages/core'))).toBe(true);
    expect(messages.some((m: string): boolean => m.includes('packages/utils'))).toBe(true);
  });

  it('ignores nested package.json files (only direct packages/*)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/ui/package.json', '{}'],
      ['/workspace/packages/ui/node_modules/dep/package.json', '{}'],
      ['/workspace/docs/en-US/ui/readme.md', '# UI docs'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDocsWorkspace.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('packages/ui/node_modules/dep');
  });

  it('matches docs path containing package name substring', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/package.json', '{}'],
      ['/workspace/docs/en-US/shared/architecture.md', '# Architecture'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateDocsWorkspace.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/validate-biome-rules', () => {
  it('has correct rule metadata', () => {
    expect(validateBiomeRules.id).toBe('workspace/validate-biome-rules');
    expect(validateBiomeRules.scope).toBe('workspace');
    expect(typeof validateBiomeRules.check).toBe('function');
  });

  it('reports error when biome.base.json is missing', async () => {
    const files: Map<string, string> = new Map();
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateBiomeRules.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Missing biome.base.json');
  });

  it('reports error when readFile throws', async () => {
    const files: Map<string, string> = new Map([['/workspace/biome.base.json', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    ctx.readFile = async (): Promise<string> => {
      await Promise.resolve();
      throw new Error('read error');
    };
    const results: LintResult[] = await validateBiomeRules.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Failed to read');
  });

  it('reports error for invalid JSON', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/biome.base.json', '{not valid json}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateBiomeRules.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Invalid JSON');
  });

  it('passes when no rules key exists', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/biome.base.json', '{"formatter": {}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateBiomeRules.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when rules is undefined', async () => {
    const files: Map<string, string> = new Map([['/workspace/biome.base.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateBiomeRules.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when rules is null', async () => {
    const files: Map<string, string> = new Map([['/workspace/biome.base.json', '{"rules": null}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateBiomeRules.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when rules values are all booleans', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/biome.base.json', '{"rules": {"noVar": true, "noDebugger": false}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateBiomeRules.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when rules values are objects', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/biome.base.json',
        '{"rules": {"noVar": {"level": "error"}, "semi": {"level": "warn"}}}',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateBiomeRules.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports error for null rule value', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/biome.base.json', '{"rules": {"noVar": null}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateBiomeRules.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Invalid rule value');
    expect(results[0]!.message).toContain('noVar');
  });

  it('reports error for string rule value', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/biome.base.json', '{"rules": {"noVar": "error"}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateBiomeRules.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Invalid rule value');
    expect(results[0]!.message).toContain('noVar');
  });

  it('reports error for numeric rule value', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/biome.base.json', '{"rules": {"noVar": 1}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateBiomeRules.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Invalid rule value');
    expect(results[0]!.message).toContain('noVar');
  });

  it('reports multiple invalid rule values', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/biome.base.json', '{"rules": {"noVar": null, "semi": "warn", "indent": true}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateBiomeRules.check(ctx);
    expect(results.length).toBe(2);
    const messages: string[] = results.map((r: LintResult): string => r.message);
    expect(messages.some((m: string): boolean => m.includes('noVar'))).toBe(true);
    expect(messages.some((m: string): boolean => m.includes('semi'))).toBe(true);
  });

  it('passes with mixed valid boolean and object values', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/biome.base.json', '{"rules": {"a": true, "b": false, "c": {"level": "error"}}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await validateBiomeRules.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-biome-disable', () => {
  it('has correct rule metadata', () => {
    expect(noBiomeDisable.id).toBe('workspace/no-biome-disable');
    expect(noBiomeDisable.scope).toBe('workspace');
    expect(typeof noBiomeDisable.check).toBe('function');
  });

  it('reports error when biome.base.json is missing', async () => {
    const files: Map<string, string> = new Map();
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBiomeDisable.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Missing biome.base.json');
  });

  it('returns empty when readFile throws', async () => {
    const files: Map<string, string> = new Map([['/workspace/biome.base.json', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    ctx.readFile = async (): Promise<string> => {
      await Promise.resolve();
      throw new Error('read error');
    };
    const results: LintResult[] = await noBiomeDisable.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when JSON is invalid', async () => {
    const files: Map<string, string> = new Map([['/workspace/biome.base.json', '{{invalid}}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBiomeDisable.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when no rules key exists', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/biome.base.json', '{"formatter": {}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBiomeDisable.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when rules is null', async () => {
    const files: Map<string, string> = new Map([['/workspace/biome.base.json', '{"rules": null}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBiomeDisable.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when all rules are true', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/biome.base.json', '{"rules": {"noVar": true, "noDebugger": true}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBiomeDisable.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when rules are objects', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/biome.base.json', '{"rules": {"noVar": {"level": "error"}}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBiomeDisable.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports error when a rule is set to false', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/biome.base.json', '{"rules": {"noVar": false}}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBiomeDisable.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Disabled rule');
    expect(results[0]!.message).toContain('noVar');
  });

  it('reports multiple disabled rules', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/biome.base.json',
        '{"rules": {"noVar": false, "noDebugger": false, "semi": true}}',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBiomeDisable.check(ctx);
    expect(results.length).toBe(2);
    const messages: string[] = results.map((r: LintResult): string => r.message);
    expect(messages.some((m: string): boolean => m.includes('noVar'))).toBe(true);
    expect(messages.some((m: string): boolean => m.includes('noDebugger'))).toBe(true);
  });

  it('ignores non-false values (true, objects, strings, null)', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/biome.base.json',
        '{"rules": {"a": true, "b": {"level": "error"}, "c": "warn", "d": null}}',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noBiomeDisable.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-legacy-image-formats', () => {
  it('has correct rule metadata', () => {
    expect(noLegacyImageFormats.id).toBe('workspace/no-legacy-image-formats');
    expect(noLegacyImageFormats.scope).toBe('workspace');
    expect(typeof noLegacyImageFormats.check).toBe('function');
  });

  it('returns empty for no files', async () => {
    const files: Map<string, string> = new Map();
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLegacyImageFormats.check(ctx);
    expect(results.length).toBe(0);
  });

  it('flags .png files', async () => {
    const files: Map<string, string> = new Map([['/workspace/assets/logo.png', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLegacyImageFormats.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Legacy image format');
    expect(results[0]!.message).toContain('logo.png');
  });

  it('flags .jpg files', async () => {
    const files: Map<string, string> = new Map([['/workspace/images/photo.jpg', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLegacyImageFormats.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('photo.jpg');
  });

  it('flags .jpeg files', async () => {
    const files: Map<string, string> = new Map([['/workspace/images/photo.jpeg', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLegacyImageFormats.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('photo.jpeg');
  });

  it('skips legacy images in node_modules', async () => {
    const files: Map<string, string> = new Map([['/workspace/node_modules/dep/icon.png', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLegacyImageFormats.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips legacy images in .git', async () => {
    const files: Map<string, string> = new Map([['/workspace/.git/objects/logo.png', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLegacyImageFormats.check(ctx);
    expect(results.length).toBe(0);
  });

  it('allows .webp files', async () => {
    const files: Map<string, string> = new Map([['/workspace/assets/logo.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLegacyImageFormats.check(ctx);
    expect(results.length).toBe(0);
  });

  it('allows .svg files', async () => {
    const files: Map<string, string> = new Map([['/workspace/assets/icon.svg', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLegacyImageFormats.check(ctx);
    expect(results.length).toBe(0);
  });

  it('allows .ico files', async () => {
    const files: Map<string, string> = new Map([['/workspace/public/favicon.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLegacyImageFormats.check(ctx);
    expect(results.length).toBe(0);
  });

  it('flags multiple legacy image files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/a.png', ''],
      ['/workspace/b.jpg', ''],
      ['/workspace/c.jpeg', ''],
      ['/workspace/d.webp', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLegacyImageFormats.check(ctx);
    expect(results.length).toBe(3);
  });

  it('is case-insensitive for extension matching', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/assets/logo.PNG', ''],
      ['/workspace/assets/photo.JPG', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLegacyImageFormats.check(ctx);
    expect(results.length).toBe(2);
  });

  it('includes tip to convert format', async () => {
    const files: Map<string, string> = new Map([['/workspace/assets/logo.png', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLegacyImageFormats.check(ctx);
    expect(results[0]!.tip).toContain('Convert to .webp or .svg');
  });

  it('allows non-image files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export default {};'],
      ['/workspace/package.json', '{}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noLegacyImageFormats.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-unreferenced-images', () => {
  it('has correct rule metadata', () => {
    expect(noUnreferencedImages.id).toBe('workspace/no-unreferenced-images');
    expect(noUnreferencedImages.scope).toBe('workspace');
    expect(typeof noUnreferencedImages.check).toBe('function');
  });

  it('returns empty when no image files exist', async () => {
    const files: Map<string, string> = new Map([['/workspace/src/index.ts', 'export default {};']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnreferencedImages.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when image is referenced in a .ts file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/assets/logo.webp', ''],
      ['/workspace/src/app.ts', 'const img = "logo.webp";'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnreferencedImages.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when image is referenced in a .tsx file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/assets/icon.svg', ''],
      ['/workspace/src/comp.tsx', '<img src="icon.svg" />'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnreferencedImages.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when image is referenced in a .html file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/public/favicon.ico', ''],
      ['/workspace/public/index.html', '<link rel="icon" href="favicon.ico">'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnreferencedImages.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when image is referenced in a .md file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/diagram.svg', ''],
      ['/workspace/docs/readme.md', '![diagram](diagram.svg)'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnreferencedImages.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when image is referenced in a .css file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/assets/bg.webp', ''],
      ['/workspace/src/style.css', 'background: url(bg.webp);'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnreferencedImages.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when image is referenced in a .json file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/assets/logo.webp', ''],
      ['/workspace/config/manifest.json', '{"icon": "logo.webp"}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnreferencedImages.check(ctx);
    expect(results.length).toBe(0);
  });

  it('warns on unreferenced .webp image', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/assets/unused.webp', ''],
      ['/workspace/src/app.ts', 'const x = 1;'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnreferencedImages.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('Unreferenced image');
    expect(results[0]!.message).toContain('unused.webp');
  });

  it('warns on unreferenced .svg image', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/assets/orphan.svg', ''],
      ['/workspace/src/app.ts', 'const x = 1;'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnreferencedImages.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('orphan.svg');
  });

  it('warns on unreferenced .ico image', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/assets/old.ico', ''],
      ['/workspace/src/app.ts', 'const x = 1;'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnreferencedImages.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('old.ico');
  });

  it('handles multiple images with some referenced and some not', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/assets/used.webp', ''],
      ['/workspace/assets/unused.svg', ''],
      ['/workspace/assets/also-used.ico', ''],
      ['/workspace/src/app.ts', 'import "used.webp"; import "also-used.ico";'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnreferencedImages.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('unused.svg');
  });

  it('continues when readFile throws for a source file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/assets/logo.webp', ''],
      ['/workspace/src/app.ts', ''],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const origReadFile: (path: string) => Promise<string> = ctx.readFile.bind(ctx);
    ctx.readFile = async (path: string): Promise<string> => {
      if (path.endsWith('.ts')) {
        await Promise.resolve();
        throw new Error('read error');
      }
      return origReadFile(path);
    };
    const results: LintResult[] = await noUnreferencedImages.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('logo.webp');
  });

  it('includes tip on unreferenced result', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/assets/orphan.webp', ''],
      ['/workspace/src/app.ts', 'const x = 1;'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnreferencedImages.check(ctx);
    expect(results[0]!.tip).toContain('Remove unused images');
  });

  it('ignores non-image and non-source files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/assets/logo.webp', ''],
      ['/workspace/data/config.yaml', 'logo.webp'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnreferencedImages.check(ctx);
    expect(results.length).toBe(1);
  });

  it('uses basename for matching (not full path)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/deep/nested/path/icon.svg', ''],
      ['/workspace/src/app.ts', 'const src = "icon.svg";'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noUnreferencedImages.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-missing-image-refs', () => {
  it('has correct rule metadata', () => {
    expect(noMissingImageRefs.id).toBe('workspace/no-missing-image-refs');
    expect(noMissingImageRefs.scope).toBe('workspace');
    expect(typeof noMissingImageRefs.check).toBe('function');
  });

  it('returns empty when no source files exist', async () => {
    const files: Map<string, string> = new Map([['/workspace/assets/logo.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMissingImageRefs.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when no image references in source', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/assets/logo.webp', ''],
      ['/workspace/src/app.ts', 'const x = 1;'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMissingImageRefs.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when referenced image exists', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/assets/logo.webp', ''],
      ['/workspace/src/app.ts', 'const img = "./assets/logo.webp";'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMissingImageRefs.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports error for missing referenced .webp image', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/app.ts', 'const img = "./assets/missing.webp";'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMissingImageRefs.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Referenced image not found');
    expect(results[0]!.message).toContain('missing.webp');
  });

  it('reports error for missing referenced .svg image', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/app.tsx', '<img src="icons/arrow.svg" />'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMissingImageRefs.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('arrow.svg');
  });

  it('reports error for missing referenced .ico image', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/public/index.html', '<link rel="icon" href="favicon.ico">'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMissingImageRefs.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('favicon.ico');
  });

  it('scans .ts source files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/app.ts', 'const img = "ghost.webp";'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMissingImageRefs.check(ctx);
    expect(results.length).toBe(1);
  });

  it('scans .tsx source files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/app.tsx', '<img src="ghost.svg" />'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMissingImageRefs.check(ctx);
    expect(results.length).toBe(1);
  });

  it('scans .js source files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/app.js', 'const img = "ghost.ico";'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMissingImageRefs.check(ctx);
    expect(results.length).toBe(1);
  });

  it('scans .jsx source files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/app.jsx', '<img src="ghost.webp" />'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMissingImageRefs.check(ctx);
    expect(results.length).toBe(1);
  });

  it('scans .html source files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/public/index.html', '<img src="ghost.svg">'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMissingImageRefs.check(ctx);
    expect(results.length).toBe(1);
  });

  it('scans .md source files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/guide.md', '![screenshot](ghost.webp)'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMissingImageRefs.check(ctx);
    expect(results.length).toBe(1);
  });

  it('scans .css source files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/style.css', 'background: url(ghost.webp);'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMissingImageRefs.check(ctx);
    expect(results.length).toBe(1);
  });

  it('does NOT scan .json source files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/config.json', '{"icon": "ghost.webp"}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMissingImageRefs.check(ctx);
    expect(results.length).toBe(0);
  });

  it('deduplicates references with same basename', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/app.ts', 'import "assets/ghost.webp";\nimport "other/ghost.webp";\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMissingImageRefs.check(ctx);
    expect(results.length).toBe(1);
  });

  it('reports multiple distinct missing refs from same file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/app.ts', 'import "a.webp";\nimport "b.svg";\nimport "c.ico";\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMissingImageRefs.check(ctx);
    expect(results.length).toBe(3);
  });

  it('continues when readFile throws for a source file', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/app.ts', ''],
      ['/workspace/src/other.ts', 'import "ghost.webp";'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const origReadFile: (path: string) => Promise<string> = ctx.readFile.bind(ctx);
    ctx.readFile = async (path: string): Promise<string> => {
      if (path.endsWith('app.ts')) {
        await Promise.resolve();
        throw new Error('read error');
      }
      return origReadFile(path);
    };
    const results: LintResult[] = await noMissingImageRefs.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('ghost.webp');
  });

  it('includes tip on missing image ref result', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/app.ts', 'import "missing.webp";'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMissingImageRefs.check(ctx);
    expect(results[0]!.tip).toContain('Fix the path');
  });

  it('matches basename against image set (not full path)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/deep/nested/logo.webp', ''],
      ['/workspace/src/app.ts', 'const img = "other/path/logo.webp";'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMissingImageRefs.check(ctx);
    expect(results.length).toBe(0);
  });

  it('reports from multiple source files independently', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/a.ts', 'import "missing-a.webp";'],
      ['/workspace/src/b.ts', 'import "missing-b.svg";'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMissingImageRefs.check(ctx);
    expect(results.length).toBe(2);
    const messages: string[] = results.map((r: LintResult): string => r.message);
    expect(messages.some((m: string): boolean => m.includes('missing-a.webp'))).toBe(true);
    expect(messages.some((m: string): boolean => m.includes('missing-b.svg'))).toBe(true);
  });
});

describe('workspace/svg-requires-title-or-desc', () => {
  it('has correct rule metadata', () => {
    expect(svgRequiresTitleOrDesc.id).toBe('workspace/svg-requires-title-or-desc');
    expect(svgRequiresTitleOrDesc.scope).toBe('workspace');
    expect(svgRequiresTitleOrDesc.fixable).toBe(false);
    expect(typeof svgRequiresTitleOrDesc.check).toBe('function');
  });

  it('errors when SVG has no title or desc', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0h24"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresTitleOrDesc.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/svg-requires-title-or-desc');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('missing');
  });

  it('passes when SVG has title', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><title>Icon</title><path d="M0 0h24"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresTitleOrDesc.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when SVG has desc', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><desc>An icon</desc><path d="M0 0h24"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresTitleOrDesc.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-SVG files', async () => {
    const files: Map<string, string> = new Map([['/workspace/icon.png', 'binary content']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresTitleOrDesc.check(ctx);
    expect(results.length).toBe(0);
  });

  it('continues on readFile failure', async () => {
    const files: Map<string, string> = new Map([['/workspace/icon.svg', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    ctx.readFile = async (): Promise<string> => {
      await Promise.resolve();
      throw new Error('fail');
    };
    const results: LintResult[] = await svgRequiresTitleOrDesc.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/svg-no-inline-style', () => {
  it('has correct rule metadata', () => {
    expect(svgNoInlineStyle.id).toBe('workspace/svg-no-inline-style');
    expect(svgNoInlineStyle.scope).toBe('workspace');
    expect(typeof svgNoInlineStyle.check).toBe('function');
  });

  it('errors when SVG has inline style', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><rect style="fill:red" /></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoInlineStyle.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Inline style');
  });

  it('passes when SVG has no inline styles', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><rect fill="currentColor" /></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoInlineStyle.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-SVG files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/app.html', '<div style="color:red"></div>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoInlineStyle.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/svg-requires-viewbox', () => {
  it('has correct rule metadata', () => {
    expect(svgRequiresViewbox.id).toBe('workspace/svg-requires-viewbox');
    expect(svgRequiresViewbox.scope).toBe('workspace');
    expect(typeof svgRequiresViewbox.check).toBe('function');
  });

  it('errors when SVG has no viewBox', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg width="24" height="24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresViewbox.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('viewBox');
  });

  it('passes when SVG has viewBox', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresViewbox.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/svg-requires-dimensions', () => {
  it('has correct rule metadata', () => {
    expect(svgRequiresDimensions.id).toBe('workspace/svg-requires-dimensions');
    expect(svgRequiresDimensions.scope).toBe('workspace');
    expect(typeof svgRequiresDimensions.check).toBe('function');
  });

  it('warns when SVG is missing width', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg height="24" viewBox="0 0 24 24"></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresDimensions.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('width or height');
  });

  it('warns when SVG is missing height', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg width="24" viewBox="0 0 24 24"></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresDimensions.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes when SVG has both width and height', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg width="24" height="24" viewBox="0 0 24 24"></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresDimensions.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/svg-no-black-fill', () => {
  it('has correct rule metadata', () => {
    expect(svgNoBlackFill.id).toBe('workspace/svg-no-black-fill');
    expect(svgNoBlackFill.scope).toBe('workspace');
    expect(typeof svgNoBlackFill.check).toBe('function');
  });

  it('warns when SVG uses fill="black"', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><path fill="black" d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoBlackFill.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('black fill');
  });

  it('warns case-insensitively on fill="Black"', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><path fill="Black" d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoBlackFill.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes when SVG uses fill="currentColor"', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><path fill="currentColor" d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoBlackFill.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// inputs() lifecycle coverage
// =============================================================================

// Bulk inputs() smoke-tests — invoke every imported rule's inputs() against
// a rich mock context, just to record the function as executed in coverage.
// Per-rule semantic tests live elsewhere; this is purely for coverage of the
// async wrapper + inline arrows.
const BULK_INPUTS_RULES_3: ReadonlyArray<{
  id: string;
  rule: { inputs?: (ctx: unknown) => Promise<readonly string[]> };
}> = [
  { id: 'enforce-docs-location', rule: enforceDocsLocationRule },
  { id: 'no-migration-tempfiles', rule: noMigrationTempfiles },
  { id: 'no-nonpreferred-image-formats', rule: noNonpreferredImageFormats },
  { id: 'validate-formatting-config-consistency', rule: validateFormattingConfigConsistency },
  { id: 'validate-nanostores-safety', rule: validateNanostoresSafety },
  { id: 'validate-tsconfig-paths-resolution', rule: validateTsconfigPathsResolution },
  { id: 'no-oversized-commits', rule: noOversizedCommits },
  { id: 'validate-monorepo-layout', rule: validateMonorepoLayout },
  { id: 'validate-yaml-schema-directives', rule: validateYamlSchemaDirectives },
  { id: 'validate-json-schema-fields', rule: validateJsonSchemaFields },
  { id: 'validate-makefiles', rule: validateMakefiles },
  { id: 'no-world-writable-files', rule: noWorldWritableFiles },
  { id: 'no-wrangler-route-collisions', rule: noWranglerRouteCollisions },
  { id: 'validate-sql-migrations', rule: validateSqlMigrations },
  { id: 'validate-shell-scripts', rule: validateShellScripts },
  { id: 'validate-ci-folder-structure', rule: validateCiFolderStructure },
  { id: 'no-empty-vscode-settings', rule: noEmptyVscodeSettings },
  { id: 'validate-all-contributorsrc', rule: validateAllContributorsrc },
  { id: 'validate-codeowners', rule: validateCodeowners },
  { id: 'prefer-env-bash-shebang', rule: preferEnvBashShebang },
  { id: 'require-script-descriptions', rule: requireScriptDescriptions },
  { id: 'no-unreferenced-shell-scripts', rule: noUnreferencedShellScripts },
  { id: 'validate-env-file-integrity', rule: validateEnvFileIntegrity },
  { id: 'validate-wrangler-config', rule: validateWranglerConfig },
  { id: 'validate-db-name-safety', rule: validateDbNameSafety },
  { id: 'validate-monorepo-schema-example', rule: validateMonorepoSchemaExample },
  { id: 'no-inline-ci-scripts', rule: noInlineCiScripts },
  { id: 'warn-unused-gitignore-patterns', rule: warnUnusedGitignorePatterns },
  { id: 'no-ci-recursive-triggers', rule: noCiRecursiveTriggers },
  { id: 'require-ci-job-conditions', rule: requireCiJobConditions },
  { id: 'require-ci-job-timeouts', rule: requireCiJobTimeouts },
  { id: 'no-unused-ci-stages', rule: noUnusedCiStages },
  { id: 'require-codeowners-coverage', rule: requireCodeownersCoverage },
  { id: 'validate-docs-frontmatter', rule: validateDocsFrontmatter },
  { id: 'require-makefile-help-target', rule: requireMakefileHelpTarget },
  { id: 'no-orphaned-ts-files', rule: noOrphanedTsFiles },
  { id: 'validate-locale-key-consistency', rule: validateLocaleKeyConsistency },
  { id: 'validate-image-optimization', rule: validateImageOptimization },
  { id: 'enforce-branch-naming', rule: enforceBranchNaming },
  { id: 'enforce-conventional-commits', rule: enforceConventionalCommits },
  { id: 'enforce-git-config', rule: enforceGitConfig },
  { id: 'validate-stateless-utils', rule: validateStatelessUtils },
  { id: 'validate-docs-locale', rule: validateDocsLocale },
  { id: 'validate-docs-workspace', rule: validateDocsWorkspace },
  { id: 'validate-biome-rules', rule: validateBiomeRules },
  { id: 'no-biome-disable', rule: noBiomeDisable },
  { id: 'no-legacy-image-formats', rule: noLegacyImageFormats },
  { id: 'no-unreferenced-images', rule: noUnreferencedImages },
  { id: 'no-missing-image-refs', rule: noMissingImageRefs },
  { id: 'svg-requires-title-or-desc', rule: svgRequiresTitleOrDesc },
  { id: 'svg-no-inline-style', rule: svgNoInlineStyle },
  { id: 'svg-requires-viewbox', rule: svgRequiresViewbox },
  { id: 'svg-requires-dimensions', rule: svgRequiresDimensions },
  { id: 'svg-no-black-fill', rule: svgNoBlackFill },
];

describe('workspace-rules-3 — bulk inputs() smoke-coverage', () => {
  for (const { id, rule } of BULK_INPUTS_RULES_3) {
    it(`workspace/${id}.inputs() runs without throwing`, async () => {
      if (typeof rule.inputs !== 'function') {
        return;
      }

      const ctx: WorkspaceContext = mockContext({
        rootDir: '/workspace',
        files: new Map([
          ['/workspace/foo.ts', 'export const a = 1;'],
          ['/workspace/.github/workflows/ci.yml', 'name: ci\n'],
          ['/workspace/Makefile', 'help:\n\t@echo hi\n'],
          ['/workspace/scripts/run.sh', '#!/usr/bin/env bash\n'],
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

describe('workspace/no-unlinked-workspace-deps — inputs() lifecycle', () => {
  it('returns combined files + package paths', async () => {
    const files: Map<string, string> = new Map([['/workspace/foo.ts', 'x']]);
    const packages: WorkspacePackage[] = [
      {
        name: '@/a',
        path: '/workspace/packages/a/package.json',
        dir: '/workspace/packages/a',
        packageJson: { name: '@/a' },
      },
    ];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace', files, packages });
    expect(typeof noUnlinkedWorkspaceDeps.inputs).toBe('function');
    const inputs = await noUnlinkedWorkspaceDeps.inputs!(ctx);
    expect(inputs).toEqual(
      expect.arrayContaining(['/workspace/foo.ts', '/workspace/packages/a/package.json']),
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
    const inputs = await noUnlinkedWorkspaceDeps.inputs!(ctx);
    expect(inputs).toEqual(['/workspace/only.ts']);
  });
});
