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
import type { LintResult, LintFix, TypeScriptRule } from './framework/types.ts';
import { ALL_RULES } from './rules/index.ts';

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

/** File extensions to lint. */
const LINT_EXTENSIONS: ReadonlySet<string> = new Set(['.ts', '.svelte.ts']);

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
  const sorted: LintFix[] = [...fixes].sort(
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
    console.log('Custom lint rules:\n');
    for (const rule of ALL_RULES) {
      console.log(`  ${rule.id}`);
      console.log(`    ${rule.description}`);
      console.log(`    patterns: ${rule.patterns.join(', ')}\n`);
    }
    return 0;
  }

  if (paths.length === 0) {
    console.error('Usage: webforge-lint <paths...> [--json] [--rule=id] [--list-rules]');
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
      console.error(`Path not found: ${p}`);
    }
  }

  if (allFiles.length === 0) {
    if (!jsonOutput) console.log('No lintable files found.');
    return 0;
  }

  // Run rules on each file
  const allResults: LintResult[] = [];

  for (const filePath of allFiles) {
    let content: string;
    try {
      content = readFileSync(filePath, 'utf-8');
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

    const results: LintResult[] = await runTypeScriptRules(filePath, content, applicableRules);
    allResults.push(...results);
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
        const original: string = readFileSync(filePath, 'utf-8');
        const fixed: string = applyFixes(original, fixes);
        if (fixed !== original) {
          writeFileSync(filePath, fixed, 'utf-8');
          fixedFiles++;
        }
      } catch {
        /* File write failed — skip */
        console.error(`  Failed to apply fixes to: ${filePath}`);
      }
    }

    if (!jsonOutput) {
      console.log(`\nApplied fixes to ${fixedFiles} file(s).`);
    }
  }

  // Output results
  if (jsonOutput) {
    console.log(JSON.stringify(allResults, null, 2));
  } else {
    const errors: LintResult[] = allResults.filter((r: LintResult) => r.severity === 'error');
    const warnings: LintResult[] = allResults.filter((r: LintResult) => r.severity === 'warning');

    for (const result of allResults) {
      const relPath: string = relative(process.cwd(), result.file);
      const icon: string = result.severity === 'error' ? '✗' : '⚠';
      console.log(
        `  ${icon} ${relPath}:${result.line}:${result.column} ${result.message} [${result.ruleId}]`,
      );
      if (result.tip) {
        console.log(`    → ${result.tip}`);
      }
    }

    if (allResults.length > 0) {
      console.log(
        `\nFound ${errors.length} error(s) and ${warnings.length} warning(s) in ${allFiles.length} file(s).`,
      );
    }
  }

  // Exit with error if any errors found (unless --warn-only)
  const hasErrors: boolean = allResults.some((r: LintResult) => r.severity === 'error');
  if (warnOnly) return 0;
  return hasErrors ? 1 : 0;
}

main()
  .then((code: number) => process.exit(code))
  .catch((err: unknown) => {
    console.error('Linter crashed:', err);
    process.exit(2);
  });
