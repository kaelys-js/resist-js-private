#!/usr/bin/env node

/**
 * Custom Linter CLI
 *
 * Runs custom AST-based lint rules on TypeScript files using oxc-parser.
 * Designed to be called alongside oxlint in the `qa:lint` script.
 *
 * Usage:
 *   node --import tsx src/cli.ts <paths...> [--json] [--rule=id] [--list-rules]
 *
 * @module
 */

import { readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { resolve, extname, join, relative } from 'node:path';

import { runTypeScriptRules } from './framework/oxc-runner.ts';
import type { LintResult, LintFix, TypeScriptRule, PackageJsonRule, PackageJsonContext, PackageJson } from './framework/types.ts';
import { ALL_RULES } from './rules/index.ts';
import { PACKAGE_RULES } from './rules/package/all.ts';

// =============================================================================
// CLI Arguments
// =============================================================================

const args: string[] = process.argv.slice(2);
const flags: string[] = args.filter((a: string) => a.startsWith('--'));
const paths: string[] = args.filter((a: string) => !a.startsWith('--'));

const jsonOutput: boolean = flags.includes('--json');
const listRules: boolean = flags.includes('--list-rules');
const warnOnly: boolean = flags.includes('--warn-only');
const autoFix: boolean = flags.includes('--fix');

const ruleFlag: string | undefined = flags.find((f: string) => f.startsWith('--rule='));
const ruleIds: string[] = ruleFlag ? ruleFlag.split('=')[1].split(',') : [];

// =============================================================================
// File Discovery
// =============================================================================

/** Directories to always skip. */
const SKIP_DIRS: ReadonlySet<string> = new Set([
  'node_modules',
  '.git',
  '.svelte-kit',
  'dist',
  'build',
  'coverage',
  '.turbo',
  '_INTEGRATE',
]);

/**
 * Check if a file path should be linted.
 *
 * @param filePath - File path to check
 * @returns Whether the file should be linted
 */
function shouldLint(filePath: string): boolean {
  if (filePath.endsWith('.svelte.ts')) return true;
  if (filePath.endsWith('.test.ts')) return false; // Skip test files
  if (filePath.endsWith('.d.ts')) return false; // Skip declaration files
  const ext: string = extname(filePath);
  return ext === '.ts';
}

/**
 * Recursively collect all lintable files from a directory.
 *
 * @param dir - Directory to scan
 * @returns Array of absolute file paths
 */
function collectFiles(dir: string): string[] {
  const files: string[] = [];

  let entries: ReturnType<typeof readdirSync>;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    /* Directory not readable — skip */
    return files;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;

    const fullPath: string = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
    } else if (entry.isFile() && shouldLint(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Recursively collect all package.json files from a directory.
 *
 * @param dir - Directory to scan
 * @returns Array of absolute file paths
 */
function collectPackageJsonFiles(dir: string): string[] {
  const files: string[] = [];
  let entries: ReturnType<typeof readdirSync>;
  try { entries = readdirSync(dir, { withFileTypes: true }); }
  catch { return files; }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath: string = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectPackageJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name === 'package.json') {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Run package.json rules on a single package.json file.
 *
 * @param filePath - Absolute path to package.json
 * @param pkg - Parsed package.json content
 * @param isRoot - Whether this is the workspace root package.json
 * @param rules - Package.json rules to run
 * @returns Array of lint results
 */
function runPkgRules(filePath: string, pkg: PackageJson, isRoot: boolean, rules: PackageJsonRule[]): LintResult[] {
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
 * @param content - Original file content
 * @param fixes - Array of fixes to apply
 * @returns Updated file content
 */
function applyFixes(content: string, fixes: LintFix[]): string {
  // Sort fixes by start offset descending so we can apply from end to start
  const sorted: LintFix[] = [...fixes].toSorted(
    (a: LintFix, b: LintFix) => b.range.start - a.range.start,
  );

  let result: string = content;
  for (const fix of sorted) {
    result = result.slice(0, fix.range.start) + fix.text + result.slice(fix.range.end);
  }
  return result;
}

// =============================================================================
// Main
// =============================================================================

/**
 * Run the custom linter on all specified paths.
 *
 * @returns Exit code (0 = clean, 1 = errors found)
 */
async function main(): Promise<number> {
  // List rules mode
  if (listRules) {
    process.stdout.write('Custom lint rules:\n\n');
    for (const rule of ALL_RULES) {
      process.stdout.write(`  ${rule.id}\n`);
      process.stdout.write(`    ${rule.description}\n`);
      process.stdout.write(`    patterns: ${rule.patterns.join(', ')}\n\n`);
    }
    return 0;
  }

  if (paths.length === 0) {
    process.stderr.write('Usage: webforge-lint <paths...> [--json] [--rule=id] [--list-rules]\n');
    return 1;
  }

  // Filter rules by ID if specified
  let rules: TypeScriptRule[] = ALL_RULES;
  if (ruleIds.length > 0) {
    rules = rules.filter((r: TypeScriptRule) => ruleIds.includes(r.id));
  }

  // Collect files
  const allFiles: string[] = [];
  for (const p of paths) {
    const resolved: string = resolve(p);
    try {
      const s = statSync(resolved);
      if (s.isDirectory()) {
        allFiles.push(...collectFiles(resolved));
      } else if (s.isFile() && shouldLint(resolved)) {
        allFiles.push(resolved);
      }
    } catch {
      process.stderr.write(`Path not found: ${p}\n`);
    }
  }

  if (allFiles.length === 0) {
    if (!jsonOutput) process.stdout.write('No lintable files found.\n');
    return 0;
  }

  // Run rules on each file — build tasks then execute in parallel
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

    // Filter rules by file pattern
    const applicableRules: TypeScriptRule[] = rules.filter((rule: TypeScriptRule) =>
      rule.patterns.some((pattern: string) => {
        if (pattern.startsWith('**/*.')) {
          const ext: string = pattern.slice(4);
          return filePath.endsWith(ext);
        }
        return filePath.includes(pattern);
      }),
    );

    if (applicableRules.length === 0) continue;
    tasks.push({ filePath, content, applicableRules });
  }

  const taskResults: LintResult[][] = await Promise.all(
    tasks.map((task: FileTask): Promise<LintResult[]> =>
      runTypeScriptRules(task.filePath, task.content, task.applicableRules),
    ),
  );
  const allResults: LintResult[] = taskResults.flat();

  // Run finalize() on rules that aggregate cross-file data
  for (const rule of rules) {
    if (rule.finalize) {
      allResults.push(...rule.finalize());
    }
  }

  // Run package.json rules
  const pkgFiles: string[] = [];
  for (const p of paths) {
    const resolved: string = resolve(p);
    try {
      const s = statSync(resolved);
      if (s.isDirectory()) {
        pkgFiles.push(...collectPackageJsonFiles(resolved));
      }
    } catch { /* skip */ }
  }

  const workspaceRootPkg: string = resolve('package.json');
  for (const pkgPath of pkgFiles) {
    try {
      const raw: string = readFileSync(pkgPath, 'utf8');
      const pkg: PackageJson = JSON.parse(raw) as PackageJson;
      const isRoot: boolean = resolve(pkgPath) === workspaceRootPkg;
      allResults.push(...runPkgRules(pkgPath, pkg, isRoot, PACKAGE_RULES));
    } catch { /* skip unreadable */ }
  }

  // Apply fixes if --fix
  if (autoFix && allResults.length > 0) {
    const fixesByFile: Map<string, LintFix[]> = new Map();
    for (const result of allResults) {
      if (!result.fix) continue;
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
        process.stderr.write(`  Failed to apply fixes to: ${filePath}\n`);
      }
    }

    if (!jsonOutput) {
      process.stdout.write(`\nApplied fixes to ${fixedFiles} file(s).\n`);
    }
  }

  // Output results
  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify(allResults, null, 2)}\n`);
  } else {
    const errors: LintResult[] = allResults.filter((r: LintResult) => r.severity === 'error');
    const warnings: LintResult[] = allResults.filter((r: LintResult) => r.severity === 'warning');

    for (const result of allResults) {
      const relPath: string = relative(process.cwd(), result.file);
      const icon: string = result.severity === 'error' ? '✗' : '⚠';
      process.stdout.write(
        `  ${icon} ${relPath}:${result.line}:${result.column} ${result.message} [${result.ruleId}]\n`,
      );
      if (result.tip) {
        process.stdout.write(`    → ${result.tip}\n`);
      }
    }

    if (allResults.length > 0) {
      process.stdout.write(
        `\nFound ${errors.length} error(s) and ${warnings.length} warning(s) in ${allFiles.length} file(s).\n`,
      );
    }
  }

  // Exit with error if any errors found (unless --warn-only)
  const hasErrors: boolean = allResults.some((r: LintResult) => r.severity === 'error');
  if (warnOnly) return 0;
  return hasErrors ? 1 : 0;
}

try {
  const code: number = await main();
  process.exit(code);
} catch (error: unknown) {
  process.stderr.write(`Linter crashed: ${String(error)}\n`);
  process.exit(2);
}
