/**
 * CLI Framework String Schemas
 *
 * Valibot schemas for framework-level CLI string definitions.
 * These cover standard flags and messages common to all task runners.
 *
 * Uses `messageTemplate()` for parameterized strings — placeholders are
 * validated at locale load time, and params are validated at render time.
 *
 * @module
 */

import * as v from 'valibot';

import { type BuiltLocale, messageTemplate } from '@/locale';
import { LocaleStringSchema, NonNegativeIntegerSchema, StrSchema } from '@/schemas/common';

// ============================================================================
// Standard Flag Description Schemas
// ============================================================================

/**
 * Strings for standard CLI flag descriptions.
 * These are shown in help output for all task runners.
 */
const StandardFlagStringsSchema = v.strictObject({
  /** --help flag description. */
  help: LocaleStringSchema,
  /** --version flag description. */
  version: LocaleStringSchema,
  /** --verbose flag description. */
  verbose: LocaleStringSchema,
  /** --quiet flag description. */
  quiet: LocaleStringSchema,
  /** --silent flag description. */
  silent: LocaleStringSchema,
  /** --format flag description. */
  format: LocaleStringSchema,
  /** --json flag description (deprecated). */
  json: LocaleStringSchema,
  /** --group flag description. */
  group: LocaleStringSchema,
  /** --color flag description. */
  color: LocaleStringSchema,
  /** --no-color flag description. */
  noColor: LocaleStringSchema,
  /** --concurrency flag description. */
  concurrency: LocaleStringSchema,
  /** --dry-run flag description. */
  dryRun: LocaleStringSchema,
  /** --fail-fast flag description. */
  failFast: LocaleStringSchema,
  /** --filter flag description. */
  filter: LocaleStringSchema,
  /** --locale flag description. */
  locale: LocaleStringSchema,
  /** --list-files flag description. */
  listFiles: LocaleStringSchema,
  /** --ignore flag description. */
  ignore: LocaleStringSchema,
  /** --timeout flag description. */
  timeout: LocaleStringSchema,
  /** --debug flag description. */
  debug: LocaleStringSchema,
  /** --serial flag description. */
  serial: LocaleStringSchema,
  /** --progress flag description. */
  progress: LocaleStringSchema,
  /** --stats flag description. */
  stats: LocaleStringSchema,
  /** --timing flag description. */
  timing: LocaleStringSchema,
  /** --summary-only flag description. */
  summaryOnly: LocaleStringSchema,
  /** --slow-threshold flag description. */
  slowThreshold: LocaleStringSchema,
  /** --github-actions flag description (deprecated). */
  githubActions: LocaleStringSchema,
  /** --no-header flag description. */
  noHeader: LocaleStringSchema,
  /** --output flag description. */
  output: LocaleStringSchema,
  /** --cwd flag description. */
  cwd: LocaleStringSchema,
  /** --stdin flag description. */
  stdin: LocaleStringSchema,
  /** --stdin-filepath flag description. */
  stdinFilepath: LocaleStringSchema,
  /** --log-level flag description. */
  logLevel: LocaleStringSchema,
});

// ============================================================================
// Progress Message Schemas
// ============================================================================

/**
 * Strings for progress output during task execution.
 */
const ProgressStringsSchema = v.strictObject({
  /** Message when scanning/discovering files. */
  scanning: messageTemplate({ count: NonNegativeIntegerSchema }),
});

// ============================================================================
// Summary Message Schemas
// ============================================================================

/**
 * Strings for the execution summary displayed at the end.
 */
const SummaryStringsSchema = v.strictObject({
  /** No files found to process. */
  noFiles: LocaleStringSchema,
});

// ============================================================================
// Error Message Schemas
// ============================================================================

/**
 * Strings for error messages.
 */
const ErrorStringsSchema = v.strictObject({
  /** Invalid locale specified. */
  invalidLocale: messageTemplate({ value: StrSchema, available: StrSchema }),
  /** Invalid flag value (generic). */
  invalidFlagValue: messageTemplate({ flag: StrSchema, value: StrSchema }),
  /** Missing required value for flag. */
  missingFlagValue: messageTemplate({ flag: StrSchema }),
  /** Invalid format value. */
  invalidFormat: messageTemplate({ flag: StrSchema, value: StrSchema }),
  /** Invalid log level value. */
  invalidLogLevel: messageTemplate({ flag: StrSchema, value: StrSchema }),
  /** Task timed out. */
  taskTimedOut: messageTemplate({ file: StrSchema, timeout: StrSchema }),
  /** Invalid environment name. */
  invalidEnvironment: messageTemplate({ value: StrSchema }),
  /** Invalid product name. */
  invalidProductName: messageTemplate({ value: StrSchema }),
  /** CWD path is not a directory. */
  cwdNotDirectory: messageTemplate({ path: StrSchema }),
});

// ============================================================================
// Misc Strings Schemas
// ============================================================================

/**
 * Miscellaneous strings used throughout the framework.
 */
const MiscStringsSchema = v.strictObject({
  /** Files count for group header (e.g., "(5 files)"). */
  filesCount: messageTemplate({ count: NonNegativeIntegerSchema }),
  /** "Other" category for uncategorized items. */
  otherCategory: LocaleStringSchema,
});

// ============================================================================
// Output Strings Schemas
// ============================================================================

/**
 * Strings for output labels and messages.
 */
