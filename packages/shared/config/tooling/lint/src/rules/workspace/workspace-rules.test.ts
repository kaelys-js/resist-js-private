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

// Phase 27 — Git Workflow Rules (ported from common.checks.sh)
import noDetachedHead from './no-detached-head.ts';
import enforceBranchNaming from './enforce-branch-naming.ts';
import enforceConventionalCommits from './enforce-conventional-commits.ts';
import noMergeCommitsOnMain from './no-merge-commits-on-main.ts';
import noRebaseInProgress from './no-rebase-in-progress.ts';
import noStaleIndexLock from './no-stale-index-lock.ts';
import enforceGitConfig from './enforce-git-config.ts';
import noSparseCheckout from './no-sparse-checkout.ts';

// Phase 28 — Git Safety & Workflow Rules Batch 2 (ported from common.checks.sh)
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

// Phase 29 — Git Safety, Code Quality & Image Validation Rules
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

// Phase 30 — SVG Validation Rules
import svgRequiresTitleOrDesc from './svg-requires-title-or-desc.ts';
import svgNoInlineStyle from './svg-no-inline-style.ts';
import svgRequiresViewbox from './svg-requires-viewbox.ts';
import svgRequiresDimensions from './svg-requires-dimensions.ts';
import svgNoBlackFill from './svg-no-black-fill.ts';
import svgNoEmbeddedFont from './svg-no-embedded-font.ts';
import svgNoScript from './svg-no-script.ts';
import svgNoExternalUrl from './svg-no-external-url.ts';
import svgNoRasterImage from './svg-no-raster-image.ts';
import svgNoExternalFontUrl from './svg-no-external-font-url.ts';
import svgNoTextElement from './svg-no-text-element.ts';
import svgNoXlinkHttp from './svg-no-xlink-http.ts';
import svgRequiresNamespace from './svg-requires-namespace.ts';
import svgNoEventHandler from './svg-no-event-handler.ts';
import svgNoRemoteHref from './svg-no-remote-href.ts';
import svgNoEmbeddedMedia from './svg-no-embedded-media.ts';

// Phase 31 — SVG Accessibility, Image Quality & Inline SVG Rules
import svgNoHiddenInteractive from './svg-no-hidden-interactive.ts';
import svgSymbolRequiresViewbox from './svg-symbol-requires-viewbox.ts';
import svgOpacityRequiresFill from './svg-opacity-requires-fill.ts';
import svgNoBlurFilter from './svg-no-blur-filter.ts';
import svgIdsUnique from './svg-ids-unique.ts';
import svgRequiresAriaRole from './svg-requires-aria-role.ts';
import svgNoClippedText from './svg-no-clipped-text.ts';
import svgTitleFirstChild from './svg-title-first-child.ts';
import svgNoTabindex from './svg-no-tabindex.ts';
import svgNoMaskFragment from './svg-no-mask-fragment.ts';
import svgRequiresAriaAttrs from './svg-requires-aria-attrs.ts';
import svgTitleDescRequiresLang from './svg-title-desc-requires-lang.ts';
import noWebpIcons from './no-webp-icons.ts';
import noInlineSvgInSource from './no-inline-svg-in-source.ts';
import noWebpInCss from './no-webp-in-css.ts';
import noRawSvgInComponents from './no-raw-svg-in-components.ts';

// Phase 32 — Image Quality, ICO/WebP Binary Validation Rules
import webpMaxSize from './webp-max-size.ts';
import webpNoLossless from './webp-no-lossless.ts';
import webpNoMetadata from './webp-no-metadata.ts';
import icoMinResolution from './ico-min-resolution.ts';
import noMisleadingImageExtension from './no-misleading-image-extension.ts';
import svgValidXml from './svg-valid-xml.ts';
import icoRequiresMultiresolution from './ico-requires-multiresolution.ts';
import icoOptimalPalette from './ico-optimal-palette.ts';
import webpNoColorProfile from './webp-no-color-profile.ts';
import webpYuv420Required from './webp-yuv420-required.ts';

// Phase 33 — GitLab CI, Shell Docblocks, Workspace & MR Rules
import gitlabCiFileRequired from './gitlab-ci-file-required.ts';
import gitlabCiSchemaHeader from './gitlab-ci-schema-header.ts';
import gitlabCiYamlSyntax from './gitlab-ci-yaml-syntax.ts';
import gitlabCiStagesDeclared from './gitlab-ci-stages-declared.ts';
import gitlabCiIncludesValid from './gitlab-ci-includes-valid.ts';
import shellFunctionDocblocks from './shell-function-docblocks.ts';
import gitlabCiJobsHaveScript from './gitlab-ci-jobs-have-script.ts';
import gitlabCiStandardNaming from './gitlab-ci-standard-naming.ts';
import wranglerAuthenticated from './wrangler-authenticated.ts';
import gitlabCiStagesStandard from './gitlab-ci-stages-standard.ts';
import cliToolsHelpVersion from './cli-tools-help-version.ts';
import workspaceSpelling from './workspace-spelling.ts';
import mrTitleFormat from './mr-title-format.ts';
import mrDescriptionRequired from './mr-description-required.ts';

// Phase 34 — MR Validation Rules
import mrLabelEnforcement from './mr-label-enforcement.ts';
import mrTargetBranchProtected from './mr-target-branch-protected.ts';
import mrDraftBlock from './mr-draft-block.ts';
import mrConflictingLabels from './mr-conflicting-labels.ts';
import mrSizeLimit from './mr-size-limit.ts';
import mrAssigneeRequired from './mr-assignee-required.ts';
import mrReviewerRequired from './mr-reviewer-required.ts';
import mrBlockingDiscussions from './mr-blocking-discussions.ts';
import mrWipCommitCheck from './mr-wip-commit-check.ts';
import mrApprovalRequired from './mr-approval-required.ts';
import mrBranchSourceRules from './mr-branch-source-rules.ts';
import mrCodeownersApproval from './mr-codeowners-approval.ts';
import mrLabelsRequiredPerScope from './mr-labels-required-per-scope.ts';
import mrDependencyChangesReviewed from './mr-dependency-changes-reviewed.ts';
import mrCiPipelinePassed from './mr-ci-pipeline-passed.ts';
import mrUpToDateWithTarget from './mr-up-to-date-with-target.ts';

// Phase 35 — MR Metadata, Valibot & Vitest Rules
import mrCherryPickLabel from './mr-cherry-pick-label.ts';
import mrTestCoverageDiff from './mr-test-coverage-diff.ts';
import mrLabelFormat from './mr-label-format.ts';
import mrReleaseLabelRequired from './mr-release-label-required.ts';
import mrNoForcePushAfterReview from './mr-no-force-push-after-review.ts';
import mrLicenseChangeReviewed from './mr-license-change-reviewed.ts';
import mrConfigChangesApproved from './mr-config-changes-approved.ts';
import mrOpenTooLong from './mr-open-too-long.ts';
import mrAutomergeNotEnabledByDefault from './mr-automerge-not-enabled-by-default.ts';
import mrLabelConflictMatrix from './mr-label-conflict-matrix.ts';
import mrSensitivePathChanges from './mr-sensitive-path-changes.ts';
import mrTestOrBenchmarkRegressions from './mr-test-or-benchmark-regressions.ts';
import valibotConsistency from './valibot-consistency.ts';
import vitestConfigAndCoverage from './vitest-config-and-coverage.ts';
import vitestConfigAndUsage from './vitest-config-and-usage.ts';

// Phase 36 — DangerJS PR Rules Migration
import prSvgOptimized from './pr-svg-optimized.ts';
import prBranchCommitMismatch from './pr-branch-commit-mismatch.ts';
import prDescriptionRequired from './pr-description-required.ts';
import prNoMergeCommits from './pr-no-merge-commits.ts';
import prWipWarning from './pr-wip-warning.ts';

// Phase 48 — Configuration Sync Validation Rules
import syncTurboTasks from './sync-turbo-tasks.ts';
import syncTsconfigPaths from './sync-tsconfig-paths.ts';
import syncLefthookScripts from './sync-lefthook-scripts.ts';
import syncOnboardingSteps from './sync-onboarding-steps.ts';
import syncWorkflowScripts from './sync-workflow-scripts.ts';
import syncFilterPatterns from './sync-filter-patterns.ts';
import syncPnpmWorkspace from './sync-pnpm-workspace.ts';

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

// =============================================================================
// Phase 27 — Git Workflow Rules (ported from common.checks.sh)
// =============================================================================

// workspace/no-detached-head
// =============================================================================

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

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

// =============================================================================
// workspace/enforce-branch-naming
// =============================================================================

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

// =============================================================================
// workspace/enforce-conventional-commits
// =============================================================================

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

// =============================================================================
// workspace/no-merge-commits-on-main
// =============================================================================

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

// =============================================================================
// workspace/no-rebase-in-progress
// =============================================================================

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

// =============================================================================
// workspace/no-stale-index-lock
// =============================================================================

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

// =============================================================================
// workspace/enforce-git-config
// =============================================================================

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

// =============================================================================
// workspace/no-sparse-checkout
// =============================================================================

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

// =============================================================================
// Phase 28 — Git Safety & Workflow Rules Batch 2
// =============================================================================

// =============================================================================
// workspace/no-unsafe-main-push
// =============================================================================

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

// =============================================================================
// workspace/no-protected-branch-push
// =============================================================================

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

// =============================================================================
// workspace/no-oversized-commit-body
// =============================================================================

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

// =============================================================================
// workspace/no-dirty-working-tree
// =============================================================================

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

// =============================================================================
// workspace/no-broken-git-refs
// =============================================================================

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

// =============================================================================
// workspace/no-broken-git-head
// =============================================================================

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

// =============================================================================
// workspace/no-unsafe-global-gitconfig
// =============================================================================

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

// =============================================================================
// workspace/no-orphaned-git-refs
// =============================================================================

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

// =============================================================================
// workspace/no-git-object-reuse
// =============================================================================

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

// =============================================================================
// workspace/no-git-alternate-objects
// =============================================================================

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

// =============================================================================
// workspace/no-empty-commit-diff
// =============================================================================

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

// =============================================================================
// workspace/no-inconsistent-worktrees
// =============================================================================

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

// =============================================================================
// workspace/no-fsmonitor-in-ci
// =============================================================================

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

// =============================================================================
// workspace/no-oversized-repo
// =============================================================================

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

// =============================================================================
// workspace/no-bloated-commits
// =============================================================================

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

// =============================================================================
// workspace/no-commit-date-skew
// =============================================================================

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

// =============================================================================
// workspace/no-git-stdin-in-ci
// =============================================================================

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

// =============================================================================
// workspace/no-reflog-in-ci
// =============================================================================

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

// =============================================================================
// workspace/no-sparse-index-disabled
// =============================================================================

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

// =============================================================================
// workspace/no-untagged-releases
// =============================================================================

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

// =============================================================================
// workspace/no-uncommitted-patches
// =============================================================================

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

// =============================================================================
// workspace/no-commit-scope-mismatch
// =============================================================================

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

// =============================================================================
// workspace/no-tracked-env-files
// =============================================================================

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

// =============================================================================
// workspace/no-metadata-only-commits
// =============================================================================

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
// =============================================================================
// workspace/validate-stateless-utils
// =============================================================================

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

// =============================================================================
// workspace/validate-docs-locale
// =============================================================================

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

// =============================================================================
// workspace/validate-docs-workspace
// =============================================================================

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

// =============================================================================
// workspace/validate-biome-rules
// =============================================================================

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

// =============================================================================
// workspace/no-biome-disable
// =============================================================================

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

// =============================================================================
// workspace/no-legacy-image-formats
// =============================================================================

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

// =============================================================================
// workspace/no-unreferenced-images
// =============================================================================

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

// =============================================================================
// workspace/no-missing-image-refs
// =============================================================================

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

// =============================================================================
// workspace/svg-requires-title-or-desc
// =============================================================================

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

// =============================================================================
// workspace/svg-no-inline-style
// =============================================================================

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

// =============================================================================
// workspace/svg-requires-viewbox
// =============================================================================

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

// =============================================================================
// workspace/svg-requires-dimensions
// =============================================================================

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

// =============================================================================
// workspace/svg-no-black-fill
// =============================================================================

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
// workspace/svg-no-embedded-font
// =============================================================================

