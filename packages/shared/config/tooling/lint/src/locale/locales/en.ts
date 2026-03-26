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
    title: '{name} — Custom AST-based linter',
    usageHeader: 'USAGE',
    usageLine: '  {name} <paths...> [options]',
    usageListRules: '  {name} --list-rules',
    optionsHeader: 'OPTIONS',
    configSection: [
      'CONFIGURATION',
      '  Configuration is loaded from {configFilename} at the workspace root.',
      '  Supports JSONC (JSON with line and block comments).',
      '',
      '  The JSON Schema ({schemaFilename}) is auto-generated on each',
      '  lint run for IDE autocomplete with rule descriptions.',
    ].join('\n'),
    stagesSection: [
      'STAGES',
      '  lint          Default stage — all rules run here',
      '  check         Structural validation checks',
      '  pre-commit    Fast rules for pre-commit hooks',
      '  build         Build-time checks',
      '  ci            CI pipeline checks',
      '  test          Test-related checks',
    ].join('\n'),
    examplesHeader: 'EXAMPLES',
  },

  flags: {
    paths: '<paths...>            Paths to lint (files or directories)',
    rule: '--rule=id[,id2,...]   Run only the specified rule(s)',
    category: '--category=name[,...] Run only rules in the specified category(ies)',
    stage: '--stage=name          Run only rules that belong to the specified stage',
    fix: '--fix                 Auto-apply fixes to source files',
    json: '--json                Output results as JSON',
    listRules: '--list-rules          Print all rules with severity and patterns',
    quiet: '--quiet               Suppress warnings, show only errors',
    bail: '--bail                Stop on first file with errors',
    ignore: '--ignore=pat[,pat2]   Additional patterns to exclude',
    config: '--config=path         Custom config file path',
    severity: '--severity=level      Override all result severities (error|warn|off)',
    diff: '--diff[=mode]         Only lint changed files (head=uncommitted, staged=staged)',
    format:
      '--format=fmt          Output format: text (default), json, sarif, github, junit, compact',
    jobs: '--jobs=N              Number of worker threads (default: CPU count, 1=single-threaded)',
    tools: '--tools               Run external tools (shellcheck, hadolint, etc.)',
    cache: '--cache               Cache file hashes for incremental runs',
    noCache: '--no-cache            Clear cache and run full lint',
    debug: '--debug               Verbose debug logging to stderr',
    warnOnly: '--warn-only           Exit 0 even if errors are found',
    help: '--help, -h            Show this help message',
  },

  output: {
    summary: 'Found {errors} error(s) and {warnings} warning(s) in {files} file(s).',
    noFiles: 'No lintable files found.',
    diffStatus: '--diff={mode}: {changed}/{total} files changed',
    helpPrefix: 'help',
  },

  listRules: {
    typescriptHeader: 'TypeScript rules:',
    packageJsonHeader: 'Package.json rules:',
    workspaceHeader: 'Workspace rules:',
    fixable: ' [fixable]',
  },

  debug: {
    configLoaded: 'Config loaded from {path}',
    ignorePatternsMerged: 'Merged {count} CLI ignore patterns',
    rulesLoaded: 'Loaded {tsCount} TypeScript rules, {pkgCount} package.json rules',
    afterRuleFilter: 'After --rule= filter: {tsCount} TS, {pkgCount} pkg rules',
    afterCategoryFilter: 'After --category={categories} filter: {tsCount} TS, {pkgCount} pkg rules',
    filesFound: 'Found {fileCount} lintable files in {pathCount} path(s)',
    cacheLoaded: 'Cache loaded: {count} entries',
    cacheDeleted: 'Cache file deleted',
    workerPoolSize: 'Using worker pool with {threads} threads for {files} files',
    workerPoolResults: 'Worker pool produced {count} result(s)',
    cacheStats: 'Cache: {hits} hits, {misses} misses',
    workspaceRunning: 'Running {count} workspace rules',
    workspaceResults: 'Workspace rules produced {count} result(s)',
    toolLoading: 'Loading external tool registry',
    toolRunning: 'Running {toolCount} external tools on {fileCount} files',
    toolResults: 'External tools produced {count} result(s)',
    cacheSaved: 'Cache saved: {hits} hits, {misses} misses, {entries} entries',
    totalTime: 'Total lint time: {ms}ms',
  },
};
