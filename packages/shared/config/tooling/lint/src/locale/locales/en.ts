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

  tools: {
    knipUnused: 'Unused {issueType} detected',
    knipUnusedDep: 'Unused dependency: "{symbol}"',
    knipUnusedDevDep: 'Unused dev dependency: "{symbol}"',
    knipUnusedExport: 'Unused export: "{symbol}"',
    knipUnusedFile: 'Unused file detected',
    knipUnusedFileTip: 'Remove this file or add it to knip configuration',
    knipUnusedType: 'Unused type export: "{symbol}"',
    typosFix: 'Fix: replace "{typo}" with "{correction}"',
    typosMisspelling: '"{typo}" should be "{correction}"',
    typosUnknownCorrection: 'unknown',
  },
};