describe('workspace/svg-no-embedded-font', () => {
  it('has correct rule metadata', () => {
    expect(svgNoEmbeddedFont.id).toBe('workspace/svg-no-embedded-font');
    expect(svgNoEmbeddedFont.scope).toBe('workspace');
    expect(typeof svgNoEmbeddedFont.check).toBe('function');
  });

  it('errors when SVG has data:font/', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/icon.svg',
        '<svg><style>@font-face{src:url(data:font/woff2;base64,abc)}</style></svg>',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEmbeddedFont.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Embedded font');
  });

  it('errors when SVG has .woff reference', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><style>@font-face{src:url(font.woff)}</style></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEmbeddedFont.check(ctx);
    expect(results.length).toBe(1);
  });

  it('errors when SVG has .ttf reference', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><style>@font-face{src:url(font.ttf)}</style></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEmbeddedFont.check(ctx);
    expect(results.length).toBe(1);
  });

  it('errors when SVG has <font element', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/icon.svg',
        '<svg><font id="MyFont"><font-face font-family="MyFont"/></font></svg>',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEmbeddedFont.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes when SVG has no fonts', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0h24"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEmbeddedFont.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/svg-no-script
// =============================================================================

describe('workspace/svg-no-script', () => {
  it('has correct rule metadata', () => {
    expect(svgNoScript.id).toBe('workspace/svg-no-script');
    expect(svgNoScript.scope).toBe('workspace');
    expect(typeof svgNoScript.check).toBe('function');
  });

  it('errors when SVG has <script> element', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><script>alert("xss")</script></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoScript.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('<script>');
  });

  it('errors case-insensitively on <SCRIPT>', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><SCRIPT>alert("xss")</SCRIPT></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoScript.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes when SVG has no script', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0h24"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoScript.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/svg-no-external-url
// =============================================================================

describe('workspace/svg-no-external-url', () => {
  it('has correct rule metadata', () => {
    expect(svgNoExternalUrl.id).toBe('workspace/svg-no-external-url');
    expect(svgNoExternalUrl.scope).toBe('workspace');
    expect(typeof svgNoExternalUrl.check).toBe('function');
  });

  it('errors when SVG has url(http://...)', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/icon.svg',
        '<svg><style>div{background:url(http://evil.com/img.png)}</style></svg>',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoExternalUrl.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('External URL');
  });

  it('errors when SVG has url(https://...)', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/icon.svg',
        '<svg><style>div{background:url(https://cdn.com/bg.png)}</style></svg>',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoExternalUrl.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes when SVG has local url()', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><style>div{fill:url(#gradient)}</style></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoExternalUrl.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/svg-no-raster-image
// =============================================================================

describe('workspace/svg-no-raster-image', () => {
  it('has correct rule metadata', () => {
    expect(svgNoRasterImage.id).toBe('workspace/svg-no-raster-image');
    expect(svgNoRasterImage.scope).toBe('workspace');
    expect(typeof svgNoRasterImage.check).toBe('function');
  });

  it('errors when SVG has base64 PNG', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><image href="data:image/png;base64,abc123"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoRasterImage.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('raster image');
  });

  it('errors when SVG has base64 JPEG', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><image href="data:image/jpeg;base64,abc123"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoRasterImage.check(ctx);
    expect(results.length).toBe(1);
  });

  it('errors when SVG has base64 GIF', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><image href="data:image/gif;base64,abc123"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoRasterImage.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes when SVG has no raster embeds', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoRasterImage.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/svg-no-external-font-url
// =============================================================================

describe('workspace/svg-no-external-font-url', () => {
  it('has correct rule metadata', () => {
    expect(svgNoExternalFontUrl.id).toBe('workspace/svg-no-external-font-url');
    expect(svgNoExternalFontUrl.scope).toBe('workspace');
    expect(typeof svgNoExternalFontUrl.check).toBe('function');
  });

  it('errors when SVG has external woff URL', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/icon.svg',
        '<svg><style>@font-face{src:url("https://fonts.com/font.woff")}</style></svg>',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoExternalFontUrl.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('External font URL');
  });

  it('errors when SVG has external woff2 URL', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/icon.svg',
        '<svg><style>@font-face{src:url(https://cdn.com/f.woff2)}</style></svg>',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoExternalFontUrl.check(ctx);
    expect(results.length).toBe(1);
  });

  it('errors when SVG has external ttf URL', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/icon.svg',
        '<svg><style>@font-face{src:url(http://fonts.com/f.ttf)}</style></svg>',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoExternalFontUrl.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes when SVG has no external font references', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoExternalFontUrl.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/svg-no-text-element
// =============================================================================

describe('workspace/svg-no-text-element', () => {
  it('has correct rule metadata', () => {
    expect(svgNoTextElement.id).toBe('workspace/svg-no-text-element');
    expect(svgNoTextElement.scope).toBe('workspace');
    expect(typeof svgNoTextElement.check).toBe('function');
  });

  it('warns when SVG has <text> element', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><text x="10" y="10">Hello</text></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoTextElement.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('<text>');
  });

  it('passes when SVG has no text elements', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoTextElement.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/svg-no-xlink-http
// =============================================================================

describe('workspace/svg-no-xlink-http', () => {
  it('has correct rule metadata', () => {
    expect(svgNoXlinkHttp.id).toBe('workspace/svg-no-xlink-http');
    expect(svgNoXlinkHttp.scope).toBe('workspace');
    expect(typeof svgNoXlinkHttp.check).toBe('function');
  });

  it('errors when SVG has insecure xlink:href', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><use xlink:href="http://evil.com/icon.svg#id"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoXlinkHttp.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('xlink:href');
  });

  it('passes when SVG uses local xlink:href', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><use xlink:href="#local-id"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoXlinkHttp.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when SVG has no xlink:href', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoXlinkHttp.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/svg-requires-namespace
// =============================================================================

describe('workspace/svg-requires-namespace', () => {
  it('has correct rule metadata', () => {
    expect(svgRequiresNamespace.id).toBe('workspace/svg-requires-namespace');
    expect(svgRequiresNamespace.scope).toBe('workspace');
    expect(typeof svgRequiresNamespace.check).toBe('function');
  });

  it('errors when SVG is missing xmlns', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresNamespace.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('xmlns');
  });

  it('passes when SVG has xmlns', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/icon.svg',
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0"/></svg>',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresNamespace.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/svg-no-event-handler
// =============================================================================

describe('workspace/svg-no-event-handler', () => {
  it('has correct rule metadata', () => {
    expect(svgNoEventHandler.id).toBe('workspace/svg-no-event-handler');
    expect(svgNoEventHandler.scope).toBe('workspace');
    expect(typeof svgNoEventHandler.check).toBe('function');
  });

  it('errors when SVG has onclick handler', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><rect onclick="alert(1)"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEventHandler.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('event handler');
  });

  it('errors when SVG has onload handler', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg onload="init()"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEventHandler.check(ctx);
    expect(results.length).toBe(1);
  });

  it('errors when SVG has onmouseover handler', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><rect onmouseover="highlight()"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEventHandler.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes when SVG has no event handlers', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEventHandler.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/svg-no-remote-href
// =============================================================================

describe('workspace/svg-no-remote-href', () => {
  it('has correct rule metadata', () => {
    expect(svgNoRemoteHref.id).toBe('workspace/svg-no-remote-href');
    expect(svgNoRemoteHref.scope).toBe('workspace');
    expect(typeof svgNoRemoteHref.check).toBe('function');
  });

  it('errors when SVG has href to HTTP URL', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><a href="http://evil.com"><rect/></a></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoRemoteHref.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Remote href');
  });

  it('errors when SVG has xlink:href to HTTPS URL', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><use xlink:href="https://cdn.com/icons.svg#x"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoRemoteHref.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes when SVG has local href', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><use href="#local-symbol"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoRemoteHref.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when SVG has no href', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoRemoteHref.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/svg-no-embedded-media
// =============================================================================

describe('workspace/svg-no-embedded-media', () => {
  it('has correct rule metadata', () => {
    expect(svgNoEmbeddedMedia.id).toBe('workspace/svg-no-embedded-media');
    expect(svgNoEmbeddedMedia.scope).toBe('workspace');
    expect(typeof svgNoEmbeddedMedia.check).toBe('function');
  });

  it('errors when SVG has <image> element', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><image href="photo.png" width="100" height="100"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEmbeddedMedia.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Embedded media');
  });

  it('errors when SVG has <video> element', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><foreignObject><video src="clip.mp4"/></foreignObject></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEmbeddedMedia.check(ctx);
    expect(results.length).toBe(1);
  });

  it('errors when SVG has <audio> element', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><foreignObject><audio src="sound.mp3"/></foreignObject></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEmbeddedMedia.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes when SVG has no media elements', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEmbeddedMedia.check(ctx);
    expect(results.length).toBe(0);
  });

  it('flags multiple media types in one SVG', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/icon.svg',
        '<svg><image href="x.png"/><foreignObject><video src="y.mp4"/><audio src="z.mp3"/></foreignObject></svg>',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEmbeddedMedia.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

// =============================================================================
// Phase 31 — SVG Accessibility, Image Quality & Inline SVG Rules
// =============================================================================

// =============================================================================
// workspace/svg-no-hidden-interactive
// =============================================================================

describe('workspace/svg-no-hidden-interactive', () => {
  it('has correct rule metadata', () => {
    expect(svgNoHiddenInteractive.id).toBe('workspace/svg-no-hidden-interactive');
    expect(svgNoHiddenInteractive.scope).toBe('workspace');
    expect(typeof svgNoHiddenInteractive.check).toBe('function');
  });

  it('errors when SVG has hidden <a> with display:none', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><a style="display: none" href="/link">click</a></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoHiddenInteractive.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('errors when SVG has hidden <button> with opacity:0', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><button style="opacity: 0">submit</button></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoHiddenInteractive.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes when SVG has visible interactive elements', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><a href="/link">visible link</a></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoHiddenInteractive.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-SVG files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/app.ts', '<a style="display: none">hidden</a>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoHiddenInteractive.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      allFiles: async (): Promise<readonly string[]> => ['/workspace/bad.svg'],
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await svgNoHiddenInteractive.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/svg-symbol-requires-viewbox
// =============================================================================

describe('workspace/svg-symbol-requires-viewbox', () => {
  it('has correct rule metadata', () => {
    expect(svgSymbolRequiresViewbox.id).toBe('workspace/svg-symbol-requires-viewbox');
    expect(svgSymbolRequiresViewbox.scope).toBe('workspace');
    expect(typeof svgSymbolRequiresViewbox.check).toBe('function');
  });

  it('errors when <symbol> has no viewBox', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icons.svg', '<svg><symbol id="icon"><path d="M0 0"/></symbol></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgSymbolRequiresViewbox.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes when <symbol> has viewBox', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/icons.svg',
        '<svg><symbol id="icon" viewBox="0 0 24 24"><path d="M0 0"/></symbol></svg>',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgSymbolRequiresViewbox.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when SVG has no <symbol> elements', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgSymbolRequiresViewbox.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-SVG files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/app.ts', '<symbol id="test">no viewBox</symbol>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgSymbolRequiresViewbox.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/svg-opacity-requires-fill
// =============================================================================

describe('workspace/svg-opacity-requires-fill', () => {
  it('has correct rule metadata', () => {
    expect(svgOpacityRequiresFill.id).toBe('workspace/svg-opacity-requires-fill');
    expect(svgOpacityRequiresFill.scope).toBe('workspace');
    expect(typeof svgOpacityRequiresFill.check).toBe('function');
  });

  it('warns when SVG has opacity= but no fill=', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><rect opacity="0.5"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgOpacityRequiresFill.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when SVG has both opacity= and fill=', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><rect opacity="0.5" fill="#000"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgOpacityRequiresFill.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when SVG has no opacity attribute', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><rect fill="#000"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgOpacityRequiresFill.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-SVG files', async () => {
    const files: Map<string, string> = new Map([['/workspace/app.css', 'div { opacity: 0.5; }']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgOpacityRequiresFill.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/svg-no-blur-filter
// =============================================================================

describe('workspace/svg-no-blur-filter', () => {
  it('has correct rule metadata', () => {
    expect(svgNoBlurFilter.id).toBe('workspace/svg-no-blur-filter');
    expect(svgNoBlurFilter.scope).toBe('workspace');
    expect(typeof svgNoBlurFilter.check).toBe('function');
  });

  it('warns when SVG has feGaussianBlur', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><filter><feGaussianBlur stdDeviation="5"/></filter></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoBlurFilter.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('warns when SVG has blur() CSS function', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><rect style="filter: blur(4px)"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoBlurFilter.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when SVG has no blur filters', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoBlurFilter.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-SVG files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/app.css', 'div { filter: blur(4px); }'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoBlurFilter.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/svg-ids-unique
// =============================================================================

describe('workspace/svg-ids-unique', () => {
  it('has correct rule metadata', () => {
    expect(svgIdsUnique.id).toBe('workspace/svg-ids-unique');
    expect(svgIdsUnique.scope).toBe('workspace');
    expect(typeof svgIdsUnique.check).toBe('function');
  });

  it('errors when same ID appears in different SVG files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/a.svg', '<svg><circle id="icon"/></svg>'],
      ['/workspace/b.svg', '<svg><rect id="icon"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgIdsUnique.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes when all IDs are unique across files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/a.svg', '<svg><circle id="circle-1"/></svg>'],
      ['/workspace/b.svg', '<svg><rect id="rect-1"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgIdsUnique.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when SVG files have no IDs', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/a.svg', '<svg><circle/></svg>'],
      ['/workspace/b.svg', '<svg><rect/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgIdsUnique.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-SVG files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/app.html', '<div id="icon"></div>'],
      ['/workspace/page.html', '<div id="icon"></div>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgIdsUnique.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      allFiles: async (): Promise<readonly string[]> => ['/workspace/bad.svg'],
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await svgIdsUnique.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/svg-requires-aria-role
// =============================================================================

describe('workspace/svg-requires-aria-role', () => {
  it('has correct rule metadata', () => {
    expect(svgRequiresAriaRole.id).toBe('workspace/svg-requires-aria-role');
    expect(svgRequiresAriaRole.scope).toBe('workspace');
    expect(typeof svgRequiresAriaRole.check).toBe('function');
  });

  it('warns when SVG has no ARIA role', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresAriaRole.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when SVG has role="img"', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg role="img" viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresAriaRole.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when SVG has role="presentation"', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg role="presentation"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresAriaRole.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when SVG has role="graphics-symbol"', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg role="graphics-symbol"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresAriaRole.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-SVG files', async () => {
    const files: Map<string, string> = new Map([['/workspace/app.html', '<div>no role</div>']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresAriaRole.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/svg-no-clipped-text
// =============================================================================

describe('workspace/svg-no-clipped-text', () => {
  it('has correct rule metadata', () => {
    expect(svgNoClippedText.id).toBe('workspace/svg-no-clipped-text');
    expect(svgNoClippedText.scope).toBe('workspace');
    expect(typeof svgNoClippedText.check).toBe('function');
  });

  it('warns when SVG text has overflow attribute', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><text overflow="hidden">Hello</text></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoClippedText.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('warns when SVG text has clip-path', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><text clip-path="url(#clip)">Hello</text></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoClippedText.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when SVG text has no clipping attributes', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><text>Hello</text></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoClippedText.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when SVG has no text elements', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoClippedText.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-SVG files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/app.html', '<text overflow="hidden">test</text>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoClippedText.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/svg-title-first-child
// =============================================================================

describe('workspace/svg-title-first-child', () => {
  it('has correct rule metadata', () => {
    expect(svgTitleFirstChild.id).toBe('workspace/svg-title-first-child');
    expect(svgTitleFirstChild.scope).toBe('workspace');
    expect(typeof svgTitleFirstChild.check).toBe('function');
  });

  it('warns when SVG has no <title> element', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgTitleFirstChild.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when SVG has <title> element', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><title>Icon</title><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgTitleFirstChild.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-SVG files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/index.html', '<html><head><title>Page</title></head></html>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgTitleFirstChild.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      allFiles: async (): Promise<readonly string[]> => ['/workspace/bad.svg'],
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await svgTitleFirstChild.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/svg-no-tabindex
// =============================================================================

describe('workspace/svg-no-tabindex', () => {
  it('has correct rule metadata', () => {
    expect(svgNoTabindex.id).toBe('workspace/svg-no-tabindex');
    expect(svgNoTabindex.scope).toBe('workspace');
    expect(typeof svgNoTabindex.check).toBe('function');
  });

  it('warns when SVG has tabindex attribute', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg tabindex="0" viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoTabindex.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when SVG has no tabindex', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoTabindex.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-SVG files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/app.html', '<div tabindex="0">focusable</div>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoTabindex.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/svg-no-mask-fragment
// =============================================================================

describe('workspace/svg-no-mask-fragment', () => {
  it('has correct rule metadata', () => {
    expect(svgNoMaskFragment.id).toBe('workspace/svg-no-mask-fragment');
    expect(svgNoMaskFragment.scope).toBe('workspace');
    expect(typeof svgNoMaskFragment.check).toBe('function');
  });

  it('warns when SVG has mask="url(#...)"', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><rect mask="url(#myMask)"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoMaskFragment.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when SVG has no mask fragments', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoMaskFragment.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-SVG files', async () => {
    const files: Map<string, string> = new Map([['/workspace/app.css', 'div { mask: url(#id); }']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoMaskFragment.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/svg-requires-aria-attrs
// =============================================================================

describe('workspace/svg-requires-aria-attrs', () => {
  it('has correct rule metadata', () => {
    expect(svgRequiresAriaAttrs.id).toBe('workspace/svg-requires-aria-attrs');
    expect(svgRequiresAriaAttrs.scope).toBe('workspace');
    expect(typeof svgRequiresAriaAttrs.check).toBe('function');
  });

  it('warns when SVG has no ARIA attributes', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresAriaAttrs.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when SVG has role="img"', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg role="img" viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresAriaAttrs.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when SVG has role="presentation"', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg role="presentation"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresAriaAttrs.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when SVG has aria-label', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg aria-label="close icon"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresAriaAttrs.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when SVG has aria-hidden', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg aria-hidden="true"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresAriaAttrs.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-SVG files', async () => {
    const files: Map<string, string> = new Map([['/workspace/app.html', '<div>no aria</div>']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresAriaAttrs.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/svg-title-desc-requires-lang
// =============================================================================

describe('workspace/svg-title-desc-requires-lang', () => {
  it('has correct rule metadata', () => {
    expect(svgTitleDescRequiresLang.id).toBe('workspace/svg-title-desc-requires-lang');
    expect(svgTitleDescRequiresLang.scope).toBe('workspace');
    expect(typeof svgTitleDescRequiresLang.check).toBe('function');
  });

  it('warns when <title> has no lang attribute', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><title>Icon</title></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgTitleDescRequiresLang.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('title');
  });

  it('warns when <desc> has no lang attribute', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><desc>A nice icon</desc></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgTitleDescRequiresLang.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('desc');
  });

  it('warns twice when both <title> and <desc> lack lang', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><title>Icon</title><desc>A nice icon</desc></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgTitleDescRequiresLang.check(ctx);
    expect(results.length).toBe(2);
  });

  it('passes when <title> has lang attribute', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><title lang="en">Icon</title></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgTitleDescRequiresLang.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when <desc> has lang attribute', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><desc lang="en">A nice icon</desc></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgTitleDescRequiresLang.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when SVG has no title or desc', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgTitleDescRequiresLang.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-SVG files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/page.html', '<title>Page Title</title>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgTitleDescRequiresLang.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-webp-icons
// =============================================================================

describe('workspace/no-webp-icons', () => {
  it('has correct rule metadata', () => {
    expect(noWebpIcons.id).toBe('workspace/no-webp-icons');
    expect(noWebpIcons.scope).toBe('workspace');
    expect(typeof noWebpIcons.check).toBe('function');
  });

  it('errors when .webp file contains "icon" in name', async () => {
    const files: Map<string, string> = new Map([['/workspace/public/app-icon.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWebpIcons.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('errors when file is favicon.webp', async () => {
    const files: Map<string, string> = new Map([['/workspace/public/favicon.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWebpIcons.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes for regular .webp files', async () => {
    const files: Map<string, string> = new Map([['/workspace/public/hero-image.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWebpIcons.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes for .ico icon files', async () => {
    const files: Map<string, string> = new Map([['/workspace/public/favicon.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWebpIcons.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes for .svg icon files', async () => {
    const files: Map<string, string> = new Map([['/workspace/public/icon.svg', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWebpIcons.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-inline-svg-in-source
// =============================================================================

describe('workspace/no-inline-svg-in-source', () => {
  it('has correct rule metadata', () => {
    expect(noInlineSvgInSource.id).toBe('workspace/no-inline-svg-in-source');
    expect(noInlineSvgInSource.scope).toBe('workspace');
    expect(typeof noInlineSvgInSource.check).toBe('function');
  });

  it('errors when .tsx file contains inline <svg>', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/src/App.tsx',
        'export default () => <svg viewBox="0 0 24 24"><path d="M0"/></svg>',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInlineSvgInSource.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('errors when .jsx file contains inline <svg>', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/App.jsx', 'export default () => <svg><circle r="5"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInlineSvgInSource.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('errors when .html file contains inline <svg>', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/public/index.html', '<html><body><svg><rect/></svg></body></html>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInlineSvgInSource.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('errors when .md file contains inline <svg>', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/readme.md', '# Title\n<svg viewBox="0 0 10 10"><circle r="1"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInlineSvgInSource.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes when source files have no inline SVG', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/App.tsx', 'export default () => <div>Hello</div>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInlineSvgInSource.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-source files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInlineSvgInSource.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      allFiles: async (): Promise<readonly string[]> => ['/workspace/bad.tsx'],
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await noInlineSvgInSource.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-webp-in-css
// =============================================================================

describe('workspace/no-webp-in-css', () => {
  it('has correct rule metadata', () => {
    expect(noWebpInCss.id).toBe('workspace/no-webp-in-css');
    expect(noWebpInCss.scope).toBe('workspace');
    expect(typeof noWebpInCss.check).toBe('function');
  });

  it('warns when CSS file has url() referencing .webp', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/styles/main.css', 'body { background-image: url(hero.webp); }'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWebpInCss.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('warns when SCSS file has url() referencing .webp', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/styles/main.scss', '.hero { background: url("bg.webp"); }'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWebpInCss.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when CSS file has no .webp references', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/styles/main.css', 'body { background-image: url(hero.svg); }'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWebpInCss.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-CSS files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/App.tsx', 'const bg = "url(hero.webp)"'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWebpInCss.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      allFiles: async (): Promise<readonly string[]> => ['/workspace/bad.css'],
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await noWebpInCss.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/no-raw-svg-in-components
// =============================================================================

describe('workspace/no-raw-svg-in-components', () => {
  it('has correct rule metadata', () => {
    expect(noRawSvgInComponents.id).toBe('workspace/no-raw-svg-in-components');
    expect(noRawSvgInComponents.scope).toBe('workspace');
    expect(typeof noRawSvgInComponents.check).toBe('function');
  });

  it('errors when .svelte file contains raw <svg>', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/src/Icon.svelte',
        '<script>export let name;</script>\n<svg viewBox="0 0 24 24"><path d="M0"/></svg>',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noRawSvgInComponents.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('errors when .tsx file contains raw <svg>', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/Icon.tsx', 'export const Icon = () => <svg><path/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noRawSvgInComponents.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes when component files have no raw SVG', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/Icon.svelte', '<script>export let name;</script>\n<Icon {name} />'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noRawSvgInComponents.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-component files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noRawSvgInComponents.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips .jsx files (only .svelte and .tsx targeted)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/Icon.jsx', 'export const Icon = () => <svg><path/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noRawSvgInComponents.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      allFiles: async (): Promise<readonly string[]> => ['/workspace/bad.svelte'],
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await noRawSvgInComponents.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 32 — Image Quality, ICO/WebP Binary Validation Rules
// =============================================================================

// =============================================================================
// workspace/webp-max-size
// =============================================================================

describe('workspace/webp-max-size', () => {
  it('has correct rule metadata', () => {
    expect(webpMaxSize.id).toBe('workspace/webp-max-size');
    expect(webpMaxSize.scope).toBe('workspace');
    expect(typeof webpMaxSize.check).toBe('function');
  });

  it('warns when .webp file exceeds 250KB', async () => {
    const largeContent: string = 'x'.repeat(256_001);
    const files: Map<string, string> = new Map([['/workspace/hero.webp', largeContent]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpMaxSize.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when .webp file is under 250KB', async () => {
    const smallContent: string = 'x'.repeat(100_000);
    const files: Map<string, string> = new Map([['/workspace/icon.webp', smallContent]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpMaxSize.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-.webp files', async () => {
    const files: Map<string, string> = new Map([['/workspace/big.png', 'x'.repeat(500_000)]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpMaxSize.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      allFiles: async (): Promise<readonly string[]> => ['/workspace/bad.webp'],
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await webpMaxSize.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/webp-no-lossless
// =============================================================================

describe('workspace/webp-no-lossless', () => {
  it('has correct rule metadata', () => {
    expect(webpNoLossless.id).toBe('workspace/webp-no-lossless');
    expect(webpNoLossless.scope).toBe('workspace');
    expect(typeof webpNoLossless.check).toBe('function');
  });

  it('warns when .webp uses lossless VP8L encoding', async () => {
    const { readFileSync } = await import('node:fs');
    // Build a minimal RIFF/WEBP header with VP8L chunk
    const buf: Buffer = Buffer.alloc(16);
    buf.write('RIFF', 0, 'ascii');
    buf.writeUInt32LE(8, 4);
    buf.write('WEBP', 8, 'ascii');
    buf.write('VP8L', 12, 'ascii');
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/photo.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoLossless.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    vi.mocked(readFileSync).mockReset();
  });

  it('passes when .webp uses lossy VP8 encoding', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.alloc(16);
    buf.write('RIFF', 0, 'ascii');
    buf.writeUInt32LE(8, 4);
    buf.write('WEBP', 8, 'ascii');
    buf.write('VP8 ', 12, 'ascii');
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/photo.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoLossless.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('skips .webp files too small for header', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockReturnValue(Buffer.alloc(10) as never);
    const files: Map<string, string> = new Map([['/workspace/tiny.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoLossless.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('skips non-.webp files', async () => {
    const files: Map<string, string> = new Map([['/workspace/photo.png', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoLossless.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const files: Map<string, string> = new Map([['/workspace/bad.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoLossless.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });
});

// =============================================================================
// workspace/webp-no-metadata
// =============================================================================

describe('workspace/webp-no-metadata', () => {
  it('has correct rule metadata', () => {
    expect(webpNoMetadata.id).toBe('workspace/webp-no-metadata');
    expect(webpNoMetadata.scope).toBe('workspace');
    expect(typeof webpNoMetadata.check).toBe('function');
  });

  it('warns when .webp contains ICC_PROFILE', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/photo.webp', 'RIFFWEBPICC_PROFILEdata'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoMetadata.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('warns when .webp contains XMP', async () => {
    const files: Map<string, string> = new Map([['/workspace/photo.webp', 'RIFFWEBPsomeXMPdata']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoMetadata.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('warns when .webp contains Exif', async () => {
    const files: Map<string, string> = new Map([['/workspace/photo.webp', 'RIFFWEBPsomeExifdata']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoMetadata.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when .webp has no metadata strings', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/photo.webp', 'RIFFWEBPVP8 cleandata'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoMetadata.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-.webp files', async () => {
    const files: Map<string, string> = new Map([['/workspace/photo.png', 'ICC_PROFILE']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoMetadata.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      allFiles: async (): Promise<readonly string[]> => ['/workspace/bad.webp'],
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await webpNoMetadata.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/ico-min-resolution
// =============================================================================

describe('workspace/ico-min-resolution', () => {
  it('has correct rule metadata', () => {
    expect(icoMinResolution.id).toBe('workspace/ico-min-resolution');
    expect(icoMinResolution.scope).toBe('workspace');
    expect(typeof icoMinResolution.check).toBe('function');
  });

  it('warns when ICO has resolution below 64x64', async () => {
    const { readFileSync } = await import('node:fs');
    // ICO header: 00 00 01 00 (magic), 01 00 (1 image)
    // ICONDIRENTRY at offset 6: width=32, height=32
    const buf: Buffer = Buffer.alloc(22);
    buf[2] = 1; // type = 1 (ICO)
    buf.writeUInt16LE(1, 4); // 1 image
    buf[6] = 32; // width
    buf[7] = 32; // height
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/favicon.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoMinResolution.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    vi.mocked(readFileSync).mockReset();
  });

  it('passes when ICO has 64x64 resolution', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.alloc(22);
    buf[2] = 1;
    buf.writeUInt16LE(1, 4);
    buf[6] = 64; // width
    buf[7] = 64; // height
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/favicon.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoMinResolution.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('passes when ICO has 256x256 resolution (width=0 means 256)', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.alloc(22);
    buf[2] = 1;
    buf.writeUInt16LE(1, 4);
    buf[6] = 0; // width=0 → 256
    buf[7] = 0; // height=0 → 256
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/favicon.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoMinResolution.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('skips ICO files too small for header', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockReturnValue(Buffer.alloc(10) as never);
    const files: Map<string, string> = new Map([['/workspace/tiny.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoMinResolution.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('skips non-.ico files', async () => {
    const files: Map<string, string> = new Map([['/workspace/icon.png', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoMinResolution.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const files: Map<string, string> = new Map([['/workspace/bad.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoMinResolution.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });
});

// =============================================================================
// workspace/no-misleading-image-extension
// =============================================================================

describe('workspace/no-misleading-image-extension', () => {
  it('has correct rule metadata', () => {
    expect(noMisleadingImageExtension.id).toBe('workspace/no-misleading-image-extension');
    expect(noMisleadingImageExtension.scope).toBe('workspace');
    expect(typeof noMisleadingImageExtension.check).toBe('function');
  });

  it('errors when .svg file does not start with XML/SVG content', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', 'This is not an SVG at all'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMisleadingImageExtension.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes when .svg starts with <svg', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMisleadingImageExtension.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when .svg starts with <?xml', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<?xml version="1.0"?><svg><path/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMisleadingImageExtension.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when .svg starts with <!DOCTYPE', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN"><svg></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMisleadingImageExtension.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when .webp file has wrong RIFF header', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.alloc(12);
    buf.write('NOTARIFF', 0, 'ascii');
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/photo.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMisleadingImageExtension.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    vi.mocked(readFileSync).mockReset();
  });

  it('passes when .webp has correct RIFF/WEBP header', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.alloc(12);
    buf.write('RIFF', 0, 'ascii');
    buf.writeUInt32LE(100, 4);
    buf.write('WEBP', 8, 'ascii');
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/photo.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMisleadingImageExtension.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('errors when .ico file has wrong magic bytes', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.from([0xff, 0xff, 0xff, 0xff]);
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/favicon.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMisleadingImageExtension.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    vi.mocked(readFileSync).mockReset();
  });

  it('passes when .ico has correct magic bytes', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.from([0x00, 0x00, 0x01, 0x00]);
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/favicon.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMisleadingImageExtension.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('skips non-image files', async () => {
    const files: Map<string, string> = new Map([['/workspace/app.ts', 'const x = 1;']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMisleadingImageExtension.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips SVG files that cannot be read', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      allFiles: async (): Promise<readonly string[]> => ['/workspace/bad.svg'],
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await noMisleadingImageExtension.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips .webp files that cannot be read', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const files: Map<string, string> = new Map([['/workspace/bad.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMisleadingImageExtension.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('skips .ico files that cannot be read', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const files: Map<string, string> = new Map([['/workspace/bad.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMisleadingImageExtension.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });
});

// =============================================================================
// workspace/svg-valid-xml
// =============================================================================

describe('workspace/svg-valid-xml', () => {
  it('has correct rule metadata', () => {
    expect(svgValidXml.id).toBe('workspace/svg-valid-xml');
    expect(svgValidXml.scope).toBe('workspace');
    expect(typeof svgValidXml.check).toBe('function');
  });

  it('errors when SVG has no <svg> element', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<html><body>Not an SVG</body></html>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgValidXml.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('errors when SVG has unclosed <svg> tag', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgValidXml.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes for well-formed SVG', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgValidXml.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-.svg files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/index.html', '<html><body></body></html>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgValidXml.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      allFiles: async (): Promise<readonly string[]> => ['/workspace/bad.svg'],
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await svgValidXml.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/ico-requires-multiresolution
// =============================================================================

describe('workspace/ico-requires-multiresolution', () => {
  it('has correct rule metadata', () => {
    expect(icoRequiresMultiresolution.id).toBe('workspace/ico-requires-multiresolution');
    expect(icoRequiresMultiresolution.scope).toBe('workspace');
    expect(typeof icoRequiresMultiresolution.check).toBe('function');
  });

  it('errors when ICO has fewer than 3 images', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.alloc(6);
    buf[2] = 1; // type = ICO
    buf.writeUInt16LE(1, 4); // 1 image
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/favicon.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoRequiresMultiresolution.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    vi.mocked(readFileSync).mockReset();
  });

  it('passes when ICO has 3 or more images', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.alloc(6);
    buf[2] = 1;
    buf.writeUInt16LE(3, 4); // 3 images
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/favicon.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoRequiresMultiresolution.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('skips ICO files too small for header', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockReturnValue(Buffer.alloc(4) as never);
    const files: Map<string, string> = new Map([['/workspace/tiny.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoRequiresMultiresolution.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('skips non-.ico files', async () => {
    const files: Map<string, string> = new Map([['/workspace/icon.png', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoRequiresMultiresolution.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const files: Map<string, string> = new Map([['/workspace/bad.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoRequiresMultiresolution.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });
});

// =============================================================================
// workspace/ico-optimal-palette
// =============================================================================

describe('workspace/ico-optimal-palette', () => {
  it('has correct rule metadata', () => {
    expect(icoOptimalPalette.id).toBe('workspace/ico-optimal-palette');
    expect(icoOptimalPalette.scope).toBe('workspace');
    expect(typeof icoOptimalPalette.check).toBe('function');
  });

  it('warns when ICO uses 32-bit color (colorCount=0)', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.alloc(22);
    buf[2] = 1; // type = ICO
    buf.writeUInt16LE(1, 4);
    buf[6] = 64; // width
    buf[7] = 64; // height
    buf[8] = 0; // colorCount=0 means ≥256 colors
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/favicon.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoOptimalPalette.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    vi.mocked(readFileSync).mockReset();
  });

  it('passes when ICO uses 256 or fewer colors', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.alloc(22);
    buf[2] = 1;
    buf.writeUInt16LE(1, 4);
    buf[6] = 64;
    buf[7] = 64;
    buf[8] = 128; // 128 colors
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/favicon.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoOptimalPalette.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('skips ICO files too small for header', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockReturnValue(Buffer.alloc(5) as never);
    const files: Map<string, string> = new Map([['/workspace/tiny.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoOptimalPalette.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('skips non-.ico files', async () => {
    const files: Map<string, string> = new Map([['/workspace/icon.png', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoOptimalPalette.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const files: Map<string, string> = new Map([['/workspace/bad.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoOptimalPalette.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });
});

// =============================================================================
// workspace/webp-no-color-profile
// =============================================================================

describe('workspace/webp-no-color-profile', () => {
  it('has correct rule metadata', () => {
    expect(webpNoColorProfile.id).toBe('workspace/webp-no-color-profile');
    expect(webpNoColorProfile.scope).toBe('workspace');
    expect(typeof webpNoColorProfile.check).toBe('function');
  });

  it('warns when .webp contains ICCP chunk', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/photo.webp', 'RIFFWEBPVP8 dataICCPprofiledata'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoColorProfile.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('warns when .webp contains EXIF chunk', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/photo.webp', 'RIFFWEBPVP8 dataEXIFmetadata'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoColorProfile.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when .webp has no color profiles', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/photo.webp', 'RIFFWEBPVP8 cleandata'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoColorProfile.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-.webp files', async () => {
    const files: Map<string, string> = new Map([['/workspace/photo.png', 'ICCP data']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoColorProfile.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      allFiles: async (): Promise<readonly string[]> => ['/workspace/bad.webp'],
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await webpNoColorProfile.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/webp-yuv420-required
// =============================================================================

describe('workspace/webp-yuv420-required', () => {
  it('has correct rule metadata', () => {
    expect(webpYuv420Required.id).toBe('workspace/webp-yuv420-required');
    expect(webpYuv420Required.scope).toBe('workspace');
    expect(typeof webpYuv420Required.check).toBe('function');
  });

  it('warns when .webp uses VP8L (lossless, not YUV420)', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.alloc(16);
    buf.write('RIFF', 0, 'ascii');
    buf.writeUInt32LE(8, 4);
    buf.write('WEBP', 8, 'ascii');
    buf.write('VP8L', 12, 'ascii');
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/photo.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpYuv420Required.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    vi.mocked(readFileSync).mockReset();
  });

  it('passes when .webp uses VP8 (lossy, YUV420)', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.alloc(16);
    buf.write('RIFF', 0, 'ascii');
    buf.writeUInt32LE(8, 4);
    buf.write('WEBP', 8, 'ascii');
    buf.write('VP8 ', 12, 'ascii');
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/photo.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpYuv420Required.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('passes when .webp uses VP8X (extended)', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.alloc(16);
    buf.write('RIFF', 0, 'ascii');
    buf.writeUInt32LE(8, 4);
    buf.write('WEBP', 8, 'ascii');
    buf.write('VP8X', 12, 'ascii');
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/photo.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpYuv420Required.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('skips .webp files too small for header', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockReturnValue(Buffer.alloc(10) as never);
    const files: Map<string, string> = new Map([['/workspace/tiny.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpYuv420Required.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('skips non-.webp files', async () => {
    const files: Map<string, string> = new Map([['/workspace/photo.png', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpYuv420Required.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const files: Map<string, string> = new Map([['/workspace/bad.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpYuv420Required.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });
});

// =============================================================================
// Phase 33 — GitLab CI, Shell Docblocks, Workspace & MR Rules
// =============================================================================

// workspace/gitlab-ci-file-required
// =============================================================================

describe('workspace/gitlab-ci-file-required', () => {
  it('has correct rule metadata', () => {
    expect(gitlabCiFileRequired.id).toBe('workspace/gitlab-ci-file-required');
    expect(gitlabCiFileRequired.scope).toBe('workspace');
    expect(typeof gitlabCiFileRequired.check).toBe('function');
  });

  it('reports error when .gitlab-ci.yml is missing', async () => {
    const files: Map<string, string> = new Map([['/workspace/package.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiFileRequired.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/gitlab-ci-file-required');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Missing .gitlab-ci.yml');
  });

  it('passes when .gitlab-ci.yml exists', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab-ci.yml', 'stages:\n  - build\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiFileRequired.check(ctx);
    expect(results.length).toBe(0);
  });
});

// workspace/gitlab-ci-schema-header
// =============================================================================

describe('workspace/gitlab-ci-schema-header', () => {
  it('has correct rule metadata', () => {
    expect(gitlabCiSchemaHeader.id).toBe('workspace/gitlab-ci-schema-header');
    expect(gitlabCiSchemaHeader.scope).toBe('workspace');
    expect(typeof gitlabCiSchemaHeader.check).toBe('function');
  });

  it('reports error when CI YAML is missing schema header', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab-ci.yml', 'stages:\n  - build\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiSchemaHeader.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('missing required YAML schema header');
  });

  it('passes when CI YAML has correct schema header', async () => {
    const header: string =
      '# yaml-language-server: $schema=https://gitlab.com/gitlab-org/gitlab/-/raw/master/app/assets/javascripts/editor/schema/ci.json';
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab-ci.yml', `${header}\nstages:\n  - build\n`],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiSchemaHeader.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-CI YAML files', async () => {
    const files: Map<string, string> = new Map([['/workspace/config.yml', 'key: value\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiSchemaHeader.check(ctx);
    expect(results.length).toBe(0);
  });

  it('checks nested CI YAML files under .gitlab/ci/', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab/ci/deploy.yml', 'deploy:\n  script: echo\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiSchemaHeader.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('missing required YAML schema header');
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = mockContext({
      files: new Map([['/workspace/.gitlab-ci.yml', '']]),
    });
    const badCtx: WorkspaceContext = {
      ...ctx,
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await gitlabCiSchemaHeader.check(badCtx);
    expect(results.length).toBe(0);
  });
});

// workspace/gitlab-ci-yaml-syntax
// =============================================================================

describe('workspace/gitlab-ci-yaml-syntax', () => {
  it('has correct rule metadata', () => {
    expect(gitlabCiYamlSyntax.id).toBe('workspace/gitlab-ci-yaml-syntax');
    expect(gitlabCiYamlSyntax.scope).toBe('workspace');
    expect(typeof gitlabCiYamlSyntax.check).toBe('function');
  });

  it('reports error for tab indentation in CI YAML', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab-ci.yml', 'stages:\n\t- build\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiYamlSyntax.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Tab character');
  });

  it('reports error for unbalanced braces', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab-ci.yml', 'variables: {\n  KEY: value\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiYamlSyntax.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Unbalanced braces');
  });

  it('passes for valid CI YAML', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab-ci.yml', 'stages:\n  - build\n  - test\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiYamlSyntax.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-CI YAML files', async () => {
    const files: Map<string, string> = new Map([['/workspace/data.yml', '\t- bad tabs\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiYamlSyntax.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = mockContext({
      files: new Map([['/workspace/.gitlab-ci.yml', '']]),
    });
    const badCtx: WorkspaceContext = {
      ...ctx,
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await gitlabCiYamlSyntax.check(badCtx);
    expect(results.length).toBe(0);
  });
});

// workspace/gitlab-ci-stages-declared
// =============================================================================

describe('workspace/gitlab-ci-stages-declared', () => {
  it('has correct rule metadata', () => {
    expect(gitlabCiStagesDeclared.id).toBe('workspace/gitlab-ci-stages-declared');
    expect(gitlabCiStagesDeclared.scope).toBe('workspace');
    expect(typeof gitlabCiStagesDeclared.check).toBe('function');
  });

  it('reports error when .gitlab-ci.yml lacks stages:', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab-ci.yml', 'build:\n  script: echo hi\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStagesDeclared.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain("Missing required top-level 'stages:'");
  });

  it('passes when stages: is present (list format)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab-ci.yml', 'stages:\n  - build\n  - test\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStagesDeclared.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when stages: is present (inline format)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab-ci.yml', 'stages: [build, test]\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStagesDeclared.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips when .gitlab-ci.yml does not exist', async () => {
    const files: Map<string, string> = new Map([['/workspace/package.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStagesDeclared.check(ctx);
    expect(results.length).toBe(0);
  });
});

// workspace/gitlab-ci-includes-valid
// =============================================================================

describe('workspace/gitlab-ci-includes-valid', () => {
  it('has correct rule metadata', () => {
    expect(gitlabCiIncludesValid.id).toBe('workspace/gitlab-ci-includes-valid');
    expect(gitlabCiIncludesValid.scope).toBe('workspace');
    expect(typeof gitlabCiIncludesValid.check).toBe('function');
  });

  it('reports error for broken include paths', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/.gitlab-ci.yml',
        'include:\n  - local: .gitlab/ci/deploy.yml\n  - local: .gitlab/ci/missing.yml\n',
      ],
      ['/workspace/.gitlab/ci/deploy.yml', 'deploy:\n  script: echo\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiIncludesValid.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('.gitlab/ci/missing.yml');
  });

  it('passes when all include paths exist', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab-ci.yml', 'include:\n  - local: .gitlab/ci/deploy.yml\n'],
      ['/workspace/.gitlab/ci/deploy.yml', 'deploy:\n  script: echo\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiIncludesValid.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when no includes are present', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab-ci.yml', 'stages:\n  - build\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiIncludesValid.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips when .gitlab-ci.yml does not exist', async () => {
    const files: Map<string, string> = new Map([['/workspace/package.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiIncludesValid.check(ctx);
    expect(results.length).toBe(0);
  });
});

// workspace/shell-function-docblocks
// =============================================================================

describe('workspace/shell-function-docblocks', () => {
  it('has correct rule metadata', () => {
    expect(shellFunctionDocblocks.id).toBe('workspace/shell-function-docblocks');
    expect(shellFunctionDocblocks.scope).toBe('workspace');
    expect(typeof shellFunctionDocblocks.check).toBe('function');
  });

  it('reports error for missing Check/Category/Stages comments', async () => {
    const shContent: string = ['check::my_func() {', '  log FATAL "error"', '  return 1', '}'].join(
      '\n',
    );
    const files: Map<string, string> = new Map([['/workspace/checks.sh', shContent]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await shellFunctionDocblocks.check(ctx);
    expect(results.length).toBe(3);
    expect(results.some((r: LintResult): boolean => r.message.includes("'# ✅ Check:'"))).toBe(
      true,
    );
    expect(results.some((r: LintResult): boolean => r.message.includes("'# Category:'"))).toBe(
      true,
    );
    expect(results.some((r: LintResult): boolean => r.message.includes("'# Stages:'"))).toBe(true);
  });

  it('reports error for raw echo/printf', async () => {
    const shContent: string = [
      'check::bad_echo() {',
      '  # ✅ Check: test',
      '  # Category: test',
      '  # Stages: test',
      '  echo "bad output"',
      '  return 1',
      '}',
    ].join('\n');
    const files: Map<string, string> = new Map([['/workspace/checks.sh', shContent]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await shellFunctionDocblocks.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('raw echo/printf'))).toBe(
      true,
    );
  });

  it('reports error for exit 1 instead of return 1', async () => {
    const shContent: string = [
      'check::bad_exit() {',
      '  # ✅ Check: test',
      '  # Category: test',
      '  # Stages: test',
      '  log FATAL "error"',
      '  exit 1',
      '}',
    ].join('\n');
    const files: Map<string, string> = new Map([['/workspace/checks.sh', shContent]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await shellFunctionDocblocks.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes("'exit 1'"))).toBe(true);
  });

  it('reports error for log FATAL without return 1', async () => {
    const shContent: string = [
      'check::no_return() {',
      '  # ✅ Check: test',
      '  # Category: test',
      '  # Stages: test',
      '  log FATAL "error"',
      '}',
    ].join('\n');
    const files: Map<string, string> = new Map([['/workspace/checks.sh', shContent]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await shellFunctionDocblocks.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes("missing 'return 1'"))).toBe(
      true,
    );
  });

  it('passes for properly formatted function', async () => {
    const shContent: string = [
      'check::good_func() {',
      '  # ✅ Check: validates good things',
      '  # Category: test',
      '  # Stages: lint, check',
      '  log FATAL "error found"',
      '  return 1',
      '}',
    ].join('\n');
    const files: Map<string, string> = new Map([['/workspace/checks.sh', shContent]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await shellFunctionDocblocks.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-.sh files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/script.ts', 'check::my_func() {\n}\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await shellFunctionDocblocks.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = mockContext({
      files: new Map([['/workspace/checks.sh', '']]),
    });
    const badCtx: WorkspaceContext = {
      ...ctx,
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await shellFunctionDocblocks.check(badCtx);
    expect(results.length).toBe(0);
  });
});

// workspace/gitlab-ci-jobs-have-script
// =============================================================================

describe('workspace/gitlab-ci-jobs-have-script', () => {
  it('has correct rule metadata', () => {
    expect(gitlabCiJobsHaveScript.id).toBe('workspace/gitlab-ci-jobs-have-script');
    expect(gitlabCiJobsHaveScript.scope).toBe('workspace');
    expect(typeof gitlabCiJobsHaveScript.check).toBe('function');
  });

  it('reports error for CI job without script:', async () => {
    const content: string = ['stages:', '  - build', 'build:', '  stage: build'].join('\n');
    const files: Map<string, string> = new Map([['/workspace/.gitlab-ci.yml', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiJobsHaveScript.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain("'build'");
    expect(results[0]!.message).toContain('missing a script:');
  });

  it('passes when all jobs have script:', async () => {
    const content: string = [
      'stages:',
      '  - build',
      'build:',
      '  stage: build',
      '  script:',
      '    - echo "building"',
    ].join('\n');
    const files: Map<string, string> = new Map([['/workspace/.gitlab-ci.yml', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiJobsHaveScript.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-job keys like stages/include/default', async () => {
    const content: string = [
      'stages:',
      '  - build',
      'include:',
      '  - local: ci.yml',
      'variables:',
      '  KEY: val',
    ].join('\n');
    const files: Map<string, string> = new Map([['/workspace/.gitlab-ci.yml', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiJobsHaveScript.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-CI YAML files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/config.yml', 'job:\n  no_script: true\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiJobsHaveScript.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = mockContext({
      files: new Map([['/workspace/.gitlab-ci.yml', '']]),
    });
    const badCtx: WorkspaceContext = {
      ...ctx,
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await gitlabCiJobsHaveScript.check(badCtx);
    expect(results.length).toBe(0);
  });
});

// workspace/gitlab-ci-standard-naming
// =============================================================================

describe('workspace/gitlab-ci-standard-naming', () => {
  it('has correct rule metadata', () => {
    expect(gitlabCiStandardNaming.id).toBe('workspace/gitlab-ci-standard-naming');
    expect(gitlabCiStandardNaming.scope).toBe('workspace');
    expect(typeof gitlabCiStandardNaming.check).toBe('function');
  });

  it('warns for non-standard job name', async () => {
    const content: string = 'custom_job:\n  script: echo\n';
    const files: Map<string, string> = new Map([['/workspace/.gitlab-ci.yml', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStandardNaming.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('custom_job');
  });

  it('warns for non-standard stage value', async () => {
    const content: string = 'build:\n  stage: custom_stage\n';
    const files: Map<string, string> = new Map([['/workspace/.gitlab-ci.yml', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStandardNaming.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('custom_stage'))).toBe(true);
  });

  it('passes for standard job name and stage', async () => {
    const content: string = 'build:\n  stage: build\n';
    const files: Map<string, string> = new Map([['/workspace/.gitlab-ci.yml', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStandardNaming.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-CI YAML files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/config.yml', 'bad_name:\n  stage: bad\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStandardNaming.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = mockContext({
      files: new Map([['/workspace/.gitlab-ci.yml', '']]),
    });
    const badCtx: WorkspaceContext = {
      ...ctx,
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await gitlabCiStandardNaming.check(badCtx);
    expect(results.length).toBe(0);
  });
});

// workspace/wrangler-authenticated
// =============================================================================

describe('workspace/wrangler-authenticated', () => {
  it('has correct rule metadata', () => {
    expect(wranglerAuthenticated.id).toBe('workspace/wrangler-authenticated');
    expect(wranglerAuthenticated.scope).toBe('workspace');
    expect(typeof wranglerAuthenticated.check).toBe('function');
  });

  it('warns when wrangler whoami fails', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('Not authenticated');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await wranglerAuthenticated.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('not authenticated');
    vi.mocked(execSync).mockReset();
  });

  it('passes when wrangler whoami succeeds', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue(Buffer.from('user@example.com') as never);
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await wranglerAuthenticated.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(execSync).mockReset();
  });
});

// workspace/gitlab-ci-stages-standard
// =============================================================================

describe('workspace/gitlab-ci-stages-standard', () => {
  it('has correct rule metadata', () => {
    expect(gitlabCiStagesStandard.id).toBe('workspace/gitlab-ci-stages-standard');
    expect(gitlabCiStagesStandard.scope).toBe('workspace');
    expect(typeof gitlabCiStagesStandard.check).toBe('function');
  });

  it('reports error for missing required stages', async () => {
    const content: string = 'stages:\n  - build\n  - test\n';
    const files: Map<string, string> = new Map([['/workspace/.gitlab-ci.yml', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStagesStandard.check(ctx);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r: LintResult): boolean => r.message.includes('Missing required'))).toBe(
      true,
    );
  });

  it('reports error for unapproved stages', async () => {
    const stages: string[] = [
      'setup',
      'check',
      'lint',
      'test',
      'build',
      'migrate',
      'deploy',
      'integration',
      'docs',
      'custom',
    ];
    const content: string = `stages:\n${stages.map((s: string): string => `  - ${s}`).join('\n')}\n`;
    const files: Map<string, string> = new Map([['/workspace/.gitlab-ci.yml', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStagesStandard.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes("'custom'"))).toBe(true);
  });

  it('reports error for incorrect stage order', async () => {
    const content: string =
      'stages:\n  - test\n  - setup\n  - check\n  - lint\n  - build\n  - migrate\n  - deploy\n  - integration\n  - docs\n';
    const files: Map<string, string> = new Map([['/workspace/.gitlab-ci.yml', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStagesStandard.check(ctx);
    expect(
      results.some((r: LintResult): boolean => r.message.includes('Incorrect stage order')),
    ).toBe(true);
  });

  it('passes when all stages are correct and in order', async () => {
    const content: string =
      'stages:\n  - setup\n  - check\n  - lint\n  - test\n  - build\n  - migrate\n  - deploy\n  - integration\n  - docs\n';
    const files: Map<string, string> = new Map([['/workspace/.gitlab-ci.yml', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStagesStandard.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-CI YAML files', async () => {
    const files: Map<string, string> = new Map([['/workspace/config.yml', 'stages:\n  - bad\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStagesStandard.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = mockContext({
      files: new Map([['/workspace/.gitlab-ci.yml', '']]),
    });
    const badCtx: WorkspaceContext = {
      ...ctx,
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await gitlabCiStagesStandard.check(badCtx);
    expect(results.length).toBe(0);
  });

  it('skips files without stages array', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab-ci.yml', 'build:\n  script: echo\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStagesStandard.check(ctx);
    expect(results.length).toBe(0);
  });
});

// workspace/cli-tools-help-version
// =============================================================================

describe('workspace/cli-tools-help-version', () => {
  it('has correct rule metadata', () => {
    expect(cliToolsHelpVersion.id).toBe('workspace/cli-tools-help-version');
    expect(cliToolsHelpVersion.scope).toBe('workspace');
    expect(typeof cliToolsHelpVersion.check).toBe('function');
  });

  it('warns when CLI tool lacks --help', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/bin/my-tool.sh', '#!/bin/bash\necho "running"\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await cliToolsHelpVersion.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('--help'))).toBe(true);
  });

  it('warns when CLI tool lacks --version', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/bin/my-tool.sh',
        '#!/bin/bash\nif [[ "$1" == "--help" ]]; then echo "usage"; fi\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await cliToolsHelpVersion.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('--version'))).toBe(true);
  });

  it('passes when CLI tool supports both flags', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/bin/my-tool.sh',
        '#!/bin/bash\n# --help and --version supported\nversion="1.0"\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await cliToolsHelpVersion.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-bin/scripts files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/tool.sh', '#!/bin/bash\necho "no help"\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await cliToolsHelpVersion.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = mockContext({
      files: new Map([['/workspace/bin/tool.sh', '']]),
    });
    const badCtx: WorkspaceContext = {
      ...ctx,
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await cliToolsHelpVersion.check(badCtx);
    expect(results.length).toBe(0);
  });
});

// workspace/workspace-spelling
// =============================================================================

describe('workspace/workspace-spelling', () => {
  it('has correct rule metadata', () => {
    expect(workspaceSpelling.id).toBe('workspace/workspace-spelling');
    expect(workspaceSpelling.scope).toBe('workspace');
    expect(typeof workspaceSpelling.check).toBe('function');
  });

  it('warns when cspell finds errors', async () => {
    const { execSync } = await import('node:child_process');
    const err: Error & { stderr?: Buffer; stdout?: Buffer } = new Error('cspell failed');
    err.stderr = Buffer.from('misspelled word found');
    vi.mocked(execSync).mockImplementation(() => {
      throw err;
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await workspaceSpelling.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('Spelling errors');
    vi.mocked(execSync).mockReset();
  });

  it('passes when cspell succeeds', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue(Buffer.from('') as never);
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await workspaceSpelling.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(execSync).mockReset();
  });
});

// workspace/mr-title-format
// =============================================================================

describe('workspace/mr-title-format', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrTitleFormat.id).toBe('workspace/mr-title-format');
    expect(mrTitleFormat.scope).toBe('workspace');
    expect(typeof mrTitleFormat.check).toBe('function');
  });

  it('reports error for invalid MR title', async () => {
    process.env['CI_MERGE_REQUEST_TITLE'] = 'bad title format';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTitleFormat.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Conventional Commit');
    process.env = { ...originalEnv };
  });

  it('passes for valid conventional commit title', async () => {
    process.env['CI_MERGE_REQUEST_TITLE'] = 'feat(api): add streaming support';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTitleFormat.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes for title without scope', async () => {
    process.env['CI_MERGE_REQUEST_TITLE'] = 'fix: resolve memory leak';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTitleFormat.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when CI_MERGE_REQUEST_TITLE is not set', async () => {
    delete process.env['CI_MERGE_REQUEST_TITLE'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTitleFormat.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when CI_MERGE_REQUEST_TITLE is empty', async () => {
    process.env['CI_MERGE_REQUEST_TITLE'] = '';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTitleFormat.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// workspace/mr-description-required
// =============================================================================

describe('workspace/mr-description-required', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrDescriptionRequired.id).toBe('workspace/mr-description-required');
    expect(mrDescriptionRequired.scope).toBe('workspace');
    expect(typeof mrDescriptionRequired.check).toBe('function');
  });

  it('reports error when description is empty', async () => {
    process.env['CI_MERGE_REQUEST_DESCRIPTION'] = '';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrDescriptionRequired.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('no description');
    process.env = { ...originalEnv };
  });

  it('reports error when description is "null"', async () => {
    process.env['CI_MERGE_REQUEST_DESCRIPTION'] = 'null';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrDescriptionRequired.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    process.env = { ...originalEnv };
  });

  it('passes when description is present', async () => {
    process.env['CI_MERGE_REQUEST_DESCRIPTION'] = 'Adds metrics exporter for Prometheus';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrDescriptionRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when CI_MERGE_REQUEST_DESCRIPTION is not set', async () => {
    delete process.env['CI_MERGE_REQUEST_DESCRIPTION'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrDescriptionRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// Phase 34 — MR Validation Rules
// =============================================================================

// =============================================================================
// workspace/mr-label-enforcement
// =============================================================================

describe('workspace/mr-label-enforcement', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrLabelEnforcement.id).toBe('workspace/mr-label-enforcement');
    expect(mrLabelEnforcement.scope).toBe('workspace');
    expect(typeof mrLabelEnforcement.check).toBe('function');
  });

  it('reports error when no approved label is present', async () => {
    process.env['CI_MERGE_REQUEST_LABELS'] = 'random-label,misc';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelEnforcement.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('missing required domain');
    process.env = { ...originalEnv };
  });

  it('passes when an approved label is present', async () => {
    process.env['CI_MERGE_REQUEST_LABELS'] = 'api,random-label';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelEnforcement.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes with multiple approved labels', async () => {
    process.env['CI_MERGE_REQUEST_LABELS'] = 'frontend,backend,tests';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelEnforcement.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when CI_MERGE_REQUEST_LABELS is not set', async () => {
    delete process.env['CI_MERGE_REQUEST_LABELS'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelEnforcement.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/mr-target-branch-protected
// =============================================================================

describe('workspace/mr-target-branch-protected', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrTargetBranchProtected.id).toBe('workspace/mr-target-branch-protected');
    expect(mrTargetBranchProtected.scope).toBe('workspace');
    expect(typeof mrTargetBranchProtected.check).toBe('function');
  });

  it('reports error when targeting main', async () => {
    process.env['CI_MERGE_REQUEST_TARGET_BRANCH_NAME'] = 'main';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTargetBranchProtected.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('main');
    process.env = { ...originalEnv };
  });

  it('reports error when targeting production', async () => {
    process.env['CI_MERGE_REQUEST_TARGET_BRANCH_NAME'] = 'production';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTargetBranchProtected.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('production');
    process.env = { ...originalEnv };
  });

  it('reports error when targeting prod', async () => {
    process.env['CI_MERGE_REQUEST_TARGET_BRANCH_NAME'] = 'prod';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTargetBranchProtected.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    process.env = { ...originalEnv };
  });

  it('passes for non-protected branch', async () => {
    process.env['CI_MERGE_REQUEST_TARGET_BRANCH_NAME'] = 'staging';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTargetBranchProtected.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when CI_MERGE_REQUEST_TARGET_BRANCH_NAME is not set', async () => {
    delete process.env['CI_MERGE_REQUEST_TARGET_BRANCH_NAME'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTargetBranchProtected.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/mr-draft-block
// =============================================================================

describe('workspace/mr-draft-block', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrDraftBlock.id).toBe('workspace/mr-draft-block');
    expect(mrDraftBlock.scope).toBe('workspace');
    expect(typeof mrDraftBlock.check).toBe('function');
  });

  it('reports error for draft title with uppercase Draft:', async () => {
    process.env['CI_MERGE_REQUEST_TITLE'] = 'Draft: work in progress';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrDraftBlock.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Draft');
    process.env = { ...originalEnv };
  });

  it('reports error for draft title with lowercase draft:', async () => {
    process.env['CI_MERGE_REQUEST_TITLE'] = 'draft: still working';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrDraftBlock.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    process.env = { ...originalEnv };
  });

  it('passes for non-draft title', async () => {
    process.env['CI_MERGE_REQUEST_TITLE'] = 'feat: add new feature';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrDraftBlock.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when CI_MERGE_REQUEST_TITLE is not set', async () => {
    delete process.env['CI_MERGE_REQUEST_TITLE'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrDraftBlock.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/mr-conflicting-labels
// =============================================================================

describe('workspace/mr-conflicting-labels', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrConflictingLabels.id).toBe('workspace/mr-conflicting-labels');
    expect(mrConflictingLabels.scope).toBe('workspace');
    expect(typeof mrConflictingLabels.check).toBe('function');
  });

  it('reports error for hotfix+refactor conflict', async () => {
    process.env['CI_MERGE_REQUEST_LABELS'] = 'hotfix,refactor';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrConflictingLabels.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('hotfix');
    expect(results[0]!.message).toContain('refactor');
    process.env = { ...originalEnv };
  });

  it('reports error for breaking-change+patch conflict', async () => {
    process.env['CI_MERGE_REQUEST_LABELS'] = 'breaking-change,patch';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrConflictingLabels.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('breaking-change');
    expect(results[0]!.message).toContain('patch');
    process.env = { ...originalEnv };
  });

  it('reports error for feature+remove conflict', async () => {
    process.env['CI_MERGE_REQUEST_LABELS'] = 'feature,remove';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrConflictingLabels.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    process.env = { ...originalEnv };
  });

  it('reports multiple errors for multiple conflicts', async () => {
    process.env['CI_MERGE_REQUEST_LABELS'] = 'hotfix,refactor,feature,remove';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrConflictingLabels.check(ctx);
    expect(results.length).toBe(2);
    process.env = { ...originalEnv };
  });

  it('passes with non-conflicting labels', async () => {
    process.env['CI_MERGE_REQUEST_LABELS'] = 'feature,api,frontend';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrConflictingLabels.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when CI_MERGE_REQUEST_LABELS is not set', async () => {
    delete process.env['CI_MERGE_REQUEST_LABELS'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrConflictingLabels.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/mr-size-limit
// =============================================================================

describe('workspace/mr-size-limit', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrSizeLimit.id).toBe('workspace/mr-size-limit');
    expect(mrSizeLimit.scope).toBe('workspace');
    expect(typeof mrSizeLimit.check).toBe('function');
  });

  it('warns when total lines exceed 800', async () => {
    process.env['MR_LINES_ADDED'] = '500';
    process.env['MR_LINES_REMOVED'] = '400';
    delete process.env['MR_FILES_CHANGED'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrSizeLimit.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('900');
    process.env = { ...originalEnv };
  });

  it('warns when files exceed 20', async () => {
    delete process.env['MR_LINES_ADDED'];
    delete process.env['MR_LINES_REMOVED'];
    process.env['MR_FILES_CHANGED'] = '25';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrSizeLimit.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('25');
    process.env = { ...originalEnv };
  });

  it('warns on both lines and files exceeding limits', async () => {
    process.env['MR_LINES_ADDED'] = '600';
    process.env['MR_LINES_REMOVED'] = '300';
    process.env['MR_FILES_CHANGED'] = '30';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrSizeLimit.check(ctx);
    expect(results.length).toBe(2);
    process.env = { ...originalEnv };
  });

  it('passes when under limits', async () => {
    process.env['MR_LINES_ADDED'] = '100';
    process.env['MR_LINES_REMOVED'] = '50';
    process.env['MR_FILES_CHANGED'] = '5';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrSizeLimit.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes at exact boundary (800 lines, 20 files)', async () => {
    process.env['MR_LINES_ADDED'] = '400';
    process.env['MR_LINES_REMOVED'] = '400';
    process.env['MR_FILES_CHANGED'] = '20';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrSizeLimit.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when no size env vars are set', async () => {
    delete process.env['MR_LINES_ADDED'];
    delete process.env['MR_LINES_REMOVED'];
    delete process.env['MR_FILES_CHANGED'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrSizeLimit.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/mr-assignee-required
// =============================================================================

describe('workspace/mr-assignee-required', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrAssigneeRequired.id).toBe('workspace/mr-assignee-required');
    expect(mrAssigneeRequired.scope).toBe('workspace');
    expect(typeof mrAssigneeRequired.check).toBe('function');
  });

  it('reports error when assignee is empty', async () => {
    process.env['MR_ASSIGNEE'] = '';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrAssigneeRequired.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('no assignee');
    process.env = { ...originalEnv };
  });

  it('passes when assignee is set', async () => {
    process.env['MR_ASSIGNEE'] = 'john.doe';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrAssigneeRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_ASSIGNEE is not set', async () => {
    delete process.env['MR_ASSIGNEE'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrAssigneeRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/mr-reviewer-required
// =============================================================================

describe('workspace/mr-reviewer-required', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrReviewerRequired.id).toBe('workspace/mr-reviewer-required');
    expect(mrReviewerRequired.scope).toBe('workspace');
    expect(typeof mrReviewerRequired.check).toBe('function');
  });

  it('reports error when reviewers is empty', async () => {
    process.env['MR_REVIEWERS'] = '';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrReviewerRequired.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('missing reviewers');
    process.env = { ...originalEnv };
  });

  it('passes when reviewers are set', async () => {
    process.env['MR_REVIEWERS'] = 'alice,bob';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrReviewerRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_REVIEWERS is not set', async () => {
    delete process.env['MR_REVIEWERS'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrReviewerRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/mr-blocking-discussions
// =============================================================================

describe('workspace/mr-blocking-discussions', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrBlockingDiscussions.id).toBe('workspace/mr-blocking-discussions');
    expect(mrBlockingDiscussions.scope).toBe('workspace');
    expect(typeof mrBlockingDiscussions.check).toBe('function');
  });

  it('reports error when unresolved discussions exist', async () => {
    process.env['MR_BLOCKING_DISCUSSIONS_COUNT'] = '3';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrBlockingDiscussions.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('3');
    process.env = { ...originalEnv };
  });

  it('passes when count is zero', async () => {
    process.env['MR_BLOCKING_DISCUSSIONS_COUNT'] = '0';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrBlockingDiscussions.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_BLOCKING_DISCUSSIONS_COUNT is not set', async () => {
    delete process.env['MR_BLOCKING_DISCUSSIONS_COUNT'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrBlockingDiscussions.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/mr-wip-commit-check
// =============================================================================

describe('workspace/mr-wip-commit-check', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrWipCommitCheck.id).toBe('workspace/mr-wip-commit-check');
    expect(mrWipCommitCheck.scope).toBe('workspace');
    expect(typeof mrWipCommitCheck.check).toBe('function');
  });

  it('reports error for wip commit message', async () => {
    process.env['MR_COMMITS'] = 'abc1234 wip stuff';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrWipCommitCheck.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('WIP');
    process.env = { ...originalEnv };
  });

  it('reports error for tmp commit message', async () => {
    process.env['MR_COMMITS'] = 'def5678 tmp save';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrWipCommitCheck.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    process.env = { ...originalEnv };
  });

  it('reports error for debug commit message', async () => {
    process.env['MR_COMMITS'] = 'abc1234 debug logging added';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrWipCommitCheck.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    process.env = { ...originalEnv };
  });

  it('reports error for fixme commit message', async () => {
    process.env['MR_COMMITS'] = 'abc1234 fixme later';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrWipCommitCheck.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    process.env = { ...originalEnv };
  });

  it('passes for clean commit messages', async () => {
    process.env['MR_COMMITS'] = 'abc1234 feat: add new feature\ndef5678 fix: resolve bug';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrWipCommitCheck.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_COMMITS is not set', async () => {
    delete process.env['MR_COMMITS'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrWipCommitCheck.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/mr-approval-required
// =============================================================================

describe('workspace/mr-approval-required', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrApprovalRequired.id).toBe('workspace/mr-approval-required');
    expect(mrApprovalRequired.scope).toBe('workspace');
    expect(typeof mrApprovalRequired.check).toBe('function');
  });

  it('reports error when approvals are insufficient (default min=1)', async () => {
    process.env['MR_APPROVAL_COUNT'] = '0';
    delete process.env['MR_APPROVAL_MIN_REQUIRED'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrApprovalRequired.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('0');
    expect(results[0]!.message).toContain('1');
    process.env = { ...originalEnv };
  });

  it('reports error when approvals below custom minimum', async () => {
    process.env['MR_APPROVAL_COUNT'] = '1';
    process.env['MR_APPROVAL_MIN_REQUIRED'] = '3';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrApprovalRequired.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('3');
    process.env = { ...originalEnv };
  });

  it('passes when approvals meet default minimum', async () => {
    process.env['MR_APPROVAL_COUNT'] = '1';
    delete process.env['MR_APPROVAL_MIN_REQUIRED'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrApprovalRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes when approvals exceed custom minimum', async () => {
    process.env['MR_APPROVAL_COUNT'] = '5';
    process.env['MR_APPROVAL_MIN_REQUIRED'] = '3';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrApprovalRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_APPROVAL_COUNT is not set', async () => {
    delete process.env['MR_APPROVAL_COUNT'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrApprovalRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/mr-branch-source-rules
// =============================================================================

describe('workspace/mr-branch-source-rules', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrBranchSourceRules.id).toBe('workspace/mr-branch-source-rules');
    expect(mrBranchSourceRules.scope).toBe('workspace');
    expect(typeof mrBranchSourceRules.check).toBe('function');
  });

  it('reports error for invalid branch name', async () => {
    process.env['MR_SOURCE_BRANCH'] = 'my-random-branch';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrBranchSourceRules.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('my-random-branch');
    process.env = { ...originalEnv };
  });

  it('reports error for branch missing slash', async () => {
    process.env['MR_SOURCE_BRANCH'] = 'feature';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrBranchSourceRules.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    process.env = { ...originalEnv };
  });

  it('passes for valid feature branch', async () => {
    process.env['MR_SOURCE_BRANCH'] = 'feature/add-auth';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrBranchSourceRules.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes for valid fix branch', async () => {
    process.env['MR_SOURCE_BRANCH'] = 'fix/memory-leak';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrBranchSourceRules.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes for valid chore branch', async () => {
    process.env['MR_SOURCE_BRANCH'] = 'chore/update-deps';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrBranchSourceRules.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes for valid hotfix branch', async () => {
    process.env['MR_SOURCE_BRANCH'] = 'hotfix/critical-fix';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrBranchSourceRules.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_SOURCE_BRANCH is not set', async () => {
    delete process.env['MR_SOURCE_BRANCH'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrBranchSourceRules.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/mr-codeowners-approval
// =============================================================================

describe('workspace/mr-codeowners-approval', () => {
  it('has correct rule metadata', () => {
    expect(mrCodeownersApproval.id).toBe('workspace/mr-codeowners-approval');
    expect(mrCodeownersApproval.scope).toBe('workspace');
    expect(typeof mrCodeownersApproval.check).toBe('function');
  });

  it('reports error when CODEOWNERS file is missing', async () => {
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace', files: new Map() });
    const results: LintResult[] = await mrCodeownersApproval.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('CODEOWNERS');
  });

  it('passes when CODEOWNERS file exists', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab/CODEOWNERS', '* @team-lead\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace', files });
    const results: LintResult[] = await mrCodeownersApproval.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/mr-labels-required-per-scope
// =============================================================================

describe('workspace/mr-labels-required-per-scope', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrLabelsRequiredPerScope.id).toBe('workspace/mr-labels-required-per-scope');
    expect(mrLabelsRequiredPerScope.scope).toBe('workspace');
    expect(typeof mrLabelsRequiredPerScope.check).toBe('function');
  });

  it('reports error when api label is missing for api path', async () => {
    process.env['MODIFIED_PATHS'] = 'packages/api/src/index.ts';
    process.env['MR_LABELS'] = 'frontend';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelsRequiredPerScope.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('api');
    process.env = { ...originalEnv };
  });

  it('reports error when ci label is missing for .gitlab path', async () => {
    process.env['MODIFIED_PATHS'] = '.gitlab/ci.yml';
    process.env['MR_LABELS'] = 'frontend';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelsRequiredPerScope.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('ci');
    process.env = { ...originalEnv };
  });

  it('passes when correct labels are present', async () => {
    process.env['MODIFIED_PATHS'] = 'packages/api/src/index.ts packages/docs/README.md';
    process.env['MR_LABELS'] = 'api,docs';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelsRequiredPerScope.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MODIFIED_PATHS is not set', async () => {
    delete process.env['MODIFIED_PATHS'];
    process.env['MR_LABELS'] = 'api';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelsRequiredPerScope.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_LABELS is not set', async () => {
    process.env['MODIFIED_PATHS'] = 'packages/api/src/index.ts';
    delete process.env['MR_LABELS'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelsRequiredPerScope.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/mr-dependency-changes-reviewed
// =============================================================================

describe('workspace/mr-dependency-changes-reviewed', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrDependencyChangesReviewed.id).toBe('workspace/mr-dependency-changes-reviewed');
    expect(mrDependencyChangesReviewed.scope).toBe('workspace');
    expect(typeof mrDependencyChangesReviewed.check).toBe('function');
  });

  it('reports error when package.json changed without deps-reviewed label', async () => {
    process.env['MODIFIED_PATHS'] = 'packages/api/package.json';
    process.env['MR_LABELS'] = 'api';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrDependencyChangesReviewed.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('package.json');
    process.env = { ...originalEnv };
  });

  it('reports error when pnpm-lock.yaml changed without deps-reviewed label', async () => {
    process.env['MODIFIED_PATHS'] = 'pnpm-lock.yaml';
    delete process.env['MR_LABELS'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrDependencyChangesReviewed.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('pnpm-lock.yaml');
    process.env = { ...originalEnv };
  });

  it('passes when deps-reviewed label is present', async () => {
    process.env['MODIFIED_PATHS'] = 'package.json pnpm-lock.yaml';
    process.env['MR_LABELS'] = 'api,deps-reviewed';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrDependencyChangesReviewed.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes when no dependency files are modified', async () => {
    process.env['MODIFIED_PATHS'] = 'src/index.ts README.md';
    process.env['MR_LABELS'] = 'api';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrDependencyChangesReviewed.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MODIFIED_PATHS is not set', async () => {
    delete process.env['MODIFIED_PATHS'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrDependencyChangesReviewed.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/mr-ci-pipeline-passed
// =============================================================================

describe('workspace/mr-ci-pipeline-passed', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrCiPipelinePassed.id).toBe('workspace/mr-ci-pipeline-passed');
    expect(mrCiPipelinePassed.scope).toBe('workspace');
    expect(typeof mrCiPipelinePassed.check).toBe('function');
  });

  it('reports error when pipeline status is failed', async () => {
    process.env['CI_PIPELINE_STATUS'] = 'failed';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrCiPipelinePassed.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('failed');
    process.env = { ...originalEnv };
  });

  it('reports error when pipeline status is running', async () => {
    process.env['CI_PIPELINE_STATUS'] = 'running';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrCiPipelinePassed.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('running');
    process.env = { ...originalEnv };
  });

  it('passes when pipeline status is success', async () => {
    process.env['CI_PIPELINE_STATUS'] = 'success';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrCiPipelinePassed.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when CI_PIPELINE_STATUS is not set', async () => {
    delete process.env['CI_PIPELINE_STATUS'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrCiPipelinePassed.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/mr-up-to-date-with-target
// =============================================================================

describe('workspace/mr-up-to-date-with-target', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrUpToDateWithTarget.id).toBe('workspace/mr-up-to-date-with-target');
    expect(mrUpToDateWithTarget.scope).toBe('workspace');
    expect(typeof mrUpToDateWithTarget.check).toBe('function');
  });

  it('reports error when source branch is behind target', async () => {
    process.env['MR_TARGET_BRANCH'] = 'main';
    process.env['MR_SOURCE_BRANCH'] = 'feature/foo';
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not ancestor');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrUpToDateWithTarget.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('behind');
    vi.mocked(execSync).mockReset();
    process.env = { ...originalEnv };
  });

  it('passes when source branch is up to date', async () => {
    process.env['MR_TARGET_BRANCH'] = 'main';
    process.env['MR_SOURCE_BRANCH'] = 'feature/bar';
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('' as never);
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrUpToDateWithTarget.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(execSync).mockReset();
    process.env = { ...originalEnv };
  });

  it('skips when MR_TARGET_BRANCH is not set', async () => {
    delete process.env['MR_TARGET_BRANCH'];
    process.env['MR_SOURCE_BRANCH'] = 'feature/foo';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrUpToDateWithTarget.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_SOURCE_BRANCH is not set', async () => {
    process.env['MR_TARGET_BRANCH'] = 'main';
    delete process.env['MR_SOURCE_BRANCH'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrUpToDateWithTarget.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// Phase 35 — MR Metadata, Valibot & Vitest Rules
// =============================================================================

// =============================================================================
// workspace/mr-cherry-pick-label
// =============================================================================

describe('workspace/mr-cherry-pick-label', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrCherryPickLabel.id).toBe('workspace/mr-cherry-pick-label');
    expect(mrCherryPickLabel.scope).toBe('workspace');
    expect(typeof mrCherryPickLabel.check).toBe('function');
  });

  it('reports error for cherry-pick title without label', async () => {
    process.env['MR_TITLE'] = 'fix(ui): cherry-pick bug fix';
    process.env['MR_LABELS'] = 'fix,ui';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrCherryPickLabel.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Cherry-pick');
    process.env = { ...originalEnv };
  });

  it('reports error for backport title without label', async () => {
    process.env['MR_TITLE'] = 'fix: backport critical patch';
    process.env['MR_LABELS'] = 'fix';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrCherryPickLabel.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    process.env = { ...originalEnv };
  });

  it('passes for cherry-pick title with cherry-pick label', async () => {
    process.env['MR_TITLE'] = 'fix(ui): cherry-pick bug fix';
    process.env['MR_LABELS'] = 'cherry-pick,fix';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrCherryPickLabel.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes for backport title with backport label', async () => {
    process.env['MR_TITLE'] = 'fix: backport critical patch';
    process.env['MR_LABELS'] = 'backport';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrCherryPickLabel.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes for non-cherry-pick title', async () => {
    process.env['MR_TITLE'] = 'feat: add new feature';
    process.env['MR_LABELS'] = 'feat';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrCherryPickLabel.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_TITLE is not set', async () => {
    delete process.env['MR_TITLE'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrCherryPickLabel.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/mr-test-coverage-diff
// =============================================================================

describe('workspace/mr-test-coverage-diff', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrTestCoverageDiff.id).toBe('workspace/mr-test-coverage-diff');
    expect(mrTestCoverageDiff.scope).toBe('workspace');
    expect(typeof mrTestCoverageDiff.check).toBe('function');
  });

  it('warns when coverage decreased', async () => {
    process.env['COVERAGE_BEFORE'] = '91.3';
    process.env['COVERAGE_AFTER'] = '89.6';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTestCoverageDiff.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('decreased');
    process.env = { ...originalEnv };
  });

  it('passes when coverage increased', async () => {
    process.env['COVERAGE_BEFORE'] = '89.0';
    process.env['COVERAGE_AFTER'] = '91.5';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTestCoverageDiff.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes when coverage unchanged', async () => {
    process.env['COVERAGE_BEFORE'] = '90.0';
    process.env['COVERAGE_AFTER'] = '90.0';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTestCoverageDiff.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when env vars not set', async () => {
    delete process.env['COVERAGE_BEFORE'];
    delete process.env['COVERAGE_AFTER'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTestCoverageDiff.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/mr-label-format
// =============================================================================

describe('workspace/mr-label-format', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrLabelFormat.id).toBe('workspace/mr-label-format');
    expect(mrLabelFormat.scope).toBe('workspace');
    expect(typeof mrLabelFormat.check).toBe('function');
  });

  it('reports error for uppercase label', async () => {
    process.env['MR_LABELS'] = 'FixesBug';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelFormat.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('FixesBug');
    process.env = { ...originalEnv };
  });

  it('reports error for label with spaces', async () => {
    process.env['MR_LABELS'] = 'needs review';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelFormat.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    process.env = { ...originalEnv };
  });

  it('passes for valid kebab-case labels', async () => {
    process.env['MR_LABELS'] = 'api-change,no-changelog,frontend';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelFormat.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_LABELS is not set', async () => {
    delete process.env['MR_LABELS'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelFormat.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/mr-release-label-required
// =============================================================================

describe('workspace/mr-release-label-required', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrReleaseLabelRequired.id).toBe('workspace/mr-release-label-required');
    expect(mrReleaseLabelRequired.scope).toBe('workspace');
    expect(typeof mrReleaseLabelRequired.check).toBe('function');
  });

  it('reports error when targeting release branch without label', async () => {
    process.env['MR_TARGET_BRANCH'] = 'release/1.5.0';
    process.env['MR_LABELS'] = 'changelog';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrReleaseLabelRequired.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('release');
    process.env = { ...originalEnv };
  });

  it('passes when targeting release branch with label', async () => {
    process.env['MR_TARGET_BRANCH'] = 'release/1.5.0';
    process.env['MR_LABELS'] = 'release,changelog';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrReleaseLabelRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes for non-release branch', async () => {
    process.env['MR_TARGET_BRANCH'] = 'staging';
    process.env['MR_LABELS'] = 'feat';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrReleaseLabelRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_TARGET_BRANCH is not set', async () => {
    delete process.env['MR_TARGET_BRANCH'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrReleaseLabelRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/mr-no-force-push-after-review
// =============================================================================

describe('workspace/mr-no-force-push-after-review', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrNoForcePushAfterReview.id).toBe('workspace/mr-no-force-push-after-review');
    expect(mrNoForcePushAfterReview.scope).toBe('workspace');
    expect(typeof mrNoForcePushAfterReview.check).toBe('function');
  });

  it('reports error when force-push after approval', async () => {
    process.env['MR_FORCE_PUSHED_AT'] = '2025-06-13T10:30:00Z';
    process.env['MR_APPROVED_AT'] = '2025-06-13T08:15:00Z';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrNoForcePushAfterReview.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Force-push');
    process.env = { ...originalEnv };
  });

  it('passes when force-push before approval', async () => {
    process.env['MR_FORCE_PUSHED_AT'] = '2025-06-13T06:00:00Z';
    process.env['MR_APPROVED_AT'] = '2025-06-13T08:15:00Z';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrNoForcePushAfterReview.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_FORCE_PUSHED_AT is not set', async () => {
    delete process.env['MR_FORCE_PUSHED_AT'];
    process.env['MR_APPROVED_AT'] = '2025-06-13T08:15:00Z';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrNoForcePushAfterReview.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_APPROVED_AT is not set', async () => {
    process.env['MR_FORCE_PUSHED_AT'] = '2025-06-13T10:30:00Z';
    delete process.env['MR_APPROVED_AT'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrNoForcePushAfterReview.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/mr-license-change-reviewed
// =============================================================================

describe('workspace/mr-license-change-reviewed', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrLicenseChangeReviewed.id).toBe('workspace/mr-license-change-reviewed');
    expect(mrLicenseChangeReviewed.scope).toBe('workspace');
    expect(typeof mrLicenseChangeReviewed.check).toBe('function');
  });

  it('reports error for LICENSE change without label', async () => {
    process.env['MR_CHANGED_FILES'] = 'LICENSE\nREADME.md';
    process.env['MR_LABELS'] = 'changelog';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLicenseChangeReviewed.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('legal-approved');
    process.env = { ...originalEnv };
  });

  it('passes for LICENSE change with legal-approved label', async () => {
    process.env['MR_CHANGED_FILES'] = 'LICENSE';
    process.env['MR_LABELS'] = 'legal-approved';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLicenseChangeReviewed.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes when no license files changed', async () => {
    process.env['MR_CHANGED_FILES'] = 'src/index.ts\nREADME.md';
    process.env['MR_LABELS'] = 'feat';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLicenseChangeReviewed.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_CHANGED_FILES is not set', async () => {
    delete process.env['MR_CHANGED_FILES'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLicenseChangeReviewed.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/mr-config-changes-approved
// =============================================================================

describe('workspace/mr-config-changes-approved', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrConfigChangesApproved.id).toBe('workspace/mr-config-changes-approved');
    expect(mrConfigChangesApproved.scope).toBe('workspace');
    expect(typeof mrConfigChangesApproved.check).toBe('function');
  });

  it('reports error for config change without label', async () => {
    process.env['MR_CHANGED_FILES'] = '.env.production\nsrc/index.ts';
    process.env['MR_LABELS'] = 'feat';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrConfigChangesApproved.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('config-approved');
    process.env = { ...originalEnv };
  });

  it('reports error for wrangler.json change without label', async () => {
    process.env['MR_CHANGED_FILES'] = 'wrangler.json';
    process.env['MR_LABELS'] = 'infra';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrConfigChangesApproved.check(ctx);
    expect(results.length).toBe(1);
    process.env = { ...originalEnv };
  });

  it('passes with config-approved label', async () => {
    process.env['MR_CHANGED_FILES'] = '.env\ntsconfig.json';
    process.env['MR_LABELS'] = 'config-approved';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrConfigChangesApproved.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes when no config files changed', async () => {
    process.env['MR_CHANGED_FILES'] = 'src/index.ts';
    process.env['MR_LABELS'] = 'feat';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrConfigChangesApproved.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_CHANGED_FILES is not set', async () => {
    delete process.env['MR_CHANGED_FILES'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrConfigChangesApproved.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/mr-open-too-long
// =============================================================================

describe('workspace/mr-open-too-long', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrOpenTooLong.id).toBe('workspace/mr-open-too-long');
    expect(mrOpenTooLong.scope).toBe('workspace');
    expect(typeof mrOpenTooLong.check).toBe('function');
  });

  it('warns when MR open >= 10 days', async () => {
    process.env['MR_OPENED_AT'] = '2025-06-01T12:00:00Z';
    process.env['NOW_UTC'] = '2025-06-13T12:00:00Z';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrOpenTooLong.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('12');
    process.env = { ...originalEnv };
  });

  it('passes when MR open < 10 days', async () => {
    process.env['MR_OPENED_AT'] = '2025-06-10T12:00:00Z';
    process.env['NOW_UTC'] = '2025-06-13T12:00:00Z';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrOpenTooLong.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when env vars not set', async () => {
    delete process.env['MR_OPENED_AT'];
    delete process.env['NOW_UTC'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrOpenTooLong.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/mr-automerge-not-enabled-by-default
// =============================================================================

describe('workspace/mr-automerge-not-enabled-by-default', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrAutomergeNotEnabledByDefault.id).toBe('workspace/mr-automerge-not-enabled-by-default');
    expect(mrAutomergeNotEnabledByDefault.scope).toBe('workspace');
    expect(typeof mrAutomergeNotEnabledByDefault.check).toBe('function');
  });

  it('reports error when automerge enabled without pipeline success', async () => {
    process.env['MR_AUTOMERGE_ENABLED'] = '1';
    process.env['MR_PIPELINE_STATUS'] = 'running';
    process.env['MR_APPROVED'] = '1';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrAutomergeNotEnabledByDefault.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('pipeline');
    process.env = { ...originalEnv };
  });

  it('reports error when automerge enabled without approval', async () => {
    process.env['MR_AUTOMERGE_ENABLED'] = '1';
    process.env['MR_PIPELINE_STATUS'] = 'success';
    process.env['MR_APPROVED'] = '0';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrAutomergeNotEnabledByDefault.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('approval');
    process.env = { ...originalEnv };
  });

  it('passes when automerge enabled with success + approval', async () => {
    process.env['MR_AUTOMERGE_ENABLED'] = '1';
    process.env['MR_PIPELINE_STATUS'] = 'success';
    process.env['MR_APPROVED'] = '1';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrAutomergeNotEnabledByDefault.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes when automerge not enabled', async () => {
    process.env['MR_AUTOMERGE_ENABLED'] = '0';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrAutomergeNotEnabledByDefault.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_AUTOMERGE_ENABLED is not set', async () => {
    delete process.env['MR_AUTOMERGE_ENABLED'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrAutomergeNotEnabledByDefault.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/mr-label-conflict-matrix
// =============================================================================

describe('workspace/mr-label-conflict-matrix', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrLabelConflictMatrix.id).toBe('workspace/mr-label-conflict-matrix');
    expect(mrLabelConflictMatrix.scope).toBe('workspace');
    expect(typeof mrLabelConflictMatrix.check).toBe('function');
  });

  it('reports error for breaking-change+patch conflict', async () => {
    process.env['MR_LABELS'] = 'breaking-change,patch';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelConflictMatrix.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('breaking-change');
    process.env = { ...originalEnv };
  });

  it('reports error for hotfix+chore conflict', async () => {
    process.env['MR_LABELS'] = 'hotfix,chore';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelConflictMatrix.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    process.env = { ...originalEnv };
  });

  it('reports error for feature+revert conflict', async () => {
    process.env['MR_LABELS'] = 'feature,revert';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelConflictMatrix.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    process.env = { ...originalEnv };
  });

  it('passes with non-conflicting labels', async () => {
    process.env['MR_LABELS'] = 'feature,api,docs';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelConflictMatrix.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_LABELS is not set', async () => {
    delete process.env['MR_LABELS'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelConflictMatrix.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/mr-sensitive-path-changes
// =============================================================================

describe('workspace/mr-sensitive-path-changes', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrSensitivePathChanges.id).toBe('workspace/mr-sensitive-path-changes');
    expect(mrSensitivePathChanges.scope).toBe('workspace');
    expect(typeof mrSensitivePathChanges.check).toBe('function');
  });

  it('reports error for sensitive path without approval', async () => {
    process.env['MR_CHANGED_FILES'] = 'scripts/deploy.sh\nsrc/index.ts';
    process.env['MR_APPROVED'] = '0';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrSensitivePathChanges.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('sensitive');
    process.env = { ...originalEnv };
  });

  it('reports error for .env file without approval', async () => {
    process.env['MR_CHANGED_FILES'] = '.env.production';
    process.env['MR_APPROVED'] = '0';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrSensitivePathChanges.check(ctx);
    expect(results.length).toBe(1);
    process.env = { ...originalEnv };
  });

  it('passes for sensitive path with approval', async () => {
    process.env['MR_CHANGED_FILES'] = '.gitlab/ci.yml';
    process.env['MR_APPROVED'] = '1';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrSensitivePathChanges.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes for non-sensitive paths', async () => {
    process.env['MR_CHANGED_FILES'] = 'src/utils.ts\nREADME.md';
    process.env['MR_APPROVED'] = '0';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrSensitivePathChanges.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_CHANGED_FILES is not set', async () => {
    delete process.env['MR_CHANGED_FILES'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrSensitivePathChanges.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/mr-test-or-benchmark-regressions
// =============================================================================

describe('workspace/mr-test-or-benchmark-regressions', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrTestOrBenchmarkRegressions.id).toBe('workspace/mr-test-or-benchmark-regressions');
    expect(mrTestOrBenchmarkRegressions.scope).toBe('workspace');
    expect(typeof mrTestOrBenchmarkRegressions.check).toBe('function');
  });

  it('reports error for coverage regression > 0.5%', async () => {
    process.env['MR_COVERAGE_DIFF'] = '-2.3';
    delete process.env['MR_BENCHMARK_DIFF'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTestOrBenchmarkRegressions.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('coverage');
    process.env = { ...originalEnv };
  });

  it('reports error for benchmark regression > 5%', async () => {
    delete process.env['MR_COVERAGE_DIFF'];
    process.env['MR_BENCHMARK_DIFF'] = '8.1';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTestOrBenchmarkRegressions.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('enchmark');
    process.env = { ...originalEnv };
  });

  it('passes when within limits', async () => {
    process.env['MR_COVERAGE_DIFF'] = '-0.3';
    process.env['MR_BENCHMARK_DIFF'] = '2.0';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTestOrBenchmarkRegressions.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when both env vars not set', async () => {
    delete process.env['MR_COVERAGE_DIFF'];
    delete process.env['MR_BENCHMARK_DIFF'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTestOrBenchmarkRegressions.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/valibot-consistency
// =============================================================================

describe('workspace/valibot-consistency', () => {
  it('has correct rule metadata', () => {
    expect(valibotConsistency.id).toBe('workspace/valibot-consistency');
    expect(valibotConsistency.scope).toBe('workspace');
    expect(typeof valibotConsistency.check).toBe('function');
  });

  it('warns on unused Valibot schema', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/schemas.ts', 'const UserSchema = v.object({ name: v.string() });\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await valibotConsistency.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r: LintResult): boolean => r.message.includes('never validated'))).toBe(
      true,
    );
  });

  it('passes for used Valibot schema', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/src/schemas.ts',
        'const UserSchema = v.object({ name: v.string() });\nUserSchema.safeParse(data);\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await valibotConsistency.check(ctx);
    const unused: LintResult[] = results.filter((r: LintResult): boolean =>
      r.message.includes('never validated'),
    );
    expect(unused.length).toBe(0);
  });

  it('warns on raw JSON.parse usage', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/parser.ts', 'const data = JSON.parse(raw);\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await valibotConsistency.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('JSON.parse'))).toBe(true);
  });

  it('warns on inline anonymous v.object schema', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/handler.ts', 'const result = validate(v.object({ id: v.number() }));\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await valibotConsistency.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('Inline anonymous'))).toBe(
      true,
    );
  });

  it('passes for clean .ts files with no issues', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/clean.ts', 'const x = 1;\nexport default x;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await valibotConsistency.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips test files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/parser.test.ts', 'const data = JSON.parse(raw);\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await valibotConsistency.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// workspace/vitest-config-and-coverage
// =============================================================================

describe('workspace/vitest-config-and-coverage', () => {
  it('has correct rule metadata', () => {
    expect(vitestConfigAndCoverage.id).toBe('workspace/vitest-config-and-coverage');
    expect(vitestConfigAndCoverage.scope).toBe('workspace');
    expect(typeof vitestConfigAndCoverage.check).toBe('function');
  });

  it('reports error when no shared vitest config exists', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export default 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await vitestConfigAndCoverage.check(ctx);
    expect(
      results.some((r: LintResult): boolean => r.message.includes('Missing shared vitest.config')),
    ).toBe(true);
  });

  it('passes when shared vitest config exists', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/utils/test/vitest.config.ts', 'export default {};\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await vitestConfigAndCoverage.check(ctx);
    const missing: LintResult[] = results.filter((r: LintResult): boolean =>
      r.message.includes('Missing shared vitest.config'),
    );
    expect(missing.length).toBe(0);
  });

  it('reports error for rogue vitest config', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/utils/test/vitest.config.ts', 'export default {};\n'],
      ['/workspace/packages/api/vitest.config.ts', 'export default {};\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await vitestConfigAndCoverage.check(ctx);
    expect(
      results.some((r: LintResult): boolean => r.message.includes('Unexpected Vitest config')),
    ).toBe(true);
  });

  it('reports error for .snap files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/__snapshots__/test.snap', 'snapshot content'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await vitestConfigAndCoverage.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('Snapshot file'))).toBe(
      true,
    );
  });

  it('reports error for skipped test', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/src/math.test.ts',
        'describe("math", () => {\n  it.skip("adds", () => {});\n});\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await vitestConfigAndCoverage.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('Skipped or focused'))).toBe(
      true,
    );
  });
});

// =============================================================================
// workspace/vitest-config-and-usage
// =============================================================================

describe('workspace/vitest-config-and-usage', () => {
  it('has correct rule metadata', () => {
    expect(vitestConfigAndUsage.id).toBe('workspace/vitest-config-and-usage');
    expect(vitestConfigAndUsage.scope).toBe('workspace');
    expect(typeof vitestConfigAndUsage.check).toBe('function');
  });

  it('reports error when vitest config missing defineConfig', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/vitest.config.ts', 'export default { test: {} };\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await vitestConfigAndUsage.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('defineConfig'))).toBe(true);
  });

  it('reports error when vitest config missing isolate', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/vitest.config.ts',
        'import { defineConfig } from "vitest/config";\nexport default defineConfig({ test: {} });\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await vitestConfigAndUsage.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('isolate'))).toBe(true);
  });

  it('reports error when vitest config missing coverage', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/vitest.config.ts',
        'import { defineConfig } from "vitest/config";\nexport default defineConfig({ test: { isolate: true } });\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await vitestConfigAndUsage.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('Missing coverage'))).toBe(
      true,
    );
  });

  it('passes for proper vitest config', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/vitest.config.ts',
        'import { defineConfig } from "vitest/config";\nexport default defineConfig({ test: { isolate: true, coverage: { lines: 90 } } });\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await vitestConfigAndUsage.check(ctx);
    const issues: LintResult[] = results.filter(
      (r: LintResult): boolean =>
        r.message.includes('defineConfig') ||
        r.message.includes('isolate') ||
        r.message.includes('coverage'),
    );
    expect(issues.length).toBe(0);
  });

  it('reports error for shared vitest export', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/utils/index.ts', "export { describe } from 'vitest';\n"],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await vitestConfigAndUsage.check(ctx);
    expect(
      results.some((r: LintResult): boolean => r.message.includes('exporting test-only')),
    ).toBe(true);
  });

  it('passes when no vitest configs exist', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export default 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await vitestConfigAndUsage.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Phase 36 — DangerJS PR Rules Migration
// =============================================================================

// =============================================================================
// workspace/pr-svg-optimized
// =============================================================================

describe('workspace/pr-svg-optimized', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(prSvgOptimized.id).toBe('workspace/pr-svg-optimized');
    expect(prSvgOptimized.scope).toBe('workspace');
    expect(typeof prSvgOptimized.check).toBe('function');
  });

  it('warns on SVG with xmlns:xlink', async () => {
    const files: Map<string, string> = new Map([
      [
        'icon.svg',
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><rect/></svg>',
      ],
    ]);
    process.env['MR_CHANGED_FILES'] = 'icon.svg';
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await prSvgOptimized.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('not optimized');
    process.env = { ...originalEnv };
  });

  it('warns on SVG with metadata element', async () => {
    const files: Map<string, string> = new Map([
      ['logo.svg', '<svg><metadata><rdf/></metadata><rect/></svg>'],
    ]);
    process.env['MR_CHANGED_FILES'] = 'logo.svg';
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await prSvgOptimized.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    process.env = { ...originalEnv };
  });

  it('warns on SVG with inkscape attributes', async () => {
    const files: Map<string, string> = new Map([
      ['draw.svg', '<svg inkscape:version="1.0"><rect/></svg>'],
    ]);
    process.env['MR_CHANGED_FILES'] = 'draw.svg';
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await prSvgOptimized.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    process.env = { ...originalEnv };
  });

  it('warns on SVG with HTML comments', async () => {
    const files: Map<string, string> = new Map([
      ['commented.svg', '<svg><!-- generated by editor --><rect/></svg>'],
    ]);
    process.env['MR_CHANGED_FILES'] = 'commented.svg';
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await prSvgOptimized.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    process.env = { ...originalEnv };
  });

  it('passes for clean optimized SVG', async () => {
    const files: Map<string, string> = new Map([
      ['clean.svg', '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>'],
    ]);
    process.env['MR_CHANGED_FILES'] = 'clean.svg';
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await prSvgOptimized.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips non-SVG files in MR_CHANGED_FILES', async () => {
    const files: Map<string, string> = new Map([['index.ts', 'export default 1;\n']]);
    process.env['MR_CHANGED_FILES'] = 'index.ts';
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await prSvgOptimized.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('scans all SVGs when MR_CHANGED_FILES not set', async () => {
    delete process.env['MR_CHANGED_FILES'];
    const files: Map<string, string> = new Map([
      ['/workspace/bad.svg', '<svg xmlns:xlink="x"><rect/></svg>'],
      ['/workspace/good.svg', '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await prSvgOptimized.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.file).toContain('bad.svg');
    process.env = { ...originalEnv };
  });

  it('skips files that fail to read', async () => {
    process.env['MR_CHANGED_FILES'] = 'missing.svg';
    const ctx: WorkspaceContext = mockContext({ files: new Map() });
    const results: LintResult[] = await prSvgOptimized.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/pr-branch-commit-mismatch
// =============================================================================

describe('workspace/pr-branch-commit-mismatch', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(prBranchCommitMismatch.id).toBe('workspace/pr-branch-commit-mismatch');
    expect(prBranchCommitMismatch.scope).toBe('workspace');
    expect(typeof prBranchCommitMismatch.check).toBe('function');
  });

  it('reports error when commit does not match branch prefix', async () => {
    process.env['MR_SOURCE_BRANCH'] = 'feature/add-login';
    process.env['MR_COMMITS'] = 'fix: some unrelated change';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prBranchCommitMismatch.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('feature');
    process.env = { ...originalEnv };
  });

  it('passes when commit matches branch prefix', async () => {
    process.env['MR_SOURCE_BRANCH'] = 'fix/login-bug';
    process.env['MR_COMMITS'] = 'fix: resolve login crash';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prBranchCommitMismatch.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes with parenthetical prefix format', async () => {
    process.env['MR_SOURCE_BRANCH'] = 'feat/new-dashboard';
    process.env['MR_COMMITS'] = 'feat(dashboard): add charts';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prBranchCommitMismatch.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips for main branch', async () => {
    process.env['MR_SOURCE_BRANCH'] = 'main';
    process.env['MR_COMMITS'] = 'chore: something';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prBranchCommitMismatch.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips for master branch', async () => {
    process.env['MR_SOURCE_BRANCH'] = 'master';
    process.env['MR_COMMITS'] = 'chore: something';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prBranchCommitMismatch.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_SOURCE_BRANCH not set', async () => {
    delete process.env['MR_SOURCE_BRANCH'];
    process.env['MR_COMMITS'] = 'fix: something';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prBranchCommitMismatch.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_COMMITS not set', async () => {
    process.env['MR_SOURCE_BRANCH'] = 'feature/x';
    delete process.env['MR_COMMITS'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prBranchCommitMismatch.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/pr-description-required
// =============================================================================

describe('workspace/pr-description-required', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(prDescriptionRequired.id).toBe('workspace/pr-description-required');
    expect(prDescriptionRequired.scope).toBe('workspace');
    expect(typeof prDescriptionRequired.check).toBe('function');
  });

  it('reports error for empty description', async () => {
    process.env['MR_DESCRIPTION'] = '';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prDescriptionRequired.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('too short');
    process.env = { ...originalEnv };
  });

  it('reports error for short description', async () => {
    process.env['MR_DESCRIPTION'] = 'Fix bug';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prDescriptionRequired.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('too short');
    process.env = { ...originalEnv };
  });

  it('reports error for whitespace-only description', async () => {
    process.env['MR_DESCRIPTION'] = '         ';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prDescriptionRequired.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    process.env = { ...originalEnv };
  });

  it('passes for adequate description', async () => {
    process.env['MR_DESCRIPTION'] =
      'This PR fixes the login timeout bug by extending the session duration.';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prDescriptionRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes for exactly 10 chars', async () => {
    process.env['MR_DESCRIPTION'] = '1234567890';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prDescriptionRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_DESCRIPTION not set', async () => {
    delete process.env['MR_DESCRIPTION'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prDescriptionRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/pr-no-merge-commits
// =============================================================================

describe('workspace/pr-no-merge-commits', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(prNoMergeCommits.id).toBe('workspace/pr-no-merge-commits');
    expect(prNoMergeCommits.scope).toBe('workspace');
    expect(typeof prNoMergeCommits.check).toBe('function');
  });

  it('reports error for merge branch commit', async () => {
    process.env['MR_COMMITS'] = "Merge branch 'main' into feature/x";
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prNoMergeCommits.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Merge commit detected');
    process.env = { ...originalEnv };
  });

  it('reports error for merge remote-tracking commit', async () => {
    process.env['MR_COMMITS'] = 'Merge remote-tracking branch origin/main';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prNoMergeCommits.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Merge commit detected');
    process.env = { ...originalEnv };
  });

  it('reports multiple merge commits', async () => {
    process.env['MR_COMMITS'] =
      "Merge branch 'main' into feature\nMerge branch 'develop' into feature";
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prNoMergeCommits.check(ctx);
    expect(results.length).toBe(2);
    process.env = { ...originalEnv };
  });

  it('passes for clean commits', async () => {
    process.env['MR_COMMITS'] = 'feat: add new dashboard\nfix: resolve login bug';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prNoMergeCommits.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes for commits with merge in message body but not at start', async () => {
    process.env['MR_COMMITS'] = 'fix: merge resolution for conflict';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prNoMergeCommits.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_COMMITS not set', async () => {
    delete process.env['MR_COMMITS'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prNoMergeCommits.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// workspace/pr-wip-warning
// =============================================================================

describe('workspace/pr-wip-warning', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(prWipWarning.id).toBe('workspace/pr-wip-warning');
    expect(prWipWarning.scope).toBe('workspace');
    expect(typeof prWipWarning.check).toBe('function');
  });

  it('warns for title with [WIP]', async () => {
    process.env['MR_TITLE'] = '[WIP] feat: new dashboard';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prWipWarning.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('Work in Progress');
    process.env = { ...originalEnv };
  });

  it('warns for title with [wip] lowercase', async () => {
    process.env['MR_TITLE'] = '[wip] fix: login';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prWipWarning.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    process.env = { ...originalEnv };
  });

  it('warns for title with [Wip] mixed case', async () => {
    process.env['MR_TITLE'] = '[Wip] chore: cleanup';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prWipWarning.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    process.env = { ...originalEnv };
  });

  it('passes for normal title without WIP', async () => {
    process.env['MR_TITLE'] = 'feat: add dashboard charts';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prWipWarning.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes for title containing WIP without brackets', async () => {
    process.env['MR_TITLE'] = 'feat: improve WIP detection';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prWipWarning.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_TITLE not set', async () => {
    delete process.env['MR_TITLE'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prWipWarning.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

// =============================================================================
// Phase 48 — Configuration Sync Validation Rules
// =============================================================================

// =============================================================================
// sync/turbo-tasks
// =============================================================================

describe('sync/turbo-tasks', () => {
  it('has correct rule metadata', () => {
    expect(syncTurboTasks.id).toBe('sync/turbo-tasks');
    expect(syncTurboTasks.scope).toBe('workspace');
    expect(typeof syncTurboTasks.check).toBe('function');
  });

  it('passes when all turbo task references are valid', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({
          scripts: {
            build: 'turbo build',
            test: 'turbo qa:test',
            ci: 'turbo qa:checks qa:test -- --verbose',
          },
        }),
      ],
      [
        '/workspace/turbo.json',
        JSON.stringify({
          tasks: {
            build: {},
            'qa:test': {},
            'qa:checks': {},
          },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncTurboTasks.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when a turbo task reference does not exist', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({
          scripts: {
            ci: 'turbo nonexistent-task',
          },
        }),
      ],
      [
        '/workspace/turbo.json',
        JSON.stringify({
          tasks: {
            build: {},
          },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncTurboTasks.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('sync/turbo-tasks');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('nonexistent-task');
  });

  it('handles //#  root-task prefix correctly', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({
          scripts: {
            format: 'turbo //#qa:format',
          },
        }),
      ],
      [
        '/workspace/turbo.json',
        JSON.stringify({
          tasks: {
            '//#qa:format': {},
          },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncTurboTasks.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when package.json is missing', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/turbo.json', JSON.stringify({ tasks: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncTurboTasks.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when turbo.json is missing', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ scripts: { ci: 'turbo build' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncTurboTasks.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when no scripts reference turbo', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ scripts: { start: 'node index.js' } })],
      ['/workspace/turbo.json', JSON.stringify({ tasks: { build: {} } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncTurboTasks.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// sync/tsconfig-paths
// =============================================================================

describe('sync/tsconfig-paths', () => {
  it('has correct rule metadata', () => {
    expect(syncTsconfigPaths.id).toBe('sync/tsconfig-paths');
    expect(syncTsconfigPaths.scope).toBe('workspace');
    expect(typeof syncTsconfigPaths.check).toBe('function');
  });

  it('passes when all path alias targets exist', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({
          compilerOptions: {
            paths: {
              '@/utils': ['./packages/utils/src/index.ts'],
            },
          },
        }),
      ],
      ['/workspace/packages/utils/src/index.ts', 'export {}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncTsconfigPaths.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when a path alias target does not exist', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({
          compilerOptions: {
            paths: {
              '@/missing': ['./packages/missing/src/index.ts'],
            },
          },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({
      files,
      rootDir: '/workspace',
    });
    vi.spyOn(ctx, 'dirExists').mockResolvedValue(false);
    const results: LintResult[] = await syncTsconfigPaths.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('sync/tsconfig-paths');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('@/missing');
  });

  it('skips wildcard targets', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({
          compilerOptions: {
            paths: {
              '@/utils/*': ['./packages/utils/src/*'],
            },
          },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncTsconfigPaths.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when tsconfig.json is missing', async () => {
    const files: Map<string, string> = new Map();
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncTsconfigPaths.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// sync/lefthook-scripts
// =============================================================================

describe('sync/lefthook-scripts', () => {
  it('has correct rule metadata', () => {
    expect(syncLefthookScripts.id).toBe('sync/lefthook-scripts');
    expect(syncLefthookScripts.scope).toBe('workspace');
    expect(typeof syncLefthookScripts.check).toBe('function');
  });

  it('passes when all lefthook pnpm scripts exist in package.json', async () => {
    const lefthookContent: string = [
      'commit-msg:',
      '  commands:',
      '    validate:',
      '      run: pnpm run lint:commit --edit {1}',
    ].join('\n');
    const files: Map<string, string> = new Map([
      ['/workspace/lefthook.yml', lefthookContent],
      ['/workspace/package.json', JSON.stringify({ scripts: { 'lint:commit': 'commitlint' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncLefthookScripts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when lefthook references a missing pnpm script', async () => {
    const lefthookContent: string = [
      'commit-msg:',
      '  commands:',
      '    validate:',
      '      run: pnpm lint:commit --edit {1}',
    ].join('\n');
    const files: Map<string, string> = new Map([
      ['/workspace/lefthook.yml', lefthookContent],
      ['/workspace/package.json', JSON.stringify({ scripts: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncLefthookScripts.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('sync/lefthook-scripts');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('lint:commit');
  });

  it('returns empty when no lefthook config found', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ scripts: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncLefthookScripts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('checks alternate lefthook config paths', async () => {
    const lefthookContent: string = [
      'pre-push:',
      '  commands:',
      '    test:',
      '      run: pnpm qa:test',
    ].join('\n');
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/config/lefthook/base.yml', lefthookContent],
      ['/workspace/package.json', JSON.stringify({ scripts: { 'qa:test': 'vitest' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncLefthookScripts.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// sync/onboarding-steps
// =============================================================================

describe('sync/onboarding-steps', () => {
  it('has correct rule metadata', () => {
    expect(syncOnboardingSteps.id).toBe('sync/onboarding-steps');
    expect(syncOnboardingSteps.scope).toBe('workspace');
    expect(typeof syncOnboardingSteps.check).toBe('function');
  });

  it('passes when all onboarding steps are valid scripts', async () => {
    const configContent: string = [
      'export default {',
      '  tooling: {',
      '    onboarding: {',
      "      steps: ['i', 'setup:vscode'],",
      '    },',
      '  },',
      '};',
    ].join('\n');
    const files: Map<string, string> = new Map([
      ['/workspace/resist.config.ts', configContent],
      [
        '/workspace/package.json',
        JSON.stringify({ scripts: { i: 'pnpm install', 'setup:vscode': 'echo setup' } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncOnboardingSteps.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when an onboarding step is not a valid script', async () => {
    const configContent: string = [
      'export default {',
      '  tooling: {',
      '    onboarding: {',
      "      steps: ['i', 'nonexistent-step'],",
      '    },',
      '  },',
      '};',
    ].join('\n');
    const files: Map<string, string> = new Map([
      ['/workspace/resist.config.ts', configContent],
      ['/workspace/package.json', JSON.stringify({ scripts: { i: 'pnpm install' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncOnboardingSteps.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('sync/onboarding-steps');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('nonexistent-step');
  });

  it('returns empty when no resist config found', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ scripts: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncOnboardingSteps.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when package.json is missing', async () => {
    const configContent: string = "export default { tooling: { onboarding: { steps: ['i'] } } };";
    const files: Map<string, string> = new Map([['/workspace/resist.config.ts', configContent]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncOnboardingSteps.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// sync/workflow-scripts
// =============================================================================

describe('sync/workflow-scripts', () => {
  it('has correct rule metadata', () => {
    expect(syncWorkflowScripts.id).toBe('sync/workflow-scripts');
    expect(syncWorkflowScripts.scope).toBe('workspace');
    expect(typeof syncWorkflowScripts.check).toBe('function');
  });

  it('passes when all workflow pnpm scripts are valid', async () => {
    const workflowContent: string = [
      'name: CI',
      'on: push',
      'jobs:',
      '  test:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - run: pnpm install',
      '      - run: pnpm qa:test',
    ].join('\n');
    const files: Map<string, string> = new Map([
      ['/workspace/.github/workflows/ci.yml', workflowContent],
      ['/workspace/package.json', JSON.stringify({ scripts: { 'qa:test': 'vitest' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncWorkflowScripts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when workflow references missing pnpm script', async () => {
    const workflowContent: string = [
      'name: CI',
      'on: push',
      'jobs:',
      '  test:',
      '    steps:',
      '      - run: pnpm nonexistent-script',
    ].join('\n');
    const files: Map<string, string> = new Map([
      ['/workspace/.github/workflows/ci.yml', workflowContent],
      ['/workspace/package.json', JSON.stringify({ scripts: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncWorkflowScripts.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('sync/workflow-scripts');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('nonexistent-script');
  });

  it('skips pnpm built-in commands', async () => {
    const workflowContent: string = [
      'name: CI',
      'on: push',
      'jobs:',
      '  test:',
      '    steps:',
      '      - run: pnpm install',
      '      - run: pnpm dlx turbo build',
      '      - run: pnpm exec vitest',
    ].join('\n');
    const files: Map<string, string> = new Map([
      ['/workspace/.github/workflows/ci.yml', workflowContent],
      ['/workspace/package.json', JSON.stringify({ scripts: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncWorkflowScripts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when no workflow files exist', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ scripts: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncWorkflowScripts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when package.json is missing', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.github/workflows/ci.yml', 'name: CI\non: push'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncWorkflowScripts.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// sync/filter-patterns
// =============================================================================

describe('sync/filter-patterns', () => {
  it('has correct rule metadata', () => {
    expect(syncFilterPatterns.id).toBe('sync/filter-patterns');
    expect(syncFilterPatterns.scope).toBe('workspace');
    expect(typeof syncFilterPatterns.check).toBe('function');
  });

  it('passes when filter paths exist', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({
          scripts: {
            'dev:admin': 'turbo dev --filter=packages/tools/admin --',
          },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncFilterPatterns.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when filter path does not exist', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({
          scripts: {
            'dev:admin': 'turbo dev --filter=packages/tools/nonexistent --',
          },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    vi.spyOn(ctx, 'dirExists').mockResolvedValue(false);
    const results: LintResult[] = await syncFilterPatterns.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('sync/filter-patterns');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('packages/tools/nonexistent');
  });

  it('skips glob filter patterns', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({
          scripts: {
            all: 'turbo build --filter=packages/*',
          },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncFilterPatterns.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips package name selectors', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({
          scripts: {
            test: 'turbo test --filter=@my/package',
          },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncFilterPatterns.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when package.json is missing', async () => {
    const files: Map<string, string> = new Map();
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncFilterPatterns.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// sync/pnpm-workspace
// =============================================================================

describe('sync/pnpm-workspace', () => {
  it('has correct rule metadata', () => {
    expect(syncPnpmWorkspace.id).toBe('sync/pnpm-workspace');
    expect(syncPnpmWorkspace.scope).toBe('workspace');
    expect(typeof syncPnpmWorkspace.check).toBe('function');
  });

  it('passes when all workspace patterns match directories', async () => {
    const workspaceYaml: string = "packages:\n  - 'packages/**'\n";
    const files: Map<string, string> = new Map([['/workspace/pnpm-workspace.yaml', workspaceYaml]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncPnpmWorkspace.check(ctx);
    expect(results.length).toBe(0);
  });

  it('warns when glob base directory does not exist', async () => {
    const workspaceYaml: string = "packages:\n  - 'nonexistent/**'\n";
    const files: Map<string, string> = new Map([['/workspace/pnpm-workspace.yaml', workspaceYaml]]);
    const ctx: WorkspaceContext = mockContext({ files });
    vi.spyOn(ctx, 'dirExists').mockResolvedValue(false);
    const results: LintResult[] = await syncPnpmWorkspace.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('sync/pnpm-workspace');
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('nonexistent');
  });

  it('warns when non-glob pattern directory does not exist', async () => {
    const workspaceYaml: string = "packages:\n  - 'tools/missing'\n";
    const files: Map<string, string> = new Map([['/workspace/pnpm-workspace.yaml', workspaceYaml]]);
    const ctx: WorkspaceContext = mockContext({ files });
    vi.spyOn(ctx, 'dirExists').mockResolvedValue(false);
    const results: LintResult[] = await syncPnpmWorkspace.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('sync/pnpm-workspace');
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('tools/missing');
  });

  it('returns empty when pnpm-workspace.yaml is missing', async () => {
    const files: Map<string, string> = new Map();
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncPnpmWorkspace.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when no patterns in workspace file', async () => {
    const workspaceYaml: string = "catalogs:\n  default:\n    valibot: '^1.0.0'\n";
    const files: Map<string, string> = new Map([['/workspace/pnpm-workspace.yaml', workspaceYaml]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncPnpmWorkspace.check(ctx);
    expect(results.length).toBe(0);
  });
});
