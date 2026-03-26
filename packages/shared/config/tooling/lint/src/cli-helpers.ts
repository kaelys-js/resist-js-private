/**
 * resist-lint — CLI Helper Functions
 *
 * Pure, testable helper functions extracted from the CLI entry point.
 * These handle argument parsing, file discovery, fix application,
 * schema generation, and the main linter orchestration loop.
 *
 * @module
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, statSync, type Dirent } from 'node:fs';
import { resolve, extname, join } from 'node:path';

import * as v from 'valibot';

import { runTypeScriptRules } from '@/lint/framework/oxc-runner.ts';
import { loadAllRules } from '@/lint/framework/rule-loader.ts';
import {
  loadConfig,
  resolveRuleSeverity,
  generateJsonSchema,
  type LintConfig,
} from '@/lint/config/schema.ts';
import { LINTER_NAME, CONFIG_FILENAME, SCHEMA_FILENAME } from '@/lint/constants.ts';
import { formatResults, type OutputFormat } from '@/lint/framework/formatters.ts';
import { createWorkspaceContext } from '@/lint/framework/rule-context.ts';
import { WorkerPool, type WorkerTask, type WorkerResult } from '@/lint/framework/worker-pool.ts';
import { ToolRegistry } from '@/lint/framework/tool-orchestrator.ts';
import { LintCache, CACHE_FILENAME, computeRuleHash } from '@/lint/framework/cache.ts';
import { ALL_TOOLS } from '@/lint/tools/registry.ts';
import { format } from '@/lint/locale/schema.ts';
import { en } from '@/lint/locale/locales/en.ts';
import type {
  LintResult,
  LintFix,
  TypeScriptRule,
  PackageJsonRule,
  WorkspaceRule,
  PackageJsonContext,
  PackageJson,
  Stage,
} from '@/lint/framework/types.ts';

// =============================================================================
// Types
// =============================================================================

/** Schema for parsed CLI arguments. */
export const CliArgsSchema = v.strictObject({
  /** Positional path arguments. */
  paths: v.array(v.string()),
  /** Whether to output results as JSON. */
  json: v.boolean(),
  /** Whether to list all rules and exit. */
  listRules: v.boolean(),
  /** Whether to exit 0 even if errors are found. */
  warnOnly: v.boolean(),
  /** Whether to auto-apply fixes to source files. */
  fix: v.boolean(),
  /** Whether to show help and exit. */
  help: v.boolean(),
  /** Rule IDs to filter by (empty = all rules). */
  ruleIds: v.array(v.string()),
  /** Categories to filter by (empty = all categories). */
  categories: v.array(v.string()),
  /** Pipeline stage to filter by (undefined = no stage filter). */
  stage: v.optional(v.string()),
  /** Whether to suppress warning-level output (show errors only). */
  quiet: v.boolean(),
  /** Whether to stop on first error (bail early). */
  bail: v.boolean(),
  /** Additional ignore patterns from CLI (merged with config exclude). */
  ignore: v.array(v.string()),
  /** Custom config file path (overrides default .resist-lint.jsonc). */
  configPath: v.optional(v.string()),
  /** Global severity override (overrides all result severities). */
  severityOverride: v.optional(v.picklist(['error', 'warn', 'off'])),
  /** Diff mode: only lint changed files ('head' = uncommitted, 'staged' = staged). */
  diff: v.optional(v.picklist(['head', 'staged'])),
  /** Whether to enable verbose debug logging to stderr. */
  debug: v.boolean(),
  /** Output format. Undefined defaults to text (or json if --json). */
  format: v.optional(v.picklist(['text', 'json', 'sarif', 'github', 'junit', 'compact'])),
  /** Number of worker threads for parallel lint (undefined = os.cpus().length, 1 = single-threaded). */
  jobs: v.optional(v.number()),
  /** Whether to run external tools (shellcheck, hadolint, etc.) alongside custom rules. */
  tools: v.boolean(),
  /** Whether to use file hash caching for incremental runs. */
  cache: v.boolean(),
});

/** Parsed CLI arguments. See {@link CliArgsSchema}. */
export type CliArgs = v.InferOutput<typeof CliArgsSchema>;

/** Schema for output sink for CLI messages (allows testing without stdout/stderr). */
export const CliOutputSchema = v.strictObject({
  /** Write to stdout. */
  stdout: v.custom<(msg: string) => void>((val: unknown): boolean => typeof val === 'function'),
  /** Write to stderr. */
  stderr: v.custom<(msg: string) => void>((val: unknown): boolean => typeof val === 'function'),
});

/** Output sink for CLI messages (allows testing without stdout/stderr). See {@link CliOutputSchema}. */
export type CliOutput = v.InferOutput<typeof CliOutputSchema>;

// =============================================================================
// Argument Parsing
// =============================================================================

/**
 * Parse raw CLI arguments into a structured format.
 *
 * @param {string[]} argv - Raw arguments (typically process.argv.slice(2))
 * @returns {CliArgs} Parsed CLI arguments
 */
