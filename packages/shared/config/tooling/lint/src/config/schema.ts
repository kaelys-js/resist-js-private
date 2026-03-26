/**
 * Custom Linter — Configuration Schema
 *
 * Valibot-validated configuration schema for `.resist-lint.jsonc`.
 * Mirrors the style of `.oxlintrc.json` with include/exclude, rules,
 * and file-specific overrides.
 *
 * @module
 */

import * as v from 'valibot';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { CONFIG_FILENAME, LINTER_NAME } from '../constants.ts';

// =============================================================================
// Schemas
// =============================================================================

/** Severity level for a rule: error, warn, or off. */
export const RuleSeveritySchema = v.picklist(['error', 'warn', 'off']);

/** Inferred type for rule severity. See {@link RuleSeveritySchema}. */
export type RuleSeverity = v.InferOutput<typeof RuleSeveritySchema>;

/** Schema for file-specific rule overrides. */
export const OverrideSchema = v.strictObject({
  /** Glob patterns matching files to apply these overrides to. */
  files: v.array(v.string()),
  /** Rule-level severity overrides for matched files. */
  rules: v.record(v.string(), RuleSeveritySchema),
});

/** Inferred type for override entries. See {@link OverrideSchema}. */
export type Override = v.InferOutput<typeof OverrideSchema>;

/** Schema for the full linter configuration file. */
export const LintConfigSchema = v.strictObject({
  /** JSON Schema reference for IDE autocomplete (ignored by linter). */
  $schema: v.optional(v.string()),
  /** Paths to include in linting (relative to workspace root). */
  include: v.optional(v.array(v.string()), []),
  /** Glob patterns to exclude from linting. */
  exclude: v.optional(v.array(v.string()), ['*.test.ts', '*.d.ts']),
  /** File extensions to lint (including `.svelte.ts`). */
  extensions: v.optional(v.array(v.string()), ['.ts', '.svelte.ts', '.mjs']),
  /** Rule ID → severity mapping. Unlisted rules default to "error". */
  rules: v.optional(v.record(v.string(), RuleSeveritySchema), {}),
  /** File-specific rule overrides (like oxlint overrides). */
  overrides: v.optional(v.array(OverrideSchema), []),
});

/** Inferred type for the linter configuration. See {@link LintConfigSchema}. */
export type LintConfig = v.InferOutput<typeof LintConfigSchema>;

// =============================================================================
// API
// =============================================================================

