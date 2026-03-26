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
  /** Configuration section text. */
  configSection: v.string(),
  /** Examples section header. */
  examplesHeader: v.string(),
  /** Options section header. */
  optionsHeader: v.string(),
  /** Stages section text. */
  stagesSection: v.string(),
  /** Title line: "{name} — Custom AST-based linter" */
  title: v.string(),
  /** Usage section header. */
  usageHeader: v.string(),
  /** Usage line 1: "{name} <paths...> [options]" */
  usageLine: v.string(),
  /** Usage line 2: "{name} --list-rules" */
  usageListRules: v.string(),
});

/** Strings for CLI flag descriptions (shown in --help). */
const FlagStringsSchema = v.strictObject({
  /** --bail description. */
  bail: v.string(),
  /** --cache description. */
  cache: v.string(),
  /** --category description. */
  category: v.string(),
  /** --config description. */
  config: v.string(),
  /** --debug description. */
  debug: v.string(),
  /** --diff description. */
  diff: v.string(),
  /** --fix description. */
  fix: v.string(),
  /** --format description. */
  format: v.string(),
  /** --help description. */
  help: v.string(),
  /** --ignore description. */
  ignore: v.string(),
  /** --jobs description. */
  jobs: v.string(),
  /** --json description. */
  json: v.string(),
  /** --list-rules description. */
  listRules: v.string(),
  /** --no-cache description. */
  noCache: v.string(),
  /** <paths...> description. */
  paths: v.string(),
  /** --quiet description. */
  quiet: v.string(),
  /** --rule description. */
  rule: v.string(),
  /** --severity description. */
  severity: v.string(),
  /** --stage description. */
  stage: v.string(),
  /** --tools description. */
  tools: v.string(),
  /** --warn-only description. */
  warnOnly: v.string(),
});

/** Strings for formatter output and summaries. */
const OutputStringsSchema = v.strictObject({
  /** Diff mode message: "--diff={mode}: {changed}/{total} files changed" */
  diffStatus: v.string(),
  /** Help prefix for tips. */
  helpPrefix: v.string(),
  /** No files found message. */
  noFiles: v.string(),
  /** Summary line: "Found {errors} error(s) and {warnings} warning(s) in {files} file(s)." */
  summary: v.string(),
});

/** Strings for --list-rules output. */
const ListRulesStringsSchema = v.strictObject({
  /** Fixable rule marker. */
  fixable: v.string(),
  /** Package.json rules section header. */
  packageJsonHeader: v.string(),
  /** TypeScript rules section header. */
  typescriptHeader: v.string(),
  /** Workspace rules section header. */
  workspaceHeader: v.string(),
});

/** Strings for debug log messages. */
const DebugStringsSchema = v.strictObject({
  /** After category filter count. */
  afterCategoryFilter: v.string(),
  /** After rule filter count. */
  afterRuleFilter: v.string(),
  /** Cache deleted. */
  cacheDeleted: v.string(),
  /** Cache loaded count. */
  cacheLoaded: v.string(),
  /** Cache saved stats. */
  cacheSaved: v.string(),
  /** Cache hit/miss stats. */
  cacheStats: v.string(),
  /** Config loaded from path. */
  configLoaded: v.string(),
  /** Files found count. */
  filesFound: v.string(),
  /** CLI ignore patterns merged. */
  ignorePatternsMerged: v.string(),
  /** Rules loaded count. */
  rulesLoaded: v.string(),
  /** External tool loading. */
  toolLoading: v.string(),
  /** External tool results. */
  toolResults: v.string(),
  /** External tool running. */
  toolRunning: v.string(),
  /** Total lint time. */
  totalTime: v.string(),
  /** Worker pool results. */
  workerPoolResults: v.string(),
  /** Worker pool size. */
  workerPoolSize: v.string(),
  /** Workspace rules results. */
  workspaceResults: v.string(),
  /** Workspace rules running. */
  workspaceRunning: v.string(),
});

