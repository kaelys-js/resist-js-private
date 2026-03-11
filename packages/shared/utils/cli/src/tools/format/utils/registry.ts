/**
 * Formatter Registry
 *
 * Auto-discovers formatter definitions from `../formatters/*.ts` via
 * `import.meta.glob`, builds lookup maps (extension, filename, pattern),
 * and provides Result-returning query functions.
 *
 * @module
 */

import * as v from 'valibot';

import { FormatterDefinitionSchema, type FormatterDefinition } from '@/cli/tools/format/schemas';
import { PathSchema, type Path, type Str } from '@/schemas/common';
import { ERRORS, type Result, err, okUnchecked } from '@/schemas/result/result';
import { getBasename, getFileExtension } from '@/utils/core/path';
import { fromUnknownError, safeParse } from '@/utils/result/safe';

// =============================================================================
// Local Type Aliases
// =============================================================================

/** Schema for nullable formatter definition. */
const NullableFormatterDefinitionSchema = v.nullable(FormatterDefinitionSchema);

/** @see {@link NullableFormatterDefinitionSchema} */
type NullableFormatterDefinition = v.InferOutput<typeof NullableFormatterDefinitionSchema>;

/** Schema for optional formatter definition. */
const OptionalFormatterDefinitionSchema = v.optional(FormatterDefinitionSchema);

/** @see {@link OptionalFormatterDefinitionSchema} */
type OptionalFormatterDefinition = v.InferOutput<typeof OptionalFormatterDefinitionSchema>;

// =============================================================================
// Auto-Discovery
// =============================================================================

/**
 * Eagerly imports all formatter definition modules from `../formatters/`.
 *
 * Each formatter file exports `default: FormatterDefinition` (a single object).
 * The glob pattern `../formatters/*.ts` is relative to this file's location
 * in `utils/`.
 */
const formatterModules = import.meta.glob<{ default: FormatterDefinition }>('../formatters/*.ts', {
  eager: true,
});

/**
 * All registered formatter definitions, sorted by `id` for deterministic ordering.
 *
 * Assembled from auto-discovered modules. Each module's `default` export is
 * a single `FormatterDefinition` object.
 */
const ALL_FORMATTERS: readonly FormatterDefinition[] = Object.values(formatterModules)
  .map((mod: { default: FormatterDefinition }): FormatterDefinition => mod.default)
  .sort((a: FormatterDefinition, b: FormatterDefinition): number => a.id.localeCompare(b.id));

// =============================================================================
// Glob-to-Regex Conversion
// =============================================================================

/**
 * Non-empty glob pattern string schema.
 *
 * Inline schema matching the `GlobPatternSchema` in `FormatterDefinitionSchema`
 * (which is not exported). Defined locally per the "never re-export" rule.
 */
const GlobPatternSchema = v.pipe(v.string(), v.minLength(1));

/** Inferred type of {@link GlobPatternSchema}. A non-empty glob pattern string. */
type GlobPattern = v.InferOutput<typeof GlobPatternSchema>;

/**
 * Converts a glob pattern to a case-insensitive `RegExp`.
 *
 * Supported syntax:
 * - `*` matches any characters except `/`
 * - `?` matches a single character
 * - `**` matches any path segment (including `/`)
 *
 * Special regex characters in the pattern are escaped before conversion.
 * The resulting regex is anchored to match at the end of a path
 * (optionally preceded by `/`).
 *
 * @param pattern - A non-empty glob pattern string.
 * @returns `Result<RegExp>` on success, or an error if the pattern produces an invalid regex.
 */
function globToRegex(pattern: GlobPattern): Result<RegExp> {
  const parsed: Result<GlobPattern> = safeParse(GlobPatternSchema, pattern);
  if (!parsed.ok) return parsed;

  const regexStr: Str = parsed.data
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '<<<DOUBLESTAR>>>')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.')
    .replace(/<<<DOUBLESTAR>>>/g, '.*');

  try {
    const regex: RegExp = new RegExp(`(?:^|/)${regexStr}$`, 'i');
    return okUnchecked<RegExp>(regex);
  } catch (thrown: unknown) {
    return err(ERRORS.VALIDATION.INVALID_FORMAT, {
      cause: fromUnknownError(thrown),
      meta: { pattern },
    });
  }
}

// =============================================================================
// Registry Maps
// =============================================================================

/** Lookup map: lowercase file extension to formatter definition. */
const byExtension: Map<Str, FormatterDefinition> = new Map<Str, FormatterDefinition>();

/** Lookup map: lowercase exact filename to formatter definition. */
const byFilename: Map<Str, FormatterDefinition> = new Map<Str, FormatterDefinition>();

/** Pattern matchers: compiled regex from glob patterns to formatter definition. */
const patternMatchers: Array<{ regex: RegExp; formatter: FormatterDefinition }> = [];

// Build lookup maps at module load.
// Runs at import time (module scope) — cannot return Result.
// Invalid glob patterns are skipped (fallback pattern per MEMORY.md).
for (const f of ALL_FORMATTERS) {
  if (f.extensions) {
    for (const ext of f.extensions) {
      byExtension.set(ext.toLowerCase(), f);
    }
  }
  if (f.filenames) {
    for (const name of f.filenames) {
      byFilename.set(name.toLowerCase(), f);
    }
  }
  if (f.patterns) {
    for (const p of f.patterns) {
      const regexResult: Result<RegExp> = globToRegex(p);
      if (regexResult.ok) {
        patternMatchers.push({ regex: regexResult.data, formatter: f });
      }
      // Invalid patterns skipped silently at module load (fallback pattern)
    }
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Gets the formatter definition for a given file path.
 *
 * Lookup priority: exact filename → glob pattern → file extension.
 * Returns `null` inside the Result when no formatter matches the file.
 *
 * @param path - Absolute or relative file path to look up.
 * @returns `Result<NullableFormatterDefinition>` — the matching formatter, or `null` if none.
 */
export function getFormatterForFile(path: Path): Result<NullableFormatterDefinition> {
  const parsed: Result<Path> = safeParse(PathSchema, path);
  if (!parsed.ok) return parsed;

  const extResult: Result<Str> = getFileExtension(parsed.data);
  if (!extResult.ok) return extResult;
  const ext: Str = extResult.data.toLowerCase();
  const baseResult: Result<Str> = getBasename(parsed.data);
  if (!baseResult.ok) return baseResult;
  const base: Str = baseResult.data.toLowerCase();

  // Check exact filename match first
  const filenameMatch: OptionalFormatterDefinition = byFilename.get(base);
  if (filenameMatch) {
    return okUnchecked<NullableFormatterDefinition>(filenameMatch);
  }

  // Check pattern matches
  for (const { regex, formatter } of patternMatchers) {
    if (regex.test(parsed.data)) {
      return okUnchecked<NullableFormatterDefinition>(formatter);
    }
  }

  // Check extension match
  const extMatch: OptionalFormatterDefinition = byExtension.get(ext);
  if (extMatch) {
    return okUnchecked<NullableFormatterDefinition>(extMatch);
  }

  return okUnchecked<NullableFormatterDefinition>(null);
}

/**
 * Gets all registered formatter definitions.
 *
 * Returns the full sorted array of auto-discovered formatters.
 * The array is `readonly` and must not be mutated.
 *
 * @returns `Result<readonly FormatterDefinition[]>` — all formatters sorted by `id`.
 */
export function getAllFormatters(): Result<readonly FormatterDefinition[]> {
  return okUnchecked<readonly FormatterDefinition[]>(ALL_FORMATTERS);
}
