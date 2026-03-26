/**
 * resist-lint — Locale String Schema
 *
 * Defines the shape of all user-facing strings in the linter.
 * Each string group is a Valibot schema. Parameterized strings
 * use `{placeholder}` syntax and are rendered via {@link format}.
 *
 * @module
 */

import * as v from 'valibot';

// =============================================================================
// Template Formatting
// =============================================================================

/**
 * Replace `{placeholder}` tokens in a template string with values.
 *
 * @param {string} template - Template string with `{key}` placeholders
 * @param {Record<string, string | number>} params - Key-value pairs to substitute
 * @returns {string} Rendered string
 *
 * @example
 * ```typescript
 * const result = format('Found {errors} error(s) in {files} file(s).', { errors: 3, files: 10 });
 * // 'Found 3 error(s) in 10 file(s).'
 * ```
 */
export function format(template: string, params: Record<string, string | number>): string {
  let result: string = template;
  for (const [key, value] of Object.entries(params)) {
    result = result.replaceAll(`{${key}}`, String(value));
  }
  return result;
}

// =============================================================================
// String Group Schemas
// =============================================================================

/** Strings for CLI help text sections. */
const CliStringsSchema = v.strictObject({
  /** Title line: "{name} — Custom AST-based linter" */
  title: v.string(),
  /** Usage section header. */
  usageHeader: v.string(),
  /** Usage line 1: "{name} <paths...> [options]" */
  usageLine: v.string(),
  /** Usage line 2: "{name} --list-rules" */
  usageListRules: v.string(),
  /** Options section header. */
  optionsHeader: v.string(),
  /** Configuration section text. */
  configSection: v.string(),
  /** Stages section text. */
  stagesSection: v.string(),
  /** Examples section header. */
  examplesHeader: v.string(),
});

/** Strings for CLI flag descriptions (shown in --help). */
const FlagStringsSchema = v.strictObject({
  /** <paths...> description. */
  paths: v.string(),
  /** --rule description. */
  rule: v.string(),
  /** --category description. */
  category: v.string(),
  /** --stage description. */
  stage: v.string(),
  /** --fix description. */
  fix: v.string(),
  /** --json description. */
  json: v.string(),
  /** --list-rules description. */
  listRules: v.string(),
  /** --quiet description. */
  quiet: v.string(),
  /** --bail description. */
  bail: v.string(),
  /** --ignore description. */
  ignore: v.string(),
  /** --config description. */
  config: v.string(),
  /** --severity description. */
  severity: v.string(),
  /** --diff description. */
  diff: v.string(),
  /** --format description. */
  format: v.string(),
  /** --jobs description. */
  jobs: v.string(),
  /** --tools description. */
  tools: v.string(),
  /** --cache description. */
  cache: v.string(),
  /** --no-cache description. */
  noCache: v.string(),
  /** --debug description. */
  debug: v.string(),
  /** --warn-only description. */
  warnOnly: v.string(),
  /** --help description. */
  help: v.string(),
});

/** Strings for formatter output and summaries. */
const OutputStringsSchema = v.strictObject({
  /** Summary line: "Found {errors} error(s) and {warnings} warning(s) in {files} file(s)." */
  summary: v.string(),
  /** No files found message. */
  noFiles: v.string(),
  /** Diff mode message: "--diff={mode}: {changed}/{total} files changed" */
  diffStatus: v.string(),
  /** Help prefix for tips. */
  helpPrefix: v.string(),
});

/** Strings for --list-rules output. */
const ListRulesStringsSchema = v.strictObject({
  /** TypeScript rules section header. */
  typescriptHeader: v.string(),
  /** Package.json rules section header. */
  packageJsonHeader: v.string(),
  /** Workspace rules section header. */
  workspaceHeader: v.string(),
  /** Fixable rule marker. */
  fixable: v.string(),
});

/** Strings for debug log messages. */
const DebugStringsSchema = v.strictObject({
  /** Config loaded from path. */
  configLoaded: v.string(),
  /** CLI ignore patterns merged. */
  ignorePatternsMerged: v.string(),
  /** Rules loaded count. */
  rulesLoaded: v.string(),
  /** After rule filter count. */
  afterRuleFilter: v.string(),
  /** After category filter count. */
  afterCategoryFilter: v.string(),
  /** Files found count. */
  filesFound: v.string(),
  /** Cache loaded count. */
  cacheLoaded: v.string(),
  /** Cache deleted. */
  cacheDeleted: v.string(),
  /** Worker pool size. */
  workerPoolSize: v.string(),
  /** Worker pool results. */
  workerPoolResults: v.string(),
  /** Cache hit/miss stats. */
  cacheStats: v.string(),
  /** Workspace rules running. */
  workspaceRunning: v.string(),
  /** Workspace rules results. */
  workspaceResults: v.string(),
  /** External tool loading. */
  toolLoading: v.string(),
  /** External tool running. */
  toolRunning: v.string(),
  /** External tool results. */
  toolResults: v.string(),
  /** Cache saved stats. */
  cacheSaved: v.string(),
  /** Total lint time. */
  totalTime: v.string(),
});

// =============================================================================
// Combined Schema
// =============================================================================

/** Complete schema for all lint strings. */
export const LintStringsSchema = v.strictObject({
  /** CLI help text sections. */
  cli: CliStringsSchema,
  /** Flag descriptions for --help output. */
  flags: FlagStringsSchema,
  /** Formatter output strings. */
  output: OutputStringsSchema,
  /** --list-rules output strings. */
  listRules: ListRulesStringsSchema,
  /** Debug log message templates. */
  debug: DebugStringsSchema,
});

/** All lint strings. See {@link LintStringsSchema}. */
export type LintStrings = v.InferOutput<typeof LintStringsSchema>;