export function parseCliArgs(argv: string[]): CliArgs {
  const flags: string[] = argv.filter((a: string): boolean => a.startsWith('-'));
  const paths: string[] = argv.filter((a: string): boolean => !a.startsWith('-'));

  const ruleFlag: string | undefined = flags.find((f: string): boolean => f.startsWith('--rule='));
  const ruleIds: string[] = ruleFlag ? (ruleFlag.split('=')[1] ?? '').split(',') : [];

  const categoryFlag: string | undefined = flags.find((f: string): boolean =>
    f.startsWith('--category='),
  );
  const categories: string[] = categoryFlag ? (categoryFlag.split('=')[1] ?? '').split(',') : [];

  const stageFlag: string | undefined = flags.find((f: string): boolean =>
    f.startsWith('--stage='),
  );
  const stage: string | undefined = stageFlag ? (stageFlag.split('=')[1] ?? '') : undefined;

  const ignoreFlag: string | undefined = flags.find((f: string): boolean =>
    f.startsWith('--ignore='),
  );
  const ignore: string[] = ignoreFlag ? (ignoreFlag.split('=')[1] ?? '').split(',') : [];

  const configFlag: string | undefined = flags.find((f: string): boolean =>
    f.startsWith('--config='),
  );
  const configPath: string | undefined = configFlag ? (configFlag.split('=')[1] ?? '') : undefined;

  const severityFlag: string | undefined = flags.find((f: string): boolean =>
    f.startsWith('--severity='),
  );
  const severityOverride: 'error' | 'warn' | 'off' | undefined = severityFlag
    ? ((severityFlag.split('=')[1] ?? '') as 'error' | 'warn' | 'off')
    : undefined;

  const diffFlag: string | undefined = flags.find(
    (f: string): boolean => f === '--diff' || f.startsWith('--diff='),
  );
  let diff: 'head' | 'staged' | undefined;
  if (diffFlag) {
    const diffValue: string = diffFlag.includes('=') ? (diffFlag.split('=')[1] ?? 'head') : 'head';
    diff = diffValue === 'staged' ? 'staged' : 'head';
  }

  const jobsFlag: string | undefined = flags.find((f: string): boolean => f.startsWith('--jobs='));
  const jobs: number | undefined = jobsFlag
    ? Number.parseInt(jobsFlag.split('=')[1] ?? '', 10) || undefined
    : undefined;

  return {
    paths,
    json: flags.includes('--json'),
    listRules: flags.includes('--list-rules'),
    warnOnly: flags.includes('--warn-only'),
    fix: flags.includes('--fix'),
    help: flags.includes('--help') || flags.includes('-h'),
    ruleIds,
    categories,
    stage,
    quiet: flags.includes('--quiet'),
    bail: flags.includes('--bail'),
    ignore,
    configPath,
    severityOverride,
    diff,
    debug: flags.includes('--debug'),
    format: parseFormatFlag(flags),
    jobs,
    tools: flags.includes('--tools'),
    cache: flags.includes('--cache') && !flags.includes('--no-cache'),
  };
}

/**
 * Parse the --format= flag from CLI flags.
 *
 * @param flags - Array of flag strings
 * @returns Output format or undefined
 */
function parseFormatFlag(
  flags: string[],
): 'text' | 'json' | 'sarif' | 'github' | 'junit' | 'compact' | undefined {
  const formatFlag: string | undefined = flags.find((f: string): boolean =>
    f.startsWith('--format='),
  );
  if (!formatFlag) {
    return undefined;
  }
  const value: string = formatFlag.split('=')[1] ?? 'text';
  const validFormats: ReadonlySet<string> = new Set([
    'text',
    'json',
    'sarif',
    'github',
    'junit',
    'compact',
  ]);
  if (validFormats.has(value)) {
    return value as 'text' | 'json' | 'sarif' | 'github' | 'junit' | 'compact';
  }
  return 'text';
}

// =============================================================================
// Binary Detection
// =============================================================================

/** Known binary file extensions that should never be linted. */
const BINARY_EXTENSIONS: ReadonlySet<string> = new Set([
  /* Images */
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.webp',
  '.avif',
  '.svg',
  '.bmp',
  '.tiff',
  /* Fonts */
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  /* Archives */
  '.zip',
  '.tar',
  '.gz',
  '.bz2',
  '.7z',
  '.rar',
  /* Documents */
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  /* Executables / Libraries */
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  /* Media */
  '.mp3',
  '.mp4',
  '.wav',
  '.ogg',
  '.webm',
  '.avi',
  '.mov',
  '.flac',
  /* Databases */
  '.sqlite',
  '.db',
  /* Source maps */
  '.map',
  /* WebAssembly */
  '.wasm',
]);

/**
 * Check if a file is likely binary based on its extension.
 *
 * Binary files should never be linted — they are not text and cannot
 * be meaningfully parsed by AST-based or text-based rules.
 *
 * @param {string} filePath - File path to check
 * @returns {boolean} Whether the file is likely binary
 */
