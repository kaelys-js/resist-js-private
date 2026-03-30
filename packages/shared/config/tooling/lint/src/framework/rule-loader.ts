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

import type { Dirent } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as v from 'valibot';
import type {
  PackageJsonRule,
  Stage,
  TypeScriptRule,
  WorkspaceRule,
} from '@/lint/framework/types.ts';
import { type LintStrings, format } from '@/lint/locale/schema.ts';

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

/** Default stage assigned to rules that don't declare stages. */
const DEFAULT_STAGES: Stage[] = ['lint'];

/** Schema for the result of loading all rules from the rules directory. */
export const LoadedRulesSchema = v.strictObject({
  /** All rules indexed by category name. */
  byCategory: v.custom<Map<string, Array<TypeScriptRule | PackageJsonRule>>>(
    (val: unknown): boolean => val instanceof Map,
  ),
  /** All rules indexed by unique rule ID for O(1) lookup. */
  byId: v.custom<Map<string, TypeScriptRule | PackageJsonRule>>(
    (val: unknown): boolean => val instanceof Map,
  ),
  /** All rules indexed by pipeline stage. */
  byStage: v.custom<Map<Stage, Array<TypeScriptRule | PackageJsonRule>>>(
    (val: unknown): boolean => val instanceof Map,
  ),
  /** Package.json lint rules. */
  packageJson: v.custom<PackageJsonRule[]>((val: unknown): boolean => Array.isArray(val)),
  /** AST-based TypeScript lint rules. */
  typescript: v.custom<TypeScriptRule[]>((val: unknown): boolean => Array.isArray(val)),
  /** Workspace-scoped lint rules. */
  workspace: v.custom<WorkspaceRule[]>((val: unknown): boolean => Array.isArray(val)),
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
 * @param {LintStrings} strings - Locale strings for user-facing messages
 * @returns {Promise<LoadedRules>} All discovered rules, categorized by type
 */
/** Module-level cache — rules never change within a process lifetime. */
let cachedRules: Promise<LoadedRules> | undefined;

export function loadAllRules(strings: LintStrings): Promise<LoadedRules> {
  if (cachedRules === undefined) {
    cachedRules = _loadAllRulesUncached(strings);
  }
  return cachedRules;
}

/** Uncached implementation — called once per process. */
async function _loadAllRulesUncached(strings: LintStrings): Promise<LoadedRules> {
  const currentDir: string = fileURLToPath(new URL('.', import.meta.url));
  const rulesDir: string = join(currentDir, '..', 'rules');

  const ruleFiles: string[] = await collectRuleFiles(rulesDir);

  const tsRules: TypeScriptRule[] = [];
  const pkgRules: PackageJsonRule[] = [];
  const wsRules: WorkspaceRule[] = [];

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
      process.stderr.write(`${format(strings.errors.ruleLoadFailed, { path: rel })}\n`);
      continue;
    }

    const mod: Record<string, unknown> = result.value;

    /* Collect rule candidates from multiple export shapes */
    const candidates: unknown[] = extractRuleCandidates(mod);

    for (const candidate of candidates) {
      classifyRule(candidate, tsRules, pkgRules, wsRules);
    }
  }

  /* Sort by rule ID for deterministic ordering */
  tsRules.sort((a: TypeScriptRule, b: TypeScriptRule): number => a.id.localeCompare(b.id));
  pkgRules.sort((a: PackageJsonRule, b: PackageJsonRule): number => a.id.localeCompare(b.id));
  wsRules.sort((a: WorkspaceRule, b: WorkspaceRule): number => a.id.localeCompare(b.id));

  /* Backfill defaults for categories/stages */
  backfillDefaults(tsRules);
  backfillDefaults(pkgRules);
  backfillDefaults(wsRules);

  /* Build byId, category, and stage indexes (TS + pkg rules only — workspace indexed separately) */
  const byId: Map<string, TypeScriptRule | PackageJsonRule> = new Map();
  const byCategory: Map<string, Array<TypeScriptRule | PackageJsonRule>> = new Map();
  const byStage: Map<Stage, Array<TypeScriptRule | PackageJsonRule>> = new Map();

  const allRules: Array<TypeScriptRule | PackageJsonRule> = [...tsRules, ...pkgRules];

  for (const rule of allRules) {
    /* Detect duplicate IDs */
    if (byId.has(rule.id)) {
      process.stderr.write(`${format(strings.errors.duplicateRule, { ruleId: rule.id })}\n`);
      continue;
    }
    byId.set(rule.id, rule);

    for (const cat of rule.categories ?? []) {
      const list: Array<TypeScriptRule | PackageJsonRule> = byCategory.get(cat) ?? [];
      list.push(rule);
      byCategory.set(cat, list);
    }

    for (const stage of rule.stages ?? DEFAULT_STAGES) {
      const list: Array<TypeScriptRule | PackageJsonRule> = byStage.get(stage) ?? [];
      list.push(rule);
      byStage.set(stage, list);
    }
  }

  return {
    byCategory,
    byId,
    byStage,
    packageJson: pkgRules,
    typescript: tsRules,
    workspace: wsRules,
  };
}

