/**
 * Custom Linter — Configuration Schema
 *
 * Valibot-validated configuration schema for `.webforgelintrc.json`.
 * Mirrors the style of `.oxlintrc.json` with include/exclude, rules,
 * and file-specific overrides.
 *
 * @module
 */

import * as v from 'valibot';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// =============================================================================
// Schemas
// =============================================================================

/** Severity level for a rule: error, warn, or off. */
export const RuleSeveritySchema = v.picklist(['error', 'warn', 'off']);

/** Inferred type for rule severity. See {@link RuleSeveritySchema}. */
export type RuleSeverity = v.InferOutput<typeof RuleSeveritySchema>;

/** Schema for file-specific rule overrides. */
export const OverrideSchema = v.object({
  /** Glob patterns matching files to apply these overrides to. */
  files: v.array(v.string()),
  /** Rule-level severity overrides for matched files. */
  rules: v.record(v.string(), RuleSeveritySchema),
});

/** Inferred type for override entries. See {@link OverrideSchema}. */
export type Override = v.InferOutput<typeof OverrideSchema>;

/** Schema for the full linter configuration file. */
export const LintConfigSchema = v.object({
  /** Paths to include in linting (relative to workspace root). */
  include: v.optional(v.array(v.string()), []),
  /** Directory names to always skip during file discovery. */
  exclude: v.optional(v.array(v.string()), []),
  /** File extensions to lint. */
  extensions: v.optional(v.array(v.string()), ['.ts', '.mjs']),
  /** Whether to include `.svelte.ts` files (always included). */
  includeSvelteTs: v.optional(v.boolean(), true),
  /** Whether to skip test files (`*.test.ts`). */
  skipTests: v.optional(v.boolean(), true),
  /** Whether to skip declaration files (`*.d.ts`). */
  skipDeclarations: v.optional(v.boolean(), true),
  /** Rule ID → severity mapping. Unlisted rules default to "error". */
  rules: v.optional(v.record(v.string(), RuleSeveritySchema), {}),
  /** File-specific rule overrides (like oxlint overrides). */
  overrides: v.optional(v.array(OverrideSchema), []),
});

/** Inferred type for the linter configuration. See {@link LintConfigSchema}. */
export type LintConfig = v.InferOutput<typeof LintConfigSchema>;

// =============================================================================
// Constants
// =============================================================================

/** Configuration file name. */
const CONFIG_FILENAME: string = '.webforgelintrc.json';

// =============================================================================
// API
// =============================================================================

/**
 * Load and validate the linter configuration file.
 *
 * Searches for `.webforgelintrc.json` in the given directory (typically
 * workspace root). Returns validated defaults if no config file exists.
 *
 * @param cwd - Directory to search for the config file
 * @returns Validated linter configuration
 * @throws If the config file contains invalid JSON or fails schema validation
 */
export function loadConfig(cwd: string): LintConfig {
  const configPath: string = resolve(cwd, CONFIG_FILENAME);
  let raw: string;

  try {
    raw = readFileSync(configPath, 'utf8');
  } catch {
    /* No config file — return defaults */
    return v.parse(LintConfigSchema, {});
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error: unknown) {
    throw new Error(`Invalid JSON in ${configPath}: ${String(error)}`, { cause: error });
  }

  const result: v.SafeParseResult<typeof LintConfigSchema> = v.safeParse(LintConfigSchema, parsed);

  if (!result.success) {
    const issues: string = result.issues
      .map(
        (issue: v.BaseIssue<unknown>): string =>
          `  - ${issue.path?.map((p: v.BaseIssue<unknown>['path'] extends (infer U)[] | undefined ? U : never) => String('key' in p ? p.key : '')).join('.') ?? 'root'}: ${issue.message}`,
      )
      .join('\n');
    throw new Error(`Invalid config in ${configPath}:\n${issues}`);
  }

  return result.output;
}

/**
 * Resolve the effective severity for a rule on a specific file.
 *
 * Checks overrides first (last matching override wins), then falls back
 * to the top-level `rules` map, then defaults to "error".
 *
 * @param config - Linter configuration
 * @param ruleId - Rule ID (e.g. 'jsdoc/require-param')
 * @param filePath - Absolute file path being linted
 * @returns Effective severity for this rule on this file
 */
export function resolveRuleSeverity(
  config: LintConfig,
  ruleId: string,
  filePath: string,
): RuleSeverity {
  /* Check overrides in reverse order — last match wins */
  for (let i: number = config.overrides.length - 1; i >= 0; i--) {
    const override: Override | undefined = config.overrides[i];
    if (!override) {
      continue;
    }

    const matches: boolean = override.files.some((pattern: string): boolean =>
      fileMatchesPattern(filePath, pattern),
    );

    if (matches && ruleId in override.rules) {
      return override.rules[ruleId] ?? 'error';
    }
  }

  /* Fall back to top-level rules map */
  if (ruleId in config.rules) {
    return config.rules[ruleId] ?? 'error';
  }

  /* Default: all rules are errors */
  return 'error';
}

/**
 * Check if a file path matches a glob-like pattern.
 *
 * Supports simple patterns:
 * - `**\/` prefix for recursive matching
 * - `*` wildcard for single path segments
 * - Direct substring matching for path fragments
 *
 * @param filePath - Absolute file path
 * @param pattern - Glob-like pattern
 * @returns Whether the file matches
 */
function fileMatchesPattern(filePath: string, pattern: string): boolean {
  /* Exact filename match (e.g. "*.test.ts") */
  if (pattern.startsWith('*.')) {
    const ext: string = pattern.slice(1);
    return filePath.endsWith(ext);
  }

  /* Recursive glob (e.g. "**\/dir/**" or "**\/*.test.ts") */
  if (pattern.startsWith('**/')) {
    const suffix: string = pattern.slice(3);

    /* Trailing /** means "anything under this directory" */
    if (suffix.endsWith('/**')) {
      const dirFragment: string = suffix.slice(0, -3);
      return filePath.includes(dirFragment);
    }

    /* If suffix contains *, extract the extension for matching */
    if (suffix.includes('*')) {
      const dotIdx: number = suffix.lastIndexOf('.');
      if (dotIdx >= 0) {
        const ext: string = suffix.slice(dotIdx);
        return filePath.endsWith(ext);
      }
      return false;
    }

    return filePath.includes(suffix);
  }

  /* Direct path fragment match */
  return filePath.includes(pattern);
}
