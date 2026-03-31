/**
 * Custom Linter — Configuration Schema
 *
 * Valibot-validated configuration schema for `.resist-lint.jsonc`.
 * Mirrors the style of `.oxlintrc.json` with include/exclude, rules,
 * and file-specific overrides.
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as v from 'valibot';
import { CONFIG_FILENAME, LINTER_NAME } from '@/lint/constants.ts';
import { format, type LintStrings } from '@/lint/locale/schema.ts';

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
  /** Glob patterns to exclude from linting. */
  exclude: v.optional(v.array(v.string()), ['*.test.ts', '*.d.ts']),
  /** File extensions to lint (including `.svelte.ts`). */
  extensions: v.optional(v.array(v.string()), ['.ts', '.svelte.ts', '.svelte', '.mjs']),
  /** Paths to include in linting (relative to workspace root). */
  include: v.optional(v.array(v.string()), []),
  /** File-specific rule overrides (like oxlint overrides). */
  overrides: v.optional(v.array(OverrideSchema), []),
  /** Per-rule configuration options (e.g. allowedTargets for no-lint-disable). */
  ruleOptions: v.optional(v.record(v.string(), v.record(v.string(), v.unknown())), {}),
  /** Rule ID → severity mapping. Unlisted rules default to "error". */
  rules: v.optional(v.record(v.string(), RuleSeveritySchema), {}),
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
 * @param {string} [customConfigPath] - Optional custom path to a config file
 * @returns {LintConfig} Validated linter configuration
 * @param {LintStrings} strings - Locale strings for user-facing messages
 * @throws If the config file contains invalid JSON or fails schema validation
 */
/** Per-path config cache — config files don't change within a process. */
const CONFIG_CACHE = new Map();

/** Clear the config cache (for testing only). */
export function _resetConfigCache(): void {
  CONFIG_CACHE.clear();
}