// =============================================================================
// Internal
// =============================================================================

/**
 * Extract rule candidates from a module's exports.
 *
 * Supports three export shapes:
 * 1. `export default rule` — single rule object
 * 2. `export default [rule1, rule2]` — array of rules as default export
 * 3. `export { rules }` — named `rules` array export
 *
 * All shapes can coexist in a single module. Deduplication happens later
 * via the `byId` duplicate detection.
 *
 * @param mod - The imported module's exports
 * @returns Array of unknown candidate objects to classify
 */
function extractRuleCandidates(mod: Record<string, unknown>): unknown[] {
  const candidates: unknown[] = [];

  /* Shape 1 & 2: default export (single object or array) */
  const defaultExport: unknown = mod.default;
  if (Array.isArray(defaultExport)) {
    /* Shape 2: export default [rule1, rule2, ...] */
    for (const item of defaultExport) {
      candidates.push(item);
    }
  } else if (defaultExport && typeof defaultExport === 'object') {
    /* Shape 1: export default rule */
    candidates.push(defaultExport);
  }

  /* Shape 3: export { rules } (named array export) */
  const namedRules: unknown = mod.rules;
  if (Array.isArray(namedRules)) {
    for (const item of namedRules) {
      candidates.push(item);
    }
  }

  return candidates;
}

/**
 * Classify a single rule candidate and push it into the appropriate array.
 *
 * A valid rule must have an `id` string. Then:
 * - If it has a `visitor` property → TypeScriptRule
 * - If it has a `check` function → PackageJsonRule
 *
 * Invalid candidates are silently skipped.
 *
 * @param candidate - Unknown object to classify
 * @param tsRules - TypeScript rules accumulator (mutated)
 * @param pkgRules - Package.json rules accumulator (mutated)
 * @param wsRules - Workspace rules accumulator (mutated)
 */
function classifyRule(
  candidate: unknown,
  tsRules: TypeScriptRule[],
  pkgRules: PackageJsonRule[],
  wsRules: WorkspaceRule[],
): void {
  if (!candidate || typeof candidate !== 'object') {
    return;
  }

  const ruleObj: Record<string, unknown> = candidate as Record<string, unknown>;

  if (!('id' in ruleObj) || typeof ruleObj.id !== 'string') {
    return;
  }

  if ('visitor' in ruleObj) {
    tsRules.push(candidate as TypeScriptRule);
  } else if ('scope' in ruleObj && ruleObj.scope === 'workspace') {
    wsRules.push(candidate as WorkspaceRule);
  } else if ('check' in ruleObj && typeof ruleObj.check === 'function') {
    pkgRules.push(candidate as PackageJsonRule);
  }
}

/**
 * Backfill default categories and stages on rules that omit them.
 *
 * - categories defaults to `[ruleId.split('/')[0]]` (the rule prefix)
 * - stages defaults to `['lint']`
 *
 * @param rules - Array of rules to backfill (mutated in place)
 */
/** Minimal rule shape shared by all rule types — used for index building and backfill. */
type BaseRule = {
  id: string;
  categories?: string[];
  stages?: Stage[];
};

function backfillDefaults(rules: BaseRule[]): void {
  for (const rule of rules) {
    if (!rule.categories || rule.categories.length === 0) {
      const prefix: string = rule.id.split('/')[0] ?? 'unknown';
      rule.categories = [prefix];
    }

    if (!rule.stages || rule.stages.length === 0) {
      rule.stages = [...DEFAULT_STAGES];
    }
  }
}

/**
 * Recursively collect all rule file paths from a directory.
 *
 * Skips test files, barrel files, and non-TypeScript files.
 * Subdirectories are scanned concurrently via Promise.all.
 *
 * @param dir - Directory to scan
 * @returns Array of absolute file paths to rule modules
 */
async function collectRuleFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  let entries: Dirent[];
  try {
    entries = (await readdir(dir, { withFileTypes: true })) as Dirent[];
  } catch {
    return files;
  }

  const subdirPromises: Promise<string[]>[] = [];

  for (const entry of entries) {
    const name: string = entry.name as string;
    const fullPath: string = join(dir, name);

    if (entry.isDirectory()) {
      subdirPromises.push(collectRuleFiles(fullPath));
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

  if (subdirPromises.length > 0) {
    const subdirResults: string[][] = await Promise.all(subdirPromises);
    for (const subFiles of subdirResults) {
      files.push(...subFiles);
    }
  }

  return files;
}