export function isBinaryFile(filePath: string): boolean {
  const dot: number = filePath.lastIndexOf('.');
  if (dot < 0) {
    return false;
  }
  const ext: string = filePath.slice(dot).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

// =============================================================================
// Git Diff Integration
// =============================================================================

/**
 * Get the set of changed file paths from git.
 *
 * @param {'head' | 'staged'} mode - Which changes to query:
 *   - `'head'`: uncommitted changes vs HEAD (`git diff --name-only HEAD`)
 *   - `'staged'`: staged changes (`git diff --cached --name-only`)
 * @returns {Set<string>} Absolute paths of changed files
 */
export function getGitChangedFiles(mode: 'head' | 'staged'): Set<string> {
  const cmd: string =
    mode === 'staged' ? 'git diff --cached --name-only' : 'git diff --name-only HEAD';

  let output: string;
  try {
    output = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch {
    /* git not available or not a git repo — return empty set */
    return new Set();
  }

  const cwd: string = process.cwd();
  const files: Set<string> = new Set<string>();

  for (const line of output.split('\n')) {
    const trimmed: string = line.trim();
    if (trimmed.length > 0) {
      files.add(resolve(cwd, trimmed));
    }
  }

  return files;
}

// =============================================================================
// File Discovery
// =============================================================================

/**
 * Check if a file path should be linted based on config.
 *
 * Binary files are rejected first. Then excluded patterns (e.g. `*.test.ts`,
 * `*.d.ts`) are checked. Finally the file extension must match one from
 * `config.extensions`.
 *
 * @param {string} filePath - File path to check
 * @param {LintConfig} config - Linter configuration
 * @returns {boolean} Whether the file should be linted
 */
export function shouldLint(filePath: string, config: LintConfig): boolean {
  /* Always reject binary files */
  if (isBinaryFile(filePath)) {
    return false;
  }

  /* Check exclude patterns */
  for (const pattern of config.exclude) {
    if (pattern.startsWith('*.') && filePath.endsWith(pattern.slice(1))) {
      return false;
    }
  }

  const ext: string = extname(filePath);
  return config.extensions.includes(ext);
}

/**
 * Recursively collect all lintable files from a directory.
 *
 * @param {string} dir - Directory to scan
 * @param {LintConfig} config - Linter configuration (provides exclude list)
 * @returns {string[]} Array of absolute file paths
 */
export function collectFiles(dir: string, config: LintConfig): string[] {
  const files: string[] = [];
  const excludeSet: ReadonlySet<string> = new Set(config.exclude);

  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true }) as Dirent[];
  } catch {
    /* Directory not readable — skip */
    return files;
  }

  for (const entry of entries) {
    if (excludeSet.has(entry.name as string)) {
      continue;
    }

    const fullPath: string = join(dir, entry.name as string);

    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, config));
    } else if (entry.isFile() && shouldLint(fullPath, config)) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Recursively collect all package.json files from a directory.
 *
 * @param {string} dir - Directory to scan
 * @param {LintConfig} config - Linter configuration (provides exclude list)
 * @returns {string[]} Array of absolute file paths
 */
export function collectPackageJsonFiles(dir: string, config: LintConfig): string[] {
  const files: string[] = [];
  const excludeSet: ReadonlySet<string> = new Set(config.exclude);

  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true }) as Dirent[];
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (excludeSet.has(entry.name as string)) {
      continue;
    }
    const fullPath: string = join(dir, entry.name as string);
    if (entry.isDirectory()) {
      files.push(...collectPackageJsonFiles(fullPath, config));
    } else if (entry.isFile() && (entry.name as string) === 'package.json') {
      files.push(fullPath);
    }
  }

  return files;
}

// =============================================================================
// Package.json Rules
// =============================================================================

/**
 * Run package.json rules on a single package.json file.
 *
 * @param {string} filePath - Absolute path to package.json
 * @param {PackageJson} pkg - Parsed package.json content
 * @param {boolean} isRoot - Whether this is the workspace root package.json
 * @param {PackageJsonRule[]} rules - Package.json rules to run
 * @param {Record<string, Record<string, unknown>>} allRuleOptions - Per-rule config options
 * @returns {LintResult[]} Array of lint results
 */
export function runPkgRules(
  filePath: string,
  pkg: PackageJson,
  isRoot: boolean,
  rules: PackageJsonRule[],
  allRuleOptions?: Record<string, Record<string, unknown>>,
): LintResult[] {
  const results: LintResult[] = [];
  for (const rule of rules) {
    const ruleOpts: Record<string, unknown> | undefined = allRuleOptions?.[rule.id];
    const context: PackageJsonContext = { file: filePath, pkg, isRoot, ruleOptions: ruleOpts };
    results.push(...rule.check(context));
  }
  return results;
}

// =============================================================================
// Rule Options Overrides
// =============================================================================

/**
 * Apply config-based category/stage overrides from ruleOptions.
 *
 * If `ruleOptions[ruleId]` contains `categories` or `stages`,
 * they replace the rule's declared values.
 *
 * @param {Array<TypeScriptRule | PackageJsonRule>} rules - Rules to update (mutated)
 * @param {Record<string, Record<string, unknown>>} ruleOptions - Config ruleOptions map
 */
function applyRuleOptionsOverrides(
  rules: Array<TypeScriptRule | PackageJsonRule>,
  ruleOptions: Record<string, Record<string, unknown>>,
): void {
  for (const rule of rules) {
    const opts: Record<string, unknown> | undefined = ruleOptions[rule.id];
    if (!opts) {
      continue;
    }

    if (Array.isArray(opts.categories)) {
      rule.categories = opts.categories as string[];
    }

    if (Array.isArray(opts.stages)) {
      rule.stages = opts.stages as Stage[];
    }
  }
}

