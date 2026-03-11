/**
 * English Locale (CLI Framework)
 *
 * Default locale for CLI framework strings.
 * Parameterized strings use `{placeholder}` syntax instead of lambdas.
 * Plurals use `{name, plural, one {# ...} other {# ...}}` syntax.
 *
 * @module
 */

import type { CliStrings } from '@/cli/locale/schema';

/**
 * English locale strings for the CLI framework.
 *
 * This is the default (and reference) locale. All string keys defined here
 * must be present in every other locale to pass schema validation.
 *
 * @example
 * ```typescript
 * import { en } from '@/cli/locale/locales/en';
 *
 * en.flags.help; // => "Show this help message and exit"
 * ```
 */
export const en: CliStrings = {
  flags: {
    help: 'Show this help message and exit',
    version: 'Show version number and exit',
    verbose: 'Show detailed output for each file processed',
    quiet: 'Suppress all output except errors',
    silent: 'Suppress all output except errors (alias for --quiet)',
    format: 'Set output format: pretty (default), compact, json, github, or junit',
    json: 'Output results as JSON (deprecated — use --format=json instead)',
    group: 'Group results by category in output',
    color: 'Force colored output even when not a TTY',
    noColor: 'Disable colored output',
    concurrency: 'Number of files to process in parallel (default: number of CPU cores)',
    dryRun: 'Show what would be done without making changes',
    failFast: 'Stop immediately when a file fails',
    filter: 'Only process files matching this glob pattern',
    locale: 'Set language for messages (e.g., en)',
    listFiles: 'List matching files and exit without processing',
    ignore: 'Exclude files matching this pattern (can be used multiple times)',
    timeout: 'Maximum time in milliseconds to process each file (0 = no limit)',
    debug: 'Show internal debug information',
    serial: 'Process files one at a time (same as --concurrency=1)',
    progress: 'Show a progress bar during execution',
    stats: 'Show detailed timing and throughput statistics',
    timing: 'Show how long each file took to process',
    summaryOnly: 'Show only the final summary, hide per-file output',
    slowThreshold: 'Warn when a file takes longer than this (milliseconds)',
    githubActions: 'Emit GitHub Actions annotations (deprecated — use --format=github instead)',
    noHeader: 'Hide the tool name and version banner',
    output: 'Write results to this file instead of stdout',
    cwd: 'Run as if started in this directory',
    stdin: 'Read file content from stdin instead of disk',
    stdinFilepath: 'Treat stdin content as if it came from this file path',
    logLevel: 'Set verbosity: silent, error, warn, info, or debug',
  },

  progress: {
    scanning: 'Scanning {count, plural, one {# file} other {# files}}...',
  },

  summary: {
    noFiles: 'No matching files found',
  },

  errors: {
    invalidLocale: 'Unknown locale "{value}". Available locales: {available}',
    invalidFlagValue: 'Invalid value for {flag}: "{value}"',
    missingFlagValue: '{flag} requires a value',
    invalidFormat:
      'Invalid value for {flag}: "{value}". Choose from: pretty, compact, json, github, junit',
    invalidLogLevel:
      'Invalid value for {flag}: "{value}". Choose from: silent, error, warn, info, debug',
    taskTimedOut: 'Task timed out after {timeout}ms: {file}',
    invalidEnvironment:
      'Invalid environment "{value}": expected one of: development, staging, production, or feature/<branch-name>',
    invalidProductName:
      'Invalid product name "{value}": must be lowercase, start with a letter, and contain only letters, numbers, and hyphens',
    cwdNotDirectory: 'Path is not a directory: "{path}"',
  },

  misc: {
    filesCount: '({count, plural, one {# file} other {# files}})',
    otherCategory: 'Other',
  },

  output: {
    statisticsHeader: 'Statistics',
    totalFiles: 'Total files:',
    processed: 'Processed:',
    successLabel: 'Succeeded:',
    unchangedLabel: 'Unchanged:',
    failedLabel: 'Failed:',
    skippedLabel: 'Skipped:',
    timingHeader: 'Timing',
    totalLabel: 'Total:',
    avgPerFile: 'Average per file:',
    slowestLabel: 'Slowest:',
    fastestLabel: 'Fastest:',
    byCategoryHeader: 'By Category',
    skippedStatus: 'skipped',
    allUpToDate: 'All files are already up to date',
    filesProcessed: '{count, plural, one {# file} other {# files}} processed',
    filesFailed: '{count, plural, one {# file} other {# files}} failed',
    usageHeader: 'USAGE',
    optionsHeader: 'OPTIONS',
    examplesHeader: 'EXAMPLES',
    exitCodesHeader: 'EXIT CODES',
    toolOptionsHeader: 'TOOL OPTIONS',
    typeHintValue: '<value>',
    typeHintNumber: '<n>',
    outputWritten: 'Results written to {path}',
    filesFound: 'Found {count, plural, one {# file} other {# files}}',
    successCount: '{count} succeeded',
    unchangedCount: '{count} unchanged',
    failedCount: '{count} failed',
  },

  runner: {
    unknownFlags: 'Unknown option: {flags}',
    interrupted: 'Received {signal}, shutting down...',
    needsFormatting: 'File needs formatting',
    formattedIn: 'Formatted in {duration}',
    filesNeedFormatting: '{count, plural, one {# file needs} other {# files need}} formatting',
    allFormatted:
      'All {count, plural, one {# file} other {# files}} processed successfully in {duration}',
    detailedStatsHeader: 'Detailed Statistics',
    byExtensionHeader: 'By File Extension',
    byFormatterHeader: 'By Formatter',
    moreExtensions: '...and {count} more',
    timingBreakdownHeader: 'Timing Breakdown',
    wallClockTime: 'Wall-clock time:',
    totalCpuTime: 'Total CPU time:',
    parallelizationSpeedup: 'Parallelization speedup:',
  },

  warnings: {
    slowThresholdExceeded:
      '{count, plural, one {# file} other {# files}} took longer than {threshold}ms:',
    andMore: '...and {count} more',
  },

  installer: {},
};
