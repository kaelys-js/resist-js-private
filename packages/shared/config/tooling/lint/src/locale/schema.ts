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
  /** attw: types configuration tip. */
  attwTip: v.string(),
  /** CODEOWNERS: empty file message. */
  codeownersEmpty: v.string(),
  /** CODEOWNERS: empty file tip. */
  codeownersEmptyTip: v.string(),
  /** CODEOWNERS: invalid owner format message: 'Invalid owner format: {owner}' */
  codeownersInvalidOwner: v.string(),
  /** CODEOWNERS: invalid owner format tip. */
  codeownersInvalidOwnerTip: v.string(),
  /** CODEOWNERS: pattern has no owners: 'Pattern "{pattern}" has no owners assigned' */
  codeownersNoOwners: v.string(),
  /** CODEOWNERS: no owners tip. */
  codeownersNoOwnersTip: v.string(),
  /** CODEOWNERS: overly broad wildcard pattern message. */
  codeownersOverlyBroad: v.string(),
  /** CODEOWNERS: overly broad pattern tip. */
  codeownersOverlyBroadTip: v.string(),
  /** codeowners-checker: validate tip. */
  codeownersCheckerTip: v.string(),
  /** CODEOWNERS: valid owner formats tip. */
  codeownersValidFormats: v.string(),
  /** dependency-cruiser: violation message: 'Dependency violation: {from} → {to} ({rule})' */
  dependencyCruiserMessage: v.string(),
  /** dependency-cruiser: tip. */
  dependencyCruiserTip: v.string(),
  /** Dependabot: configuration docs URL tip. */
  dependabotConfigTip: v.string(),
  /** Dependabot: empty file message. */
  dependabotEmpty: v.string(),
  /** Dependabot: empty file tip. */
  dependabotEmptyTip: v.string(),
  /** Dependabot: invalid version message: 'Invalid version: "{version}" — must be 2' */
  dependabotInvalidVersion: v.string(),
  /** Dependabot: invalid version tip. */
  dependabotInvalidVersionTip: v.string(),
  /** Dependabot: missing updates field message. */
  dependabotMissingUpdates: v.string(),
  /** Dependabot: missing updates tip. */
  dependabotMissingUpdatesTip: v.string(),
  /** Dependabot: missing version field message. */
  dependabotMissingVersion: v.string(),
  /** Dependabot: missing version tip. */
  dependabotMissingVersionTip: v.string(),
  /** Dependabot: unrecognized ecosystem: 'Unrecognized package ecosystem: {ecosystem}' */
  dependabotUnrecognizedEcosystem: v.string(),
  /** Dependabot: valid ecosystems tip: 'Valid ecosystems: {ecosystems}' */
  dependabotValidEcosystems: v.string(),
  /** Shared format: file is not formatted. */
  formatFileNotFormatted: v.string(),
  /** Shared format: file is not properly formatted. */
  formatFileNotProperlyFormatted: v.string(),
  /** Shared format: formatting issue detected. */
  formatIssueDetected: v.string(),
  /** Shared format: combined message with fix command: 'File is not properly formatted. Run `{tool}` to fix.' */
  formatNotProperlyFormattedWithFix: v.string(),
  /** Shared format: file requires formatting changes. */
  formatRequiresChanges: v.string(),
  /** Shared format: run tool to auto-format: 'Run `{tool}` to auto-format this file' */
  formatRunTool: v.string(),
  /** GitHub funding: empty file message. */
  fundingEmpty: v.string(),
  /** GitHub funding: empty file tip. */
  fundingEmptyTip: v.string(),
  /** GitHub funding: unrecognized platform: 'Unrecognized funding platform: {platform}' */
  fundingUnrecognized: v.string(),
  /** GitHub funding: valid platforms tip: 'Valid funding platforms: {platforms}' */
  fundingValidPlatforms: v.string(),
  /** gitattributes: syntax tip. */
  gitattributesTip: v.string(),
  /** gitleaks: secret detected message: '{description}: secret detected ({secret})' */
  gitleaksMessage: v.string(),
  /** gitleaks: rotate credential tip. */
  gitleaksTip: v.string(),
  /** ignore-files: tip. */
  ignoreFilesTip: v.string(),
  /** GitHub issue template: empty file message. */
  issueTemplateEmpty: v.string(),
  /** GitHub issue template: empty file tip. */
  issueTemplateEmptyTip: v.string(),
  /** GitHub issue template: missing field: 'Missing required field: {field}' */
  issueTemplateMissingField: v.string(),
  /** GitHub issue template: missing field tip: "Add a '{field}:' field..." */
  issueTemplateMissingFieldTip: v.string(),
  /** GitHub issue template: transform output tip. */
  issueTemplateTip: v.string(),
  /** jscpd: duplicate code message: 'Duplicate code found: {lines} lines between {firstName} and {secondName}' */
  jscpdMessage: v.string(),
  /** jscpd: extract shared code tip. */
  jscpdTip: v.string(),
  /** Julia: not formatted message. */
  juliaNotFormatted: v.string(),
  /** Julia: run formatter tip. */
  juliaTip: v.string(),
  /** justfile: generic formatting issues message. */
  justfileFormatting: v.string(),
  /** justfile: fallback formatting issue message. */
  justfileFormattingIssue: v.string(),
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
  /** license-checker: problematic license message. */
  licenseCheckerMessage: v.string(),
  /** license-checker: review license tip. */
  licenseCheckerTip: v.string(),
  /** lockfile-lint: security tip. */
  lockfileLintTip: v.string(),
  /** ls-lint: file naming violation message: 'File naming violation: {violation}' */
  lsLintMessage: v.string(),
  /** ls-lint: rename file tip. */
  lsLintTip: v.string(),
  /** madge: circular dependency message: 'Circular dependency: {chain}' */
  madgeMessage: v.string(),
  /** madge: break cycle tip. */
  madgeTip: v.string(),
  /** markdownlint: rule tip: 'Rule: {rule}' */
  markdownlintTip: v.string(),
  /** npmrc: syntax tip. */
  npmrcTip: v.string(),
  /** nvmrc: valid patterns tip. */
  nvmrcTip: v.string(),
  /** PR template: checklist tip. */
  prTemplateChecklistTip: v.string(),
  /** PR template: description tip. */
  prTemplateDescriptionTip: v.string(),
  /** PR template: empty file message. */
  prTemplateEmpty: v.string(),
  /** PR template: empty file tip. */
  prTemplateEmptyTip: v.string(),
  /** PR template: missing checklist message. */
  prTemplateMissingChecklist: v.string(),
  /** PR template: missing description message. */
  prTemplateMissingDescription: v.string(),
  /** PR template: good template tip. */
  prTemplateTip: v.string(),
  /** publint: message: 'publint: {code} at {path}' */
  publintMessage: v.string(),
  /** publint: review exports tip. */
  publintTip: v.string(),
  /** sort-package-json: not sorted message: '{file} is not sorted' */
  sortPackageJsonNotSorted: v.string(),
  /** sort-package-json: fix tip. */
  sortPackageJsonTip: v.string(),
  /** syncpack: version mismatch message. */
  syncpackMessage: v.string(),
  /** syncpack: version mismatch detail (fallback). */
  syncpackMismatch: v.string(),
  /** syncpack: fix-mismatches tip. */
  syncpackTip: v.string(),
  /** terraform: fallback formatting message. */
  terraformNeedsFormatting: v.string(),
  /** terraform: fallback formatting tip. */
  terraformNeedsFormattingTip: v.string(),
  /** Shared: see documentation at URL: 'See {url}' */
  toolSeeDocsAt: v.string(),
  /** Typos: fix tip: 'Fix: replace "{typo}" with "{correction}"' */
  typosFix: v.string(),
  /** Typos: misspelling message: '"{typo}" should be "{correction}"' */
  typosMisspelling: v.string(),
  /** Typos: fallback when no corrections available. */
  typosUnknownCorrection: v.string(),
});