// =============================================================================
// Auto-fix
// =============================================================================

/**
 * Apply fixes to a file, returning the updated content.
 * Fixes are applied in reverse offset order to preserve byte positions.
 *
 * @param {string} content - Original file content
 * @param {LintFix[]} fixes - Array of fixes to apply
 * @returns {string} Updated file content
 */
export function applyFixes(content: string, fixes: LintFix[]): string {
  const sorted: LintFix[] = [...fixes].toSorted(
    (a: LintFix, b: LintFix): number => b.range.start - a.range.start,
  );

  let result: string = content;
  for (const fix of sorted) {
    result = result.slice(0, fix.range.start) + fix.text + result.slice(fix.range.end);
  }
  return result;
}

// =============================================================================
// JSON Schema
// =============================================================================

/**
 * Auto-generate the JSON Schema file for IDE autocomplete.
 *
 * Writes the schema to the workspace root alongside the config file.
 * Runs silently — errors are swallowed since schema generation is optional.
 *
 * @param {TypeScriptRule[]} tsRules - All TypeScript rules
 * @param {PackageJsonRule[]} pkgRules - All package.json rules
 */
export function writeJsonSchema(tsRules: TypeScriptRule[], pkgRules: PackageJsonRule[]): void {
  const allRuleIds: string[] = [
    ...tsRules.map((r: TypeScriptRule): string => r.id),
    ...pkgRules.map((r: PackageJsonRule): string => r.id),
  ];
  const descriptions: Map<string, string> = new Map();
  for (const r of tsRules) {
    descriptions.set(r.id, r.description);
  }
  for (const r of pkgRules) {
    descriptions.set(r.id, r.description);
  }
  const schema: Record<string, unknown> = generateJsonSchema(allRuleIds, descriptions);
  const outPath: string = resolve(process.cwd(), SCHEMA_FILENAME);
  try {
    writeFileSync(outPath, `${JSON.stringify(schema, null, 2)}\n`, 'utf8');
  } catch {
    /* Schema write failed — non-critical, continue */
  }
}

// =============================================================================
// Help Text
// =============================================================================

/**
 * Build the formatted CLI help text from locale strings.
 *
 * @param {string} linterName - The linter display name
 * @param {string} configFilename - The config file name
 * @param {string} schemaFilename - The JSON Schema file name
 * @returns {string} Help text string
 */
export function buildHelpText(
  linterName: string,
  configFilename: string,
  schemaFilename: string,
): string {
  const t = en;
  const n: Record<string, string> = { name: linterName };

  return `
${format(t.cli.title, n)}

${t.cli.usageHeader}
${format(t.cli.usageLine, n)}
${format(t.cli.usageListRules, n)}

${t.cli.optionsHeader}
  ${t.flags.paths}
  ${t.flags.rule}
  ${t.flags.category}
  ${t.flags.stage}
  ${t.flags.fix}
  ${t.flags.json}
  ${t.flags.listRules}
  ${t.flags.quiet}
  ${t.flags.bail}
  ${t.flags.ignore}
  ${t.flags.config}
  ${t.flags.severity}
  ${t.flags.diff}
  ${t.flags.format}
  ${t.flags.jobs}
  ${t.flags.tools}
  ${t.flags.cache}
  ${t.flags.noCache}
  ${t.flags.debug}
  ${t.flags.warnOnly}
  ${t.flags.help}

${format(t.cli.configSection, { configFilename, schemaFilename })}

${t.cli.stagesSection}

${t.cli.examplesHeader}
  ${linterName} packages/shared/schemas
  ${linterName} --rule=jsdoc/require-param packages/shared/schemas
  ${linterName} --category=typescript packages/shared/schemas
  ${linterName} --stage=pre-commit packages/shared/schemas
  ${linterName} --fix packages/shared/schemas
  ${linterName} --list-rules

`;
}

// =============================================================================
// Main Linter Loop
// =============================================================================

/**
 * Process lint tasks sequentially, stopping on the first error (bail mode).
 *
 * @param tasks - File tasks to process
 * @param ruleOptions - Per-rule config options
 * @returns Results collected before bail, and whether bail triggered
 */
function processBailTasks(
  tasks: Array<{ filePath: string; content: string; applicableRules: TypeScriptRule[] }>,
  ruleOptions: Record<string, Record<string, unknown>>,
): Promise<{ results: LintResult[]; bailed: boolean }> {
  const accumulated: LintResult[] = [];

  /**
   * Process a single task and recurse.
   *
   * @param index - Current task index
   * @returns Accumulated results and bail status
   */
  async function processNext(index: number): Promise<{ results: LintResult[]; bailed: boolean }> {
    if (index >= tasks.length) {
      return { results: accumulated, bailed: false };
    }
    const task = tasks[index]!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
    const taskResults: LintResult[] = await runTypeScriptRules(
      task.filePath,
      task.content,
      task.applicableRules,
      ruleOptions,
    );
    accumulated.push(...taskResults);
    if (taskResults.some((r: LintResult): boolean => r.severity === 'error')) {
      return { results: accumulated, bailed: true };
    }
    return processNext(index + 1);
  }

  return processNext(0);
}

