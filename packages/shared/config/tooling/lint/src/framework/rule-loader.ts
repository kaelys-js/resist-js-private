/**
 * Custom Linter — Rule Auto-Loader
 *
 * Automatically discovers and loads all lint rules from the `rules/` directory.
 * Eliminates the need for manual barrel files (`all.ts`, `index.ts`).
 *
 * Rules are identified by their default export:
 * - TypeScriptRule: has `visitor` property
 * - PackageJsonRule: has `check` property
 *
 * @module
 */

import { readdirSync, type Dirent } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as v from 'valibot';

import type { TypeScriptRule, PackageJsonRule } from '@/lint/framework/types.ts';

// =============================================================================
// Constants
// =============================================================================

/** Files to skip during rule discovery. */
const SKIP_FILES: ReadonlySet<string> = new Set(['all.ts', 'index.ts']);

/** File suffixes to skip. */
const SKIP_SUFFIXES: readonly string[] = ['.test.ts', '.spec.ts', '.d.ts'];

// =============================================================================
// Types
// =============================================================================

/** Schema for the result of loading all rules from the rules directory. */
export const LoadedRulesSchema = v.strictObject({
  /** AST-based TypeScript lint rules. */
  typescript: v.custom<TypeScriptRule[]>((val: unknown): boolean => Array.isArray(val)),
  /** Package.json lint rules. */
  packageJson: v.custom<PackageJsonRule[]>((val: unknown): boolean => Array.isArray(val)),
});

/** Result of loading all rules from the rules directory. See {@link LoadedRulesSchema}. */
export type LoadedRules = v.InferOutput<typeof LoadedRulesSchema>;

// =============================================================================
// API
// =============================================================================

/**
 * Discover and load all lint rules from the rules directory.
 *
 * Recursively scans `src/rules/` for `.ts` files, imports each one,
 * and categorizes the default export as either a TypeScriptRule or
 * PackageJsonRule based on its shape.
 *
 * @returns {Promise<LoadedRules>} All discovered rules, categorized by type
 */
export async function loadAllRules(): Promise<LoadedRules> {
  const currentDir: string = fileURLToPath(new URL('.', import.meta.url));
  const rulesDir: string = join(currentDir, '..', 'rules');

  const ruleFiles: string[] = collectRuleFiles(rulesDir);

  const tsRules: TypeScriptRule[] = [];
  const pkgRules: PackageJsonRule[] = [];

  /* Import all rule files in parallel to avoid no-await-in-loop */
  const importResults: Array<PromiseSettledResult<Record<string, unknown>>> =
    await Promise.allSettled(
      ruleFiles.map(
        (filePath: string): Promise<Record<string, unknown>> =>
          import(filePath) as Promise<Record<string, unknown>>,
      ),
    );

  for (let i: number = 0; i < importResults.length; i++) {
    const result: PromiseSettledResult<Record<string, unknown>> | undefined = importResults[i];
    const filePath: string = ruleFiles[i] ?? '';

    if (!result || result.status === 'rejected') {
      const rel: string = relative(rulesDir, filePath);
      process.stderr.write(`  Warning: Failed to load rule from ${rel}\n`);
      continue;
    }

    const mod: Record<string, unknown> = result.value;
    const rule: unknown = mod.default;

    if (!rule || typeof rule !== 'object') {
      continue;
    }

    const ruleObj: Record<string, unknown> = rule as Record<string, unknown>;

    if (!('id' in ruleObj) || typeof ruleObj.id !== 'string') {
      continue;
    }

    if ('visitor' in ruleObj) {
      tsRules.push(rule as TypeScriptRule);
    } else if ('check' in ruleObj && typeof ruleObj.check === 'function') {
      pkgRules.push(rule as PackageJsonRule);
    }
  }

  /* Sort by rule ID for deterministic ordering */
  tsRules.sort((a: TypeScriptRule, b: TypeScriptRule): number => a.id.localeCompare(b.id));
  pkgRules.sort((a: PackageJsonRule, b: PackageJsonRule): number => a.id.localeCompare(b.id));

  return { typescript: tsRules, packageJson: pkgRules };
}

// =============================================================================
// Internal
// =============================================================================

/**
 * Recursively collect all rule file paths from a directory.
 *
 * Skips test files, barrel files, and non-TypeScript files.
 *
 * @param dir - Directory to scan
 * @returns Array of absolute file paths to rule modules
 */
function collectRuleFiles(dir: string): string[] {
  const files: string[] = [];

  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true }) as Dirent[];
  } catch {
    return files;
  }

  for (const entry of entries) {
    const name: string = entry.name as string;
    const fullPath: string = join(dir, name);

    if (entry.isDirectory()) {
      files.push(...collectRuleFiles(fullPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    /* Skip non-TypeScript files */
    if (!name.endsWith('.ts')) {
      continue;
    }

    /* Skip known non-rule files */
    if (SKIP_FILES.has(name)) {
      continue;
    }

    /* Skip test/spec/declaration files */
    if (SKIP_SUFFIXES.some((suffix: string): boolean => name.endsWith(suffix))) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
}