export function loadConfig(
  cwd: string,
  customConfigPath: string | undefined,
  strings: LintStrings,
): LintConfig {
  const configPath: string = customConfigPath
    ? resolve(cwd, customConfigPath)
    : resolve(cwd, CONFIG_FILENAME);

  const cached: LintConfig | undefined = CONFIG_CACHE.get(configPath);
  if (cached !== undefined) {
    /* Return a shallow copy so callers can mutate exclude/rules without poisoning the cache. */
    return { ...cached, exclude: [...cached.exclude], rules: { ...cached.rules } };
  }

  let raw: string;

  try {
    raw = readFileSync(configPath, 'utf8');
  } catch {
    /* No config file — return defaults */
    const defaults: LintConfig = v.parse(LintConfigSchema, {});
    CONFIG_CACHE.set(configPath, defaults);
    return { ...defaults, exclude: [...defaults.exclude], rules: { ...defaults.rules } };
  }

  /* Strip JSONC comments before parsing */
  const stripped: string = stripJsoncComments(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch (error: unknown) {
    throw new Error(
      format(strings.errors.invalidJsonc, { error: String(error), path: configPath }),
      {
        cause: error,
      },
    );
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
    throw new Error(format(strings.errors.invalidConfig, { issues, path: configPath }));
  }

  CONFIG_CACHE.set(configPath, result.output);
  return {
    ...result.output,
    exclude: [...result.output.exclude],
    rules: { ...result.output.rules },
  };
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

/**
 * JSON Schema property definition.
 *
 * Self-referential type — must be defined explicitly alongside its schema
 * because `v.InferOutput` cannot resolve recursive `v.lazy()` references.
 */
export type JsonSchemaProperty = {
  type?: string;
  description?: string;
  default?: unknown;
  enum?: string[];
  items?: JsonSchemaProperty;
  additionalProperties?: JsonSchemaProperty | boolean;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
};

/** Schema for JSON Schema property definitions. See {@link JsonSchemaProperty}. */
export const JsonSchemaPropertySchema: v.GenericSchema<JsonSchemaProperty> = v.strictObject({
  /** Schema for additional object properties, or boolean to allow/deny all. */
  additionalProperties: v.optional(
    v.union([
      v.lazy((): v.GenericSchema<JsonSchemaProperty> => JsonSchemaPropertySchema),
      v.boolean(),
    ]),
  ),
  /** Default value for the property. */
  default: v.optional(v.unknown()),
  /** Human-readable description of the property. */
  description: v.optional(v.string()),
  /** Allowed string enum values. */
  enum: v.optional(v.array(v.string())),
  /** Schema for array items. */
  items: v.optional(v.lazy((): v.GenericSchema<JsonSchemaProperty> => JsonSchemaPropertySchema)),
  /** Named property schemas for object types. */
  properties: v.optional(
    v.record(
      v.string(),
      v.lazy((): v.GenericSchema<JsonSchemaProperty> => JsonSchemaPropertySchema),
    ),
  ),
  /** Required property names for object types. */
  required: v.optional(v.array(v.string())),
  /** JSON Schema type (e.g. 'string', 'object', 'array'). */
  type: v.optional(v.string()),
});

/** Schema for a full JSON Schema document. */
export const JsonSchemaDocumentSchema = v.strictObject({
  /** JSON Schema specification version URI. */
  $schema: v.string(),
  /** Whether to allow properties not listed in 'properties'. */
  additionalProperties: v.boolean(),
  /** Schema description. */
  description: v.string(),
  /** Top-level property definitions. */
  properties: v.record(
    v.string(),
    v.lazy((): v.GenericSchema<JsonSchemaProperty> => JsonSchemaPropertySchema),
  ),
  /** Schema title. */
  title: v.string(),
  /** Root JSON Schema type (always 'object' for config). */
  type: v.string(),
});

/** Full JSON Schema document. See {@link JsonSchemaDocumentSchema}. */
export type JsonSchemaDocument = v.InferOutput<typeof JsonSchemaDocumentSchema>;

/**
 * Generate a JSON Schema for the linter configuration.
 *
 * Includes all discovered rule IDs as enum values in the rules property,
 * giving IDE autocomplete with descriptions.
 *
 * @param {string[]} ruleIds - All known rule IDs (e.g. ['jsdoc/require-param', ...])
 * @param {Map<string, string>} ruleDescriptions - Map of rule ID to human-readable description
 * @param {LintStrings} strings - Locale strings for user-facing messages
 * @returns {JsonSchemaDocument} JSON Schema document as a plain object
 */
export function generateJsonSchema(
  ruleIds: string[],
  ruleDescriptions: Map<string, string>,
  strings: LintStrings,
): JsonSchemaDocument {
  const ruleEnumDescription: string = ruleIds
    .map((id: string): string => `- \`${id}\`: ${ruleDescriptions.get(id) ?? ''}`)
    .join('\n');

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    additionalProperties: false,
    description: format(strings.schema.configDescription, { linterName: LINTER_NAME }),
    properties: {
      $schema: {
        description: strings.schema.schemaFieldDescription,
        type: 'string',
      },
      exclude: {
        default: ['*.test.ts', '*.d.ts'],
        description: strings.schema.excludeDescription,
        items: { type: 'string' },
        type: 'array',
      },
      extensions: {
        default: ['.ts', '.svelte.ts', '.svelte', '.mjs'],
        description: strings.schema.extensionsDescription,
        items: { type: 'string' },
        type: 'array',
      },
      include: {
        default: [],
        description: strings.schema.includeDescription,
        items: { type: 'string' },
        type: 'array',
      },
      overrides: {
        description: strings.schema.overridesDescription,
        items: {
          properties: {
            files: {
              description: strings.schema.overridesFilesDescription,
              items: { type: 'string' },
              type: 'array',
            },
            rules: {
              additionalProperties: {
                enum: ['error', 'warn', 'off'],
                type: 'string',
              },
              description: strings.schema.overridesRulesDescription,
              type: 'object',
            },
          },
          required: ['files', 'rules'],
          type: 'object',
        },
        type: 'array',
      },
      ruleOptions: {
        additionalProperties: {
          description: strings.schema.ruleOptionsAdditionalDescription,
          type: 'object',
        },
        description: strings.schema.ruleOptionsDescription,
        type: 'object',
      },
      rules: {
        additionalProperties: {
          description: strings.schema.ruleSeverityDescription,
          enum: ['error', 'warn', 'off'],
          type: 'string',
        },
        description: format(strings.schema.rulesDescription, { ruleList: ruleEnumDescription }),
        type: 'object',
      },
    },
    title: format(strings.schema.title, { linterName: LINTER_NAME }),
    type: 'object',
  };
}
