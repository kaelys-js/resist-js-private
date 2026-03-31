/**
 * resist-lint — English Locale
 *
 * Default locale for all user-facing strings.
 * Parameterized strings use `{placeholder}` syntax.
 *
 * @module
 */

import type { LintStrings } from '@/lint/locale/schema.ts';

/**
 * English locale strings for resist-lint.
 *
 * @example
 * ```typescript
 * import { en } from '@/lint/locale/locales/en';
 * console.log(en.output.noFiles); // "No lintable files found."
 * ```
 */
export const en: LintStrings = {
  cli: {
    configSection: [
      'CONFIGURATION',
      '  Configuration is loaded from {configFilename} at the workspace root.',
      '  Supports JSONC (JSON with line and block comments).',
      '',
      '  The JSON Schema ({schemaFilename}) is auto-generated on each',
      '  lint run for IDE autocomplete with rule descriptions.',
    ].join('\n'),
    examplesHeader: 'EXAMPLES',
    optionsHeader: 'OPTIONS',
    stagesSection: [
      'STAGES',
      '  lint          Default stage — all rules run here',
      '  check         Structural validation checks',
      '  pre-commit    Fast rules for pre-commit hooks',
      '  build         Build-time checks',
      '  ci            CI pipeline checks',
      '  test          Test-related checks',
    ].join('\n'),
    title: '{name} — Custom AST-based linter',
    usageHeader: 'USAGE',
    usageLine: '  {name} <paths...> [options]',
    usageListRules: '  {name} --list-rules',
  },

  debug: {
    afterCategoryFilter: 'After --category={categories} filter: {tsCount} TS, {pkgCount} pkg rules',
    afterRuleFilter: 'After --rule= filter: {tsCount} TS, {pkgCount} pkg rules',
    cacheDeleted: 'Cache file deleted',
    cacheLoaded: 'Cache loaded: {count} entries',
    cacheSaved: 'Cache saved: {hits} hits, {misses} misses, {entries} entries',
    cacheStats: 'Cache: {hits} hits, {misses} misses',
    configLoaded: 'Config loaded from {path}',
    filesFound: 'Found {fileCount} lintable files in {pathCount} path(s)',
    ignorePatternsMerged: 'Merged {count} CLI ignore patterns',
    rulesLoaded: 'Loaded {tsCount} TypeScript rules, {pkgCount} package.json rules',
    toolLoading: 'Loading external tool registry',
    toolResults: 'External tools produced {count} result(s)',
    toolRunning: 'Running {toolCount} external tools on {fileCount} files',
    totalTime: 'Total lint time: {ms}ms',
    workerPoolResults: 'Worker pool produced {count} result(s)',
    workerPoolSize: 'Using worker pool with {threads} threads for {files} files',
    workspaceResults: 'Workspace rules produced {count} result(s)',
    workspaceRunning: 'Running {count} workspace rules',
  },

  errors: {
    crash: 'Linter crashed: {error}',
    duplicateRule: '  Warning: Duplicate rule ID "{ruleId}" — skipping',
    fixApplied: '\nApplied fixes to {count} file(s).',
    fixFailed: '  Failed to apply fixes to: {filePath}',
    invalidConfig: 'Invalid config in {path}:\n{issues}',
    invalidJsonc: 'Invalid JSONC in {path}: {error}',
    jsonParseError: 'JSON parse error',
    pathNotFound: 'Path not found: {path}',
    ruleLoadFailed: '  Warning: Failed to load rule from {path}',
    usageError: 'Usage: {name} <paths...> [--json] [--rule=id] [--list-rules] [--help]',
    usageErrorConfig: 'Or add "include" paths to {configFilename}',
    workerError: '  Warning: Worker error on task {taskId}: {error}',
    workerNotFound: 'Worker {index} not found',
  },

  flags: {
    bail: '--bail                Stop on first file with errors',
    cache: '--cache               Cache file hashes for incremental runs',
    category: '--category=name[,...] Run only rules in the specified category(ies)',
    config: '--config=path         Custom config file path',
    debug: '--debug               Verbose debug logging to stderr',
    diff: '--diff[=mode]         Only lint changed files (head=uncommitted, staged=staged)',
    fix: '--fix                 Auto-apply fixes to source files',
    format:
      '--format=fmt          Output format: text (default), json, sarif, github, junit, compact',
    help: '--help, -h            Show this help message',
    ignore: '--ignore=pat[,pat2]   Additional patterns to exclude',
    jobs: '--jobs=N              Number of worker threads (default: CPU count, 1=single-threaded)',
    json: '--json                Output results as JSON',
    listRules: '--list-rules          Print all rules with severity and patterns',
    locale: '--locale=CODE         Set output locale (default: en)',
    noCache: '--no-cache            Clear cache and run full lint',
    paths: '<paths...>            Paths to lint (files or directories)',
    quiet: '--quiet               Suppress warnings, show only errors',
    rule: '--rule=id[,id2,...]   Run only the specified rule(s)',
    severity: '--severity=level      Override all result severities (error|warn|off)',
    stage: '--stage=name          Run only rules that belong to the specified stage',
    tools: '--tools               Run external tools (shellcheck, hadolint, etc.)',
    warnOnly: '--warn-only           Exit 0 even if errors are found',
  },

  listRules: {
    fixable: ' [fixable]',
    packageJsonHeader: 'Package.json rules:',
    typescriptHeader: 'TypeScript rules:',
    workspaceHeader: 'Workspace rules:',
  },

  listRulesFormat: {
    categoriesLabel: 'categories:',
    debugPrefix: '[debug]',
    patternsLabel: 'patterns:',
    stagesLabel: 'stages:',
  },

  output: {
    diffStatus: '--diff={mode}: {changed}/{total} files changed',
    helpPrefix: 'help',
    noFiles: 'No lintable files found.',
    summary: 'Found {errors} error(s) and {warnings} warning(s) in {files} file(s).',
  },

  schema: {
    configDescription: 'Configuration file for the {linterName} custom linter.',
    excludeDescription: 'Glob patterns to exclude from linting (e.g. "*.test.ts", "*.d.ts").',
    extensionsDescription: 'File extensions to lint (including .svelte.ts).',
    includeDescription: 'Paths to include in linting (relative to workspace root).',
    overridesDescription: 'File-specific rule overrides. Last matching override wins.',
    overridesFilesDescription: 'Glob patterns matching files to apply these overrides to.',
    overridesRulesDescription: 'Rule-level severity overrides for matched files.',
    ruleOptionsAdditionalDescription: 'Options specific to a rule.',
    ruleOptionsDescription:
      'Per-rule configuration options. Keys are rule IDs, values are option objects.\n\n' +
      'Common options:\n' +
      '- categories: string[] — override rule categories for filtering\n' +
      '- stages: string[] — override pipeline stages (lint, check, pre-commit, build, ci, test)',
    ruleSeverityDescription:
      'Rule severity: "error" (exit 1), "warn" (report but pass), "off" (skip).',
    rulesBaseDescription: 'Rule ID → severity mapping. Unlisted rules default to "error".',
    schemaFieldDescription: 'Path to the JSON Schema for IDE autocomplete.',
    title: '{linterName} configuration',
  },

  tools: {
    attwTip: 'Review TypeScript types configuration and package exports',
    codeownersCheckerTip: 'Ensure all CODEOWNERS paths exist and owners are valid',
    codeownersEmpty: 'CODEOWNERS file is empty',
    codeownersEmptyTip: 'Add at least one ownership rule (e.g., "* @org/team").',
    codeownersInvalidOwner: 'Invalid owner format: {owner}',
    codeownersInvalidOwnerTip: 'Owners must be @username, @org/team, or user@example.com.',
    codeownersNoOwners: 'Pattern "{pattern}" has no owners assigned',
    codeownersNoOwnersTip:
      'Add at least one owner (@user, @org/team, or email) after the file pattern.',
    codeownersOverlyBroad:
      'Overly broad pattern: "*" matches all files — consider using more specific patterns',
    codeownersOverlyBroadTip:
      'Use specific path patterns like "src/" or "*.ts" instead of catching everything with "*".',
    codeownersValidFormats: 'Valid owner formats: @user, @org/team, or user@example.com',
    dependencyCruiserMessage: 'Dependency violation: {from} \u2192 {to} ({rule})',
    dependencyCruiserTip: 'Review dependency rules and restructure imports',
    dependabotConfigTip:
      'See https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file',
    dependabotEmpty: 'Dependabot configuration file is empty',
    dependabotEmptyTip: 'Add version: 2 and an updates array to the configuration.',
    dependabotInvalidVersion: 'Invalid version: "{version}" — must be 2',
    dependabotInvalidVersionTip: 'Dependabot configuration requires version: 2.',
    dependabotMissingUpdates: 'Missing required field: updates',
    dependabotMissingUpdatesTip:
      'Add an "updates:" array with at least one package ecosystem entry.',
    dependabotMissingVersion: 'Missing required field: version',
    dependabotMissingVersionTip: 'Add "version: 2" as the first line of the configuration.',
    dependabotUnrecognizedEcosystem: 'Unrecognized package ecosystem: {ecosystem}',
    dependabotValidEcosystems: 'Valid ecosystems: {ecosystems}',
    formatFileNotFormatted: 'File is not formatted',
    formatFileNotProperlyFormatted: 'File is not properly formatted',
    formatIssueDetected: 'Formatting issue detected',
    formatNotProperlyFormattedWithFix: 'File is not properly formatted. Run `{tool}` to fix.',
    formatRequiresChanges: 'File requires formatting changes',
    formatRunTool: 'Run `{tool}` to auto-format this file',
    fundingEmpty: 'FUNDING.yml file is empty',
    fundingEmptyTip: 'Add at least one funding platform (e.g., github, patreon, open_collective).',
    fundingUnrecognized: 'Unrecognized funding platform: {platform}',
    fundingValidPlatforms: 'Valid funding platforms: {platforms}',
    gitattributesTip:
      'Ensure each line has a valid pattern followed by valid, non-conflicting attributes',
    gitleaksMessage: '{description}: secret detected ({secret})',
    gitleaksTip: 'Remove the secret and rotate the credential immediately',
    ignoreFilesTip: 'Remove invalid globs (***), trailing whitespace, and duplicate patterns',
    issueTemplateEmpty: 'Issue template file is empty',
    issueTemplateEmptyTip: 'Add name, description, and labels fields to the issue template.',
    issueTemplateMissingField: 'Missing required field: {field}',
    issueTemplateMissingFieldTip: "Add a '{field}:' field to the top level of the issue template.",
    issueTemplateTip:
      'Ensure the issue template has valid YAML and includes name, description, and labels fields.',
    jscpdMessage: 'Duplicate code found: {lines} lines between {firstName} and {secondName}',
    jscpdTip: 'Extract duplicated code into a shared function or module',
    juliaNotFormatted: 'File is not formatted according to JuliaFormatter',
    juliaTip: 'Run JuliaFormatter with `overwrite=true` to auto-format this file',
    justfileFormatting: 'Justfile has formatting issues',
    justfileFormattingIssue: 'Formatting issue',
    knipUnused: 'Unused {issueType} detected',
    knipUnusedDep: 'Unused dependency: "{symbol}"',
    knipUnusedDevDep: 'Unused dev dependency: "{symbol}"',
    knipUnusedExport: 'Unused export: "{symbol}"',
    knipUnusedFile: 'Unused file detected',
    knipUnusedFileTip: 'Remove this file or add it to knip configuration',
    knipUnusedType: 'Unused type export: "{symbol}"',
    licenseCheckerMessage: 'Problematic license "{license}" found in {package}',
    licenseCheckerTip: 'Review the license for {package} and consider an alternative package',
    lockfileLintTip: 'Ensure lockfiles only reference trusted HTTPS registries',
    lsLintMessage: 'File naming violation: {violation}',
    lsLintTip: 'Rename the file to match the configured naming convention',
    madgeMessage: 'Circular dependency: {chain}',
    madgeTip: 'Break the cycle by extracting shared code into a separate module',
    markdownlintTip: 'Rule: {rule}',
    npmrcTip: 'Each line should be a comment (;/#), blank, or key=value pair',
    nvmrcTip: 'Valid patterns: v18, 18.17.0, lts/*, lts/hydrogen, node, stable',
    prTemplateChecklistTip: 'Add a checklist section with items like "- [ ] Tests added".',
    prTemplateDescriptionTip: 'Add a "## Description" heading to guide PR authors.',
    prTemplateEmpty: 'PR template file is empty',
    prTemplateEmptyTip: 'Add a description section and a review checklist to the PR template.',
    prTemplateMissingChecklist: 'PR template is missing a review checklist',
    prTemplateMissingDescription: 'PR template is missing a description section',
    prTemplateTip:
      'A good PR template includes a description section and a checklist for reviewers.',
    publintMessage: 'publint: {code} at {path}',
    publintTip: 'Review package.json exports and files configuration',
    sortPackageJsonNotSorted: '{file} is not sorted',
    sortPackageJsonTip: 'Run sort-package-json to fix the key ordering',
    syncpackMessage: 'Version mismatch: {package} has mismatched versions across packages',
    syncpackMismatch: 'Version mismatch: {detail}',
    syncpackTip: 'Run syncpack fix-mismatches to align versions',
    terraformNeedsFormatting: 'Terraform files need formatting. Run `terraform fmt` to fix.',
    terraformNeedsFormattingTip: 'Run `terraform fmt` to auto-format Terraform files.',
    toolSeeDocsAt: 'See {url}',
    typosFix: 'Fix: replace "{typo}" with "{correction}"',
    typosMisspelling: '"{typo}" should be "{correction}"',
    typosUnknownCorrection: 'unknown',
  },
};
