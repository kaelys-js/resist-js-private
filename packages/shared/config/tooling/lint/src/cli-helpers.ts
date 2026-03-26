/**
 * resist-lint — CLI Helper Functions
 *
 * Pure, testable helper functions extracted from the CLI entry point.
 * These handle argument parsing, file discovery, fix application,
 * schema generation, and the main linter orchestration loop.
 *
 * @module
 */

import { readFileSync, writeFileSync, readdirSync, statSync, type Dirent } from 'node:fs';
import { resolve, extname, join, relative } from 'node:path';

import { runTypeScriptRules } from './framework/oxc-runner.ts';
import { loadAllRules } from './framework/rule-loader.ts';
import {
  loadConfig,
  resolveRuleSeverity,
  generateJsonSchema,
  type LintConfig,
} from './config/schema.ts';
import { LINTER_NAME, CONFIG_FILENAME, SCHEMA_FILENAME } from './constants.ts';
import type {
  LintResult,
  LintFix,
  TypeScriptRule,
  PackageJsonRule,
  PackageJsonContext,
  PackageJson,
} from './framework/types.ts';

// =============================================================================
// Types
// =============================================================================

/** Parsed CLI arguments. */
export type CliArgs = {
  /** Positional path arguments. */
  paths: string[];
  /** Whether to output results as JSON. */
  json: boolean;
  /** Whether to list all rules and exit. */
  listRules: boolean;
  /** Whether to exit 0 even if errors are found. */
  warnOnly: boolean;
  /** Whether to auto-apply fixes to source files. */
  fix: boolean;
  /** Whether to show help and exit. */
  help: boolean;
  /** Rule IDs to filter by (empty = all rules). */
  ruleIds: string[];
};

/** Output sink for CLI messages (allows testing without stdout/stderr). */
export type CliOutput = {
  /** Write to stdout. */
  stdout: (msg: string) => void;
  /** Write to stderr. */
  stderr: (msg: string) => void;
};

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

  return {
    paths,
    json: flags.includes('--json'),
    listRules: flags.includes('--list-rules'),
    warnOnly: flags.includes('--warn-only'),
    fix: flags.includes('--fix'),
    help: flags.includes('--help') || flags.includes('-h'),
    ruleIds,
  };
}

// =============================================================================
// File Discovery
// =============================================================================

/**
 * Check if a file path should be linted based on config.
 *
 * Excluded patterns (e.g. `*.test.ts`, `*.d.ts`) are checked first.
 * Then the file extension must match one from `config.extensions`.
 *
 * @param {string} filePath - File path to check
 * @param {LintConfig} config - Linter configuration
 * @returns {boolean} Whether the file should be linted
 */