/** Strings for JSON Schema descriptions (IDE tooltips in .resist-lint.jsonc). */
const SchemaStringsSchema = v.strictObject({
  /** Top-level config description: "Configuration file for the {linterName} custom linter." */
  configDescription: v.string(),
  /** exclude array description. */
  excludeDescription: v.string(),
  /** extensions array description. */
  extensionsDescription: v.string(),
  /** include array description. */
  includeDescription: v.string(),
  /** overrides array description. */
  overridesDescription: v.string(),
  /** overrides[].files description. */
  overridesFilesDescription: v.string(),
  /** overrides[].rules description. */
  overridesRulesDescription: v.string(),
  /** ruleOptions description. */
  ruleOptionsDescription: v.string(),
  /** ruleOptions additionalProperties description. */
  ruleOptionsAdditionalDescription: v.string(),
  /** Rule severity enum description. */
  ruleSeverityDescription: v.string(),
  /** rules object description (has {ruleList} placeholder). */
  rulesDescription: v.string(),
  /** $schema field description. */
  schemaFieldDescription: v.string(),
  /** Schema title: "{linterName} configuration" */
  title: v.string(),
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
  /** JSON Schema description strings. */
  schema: SchemaStringsSchema,
  /** External tool user-facing messages. */
  tools: ToolStringsSchema,
});

/** All lint strings. See {@link LintStringsSchema}. */
export type LintStrings = v.InferOutput<typeof LintStringsSchema>;
