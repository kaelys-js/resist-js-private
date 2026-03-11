/**
 * Formatter Schemas
 *
 * Valibot schemas for formatter and external command definitions.
 * Used by all formatter definition files in `formatters/`.
 *
 * @module
 */

import * as v from 'valibot';

import { ToolNameSchema } from '@/cli/schemas';
import type { Str } from '@/schemas/common';
import { FilenameSchema, KebabCaseIdSchema, LocaleStringSchema } from '@/schemas/common';
import { arity } from '@/schemas/function/arity';
import { functionSchema } from '@/schemas/function/function';

// =============================================================================
// Inline Schemas (no shared equivalent)
// =============================================================================

/**
 * File extension starting with a dot (e.g., `.ts`, `.go`, `.mjs`).
 *
 * @example `'.ts'`, `'.go'`, `'.mjs'`
 */
const FileExtensionSchema = v.pipe(
  v.string(),
  v.regex(/^\.[a-zA-Z0-9]+$/, 'Must be a file extension starting with dot (e.g., ".ts", ".go")'),
);

/**
 * Non-empty glob pattern string (e.g., `'*.blade.php'`, `'.env.*'`).
 *
 * @example `'*.blade.php'`, `'.env.*'`, `'Dockerfile.*'`
 */
const GlobPatternSchema = v.pipe(v.string(), v.minLength(1));

/**
 * Non-empty command argument string.
 *
 * @example `'--check'`, `'-w'`, `'format'`
 */
const CommandArgSchema = v.pipe(v.string(), v.minLength(1));

/**
 * Config flag template containing a `{config}` placeholder.
 * The placeholder is replaced at runtime with the resolved config file path.
 *
 * @example `'--config "{config}"'`, `'--config-path="{config}"'`
 */
const ConfigFlagTemplateSchema = v.pipe(
  v.string(),
  v.includes('{config}', 'Must contain {config} placeholder'),
);

// =============================================================================
// External Command Schema
// =============================================================================

/**
 * Configuration for an external formatting tool command.
 *
 * Each command defines a tool binary with format/check arguments.
 * Formatters with `tool: 'external'` provide one or more commands
 * tried in order — the first available binary wins.
 */
const ExternalCommandSchema = v.strictObject({
  /** Tool binary name (used for availability check via `which`). */
  bin: ToolNameSchema,
  /** Arguments for format mode (file path appended at runtime). Non-empty. */
  formatArgs: v.pipe(v.array(CommandArgSchema), v.minLength(1)),
  /** Arguments for check mode (file path appended at runtime). Omit if tool has no check mode. */
  checkArgs: v.optional(v.pipe(v.array(CommandArgSchema), v.minLength(1))),
  /** Config file to search for in project root (e.g., `'ruff.toml'`, `'.sqlfluff'`). */
  configFile: v.optional(FilenameSchema),
  /** Config flag template with `{config}` placeholder (e.g., `'--config "{config}"'`). */
  configFlag: v.optional(ConfigFlagTemplateSchema),
  /** Check by comparing formatted stdout to original content. */
  checkByDiff: v.optional(v.boolean()),
  /** Check by verifying stdout is empty (e.g., `gofmt -d` outputs diff on mismatch). */
  checkByEmptyStdout: v.optional(v.boolean()),
  /** Tool writes to stdout instead of in-place (need to capture and write back). */
  writesStdout: v.optional(v.boolean()),
  /** Whether this tool supports multiple file arguments in one invocation. Defaults to `true`. */
  supportsBatching: v.optional(v.boolean()),
});

// =============================================================================
// Formatter Definition Schema
// =============================================================================

/**
 * Schema for a formatter definition.
 *
 * Each formatter handles one or more file types, matched by extension,
 * exact filename, or glob pattern. At least one of `extensions`, `filenames`,
 * or `patterns` should be provided (not enforced at schema level since
 * all are optional — enforced by convention in formatter files).
 */
export const FormatterDefinitionSchema = v.strictObject({
  /** Unique formatter ID (kebab-case, e.g., `'go'`, `'docker-compose'`). */
  id: KebabCaseIdSchema,
  /** Human-readable display name (e.g., `'TypeScript/JavaScript'`, `'C#'`). */
  name: LocaleStringSchema,
  /** File extensions this formatter handles (e.g., `['.go', '.mod']`). */
  extensions: v.optional(v.pipe(v.array(FileExtensionSchema), v.minLength(1))),
  /** Exact filenames this formatter handles (e.g., `['Dockerfile', 'Makefile']`). */
  filenames: v.optional(v.pipe(v.array(FilenameSchema), v.minLength(1))),
  /** Filename glob patterns (e.g., `['.env.*', '*.blade.php']`). */
  patterns: v.optional(v.pipe(v.array(GlobPatternSchema), v.minLength(1))),
  /** Tool type: biome, prettier, external CLI, custom (inline transform), or noop (pass-through). */
  tool: v.picklist(['biome', 'prettier', 'external', 'custom', 'noop']),
  /** Parser override for biome/prettier (e.g., `'babel'`, `'yaml'`). */
  parser: v.optional(v.pipe(v.string(), v.minLength(1))),
  /** External tool commands (tried in order, first available wins). */
  commands: v.optional(v.pipe(v.array(ExternalCommandSchema), v.minLength(1))),
  /** Custom transform function for `'custom'` tool type. Takes file content, returns formatted content. */
  transform: v.optional(v.pipe(functionSchema<[Str], Str>(), arity(1))),
});

// =============================================================================
// Types
// =============================================================================

/** Inferred output type of {@link ExternalCommandSchema}. External tool command configuration. */
export type ExternalCommand = v.InferOutput<typeof ExternalCommandSchema>;
/** Inferred output type of {@link FormatterDefinitionSchema}. Formatter definition for a file type. */
export type FormatterDefinition = v.InferOutput<typeof FormatterDefinitionSchema>;