export function shouldLint(filePath: string, config: LintConfig): boolean {
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
 * @returns {LintResult[]} Array of lint results
 */
export function runPkgRules(
  filePath: string,
  pkg: PackageJson,
  isRoot: boolean,
  rules: PackageJsonRule[],
): LintResult[] {
  const context: PackageJsonContext = { file: filePath, pkg, isRoot };
  const results: LintResult[] = [];
  for (const rule of rules) {
    results.push(...rule.check(context));
  }
  return results;
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
 * Build the formatted CLI help text.
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
  return `
${linterName} — Custom AST-based linter

USAGE
  ${linterName} <paths...> [options]
  ${linterName} --list-rules

OPTIONS
  <paths...>            Paths to lint (files or directories)
  --rule=id[,id2,...]   Run only the specified rule(s)
  --fix                 Auto-apply fixes to source files
  --json                Output results as JSON
  --list-rules          Print all rules with severity and patterns
  --warn-only           Exit 0 even if errors are found
  --help, -h            Show this help message

CONFIGURATION
  Configuration is loaded from ${configFilename} at the workspace root.
  Supports JSONC (JSON with line and block comments).

  The JSON Schema (${schemaFilename}) is auto-generated on each
  lint run for IDE autocomplete with rule descriptions.

EXAMPLES
  ${linterName} packages/shared/schemas
  ${linterName} --rule=jsdoc/require-param packages/shared/schemas
  ${linterName} --fix packages/shared/schemas
  ${linterName} --list-rules

`;
}

// =============================================================================
// Main Linter Loop
// =============================================================================

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

  /* Load config */
  const config: LintConfig = loadConfig(process.cwd());

  /* Auto-discover all rules */
  const loaded: { typescript: TypeScriptRule[]; packageJson: PackageJsonRule[] } =
    await loadAllRules();
  let allTsRules: TypeScriptRule[] = loaded.typescript;
  let allPkgRules: PackageJsonRule[] = loaded.packageJson;

  /* Auto-generate JSON Schema for IDE autocomplete */
  writeJsonSchema(allTsRules, allPkgRules);

  /* List rules mode */
  if (cliArgs.listRules) {
    output.stdout('TypeScript rules:\n\n');
    for (const rule of allTsRules) {
      const severity: string = config.rules[rule.id] ?? 'error';
      const fixable: string = rule.fixable ? ' [fixable]' : '';
      output.stdout(`  ${rule.id} (${severity})${fixable}\n`);
      output.stdout(`    ${rule.description}\n`);
      output.stdout(`    patterns: ${rule.patterns.join(', ')}\n\n`);
    }
    output.stdout('Package.json rules:\n\n');
    for (const rule of allPkgRules) {
      const severity: string = config.rules[rule.id] ?? 'error';
      const fixable: string = rule.fixable ? ' [fixable]' : '';
      output.stdout(`  ${rule.id} (${severity})${fixable}\n`);
      output.stdout(`    ${rule.description}\n\n`);
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

  /* Filter rules by --rule= flag if specified */
  if (cliArgs.ruleIds.length > 0) {
    allTsRules = allTsRules.filter((r: TypeScriptRule): boolean => cliArgs.ruleIds.includes(r.id));
    allPkgRules = allPkgRules.filter((r: PackageJsonRule): boolean =>
      cliArgs.ruleIds.includes(r.id),
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

  if (allFiles.length === 0) {
    if (!cliArgs.json) {
      output.stdout('No lintable files found.\n');
    }
    return 0;
  }

  /* Run TypeScript rules on each file */
  type FileTask = { filePath: string; content: string; applicableRules: TypeScriptRule[] };
  const tasks: FileTask[] = [];

  for (const filePath of allFiles) {
    let content: string;
    try {
      content = readFileSync(filePath, 'utf8');
    } catch {
      /* File not readable — skip */
      continue;
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

  const taskResults: LintResult[][] = await Promise.all(
    tasks.map(
      (task: FileTask): Promise<LintResult[]> =>
        runTypeScriptRules(task.filePath, task.content, task.applicableRules),
    ),
  );
  let allResults: LintResult[] = taskResults.flat();

  /* Run finalize() on rules that aggregate cross-file data */
  for (const rule of allTsRules) {
    if (rule.finalize) {
      allResults.push(...rule.finalize());
    }
  }

  /* Run package.json rules */
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

      allResults.push(...runPkgRules(pkgPath, pkg, isRoot, applicablePkgRules));
    } catch {
      /* skip unreadable */
    }
  }

  /* Apply per-file severity from overrides (convert error to warning based on config) */
  allResults = allResults.map((result: LintResult): LintResult => {
    const severity: string = resolveRuleSeverity(config, result.ruleId, result.file);
    if (severity === 'warn' && result.severity === 'error') {
      return { ...result, severity: 'warning' };
    }
    return result;
  });

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

  /* Output results */
  if (cliArgs.json) {
    output.stdout(`${JSON.stringify(allResults, null, 2)}\n`);
  } else {
    const errors: LintResult[] = allResults.filter(
      (r: LintResult): boolean => r.severity === 'error',
    );
    const warnings: LintResult[] = allResults.filter(
      (r: LintResult): boolean => r.severity === 'warning',
    );

    for (const result of allResults) {
      const relPath: string = relative(process.cwd(), result.file);
      const icon: string = result.severity === 'error' ? '✗' : '⚠';
      output.stdout(
        `  ${icon} ${relPath}:${result.line}:${result.column} ${result.message} [${result.ruleId}]\n`,
      );
      if (result.tip) {
        output.stdout(`    → ${result.tip}\n`);
      }
    }

    if (allResults.length > 0) {
      output.stdout(
        `\nFound ${errors.length} error(s) and ${warnings.length} warning(s) in ${allFiles.length} file(s).\n`,
      );
    }
  }

  /* Exit with error if any errors found (unless --warn-only) */
  const hasErrors: boolean = allResults.some((r: LintResult): boolean => r.severity === 'error');
  if (cliArgs.warnOnly) {
    return 0;
  }
  return hasErrors ? 1 : 0;
}