/** Strings for error and warning messages. */
const ErrorStringsSchema = v.strictObject({
  /** Linter crash message: "Linter crashed: {error}" */
  crash: v.string(),
  /** Duplicate rule warning: "Warning: Duplicate rule ID \"{ruleId}\" — skipping" */
  duplicateRule: v.string(),
  /** Fix applied summary: "Applied fixes to {count} file(s)." */
  fixApplied: v.string(),
  /** Fix apply failed: "Failed to apply fixes to: {filePath}" */
  fixFailed: v.string(),
  /** Invalid config schema: "Invalid config in {path}:\n{issues}" */
  invalidConfig: v.string(),
  /** Invalid JSONC config: "Invalid JSONC in {path}: {error}" */
  invalidJsonc: v.string(),
  /** JSON parse error fallback. */
  jsonParseError: v.string(),
  /** Path not found: "Path not found: {path}" */
  pathNotFound: v.string(),
  /** Rule load warning: "Warning: Failed to load rule from {path}" */
  ruleLoadFailed: v.string(),
  /** Usage error line 1: "Usage: {name} <paths...> [--json] [--rule=id] [--list-rules] [--help]" */
  usageError: v.string(),
  /** Usage error line 2: "Or add \"include\" paths to {configFilename}" */
  usageErrorConfig: v.string(),
  /** Worker error: "Warning: Worker error on task {taskId}: {error}" */
  workerError: v.string(),
  /** Worker not found: "Worker {index} not found" */
  workerNotFound: v.string(),
});

/** Strings for external tool user-facing messages. */
const ToolStringsSchema = v.strictObject({
  /** Knip: generic unused issue message: "Unused {issueType} detected" */
  knipUnused: v.string(),
  /** Knip: unused dependency: 'Unused dependency: "{symbol}"' */
  knipUnusedDep: v.string(),
  /** Knip: unused dev dependency: 'Unused dev dependency: "{symbol}"' */
  knipUnusedDevDep: v.string(),
  /** Knip: unused export: 'Unused export: "{symbol}"' */
  knipUnusedExport: v.string(),
  /** Knip: unused file message. */
  knipUnusedFile: v.string(),
  /** Knip: unused file tip. */
  knipUnusedFileTip: v.string(),
  /** Knip: unused type export: 'Unused type export: "{symbol}"' */
  knipUnusedType: v.string(),
  /** Typos: fix tip: 'Fix: replace "{typo}" with "{correction}"' */
  typosFix: v.string(),
  /** Typos: misspelling message: '"{typo}" should be "{correction}"' */
  typosMisspelling: v.string(),
  /** Typos: fallback when no corrections available. */
  typosUnknownCorrection: v.string(),
});

/** Strings for --list-rules format labels. */
const ListRulesFormatSchema = v.strictObject({
  /** Categories label: "categories:" */
  categoriesLabel: v.string(),
  /** Debug prefix: "[debug]" */
  debugPrefix: v.string(),
  /** Patterns label: "patterns:" */
  patternsLabel: v.string(),
  /** Stages label: "stages:" */
  stagesLabel: v.string(),
});

// =============================================================================
// Combined Schema
// =============================================================================

/** Complete schema for all lint strings. */
export const LintStringsSchema = v.strictObject({
  /** CLI help text sections. */
  cli: CliStringsSchema,
  /** Debug log message templates. */
  debug: DebugStringsSchema,
  /** Error and warning messages. */
  errors: ErrorStringsSchema,
  /** Flag descriptions for --help output. */
  flags: FlagStringsSchema,
  /** --list-rules output strings. */
  listRules: ListRulesStringsSchema,
  /** List-rules format labels. */
  listRulesFormat: ListRulesFormatSchema,
  /** Formatter output strings. */
  output: OutputStringsSchema,
  /** External tool user-facing messages. */
  tools: ToolStringsSchema,
});

/** All lint strings. See {@link LintStringsSchema}. */
export type LintStrings = v.InferOutput<typeof LintStringsSchema>;