/**
 * Load and validate the linter configuration file.
 *
 * Searches for `.resist-lint.jsonc` in the given directory (typically
 * workspace root). Returns validated defaults if no config file exists.
 * Supports JSONC (JSON with line and block comments).
 *
 * @param {string} cwd - Directory to search for the config file
 * @returns {LintConfig} Validated linter configuration
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

  /* Strip JSONC comments before parsing */
  const stripped: string = stripJsoncComments(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch (error: unknown) {
    throw new Error(`Invalid JSONC in ${configPath}: ${String(error)}`, { cause: error });
  }

  const result: v.SafeParseResult<typeof LintConfigSchema> = v.safeParse(LintConfigSchema, parsed);

  if (!result.success) {
    const issues: string = result.issues
      .map((issue: v.BaseIssue<unknown>): string => {
        const pathStr: string =
          issue.path?.map((p: { key?: unknown }): string => String(p.key ?? '')).join('.') ??
          'root';
        return `  - ${pathStr}: ${issue.message}`;
      })
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
 * @param {LintConfig} config - Linter configuration
 * @param {string} ruleId - Rule ID (e.g. 'jsdoc/require-param')
 * @param {string} filePath - Absolute file path being linted
 * @returns {RuleSeverity} Effective severity for this rule on this file
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
 * - Double-star prefix for recursive matching
 * - Single-star wildcard for path segments
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

  // Recursive glob (e.g. "**/dir/**" or "**/*.test.ts")
  if (pattern.startsWith('**/')) {
    const suffix: string = pattern.slice(3);

    // Trailing "/**" means "anything under this directory"
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

/**
 * Strip JSONC comments (line comments and block comments) from a string.
 *
 * Preserves strings so that comment markers inside quotes are not stripped.
 *
 * @param input - JSONC string with potential comments
 * @returns Plain JSON string with comments removed
 */
function stripJsoncComments(input: string): string {
  let result: string = '';
  let i: number = 0;
  const len: number = input.length;

  while (i < len) {
    const ch: string = input[i] ?? '';

    /* Handle strings — preserve contents as-is */
    if (ch === '"') {
      let j: number = i + 1;
      while (j < len) {
        const sc: string = input[j] ?? '';
        if (sc === '\\') {
          j += 2;
          continue;
        }
        if (sc === '"') {
          j++;
          break;
        }
        j++;
      }
      result += input.slice(i, j);
      i = j;
      continue;
    }

    /* Handle line comments */
    if (ch === '/' && (input[i + 1] ?? '') === '/') {
      while (i < len && input[i] !== '\n') {
        i++;
      }
      continue;
    }

    /* Handle block comments */
    if (ch === '/' && (input[i + 1] ?? '') === '*') {
      i += 2;
      while (i < len) {
        if ((input[i] ?? '') === '*' && (input[i + 1] ?? '') === '/') {
          i += 2;
          break;
        }
        i++;
      }
      continue;
    }

    result += ch;
    i++;
  }

  return result;
}

// =============================================================================
// JSON Schema Generation
// =============================================================================

/** JSON Schema property definition. */
type JsonSchemaProperty = {
  type?: string;
  description?: string;
  default?: unknown;
  enum?: string[];
  items?: JsonSchemaProperty;
  additionalProperties?: JsonSchemaProperty | boolean;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
};

/** Full JSON Schema document. */
type JsonSchemaDocument = {
  $schema: string;
  title: string;
  description: string;
  type: string;
  properties: Record<string, JsonSchemaProperty>;
  additionalProperties: boolean;
};

/**
 * Generate a JSON Schema for the linter configuration.
 *
 * Includes all discovered rule IDs as enum values in the rules property,
 * giving IDE autocomplete with descriptions.
 *
 * @param {string[]} ruleIds - All known rule IDs (e.g. ['jsdoc/require-param', ...])
 * @param {Map<string, string>} ruleDescriptions - Map of rule ID to human-readable description
 * @returns {JsonSchemaDocument} JSON Schema document as a plain object
 */
export function generateJsonSchema(
  ruleIds: string[],
  ruleDescriptions: Map<string, string>,
): JsonSchemaDocument {
  const ruleEnumDescription: string = ruleIds
    .map((id: string): string => `- \`${id}\`: ${ruleDescriptions.get(id) ?? ''}`)
    .join('\n');

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: `${LINTER_NAME} configuration`,
    description: `Configuration file for the ${LINTER_NAME} custom linter.`,
    type: 'object',
    properties: {
      $schema: {
        type: 'string',
        description: 'Path to the JSON Schema for IDE autocomplete.',
      },
      include: {
        type: 'array',
        description: 'Paths to include in linting (relative to workspace root).',
        items: { type: 'string' },
        default: [],
      },
      exclude: {
        type: 'array',
        description: 'Glob patterns to exclude from linting (e.g. "*.test.ts", "*.d.ts").',
        items: { type: 'string' },
        default: ['*.test.ts', '*.d.ts'],
      },
      extensions: {
        type: 'array',
        description: 'File extensions to lint (including .svelte.ts).',
        items: { type: 'string' },
        default: ['.ts', '.svelte.ts', '.mjs'],
      },
      rules: {
        type: 'object',
        description: `Rule ID → severity mapping. Unlisted rules default to "error".\n\nAvailable rules:\n${ruleEnumDescription}`,
        additionalProperties: {
          type: 'string',
          enum: ['error', 'warn', 'off'],
          description: 'Rule severity: "error" (exit 1), "warn" (report but pass), "off" (skip).',
        },
      },
      overrides: {
        type: 'array',
        description: 'File-specific rule overrides. Last matching override wins.',
        items: {
          type: 'object',
          properties: {
            files: {
              type: 'array',
              description: 'Glob patterns matching files to apply these overrides to.',
              items: { type: 'string' },
            },
            rules: {
              type: 'object',
              description: 'Rule-level severity overrides for matched files.',
              additionalProperties: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
            },
          },
          required: ['files', 'rules'],
        },
      },
    },
    additionalProperties: false,
  };
}