/**
 * Run the full linter pipeline.
 *
 * Loads config, discovers rules, collects files, runs rules,
 * applies fixes, and outputs results. Returns an exit code.
 *
 * @param {CliArgs} cliArgs - Parsed CLI arguments
 * @param {CliOutput} output - Output sink for messages
 * @returns {Promise<number>} Exit code (0 = clean, 1 = errors, 2 = crash)
 */
export async function runLinter(cliArgs: CliArgs, output: CliOutput): Promise<number> {
  /* --help flag */
  if (cliArgs.help) {
    output.stdout(buildHelpText(LINTER_NAME, CONFIG_FILENAME, SCHEMA_FILENAME));
    return 0;
  }

  /**
   * Write debug message to stderr when --debug is active.
   *
   * @param msg - Debug message to output
   */
  const dbg = (msg: string): void => {
    if (cliArgs.debug) {
      output.stderr(`[debug] ${msg}\n`);
    }
  };

  const lintStartTime: number = Date.now();

  /* Load config */
  const config: LintConfig = loadConfig(process.cwd(), cliArgs.configPath);
  dbg(format(en.debug.configLoaded, { path: cliArgs.configPath ?? CONFIG_FILENAME }));

  /* Merge CLI --ignore patterns into config excludes */
  if (cliArgs.ignore.length > 0) {
    config.exclude = [...config.exclude, ...cliArgs.ignore];
    dbg(format(en.debug.ignorePatternsMerged, { count: cliArgs.ignore.length }));
  }

  /* Auto-discover all rules */
  const loaded: Awaited<ReturnType<typeof loadAllRules>> = await loadAllRules();
  let allTsRules: TypeScriptRule[] = loaded.typescript;
  let allPkgRules: PackageJsonRule[] = loaded.packageJson;
  dbg(format(en.debug.rulesLoaded, { tsCount: allTsRules.length, pkgCount: allPkgRules.length }));

  /* Auto-generate JSON Schema for IDE autocomplete */
  writeJsonSchema(allTsRules, allPkgRules);

  /* List rules mode */
  if (cliArgs.listRules) {
    output.stdout(`${en.listRules.typescriptHeader}\n\n`);
    for (const rule of allTsRules) {
      const severity: string = config.rules[rule.id] ?? 'error';
      const fixable: string = rule.fixable ? en.listRules.fixable : '';
      const cats: string = (rule.categories ?? []).join(', ');
      const stgs: string = (rule.stages ?? ['lint']).join(', ');
      output.stdout(`  ${rule.id} (${severity})${fixable}\n`);
      output.stdout(`    ${rule.description}\n`);
      output.stdout(`    patterns: ${rule.patterns.join(', ')}\n`);
      output.stdout(`    categories: ${cats}  stages: ${stgs}\n\n`);
    }
    output.stdout(`${en.listRules.packageJsonHeader}\n\n`);
    for (const rule of allPkgRules) {
      const severity: string = config.rules[rule.id] ?? 'error';
      const fixable: string = rule.fixable ? en.listRules.fixable : '';
      const cats: string = (rule.categories ?? []).join(', ');
      const stgs: string = (rule.stages ?? ['lint']).join(', ');
      output.stdout(`  ${rule.id} (${severity})${fixable}\n`);
      output.stdout(`    ${rule.description}\n`);
      output.stdout(`    categories: ${cats}  stages: ${stgs}\n\n`);
    }
    if (loaded.workspace.length > 0) {
      output.stdout(`${en.listRules.workspaceHeader}\n\n`);
      for (const rule of loaded.workspace) {
        const severity: string = config.rules[rule.id] ?? 'error';
        const fixable: string = rule.fixable ? en.listRules.fixable : '';
        const cats: string = (rule.categories ?? []).join(', ');
        const stgs: string = (rule.stages ?? ['lint']).join(', ');
        output.stdout(`  ${rule.id} (${severity})${fixable}\n`);
        output.stdout(`    ${rule.description}\n`);
        output.stdout(`    categories: ${cats}  stages: ${stgs}\n\n`);
      }
    }
    return 0;
  }

  /* Resolve paths from CLI or config */
  const paths: string[] = cliArgs.paths.length > 0 ? cliArgs.paths : [...config.include];

  if (paths.length === 0) {
    output.stderr(
      `Usage: ${LINTER_NAME} <paths...> [--json] [--rule=id] [--list-rules] [--help]\n` +
        `Or add "include" paths to ${CONFIG_FILENAME}\n`,
    );
    return 1;
  }

  /* Filter rules by --rule= flag if specified (O(1) lookup via byId) */
  if (cliArgs.ruleIds.length > 0) {
    const ruleIdSet: ReadonlySet<string> = new Set(cliArgs.ruleIds);
    allTsRules = allTsRules.filter((r: TypeScriptRule): boolean => ruleIdSet.has(r.id));
    allPkgRules = allPkgRules.filter((r: PackageJsonRule): boolean => ruleIdSet.has(r.id));
    dbg(
      format(en.debug.afterRuleFilter, {
        tsCount: allTsRules.length,
        pkgCount: allPkgRules.length,
      }),
    );
  }

  /* Apply config-based category/stage overrides from ruleOptions */
  applyRuleOptionsOverrides(allTsRules, config.ruleOptions);
  applyRuleOptionsOverrides(allPkgRules, config.ruleOptions);

  /* Filter rules by --category= flag if specified */
  if (cliArgs.categories.length > 0) {
    allTsRules = allTsRules.filter((r: TypeScriptRule): boolean =>
      (r.categories ?? []).some((c: string): boolean => cliArgs.categories.includes(c)),
    );
    allPkgRules = allPkgRules.filter((r: PackageJsonRule): boolean =>
      (r.categories ?? []).some((c: string): boolean => cliArgs.categories.includes(c)),
    );
    dbg(
      format(en.debug.afterCategoryFilter, {
        categories: cliArgs.categories.join(','),
        tsCount: allTsRules.length,
        pkgCount: allPkgRules.length,
      }),
    );
  }

  /* Filter rules by --stage= flag if specified */
  if (cliArgs.stage) {
    const stageFilter: string = cliArgs.stage;
    allTsRules = allTsRules.filter((r: TypeScriptRule): boolean =>
      (r.stages ?? ['lint']).includes(stageFilter as Stage),
    );
    allPkgRules = allPkgRules.filter((r: PackageJsonRule): boolean =>
      (r.stages ?? ['lint']).includes(stageFilter as Stage),
    );
  }

  /* Filter out globally disabled rules */
  allTsRules = allTsRules.filter(
    (r: TypeScriptRule): boolean => (config.rules[r.id] ?? 'error') !== 'off',
  );
  allPkgRules = allPkgRules.filter(
    (r: PackageJsonRule): boolean => (config.rules[r.id] ?? 'error') !== 'off',
  );

  /* Collect files */
  const allFiles: string[] = [];
  for (const p of paths) {
    const resolved: string = resolve(p);
    try {
      const s: ReturnType<typeof statSync> = statSync(resolved);
      if (s.isDirectory()) {
        allFiles.push(...collectFiles(resolved, config));
      } else if (s.isFile() && shouldLint(resolved, config)) {
        allFiles.push(resolved);
      }
    } catch {
      output.stderr(`Path not found: ${p}\n`);
    }
  }

  dbg(format(en.debug.filesFound, { fileCount: allFiles.length, pathCount: paths.length }));

  /* When --diff is set, intersect with git-changed files */
  if (cliArgs.diff) {
    const changedFiles: Set<string> = getGitChangedFiles(cliArgs.diff);
    const beforeCount: number = allFiles.length;

    /* Remove files not in the diff set (filter in place) */
    for (let i: number = allFiles.length - 1; i >= 0; i--) {
      if (!changedFiles.has(allFiles[i] ?? '')) {
        allFiles.splice(i, 1);
      }
    }

    if (!cliArgs.json && !cliArgs.quiet) {
      output.stderr(
        `${format(en.output.diffStatus, { mode: cliArgs.diff, changed: allFiles.length, total: beforeCount })}\n`,
      );
    }
  }

  if (allFiles.length === 0) {
    if (!cliArgs.json) {
      output.stdout(`${en.output.noFiles}\n`);
    }
    return 0;
  }

  /* Initialize cache when --cache is enabled */
  const cachePath: string = resolve(process.cwd(), CACHE_FILENAME);
  const allRuleIds: string[] = [
    ...allTsRules.map((r: TypeScriptRule): string => r.id),
    ...allPkgRules.map((r: PackageJsonRule): string => r.id),
  ];
  const ruleHash: string = computeRuleHash(allRuleIds);
  let lintCache: LintCache | null = null;

  if (cliArgs.cache) {
    lintCache = LintCache.load(cachePath, ruleHash);
    dbg(format(en.debug.cacheLoaded, { count: lintCache.getEntryCount() }));
  }

  /* Handle --no-cache: delete cache file before running */
  if (!cliArgs.cache && process.argv.includes('--no-cache')) {
    LintCache.delete(cachePath);
    dbg(en.debug.cacheDeleted);
  }

  /* Run TypeScript rules on each file */
  type FileTask = { filePath: string; content: string; applicableRules: TypeScriptRule[] };
  const tasks: FileTask[] = [];
  const cachedResults: LintResult[] = [];

  for (const filePath of allFiles) {
    let content: string;
    try {
      content = readFileSync(filePath, 'utf8');
    } catch {
      /* File not readable — skip */
      continue;
    }

    /* Check cache first */
    if (lintCache) {
      const cached: LintResult[] | null = lintCache.get(filePath, content);
      if (cached) {
        cachedResults.push(...cached);
        continue;
      }
    }

    /* Filter rules by file pattern AND per-file severity (overrides may disable) */
    const applicableRules: TypeScriptRule[] = allTsRules.filter((rule: TypeScriptRule): boolean => {
      /* Check file pattern match */
      const patternMatch: boolean = rule.patterns.some((pattern: string): boolean => {
        if (pattern.startsWith('**/*.')) {
          const ext: string = pattern.slice(4);
          return filePath.endsWith(ext);
        }
        return filePath.includes(pattern);
      });

      if (!patternMatch) {
        return false;
      }

      /* Check override severity — skip if "off" for this file */
      const severity: string = resolveRuleSeverity(config, rule.id, filePath);
      return severity !== 'off';
    });

    if (applicableRules.length === 0) {
      continue;
    }
    tasks.push({ filePath, content, applicableRules });
  }

  let allResults: LintResult[];
  let bailed: boolean = false;

  /* Determine parallelism mode */
  const jobCount: number = cliArgs.jobs ?? 1;
  const useWorkerPool: boolean = jobCount > 1 && !cliArgs.bail && tasks.length > 1;

  if (cliArgs.bail) {
    /* --bail: process files sequentially, stop on first error */
    const bailResult = await processBailTasks(tasks, config.ruleOptions);
    ({ bailed } = bailResult);
    allResults = bailResult.results;
  } else if (useWorkerPool) {
    /* Worker thread parallelism — distribute tasks across workers */
    dbg(format(en.debug.workerPoolSize, { threads: jobCount, files: tasks.length }));
    const pool: WorkerPool = new WorkerPool(jobCount);

    try {
      await pool.waitForReady();

      const workerTasks: WorkerTask[] = tasks.map(
        (task: FileTask, idx: number): WorkerTask => ({
          taskId: idx,
          filePath: task.filePath,
          content: task.content,
          ruleIds: task.applicableRules.map((r: TypeScriptRule): string => r.id),
          ruleOptions: config.ruleOptions,
        }),
      );

      const workerResults: WorkerResult[] = await pool.executeAll(workerTasks);

      allResults = [];
      for (const wr of workerResults) {
        if (wr.error) {
          output.stderr(`  Warning: Worker error on task ${wr.taskId}: ${wr.error}\n`);
        }
        allResults.push(...wr.results);
      }

      dbg(format(en.debug.workerPoolResults, { count: allResults.length }));
    } finally {
      await pool.shutdown();
    }
  } else {
    /* Default: process all files in parallel within single thread */
    const taskResults: LintResult[][] = await Promise.all(
      tasks.map(
        (task: FileTask): Promise<LintResult[]> =>
          runTypeScriptRules(task.filePath, task.content, task.applicableRules, config.ruleOptions),
      ),
    );
    allResults = taskResults.flat();
  }

  /* Run finalize() on rules that aggregate cross-file data */
  if (!bailed) {
    for (const rule of allTsRules) {
      if (rule.finalize) {
        allResults.push(...rule.finalize());
      }
    }
  }

  /* Update cache with newly-linted file results */
  if (lintCache) {
    /* Group results by file for cache storage */
    const resultsByFile: Map<string, LintResult[]> = new Map();
    for (const result of allResults) {
      const existing: LintResult[] = resultsByFile.get(result.file) ?? [];
      existing.push(result);
      resultsByFile.set(result.file, existing);
    }

    for (const task of tasks) {
      const fileResults: LintResult[] = resultsByFile.get(task.filePath) ?? [];
      lintCache.set(task.filePath, task.content, fileResults);
    }
  }

  /* Merge cached results into allResults */
  if (cachedResults.length > 0) {
    allResults.push(...cachedResults);
    dbg(
      format(en.debug.cacheStats, {
        hits: lintCache?.getHitCount() ?? 0,
        misses: lintCache?.getMissCount() ?? 0,
      }),
    );
  }

  /* Run package.json rules (skip if bailed) */
  const pkgFiles: string[] = [];
  for (const p of paths) {
    const resolved: string = resolve(p);
    try {
      const s: ReturnType<typeof statSync> = statSync(resolved);
      if (s.isDirectory()) {
        pkgFiles.push(...collectPackageJsonFiles(resolved, config));
      }
    } catch {
      /* skip */
    }
  }

  const workspaceRootPkg: string = resolve('package.json');
  for (const pkgPath of pkgFiles) {
    try {
      const raw: string = readFileSync(pkgPath, 'utf8');
      const pkg: PackageJson = JSON.parse(raw) as PackageJson;
      const isRoot: boolean = resolve(pkgPath) === workspaceRootPkg;

      /* Filter package rules by severity for this file */
      const applicablePkgRules: PackageJsonRule[] = allPkgRules.filter(
        (rule: PackageJsonRule): boolean => resolveRuleSeverity(config, rule.id, pkgPath) !== 'off',
      );

      allResults.push(...runPkgRules(pkgPath, pkg, isRoot, applicablePkgRules, config.ruleOptions));
    } catch {
      /* skip unreadable */
    }
  }

  /* Run workspace rules (skip if bailed or if only individual files were provided).
   * Workspace rules scan the entire repo so they only make sense when linting
   * directories (e.g., `resist-lint packages/` or the default config include paths). */
  const hasDirectoryPaths: boolean = paths.some((p: string): boolean => {
    try {
      return statSync(resolve(p)).isDirectory();
    } catch {
      return false;
    }
  });

  if (!bailed && hasDirectoryPaths && loaded.workspace.length > 0) {
    let wsRules: WorkspaceRule[] = [...loaded.workspace];

    /* Filter workspace rules by --rule= */
    if (cliArgs.ruleIds.length > 0) {
      const ruleIdSet: ReadonlySet<string> = new Set(cliArgs.ruleIds);
      wsRules = wsRules.filter((r: WorkspaceRule): boolean => ruleIdSet.has(r.id));
    }

    /* Filter workspace rules by --category= */
    if (cliArgs.categories.length > 0) {
      wsRules = wsRules.filter((r: WorkspaceRule): boolean =>
        (r.categories ?? []).some((c: string): boolean => cliArgs.categories.includes(c)),
      );
    }

    /* Filter workspace rules by --stage= */
    if (cliArgs.stage) {
      const stageFilter: string = cliArgs.stage;
      wsRules = wsRules.filter((r: WorkspaceRule): boolean =>
        (r.stages ?? ['lint']).includes(stageFilter as Stage),
      );
    }

    /* Filter out globally disabled workspace rules */
    wsRules = wsRules.filter(
      (r: WorkspaceRule): boolean => (config.rules[r.id] ?? 'error') !== 'off',
    );

    if (wsRules.length > 0) {
      dbg(format(en.debug.workspaceRunning, { count: wsRules.length }));
      const wsContext: ReturnType<typeof createWorkspaceContext> = createWorkspaceContext(
        resolve(process.cwd()),
      );

      const wsResults: LintResult[][] = await Promise.all(
        wsRules.map((rule: WorkspaceRule): Promise<LintResult[]> => rule.check(wsContext)),
      );

      for (const results of wsResults) {
        allResults.push(...results);
      }

      dbg(format(en.debug.workspaceResults, { count: wsResults.flat().length }));
    }
  }

  /* Run external tools when --tools is enabled */
  if (cliArgs.tools && !bailed) {
    dbg(en.debug.toolLoading);
    const toolRegistry: ToolRegistry = new ToolRegistry();
    for (const tool of ALL_TOOLS) {
      toolRegistry.register(tool);
    }

    dbg(
      format(en.debug.toolRunning, {
        toolCount: toolRegistry.getAll().length,
        fileCount: allFiles.length,
      }),
    );
    const toolResults: LintResult[] = await toolRegistry.runAll(allFiles);
    allResults.push(...toolResults);
    dbg(format(en.debug.toolResults, { count: toolResults.length }));
  }

  /* Apply per-file severity from overrides (convert error to warning based on config) */
  allResults = allResults.map((result: LintResult): LintResult => {
    const severity: string = resolveRuleSeverity(config, result.ruleId, result.file);
    if (severity === 'warn' && result.severity === 'error') {
      return { ...result, severity: 'warning' };
    }
    return result;
  });

  /* Apply global --severity= override */
  if (cliArgs.severityOverride === 'off') {
    allResults = [];
  } else if (cliArgs.severityOverride === 'warn') {
    allResults = allResults.map((r: LintResult): LintResult => ({ ...r, severity: 'warning' }));
  } else if (cliArgs.severityOverride === 'error') {
    allResults = allResults.map((r: LintResult): LintResult => ({ ...r, severity: 'error' }));
  }

  /* Apply fixes if --fix */
  if (cliArgs.fix && allResults.length > 0) {
    const fixesByFile: Map<string, LintFix[]> = new Map();
    for (const result of allResults) {
      if (!result.fix) {
        continue;
      }
      const existing: LintFix[] = fixesByFile.get(result.file) ?? [];
      existing.push(result.fix);
      fixesByFile.set(result.file, existing);
    }

    let fixedFiles: number = 0;
    for (const [filePath, fixes] of fixesByFile) {
      try {
        const original: string = readFileSync(filePath, 'utf8');
        const fixed: string = applyFixes(original, fixes);
        if (fixed !== original) {
          writeFileSync(filePath, fixed, 'utf8');
          fixedFiles++;
        }
      } catch {
        /* File write failed — skip */
        output.stderr(`  Failed to apply fixes to: ${filePath}\n`);
      }
    }

    if (!cliArgs.json) {
      output.stdout(`\nApplied fixes to ${fixedFiles} file(s).\n`);
    }
  }

  /* When --quiet, only display errors (but still count warnings for summary) */
  const displayResults: LintResult[] = cliArgs.quiet
    ? allResults.filter((r: LintResult): boolean => r.severity === 'error')
    : allResults;

  /* Resolve output format: --format= takes priority, --json is alias for --format=json */
  const outputFormat: OutputFormat = cliArgs.format ?? (cliArgs.json ? 'json' : 'text');

  /* Build rule description map for SARIF */
  const ruleDescs: Map<string, string> = new Map<string, string>();
  for (const rule of loaded.typescript) {
    ruleDescs.set(rule.id, rule.description);
  }
  for (const rule of loaded.packageJson) {
    ruleDescs.set(rule.id, rule.description);
  }
  for (const rule of loaded.workspace) {
    ruleDescs.set(rule.id, rule.description);
  }

  /* Format and output results */
  const formatted: string = formatResults(displayResults, outputFormat, allFiles.length, ruleDescs);
  if (formatted.length > 0) {
    output.stdout(formatted);
  }

  /* Save cache to disk */
  if (lintCache) {
    lintCache.save(cachePath);
    dbg(
      format(en.debug.cacheSaved, {
        hits: lintCache.getHitCount(),
        misses: lintCache.getMissCount(),
        entries: lintCache.getEntryCount(),
      }),
    );
  }

  dbg(format(en.debug.totalTime, { ms: Date.now() - lintStartTime }));

  /* Exit with error if any errors found (unless --warn-only) */
  const hasErrors: boolean = allResults.some((r: LintResult): boolean => r.severity === 'error');
  if (cliArgs.warnOnly) {
    return 0;
  }
  return hasErrors ? 1 : 0;
}