const OutputStringsSchema = v.strictObject({
  /** "Statistics:" header. */
  statisticsHeader: LocaleStringSchema,
  /** "Total files:" label. */
  totalFiles: LocaleStringSchema,
  /** "Processed:" label. */
  processed: LocaleStringSchema,
  /** "Success:" label. */
  successLabel: LocaleStringSchema,
  /** "Unchanged:" label. */
  unchangedLabel: LocaleStringSchema,
  /** "Failed:" label. */
  failedLabel: LocaleStringSchema,
  /** "Skipped:" label. */
  skippedLabel: LocaleStringSchema,
  /** "Timing:" header. */
  timingHeader: LocaleStringSchema,
  /** "Total:" label. */
  totalLabel: LocaleStringSchema,
  /** "Avg per file:" label. */
  avgPerFile: LocaleStringSchema,
  /** "Slowest:" label. */
  slowestLabel: LocaleStringSchema,
  /** "Fastest:" label. */
  fastestLabel: LocaleStringSchema,
  /** "By category:" header. */
  byCategoryHeader: LocaleStringSchema,
  /** "skipped" status label. */
  skippedStatus: LocaleStringSchema,
  /** "All files already up to date" message. */
  allUpToDate: LocaleStringSchema,
  /** Files processed success message. */
  filesProcessed: messageTemplate({ count: NonNegativeIntegerSchema }),
  /** Files failed message. */
  filesFailed: messageTemplate({ count: NonNegativeIntegerSchema }),
  /** "Usage:" header. */
  usageHeader: LocaleStringSchema,
  /** "Options:" header. */
  optionsHeader: LocaleStringSchema,
  /** "Examples:" header. */
  examplesHeader: LocaleStringSchema,
  /** "Exit Codes:" header. */
  exitCodesHeader: LocaleStringSchema,
  /** "Tool Options:" header for tool-specific flags. */
  toolOptionsHeader: LocaleStringSchema,
  /** Type hint for string value. */
  typeHintValue: LocaleStringSchema,
  /** Type hint for number value. */
  typeHintNumber: LocaleStringSchema,
  /** Output written to file message. */
  outputWritten: messageTemplate({ path: StrSchema }),
  /** Files found count. */
  filesFound: messageTemplate({ count: NonNegativeIntegerSchema }),
  /** "success" count label. */
  successCount: messageTemplate({ count: NonNegativeIntegerSchema }),
  /** "unchanged" count label. */
  unchangedCount: messageTemplate({ count: NonNegativeIntegerSchema }),
  /** "failed" count label. */
  failedCount: messageTemplate({ count: NonNegativeIntegerSchema }),
});

// ============================================================================
// Runner Strings Schemas
// ============================================================================

/**
 * Strings for runner-specific messages.
 */
const RunnerStringsSchema = v.strictObject({
  /** Unknown flags error message. */
  unknownFlags: messageTemplate({ flags: StrSchema }),
  /** Interrupted signal message. */
  interrupted: messageTemplate({ signal: StrSchema }),
  /** File needs formatting error. */
  needsFormatting: LocaleStringSchema,
  /** Formatted in duration message. */
  formattedIn: messageTemplate({ duration: StrSchema }),
  /** Files need formatting error for GitHub Actions. */
  filesNeedFormatting: messageTemplate({ count: NonNegativeIntegerSchema }),
  /** All files formatted successfully message. */
  allFormatted: messageTemplate({ count: NonNegativeIntegerSchema, duration: StrSchema }),
  /** Detailed Statistics header. */
  detailedStatsHeader: LocaleStringSchema,
  /** By Extension header. */
  byExtensionHeader: LocaleStringSchema,
  /** By Formatter header. */
  byFormatterHeader: LocaleStringSchema,
  /** "... and X more extensions" message. */
  moreExtensions: messageTemplate({ count: NonNegativeIntegerSchema }),
  /** Timing Breakdown header. */
  timingBreakdownHeader: LocaleStringSchema,
  /** Wall-clock time label. */
  wallClockTime: LocaleStringSchema,
  /** Total CPU time label. */
  totalCpuTime: LocaleStringSchema,
  /** Parallelization speedup label. */
  parallelizationSpeedup: LocaleStringSchema,
});

// ============================================================================
// Warning Strings Schemas
// ============================================================================

/**
 * Strings for warning messages.
 */
const WarningStringsSchema = v.strictObject({
  /** Slow threshold exceeded message. */
  slowThresholdExceeded: messageTemplate({
    count: NonNegativeIntegerSchema,
    threshold: NonNegativeIntegerSchema,
  }),
  /** "... and X more" message. */
  andMore: messageTemplate({ count: NonNegativeIntegerSchema }),
});

// ============================================================================
// Installer Strings Schemas
// ============================================================================

/**
 * Strings for tool installer utilities.
 * Used by the shared installer for error messages during tool installation.
 */
const InstallerStringsSchema = v.strictObject({});

// ============================================================================
// Root Schema
// ============================================================================

/**
 * Root schema containing all CLI framework strings.
 * Each locale file must provide an object matching this schema.
 */
export const CliStringsSchema = v.strictObject({
  /** Strings for standard flag descriptions. */
  flags: StandardFlagStringsSchema,
  /** Strings for progress messages. */
  progress: ProgressStringsSchema,
  /** Strings for execution summary. */
  summary: SummaryStringsSchema,
  /** Strings for error messages. */
  errors: ErrorStringsSchema,
  /** Miscellaneous strings. */
  misc: MiscStringsSchema,
  /** Strings for output formatting. */
  output: OutputStringsSchema,
  /** Strings for runner messages. */
  runner: RunnerStringsSchema,
  /** Strings for warning messages. */
  warnings: WarningStringsSchema,
  /** Strings for tool installer utilities. */
  installer: InstallerStringsSchema,
});

// ============================================================================
// Types
// ============================================================================

/** Raw locale strings type (pre-build). Used to type en.ts locale files. */
export type CliStrings = v.InferOutput<typeof CliStringsSchema>;

/** Built locale type (post-build). Every key is a callable `(params?) => Result<Str>`. */
export type BuiltCliStrings = BuiltLocale<typeof CliStringsSchema>;
