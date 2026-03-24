/**
 * Locale Template System
 *
 * Replaces function-based locale strings with validated `{placeholder}` templates.
 * At load time, raw template strings are transformed into callable locale objects
 * where every key is a function `(params?) => Result<Str>`.
 *
 * @module
 *
 * Two-phase design:
 * 1. **Schema phase** — `messageTemplate()` creates Valibot schemas that validate
 *    raw strings in en.ts (placeholder presence/absence). `v.InferOutput` gives `string`.
 * 2. **Build phase** — `buildLocale()` transforms raw strings into callable functions.
 *    The `BuiltLocale<>` mapped type transforms the schema shape into function signatures
 *    with full parameter autocomplete.
 *
 * @example
 * ```typescript
 * // In schema.ts:
 * const MySchema = v.strictObject({
 *   greeting: messageTemplate({ name: StrSchema }),
 *   farewell: messageTemplate(),
 * });
 * type MyRawStrings = v.InferOutput<typeof MySchema>; // { greeting: string; farewell: string }
 * type MyStrings = BuiltLocale<typeof MySchema>;
 * // { greeting: (params: { name: Str }) => Result<Str>; farewell: () => Result<Str> }
 *
 * // In en.ts:
 * export const en: MyRawStrings = { greeting: 'Hello, {name}!', farewell: 'Goodbye!' };
 *
 * // After buildLocale():
 * const strings: MyStrings = buildLocale(MySchema, en);
 * strings.greeting({ name: 'Alice' }); // => ok('Hello, Alice!')
 * strings.farewell();                   // => ok('Goodbye!')
 * ```
 */

import * as v from 'valibot';

import {
  NumSchema,
  RawLocaleStringsSchema,
  StrSchema,
  type Bool,
  type HandlebarsValue,
  type Num,
  type NullableRegExpExecArray,
  type NullableRegExpMatchArray,
  type OptionalStr,
  type RawLocaleStrings,
  type Str,
} from '@/schemas/common';
import { ERRORS, type Result, err, ok, okUnchecked } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';
import {
  formatNumber,
  formatDate,
  formatTime,
  DateTimeStyleSchema,
  type DateTimeStyle,
  parseNumberSkeleton,
  parseDateTimeSkeleton,
} from '@/locale/format';

// =============================================================================
// Local Type Aliases
// =============================================================================

type NullableParamSchemas = ParamSchemas | null;
type NullableSchemaEntries = Record<string, v.GenericSchema> | null;

// =============================================================================
// Escaped Literal Sentinels
// =============================================================================

/**
 * Sentinel prefix for escaped literal placeholders.
 * Uses NUL bytes which cannot appear in valid template strings.
 */
const ESCAPE_SENTINEL_PREFIX: Str = '\u0000ESC_';

/** Sentinel suffix for escaped literal placeholders. */
const ESCAPE_SENTINEL_SUFFIX: Str = '\u0000';

/** Valibot schema for an escaped literal entry. */
const EscapedLiteralSchema = v.strictObject({
  /** Unique sentinel string replacing the literal in the template. */
  sentinel: StrSchema,
  /** Original literal text (e.g., `'{escaped}'`). */
  literal: StrSchema,
});

/** An escaped literal entry mapping sentinel → original literal text. */
type EscapedLiteral = v.InferOutput<typeof EscapedLiteralSchema>;

/** Valibot schema for the result of escaping ICU literals. */
const EscapeResultSchema = v.strictObject({
  /** Template text with sentinels replacing escaped literals. */
  text: StrSchema,
  /** Array of sentinel → original literal mappings. */
  literals: v.array(EscapedLiteralSchema),
});

/** Result of escaping ICU literals — template with sentinels + restore map. */
type EscapeResult = v.InferOutput<typeof EscapeResultSchema>;

/**
 * Replaces ICU escaped literal regions with sentinels.
 *
 * ICU MessageFormat escaping rules:
 * - `'{text}'` → literal `{text}` (not treated as placeholder)
 * - `''` → literal single quote `'`
 * - Unpaired single quote at end of string → literal single quote
 *
 * @param template - The template string. Validated via `StrSchema`.
 * @returns `Result<EscapeResult>` — the template with sentinels, plus sentinel → literal map for restoration.
 */
function escapeICULiterals(template: Str): Result<EscapeResult> {
  const templateResult: Result<Str> = safeParse(StrSchema, template);

  if (!templateResult.ok) {
    return templateResult;
  }

  const literals: EscapedLiteral[] = [];
  let result: Str = '';
  let i: Num = 0;
  const src: Str = templateResult.data;

  while (i < src.length) {
    if (src[i] === "'") {
      // '' → single quote literal
      if (i + 1 < src.length && src[i + 1] === "'") {
        const sentinel: Str = `${ESCAPE_SENTINEL_PREFIX}${literals.length}${ESCAPE_SENTINEL_SUFFIX}`;
        literals.push({ sentinel, literal: "'" });
        result += sentinel;
        i += 2;
        continue;
      }

      // '{...}' or other quoted region
      const closeIndex: Num = src.indexOf("'", i + 1);

      if (closeIndex !== -1) {
        const sentinel: Str = `${ESCAPE_SENTINEL_PREFIX}${literals.length}${ESCAPE_SENTINEL_SUFFIX}`;
        const literalText: Str = src.slice(i + 1, closeIndex);
        literals.push({ sentinel, literal: literalText });
        result += sentinel;
        i = closeIndex + 1;
        continue;
      }

      // Unpaired single quote at end → output as literal quote
      const sentinel: Str = `${ESCAPE_SENTINEL_PREFIX}${literals.length}${ESCAPE_SENTINEL_SUFFIX}`;
      literals.push({ sentinel, literal: "'" });
      result += sentinel;
      i++;
      continue;
    }

    result += src[i];
    i++;
  }

  return ok(EscapeResultSchema, { text: result, literals });
}

/**
 * Restores sentinel placeholders with their original escaped literal text.
 *
 * @param template - The template with sentinels. Validated via `StrSchema`.
 * @param literals - The sentinel → literal mappings from `escapeICULiterals()`.
 * @returns `Result<Str>` — the template with all sentinels replaced by their literal values.
 */
function restoreEscapedLiterals(template: Str, literals: readonly EscapedLiteral[]): Result<Str> {
  const templateResult: Result<Str> = safeParse(StrSchema, template);

  if (!templateResult.ok) {
    return templateResult;
  }

  let result: Str = templateResult.data;

  for (const entry of literals) {
    while (result.includes(entry.sentinel)) {
      result = result.replace(entry.sentinel, entry.literal);
    }
  }

  return ok(StrSchema, result);
}

// =============================================================================
// Template Metadata
// =============================================================================

/**
 * Symbol used to attach parameter schema metadata to template Valibot schemas.
 * This allows `buildLocale()` to retrieve param schemas from the locale schema
 * without any external mapping.
 */
const TEMPLATE_PARAMS: unique symbol = Symbol('templateParams');

/**
 * Parameter schema map — maps placeholder names to their Valibot schemas.
 */
type ParamSchemas = Record<string, v.GenericSchema>;

// =============================================================================
// Custom Formatters
// =============================================================================

/**
 * A custom formatter function that transforms a string value.
 *
 * @param value - The string value to transform. Validated via `StrSchema`.
 * @param locale - The current BCP 47 locale tag. May be `undefined`.
 * @returns `Result<Str>` — the transformed value, or a validation error.
 */
type FormatterFn = (value: Str, locale: OptionalStr) => Result<Str>;

/**
 * Map of formatter names to formatter functions.
 * Used by pipe syntax `{name|formatter}` and message ref modifiers `@.modifier:key`.
 *
 * Irreducible TS type: maps string keys to function-typed values.
 * Valibot validates data shapes, not function signatures.
 */
export type FormatterMap = Readonly<Record<Str, FormatterFn>>;

/**
 * Returns the built-in case modifier formatters.
 *
 * Locale-aware using `String.toLocaleUpperCase()` / `String.toLocaleLowerCase()`
 * (handles Turkish İ/ı, Greek final sigma, etc.).
 *
 * @param locale - Optional BCP 47 locale tag for locale-aware transforms.
 * @returns {Result<FormatterMap>} Built-in formatter map.
 */
function builtInFormatters(locale: OptionalStr): Result<FormatterMap> {
  return okUnchecked<FormatterMap>({
    upper: (value: Str, loc: OptionalStr): Result<Str> => {
      const valueResult: Result<Str> = safeParse(StrSchema, value);

      if (!valueResult.ok) {
        return valueResult;
      }
      if (loc !== undefined) {
        const locResult: Result<Str> = safeParse(StrSchema, loc);

        if (!locResult.ok) {
          return locResult;
        }
      }

      const effectiveLocale: OptionalStr = loc ?? locale;
      const transformed: Str = effectiveLocale
        ? valueResult.data.toLocaleUpperCase(effectiveLocale)
        : valueResult.data.toUpperCase();

      return ok(StrSchema, transformed);
    },
    lower: (value: Str, loc: OptionalStr): Result<Str> => {
      const valueResult: Result<Str> = safeParse(StrSchema, value);

      if (!valueResult.ok) {
        return valueResult;
      }
      if (loc !== undefined) {
        const locResult: Result<Str> = safeParse(StrSchema, loc);

        if (!locResult.ok) {
          return locResult;
        }
      }

      const effectiveLocale: OptionalStr = loc ?? locale;
      const transformed: Str = effectiveLocale
        ? valueResult.data.toLocaleLowerCase(effectiveLocale)
        : valueResult.data.toLowerCase();

      return ok(StrSchema, transformed);
    },
    capitalize: (value: Str, loc: OptionalStr): Result<Str> => {
      const valueResult: Result<Str> = safeParse(StrSchema, value);

      if (!valueResult.ok) {
        return valueResult;
      }
      if (loc !== undefined) {
        const locResult: Result<Str> = safeParse(StrSchema, loc);

        if (!locResult.ok) {
          return locResult;
        }
      }
      if (valueResult.data.length === 0) {
        return ok(StrSchema, valueResult.data);
      }

      const effectiveLocale: OptionalStr = loc ?? locale;
      const first: Str = effectiveLocale
        ? valueResult.data.charAt(0).toLocaleUpperCase(effectiveLocale)
        : valueResult.data.charAt(0).toUpperCase();
      const rest: Str = valueResult.data.slice(1);

      return ok(StrSchema, first + rest);
    },
    title: (value: Str, loc: OptionalStr): Result<Str> => {
      const valueResult: Result<Str> = safeParse(StrSchema, value);

      if (!valueResult.ok) {
        return valueResult;
      }
      if (loc !== undefined) {
        const locResult: Result<Str> = safeParse(StrSchema, loc);

        if (!locResult.ok) {
          return locResult;
        }
      }

      const effectiveLocale: OptionalStr = loc ?? locale;
      // String.replace callback returns Str (required by JS API) — pure string
      // operations inside cannot fail, so no Result propagation needed here.
      const transformed: Str = valueResult.data.replaceAll(/\S+/g, (word: Str): Str => {
        return effectiveLocale
          ? word.charAt(0).toLocaleUpperCase(effectiveLocale) +
              word.slice(1).toLocaleLowerCase(effectiveLocale)
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      });

      return ok(StrSchema, transformed);
    },
  });
}

/**
 * Branded type to carry param info at the TypeScript level.
 * `messageTemplate({ name: StrSchema })` produces a schema with
 * `_templateParams: { name: typeof StrSchema }` in its type,
 * which `BuiltLocale` reads to generate the correct function signature.
 */
export type TemplateSchema<TParams extends ParamSchemas = ParamSchemas> = v.GenericSchema<
  string,
  string
> & { readonly _templateParams: TParams };

// =============================================================================
// messageTemplate()
// =============================================================================

/**
 * Creates a Valibot schema for a locale template string.
 *
 * **Without params**: validates that the value is a string with no `{placeholder}` tokens.
 * **With params**: validates that every declared param appears as `{paramName}` in the
 * string, and no undeclared `{paramName}` placeholders exist. Plural blocks
 * (`{name, plural, ...}`) are recognized — the `name` portion is validated.
 *
 * The param schemas are attached as metadata (via symbol) so `buildLocale()` can
 * retrieve them to build callable locale functions at runtime.
 *
 * @param params - Map of placeholder names to Valibot schemas. Omit for plain strings.
 * @returns A Valibot string schema with attached param metadata.
 *
 * @example
 * ```typescript
 * // Plain string (no params)
 * const plain = messageTemplate();
 *
 * // Parameterized template
 * const tmpl = messageTemplate({ count: NonNegativeIntegerSchema, path: StrSchema });
 * ```
 */
/**
 * Creates a Valibot schema for a locale template string.
 *
 * Validates that the raw string contains the correct placeholders.
 * The returned schema's `v.InferOutput` is `string` — the runtime
 * transform to a callable function happens in `buildLocale()`.
 *
 * @param {TParams} params - Optional parameter definitions for template placeholders.
 * @returns {TemplateSchema<TParams>} A Valibot schema that validates the raw template string.
 *
 * @example
 * ```typescript
 * const schema = messageTemplate({ name: StrSchema });
 * // Validates: 'Hello, {name}!' ✅
 * // Rejects: 'Hello!' ❌ (missing {name})
 * ```
 */
export function messageTemplate(): TemplateSchema<Record<Str, never>>;
export function messageTemplate<TParams extends ParamSchemas>(
  params: TParams,
): TemplateSchema<TParams>;
export function messageTemplate<TParams extends ParamSchemas>(
  params?: TParams,
): TemplateSchema<TParams> {
  const paramDefs: TParams = (params ?? {}) as TParams; // Irreducible: TParams is a generic — no runtime schema. Safe per overload constraints.
  const expectedKeys: Set<Str> = new Set<Str>(Object.keys(paramDefs));

  const schema: v.GenericSchema =
    expectedKeys.size === 0
      ? v.string()
      : v.pipe(
          v.string(),
          v.check(
            (val: Str): Bool => {
              const foundResult: Result<Set<Str>> = extractPlaceholders(val);

              if (!foundResult.ok) {
                return false;
              }

              const found: ReadonlySet<Str> = foundResult.data;

              for (const key of expectedKeys) {
                if (!found.has(key)) {
                  return false;
                }
              }
              for (const key of found) {
                if (!expectedKeys.has(key)) {
                  return false;
                }
              }
              return true;
            },
            `Template must contain exactly these placeholders: ${[...expectedKeys].join(', ')}`,
          ),
        );

  // Attach param schemas as metadata for buildLocale() to retrieve at runtime.
  const schemaRecord: Record<symbol, unknown> = schema as Record<symbol, unknown>; // Symbol indexing requires cast
  schemaRecord[TEMPLATE_PARAMS] = paramDefs;

  return schema as unknown as TemplateSchema<TParams>; // Irreducible: TemplateSchema<TParams> is generic — no runtime schema. Metadata attached via symbol above.
}

/**
 * Retrieves the param schemas attached to a `messageTemplate()` schema.
 *
 * @param schema - A Valibot schema (possibly created by `messageTemplate()`).
 * @returns The param schemas map, or `null` if none are attached.
 */
function getTemplateParams(schema: v.GenericSchema): NullableParamSchemas {
  const schemaRecord: Record<symbol, unknown> = schema as unknown as Record<symbol, unknown>; // Symbol indexing requires cast
  const params: unknown = schemaRecord[TEMPLATE_PARAMS];

  if (params && typeof params === 'object') {
    return params as NullableParamSchemas; // cast safe: params validated by schema check on caller side
  } // Runtime-guarded
  return null;
}

// =============================================================================
// BuiltLocale Type Mapping
// =============================================================================

/**
 * Maps a Valibot locale schema into a callable locale object type.
 *
 * - Nested `v.strictObject(...)` entries → recursively mapped sub-objects
 * - `messageTemplate()` (no params) → `() => Result<Str>`
 * - `messageTemplate({ name: StrSchema })` → `(params: { name: Str }) => Result<Str>`
 *
 * @example
 * ```typescript
 * const MySchema = v.strictObject({
 *   errors: v.strictObject({
 *     taskTimedOut: messageTemplate({ file: StrSchema, timeout: StrSchema }),
 *   }),
 *   success: messageTemplate(),
 *   count: messageTemplate({ n: NonNegativeIntegerSchema }),
 * });
 *
 * type Built = BuiltLocale<typeof MySchema>;
 * // {
 * //   errors: { taskTimedOut: (params: { file: Str; timeout: Str }) => Result<Str> };
 * //   success: () => Result<Str>;
 * //   count: (params: { n: NonNegativeInteger }) => Result<Str>;
 * // }
 * ```
 */
export type BuiltLocale<TSchema> =
  TSchema extends v.StrictObjectSchema<infer TEntries, undefined>
    ? { readonly [K in keyof TEntries]: BuiltLocaleEntry<TEntries[K]> }
    : TSchema extends v.ObjectSchema<infer TEntries, undefined>
      ? { readonly [K in keyof TEntries]: BuiltLocaleEntry<TEntries[K]> }
      : TSchema extends v.LooseObjectSchema<infer TEntries, undefined>
        ? { readonly [K in keyof TEntries]: BuiltLocaleEntry<TEntries[K]> }
        : TSchema extends v.IntersectSchema<infer TOptions, undefined>
          ? IntersectBuiltLocale<TOptions>
          : unknown;

/** Maps a single schema entry to its callable form. */
type BuiltLocaleEntry<TEntry> =
  // Nested object → recurse
  TEntry extends v.StrictObjectSchema<infer _E, undefined>
    ? BuiltLocale<TEntry>
    : TEntry extends v.ObjectSchema<infer _E, undefined>
      ? BuiltLocale<TEntry>
      : TEntry extends v.LooseObjectSchema<infer _E, undefined>
        ? BuiltLocale<TEntry>
        : // Template with params → (params: { ... }) => Result<Str>
          TEntry extends TemplateSchema<infer TParams>
          ? keyof TParams extends never
            ? () => Result<Str>
            : (params: { [K in keyof TParams]: v.InferOutput<TParams[K]> }) => Result<Str>
          : // Plain v.string() → () => Result<Str>
            TEntry extends v.StringSchema<undefined>
            ? () => Result<Str>
            : // Piped string (check before array/optional — pipes on strings should be callables)
              TEntry extends v.SchemaWithPipe<infer _P>
              ? () => Result<Str>
              : // Non-string types pass through unchanged (arrays, records, optionals, etc.)
                TEntry extends v.ArraySchema<infer _I, undefined>
                ? v.InferOutput<TEntry>
                : TEntry extends v.OptionalSchema<infer TWrapped, infer _TDefault>
                  ? TWrapped extends v.StringSchema<undefined>
                    ? (() => Result<Str>) | undefined
                    : v.InferOutput<TEntry>
                  : TEntry extends v.RecordSchema<infer _K, infer _V, undefined>
                    ? v.InferOutput<TEntry>
                    : // Fallback — pass through the inferred output type
                      TEntry extends v.GenericSchema
                      ? v.InferOutput<TEntry>
                      : unknown;

/** Merges built locales from an intersect schema's options tuple. */
type IntersectBuiltLocale<TOptions extends readonly v.GenericSchema[]> = TOptions extends readonly [
  infer TFirst,
  ...infer TRest,
]
  ? TRest extends readonly v.GenericSchema[]
    ? BuiltLocale<TFirst> & IntersectBuiltLocale<TRest>
    : BuiltLocale<TFirst>
  : unknown;

// =============================================================================
// Placeholder Extraction
// =============================================================================

/**
 * Extracts `{name}` placeholder names from a template string.
 * Recognizes simple `{name}`, plural `{name, plural, ...}`, select `{name, select, ...}`,
 * selectordinal `{name, selectordinal, ...}`, number `{name, number}`, and
 * date/time `{name, date, ...}` / `{name, time, ...}` blocks.
 *
 * @param template - The template string to scan. Validated via `StrSchema`.
 * @returns `Result<Set<Str>>` — set of placeholder names found, or a validation error.
 */
function extractPlaceholders(template: Str): Result<Set<Str>> {
  const templateResult: Result<Str> = safeParse(StrSchema, template);

  if (!templateResult.ok) {
    return templateResult;
  }

  // Strip escaped literals before scanning for placeholders
  const escapeResult: Result<EscapeResult> = escapeICULiterals(templateResult.data);

  if (!escapeResult.ok) {
    return escapeResult;
  }

  const cleanTemplate: Str = escapeResult.data.text;

  const found: Set<Str> = new Set<Str>();
  const simpleRegex: RegExp = /\{(\w+)(?:\|[\w|]*)?\}/g;
  const pluralRegex: RegExp = /\{(\w+)\s*,\s*plural\s*,/g;
  const selectRegex: RegExp = /\{(\w+)\s*,\s*select\s*,/g;
  const selectOrdinalRegex: RegExp = /\{(\w+)\s*,\s*selectordinal\s*,/g;
  const numberRegex: RegExp = /\{(\w+)\s*,\s*number/g;
  const dateTimeRegex: RegExp = /\{(\w+)\s*,\s*(?:date|time)/g;

  let match: NullableRegExpExecArray;

  while ((match = simpleRegex.exec(cleanTemplate)) !== null) {
    if (match[1]) {
      found.add(match[1]);
    }
  }
  while ((match = pluralRegex.exec(cleanTemplate)) !== null) {
    if (match[1]) {
      found.add(match[1]);
    }
  }
  while ((match = selectRegex.exec(cleanTemplate)) !== null) {
    if (match[1]) {
      found.add(match[1]);
    }
  }
  while ((match = selectOrdinalRegex.exec(cleanTemplate)) !== null) {
    if (match[1]) {
      found.add(match[1]);
    }
  }
  while ((match = numberRegex.exec(cleanTemplate)) !== null) {
    if (match[1]) {
      found.add(match[1]);
    }
  }
  while ((match = dateTimeRegex.exec(cleanTemplate)) !== null) {
    if (match[1]) {
      found.add(match[1]);
    }
  }

  const rangeRegex: RegExp = /\{(\w+)\s*,\s*range/g;

  while ((match = rangeRegex.exec(cleanTemplate)) !== null) {
    if (match[1]) {
      found.add(match[1]);
    }
  }
  return okUnchecked<Set<Str>>(found);
}

// =============================================================================
// Plural Resolution
// =============================================================================

/**
 * Resolves a plural expression for a given count.
 *
 * Supports ICU-style plural keywords: `=0`, `=1`, `=N` (exact match),
 * then `Intl.PluralRules` keyword (`zero`, `one`, `two`, `few`, `many`, `other`),
 * then `other` fallback. `#` in the branch body is replaced with the count value.
 *
 * @param count - The numeric value to select a plural branch for. Validated via `NumSchema`.
 * @param body - The plural body string (e.g., `"one {# file} other {# files}"`). Validated via `StrSchema`.
 * @param locale - Optional BCP 47 locale tag for `Intl.PluralRules`. Defaults to runtime default.
 * @returns `Result<Str>` — the resolved string for the given count, or a validation error.
 */
function resolvePlural(count: Num, body: Str, locale?: Str): Result<Str> {
  const countResult: Result<Num> = safeParse(NumSchema, count);

  if (!countResult.ok) {
    return countResult;
  }

  const bodyResult: Result<Str> = safeParse(StrSchema, body);

  if (!bodyResult.ok) {
    return bodyResult;
  }
  if (locale !== undefined) {
    const localeResult: Result<Str> = safeParse(StrSchema, locale);

    if (!localeResult.ok) {
      return localeResult;
    }
  }

  const parsed: Result<PluralParseResult> = parsePluralBranches(bodyResult.data);

  if (!parsed.ok) {
    return parsed;
  }

  const pluralOffset: Num = parsed.data.offset;
  const adjustedCount: Num = countResult.data - pluralOffset;

  // Exact match uses original count for matching, adjusted count for # replacement
  const exact: OptionalStr = parsed.data.branches.get(`=${countResult.data}`);

  if (exact !== undefined) {
    return ok(StrSchema, exact.replaceAll('#', String(adjustedCount)));
  }

  // Keyword match uses adjusted count for both rule selection and # replacement
  const rules: Intl.PluralRules = new Intl.PluralRules(locale ?? undefined, { type: 'cardinal' });
  const keyword: Str = rules.select(adjustedCount);
  const branch: Str = parsed.data.branches.get(keyword) ?? parsed.data.branches.get('other') ?? '';

  return ok(StrSchema, branch.replaceAll('#', String(adjustedCount)));
}

/** Schema for parsed plural branches. */
const PluralParseResultSchema = v.strictObject({
  /** Map of plural category → template string. */
  branches: v.custom<Map<Str, Str>>((val: unknown): Bool => val instanceof Map), // cast safe: Map validated by instanceof
  /** Plural offset value (default 0). */
  offset: NumSchema,
});

/** Result of parsing plural branches. See {@link PluralParseResultSchema}. */
type PluralParseResult = v.InferOutput<typeof PluralParseResultSchema>;

/**
 * Parses plural branch definitions and optional `offset:N` from a plural body string.
 *
 * Input format: `"offset:1 one {# item} other {# items}"`
 * Output: `{ branches: Map { 'one' => '# item', 'other' => '# items' }, offset: 1 }`
 *
 * @param body - The plural body string to parse. Validated via `StrSchema`.
 * @returns `Result<PluralParseResult>` — parsed branches and offset.
 */
function parsePluralBranches(body: Str): Result<PluralParseResult> {
  const bodyResult: Result<Str> = safeParse(StrSchema, body);

  if (!bodyResult.ok) {
    return bodyResult;
  }

  const branches: Map<Str, Str> = new Map<Str, Str>();
  let trimmed: Str = bodyResult.data.trim();
  let offset: Num = 0;

  // Check for offset:N at the start
  const offsetMatch: NullableRegExpMatchArray = trimmed.match(/^offset\s*:\s*(\d+)\s*/);

  if (offsetMatch && offsetMatch[1] !== undefined) {
    offset = Number(offsetMatch[1]);
    trimmed = trimmed.slice(offsetMatch[0].length);
  }

  // Loop counter i and depth are local loop mechanics, not domain values
  let i: Num = 0;

  while (i < trimmed.length) {
    // Skip whitespace
    while (i < trimmed.length && /\s/.test(trimmed[i] ?? '')) {
      i++;
    }
    if (i >= trimmed.length) {
      break;
    }

    // Read keyword (e.g., "one", "other", "=0")
    let keyword: Str = '';

    while (i < trimmed.length && !/[\s{]/.test(trimmed[i] ?? '')) {
      keyword += trimmed[i];
      i++;
    }
    if (!keyword) {
      break;
    }

    // Skip whitespace
    while (i < trimmed.length && /\s/.test(trimmed[i] ?? '')) {
      i++;
    }

    // Read brace-delimited body
    if (i >= trimmed.length || trimmed[i] !== '{') {
      break;
    }
    i++; // skip opening brace

    let depth: Num = 1;
    let branchBody: Str = '';

    while (i < trimmed.length && depth > 0) {
      if (trimmed[i] === '{') {
        depth++;
      } else if (trimmed[i] === '}') {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
      branchBody += trimmed[i];
      i++;
    }

    branches.set(keyword, branchBody);
  }

  return ok(PluralParseResultSchema, { branches, offset });
}

// =============================================================================
// Select Resolution
// =============================================================================

/**
 * Resolves a select expression by exact string match on branch keywords.
 * Falls back to `other` if no exact match is found.
 *
 * @param value - The string value to match against branch keywords. Validated via `StrSchema`.
 * @param body - The select body (e.g., `"male {He went} female {She went} other {They went}"`). Validated via `StrSchema`.
 * @returns `Result<Str>` — the resolved branch string, or a validation error.
 */
function resolveSelect(value: Str, body: Str): Result<Str> {
  const valueResult: Result<Str> = safeParse(StrSchema, value);

  if (!valueResult.ok) {
    return valueResult;
  }

  const bodyResult: Result<Str> = safeParse(StrSchema, body);

  if (!bodyResult.ok) {
    return bodyResult;
  }

  const branches: Result<PluralParseResult> = parsePluralBranches(bodyResult.data);

  if (!branches.ok) {
    return branches;
  }

  // Exact match, then `other` fallback
  const branch: Str =
    branches.data.branches.get(valueResult.data) ?? branches.data.branches.get('other') ?? '';

  return ok(StrSchema, branch);
}

// =============================================================================
// Select Ordinal Resolution
// =============================================================================

/**
 * Resolves an ordinal plural expression for a given count.
 * Uses `Intl.PluralRules` with `{ type: 'ordinal' }` for keyword selection.
 * Supports exact match (`=1`, `=2`) first, then ordinal keyword, then `other`.
 * `#` in branch body is replaced with the count value.
 *
 * @param count - The numeric value. Validated via `NumSchema`.
 * @param body - The ordinal body string (e.g., `"one {#st} two {#nd} few {#rd} other {#th}"`). Validated via `StrSchema`.
 * @param locale - Optional BCP 47 locale tag for `Intl.PluralRules`. Defaults to runtime default.
 * @returns `Result<Str>` — the resolved ordinal string, or a validation error.
 */
function resolveSelectOrdinal(count: Num, body: Str, locale?: Str): Result<Str> {
  const countResult: Result<Num> = safeParse(NumSchema, count);

  if (!countResult.ok) {
    return countResult;
  }

  const bodyResult: Result<Str> = safeParse(StrSchema, body);

  if (!bodyResult.ok) {
    return bodyResult;
  }
  if (locale !== undefined) {
    const localeResult: Result<Str> = safeParse(StrSchema, locale);

    if (!localeResult.ok) {
      return localeResult;
    }
  }

  const parsed: Result<PluralParseResult> = parsePluralBranches(bodyResult.data);

  if (!parsed.ok) {
    return parsed;
  }

  const pluralOffset: Num = parsed.data.offset;
  const adjustedCount: Num = countResult.data - pluralOffset;

  // Exact match uses original count for matching, adjusted count for # replacement
  const exact: OptionalStr = parsed.data.branches.get(`=${countResult.data}`);

  if (exact !== undefined) {
    return ok(StrSchema, exact.replaceAll('#', String(adjustedCount)));
  }

  // Ordinal keyword match via Intl.PluralRules — uses adjusted count
  const rules: Intl.PluralRules = new Intl.PluralRules(locale ?? undefined, { type: 'ordinal' });
  const keyword: Str = rules.select(adjustedCount);
  const branch: Str = parsed.data.branches.get(keyword) ?? parsed.data.branches.get('other') ?? '';

  return ok(StrSchema, branch.replaceAll('#', String(adjustedCount)));
}

// =============================================================================
// Block Replacement — Select
// =============================================================================

/**
 * Replaces `{name, select, ...branches...}` blocks in a template string.
 * Handles nested braces by counting brace depth. Resolved branches are
 * recursively processed for nested ICU blocks.
 *
 * @param template - The template string. Validated via `StrSchema`.
 * @param params - Key-value map of placeholder values.
 * @param locale - Optional BCP 47 locale tag.
 * @param depth - Current ICU nesting depth.
 * @param escapedLiterals - Escaped literal sentinels from the outermost call.
 * @param formatters - Optional custom formatters for pipe syntax and message ref modifiers.
 * @returns `Result<Str>` — the template with select blocks resolved, or a validation error.
 */
function replaceSelectBlocks(
  template: Str,
  params: Record<Str, unknown>,
  locale: OptionalStr,
  depth: Num,
  escapedLiterals: readonly EscapedLiteral[],
  formatters?: FormatterMap,
): Result<Str> {
  const templateResult: Result<Str> = safeParse(StrSchema, template);

  if (!templateResult.ok) {
    return templateResult;
  }

  let result: Str = '';
  let i: Num = 0;

  while (i < templateResult.data.length) {
    if (templateResult.data[i] === '{') {
      const remaining: Str = templateResult.data.slice(i + 1);
      const selectMatch: NullableRegExpMatchArray = remaining.match(/^(\w+)\s*,\s*select\s*,\s*/);

      if (selectMatch && selectMatch[1]) {
        const [, key]: Str[] = selectMatch;
        const bodyStart: Num = i + 1 + selectMatch[0].length;

        let braceDepth: Num = 1;
        let j: Num = bodyStart;

        while (j < templateResult.data.length && braceDepth > 0) {
          if (templateResult.data[j] === '{') {
            braceDepth++;
          } else if (templateResult.data[j] === '}') {
            braceDepth--;
          }
          j++;
        }

        const body: Str = templateResult.data.slice(bodyStart, j - 1);
        const value: Str = String(params[key] ?? '');
        const resolvedResult: Result<Str> = resolveSelect(value, body);

        if (!resolvedResult.ok) {
          return resolvedResult;
        }

        // Recursively process the resolved branch for inner ICU blocks
        const recursiveResult: Result<Str> = renderMessageInternal(
          resolvedResult.data,
          params,
          locale,
          depth + 1,
          escapedLiterals,
          undefined,
          formatters,
        );

        if (!recursiveResult.ok) {
          return recursiveResult;
        }
        result += recursiveResult.data;
        i = j;
        continue;
      }
    }

    result += templateResult.data[i];
    i++;
  }

  return ok(StrSchema, result);
}

// =============================================================================
// Block Replacement — Select Ordinal
// =============================================================================

/**
 * Replaces `{name, selectordinal, ...branches...}` blocks in a template string.
 * Handles nested braces by counting brace depth. Resolved branches are
 * recursively processed for nested ICU blocks.
 *
 * @param template - The template string. Validated via `StrSchema`.
 * @param params - Key-value map of placeholder values.
 * @param locale - Optional BCP 47 locale tag for `Intl.PluralRules`. Defaults to runtime default.
 * @param depth - Current ICU nesting depth.
 * @param escapedLiterals - Escaped literal sentinels from the outermost call.
 * @param formatters - Optional custom formatters for pipe syntax and message ref modifiers.
 * @returns `Result<Str>` — the template with selectordinal blocks resolved, or a validation error.
 */
function replaceSelectOrdinalBlocks(
  template: Str,
  params: Record<Str, unknown>,
  locale: OptionalStr,
  depth: Num,
  escapedLiterals: readonly EscapedLiteral[],
  formatters?: FormatterMap,
): Result<Str> {
  const templateResult: Result<Str> = safeParse(StrSchema, template);

  if (!templateResult.ok) {
    return templateResult;
  }
  if (locale !== undefined) {
    const localeResult: Result<Str> = safeParse(StrSchema, locale);

    if (!localeResult.ok) {
      return localeResult;
    }
  }

  let result: Str = '';
  let i: Num = 0;

  while (i < templateResult.data.length) {
    if (templateResult.data[i] === '{') {
      const remaining: Str = templateResult.data.slice(i + 1);
      const ordinalMatch: NullableRegExpMatchArray = remaining.match(
        /^(\w+)\s*,\s*selectordinal\s*,\s*/,
      );

      if (ordinalMatch && ordinalMatch[1]) {
        const [, key]: Str[] = ordinalMatch;
        const bodyStart: Num = i + 1 + ordinalMatch[0].length;

        let braceDepth: Num = 1;
        let j: Num = bodyStart;

        while (j < templateResult.data.length && braceDepth > 0) {
          if (templateResult.data[j] === '{') {
            braceDepth++;
          } else if (templateResult.data[j] === '}') {
            braceDepth--;
          }
          j++;
        }

        const body: Str = templateResult.data.slice(bodyStart, j - 1);
        const count: Num = Number(params[key]);
        const resolvedResult: Result<Str> = resolveSelectOrdinal(count, body, locale);

        if (!resolvedResult.ok) {
          return resolvedResult;
        }

        // Recursively process the resolved branch for inner ICU blocks
        const recursiveResult: Result<Str> = renderMessageInternal(
          resolvedResult.data,
          params,
          locale,
          depth + 1,
          escapedLiterals,
          undefined,
          formatters,
        );

        if (!recursiveResult.ok) {
          return recursiveResult;
        }
        result += recursiveResult.data;
        i = j;
        continue;
      }
    }

    result += templateResult.data[i];
    i++;
  }

  return ok(StrSchema, result);
}

// =============================================================================
// renderMessage()
// =============================================================================

/** Maximum nesting depth for recursive ICU block resolution. */
const MAX_ICU_DEPTH: Num = 10;

/**
 * Resolves `@:key`, `@:path.to.key`, and `@.modifier:key` message references.
 *
 * When a modifier is present (`@.upper:key`), the resolved value is passed
 * through the named formatter from the effective formatter map.
 *
 * @param template - The template string (already escape-processed). Validated via `StrSchema`.
 * @param resolver - Callback that resolves a dot-separated key path to a rendered string. Optional.
 * @param depth - Current nesting depth for recursion protection.
 * @param locale - Optional BCP 47 locale tag for formatters.
 * @param formatters - Optional custom formatters (merged with built-ins).
 * @returns `Result<Str>` — the template with message references resolved.
 */
function replaceMessageRefs(
  template: Str,
  resolver: ((key: Str) => Result<Str>) | undefined,
  depth: Num,
  locale?: Str,
  formatters?: FormatterMap,
): Result<Str> {
  if (!resolver) {
    return ok(StrSchema, template);
  }
  if (depth > MAX_ICU_DEPTH) {
    return err(ERRORS.LOCALE.FORMAT_FAILED, {
      meta: {
        type: 'messageRef',
        reason: `Message reference depth exceeded maximum of ${MAX_ICU_DEPTH}`,
      },
    });
  }

  const templateResult: Result<Str> = safeParse(StrSchema, template);

  if (!templateResult.ok) {
    return templateResult;
  }

  // Match @:key or @.modifier:key or @.modifier:path.to.key
  const refRegex: RegExp = /@(?:\.([\w]+))?:([\w]+(?:\.[\w]+)*)/g;
  let result: Str = templateResult.data;

  // Collect all matches first to avoid infinite replacement loops
  const replacements: Array<{
    readonly full: Str;
    readonly modifier: OptionalStr;
    readonly key: Str;
  }> = [];
  let match: NullableRegExpExecArray = refRegex.exec(result);

  while (match !== null) {
    if (match[2] !== undefined) {
      replacements.push({ full: match[0], modifier: match[1], key: match[2] });
    }
    match = refRegex.exec(result);
  }

  const builtInResult: Result<FormatterMap> = builtInFormatters(locale);

  if (!builtInResult.ok) {
    return builtInResult;
  }

  const effectiveFormatters: FormatterMap = {
    ...builtInResult.data,
    ...formatters,
  };

  for (const replacement of replacements) {
    const resolvedResult: Result<Str> = resolver(replacement.key);

    if (!resolvedResult.ok) {
      return resolvedResult;
    }

    let resolved: Str = resolvedResult.data;

    if (replacement.modifier) {
      const formatter: FormatterFn | undefined = effectiveFormatters[replacement.modifier];

      if (formatter) {
        const fmtResult: Result<Str> = formatter(resolved, locale);

        if (!fmtResult.ok) {
          return fmtResult;
        }
        resolved = fmtResult.data;
      }
    }

    result = result.replace(replacement.full, resolved);
  }

  return ok(StrSchema, result);
}

/**
 * Internal rendering pipeline with depth tracking for nested ICU blocks.
 *
 * @param template - The template string (already escape-processed).
 * @param params - Key-value map of placeholder values.
 * @param locale - Optional BCP 47 locale tag.
 * @param depth - Current nesting depth (0-based).
 * @param escapedLiterals - Escaped literal sentinels from the outermost call.
 * @param resolver - Optional callback for `@:key` message reference resolution.
 * @param formatters - Optional custom formatters for pipe syntax and message ref modifiers.
 * @returns `Result<Str>` — the rendered string.
 */
function renderMessageInternal(
  template: Str,
  params: Record<Str, unknown>,
  locale: OptionalStr,
  depth: Num,
  escapedLiterals: readonly EscapedLiteral[],
  resolver?: (key: Str) => Result<Str>,
  formatters?: FormatterMap,
): Result<Str> {
  if (depth > MAX_ICU_DEPTH) {
    return err(ERRORS.LOCALE.FORMAT_FAILED, {
      meta: { type: 'template', reason: `ICU nesting depth exceeded maximum of ${MAX_ICU_DEPTH}` },
    });
  }

  // 0. Message references — resolve @:key and @.modifier:key before ICU processing
  const refResult: Result<Str> = replaceMessageRefs(template, resolver, depth, locale, formatters);

  if (!refResult.ok) {
    return refResult;
  }

  // 1. Select blocks
  const selectResult: Result<Str> = replaceSelectBlocks(
    refResult.data,
    params,
    locale,
    depth,
    escapedLiterals,
    formatters,
  );

  if (!selectResult.ok) {
    return selectResult;
  }

  // 2. Select ordinal blocks
  const ordinalResult: Result<Str> = replaceSelectOrdinalBlocks(
    selectResult.data,
    params,
    locale,
    depth,
    escapedLiterals,
    formatters,
  );

  if (!ordinalResult.ok) {
    return ordinalResult;
  }

  // 3. Plural blocks
  const pluralResult: Result<Str> = replacePluralBlocks(
    ordinalResult.data,
    params,
    locale,
    depth,
    escapedLiterals,
    formatters,
  );

  if (!pluralResult.ok) {
    return pluralResult;
  }

  // 3.5. Range blocks
  const rangeResult: Result<Str> = replaceRangeBlocks(
    pluralResult.data,
    params,
    locale,
    depth,
    escapedLiterals,
    formatters,
  );

  if (!rangeResult.ok) {
    return rangeResult;
  }

  // 4. Number blocks
  const numberResult: Result<Str> = replaceNumberBlocks(rangeResult.data, params, locale);

  if (!numberResult.ok) {
    return numberResult;
  }

  // 5. Date/time blocks
  const dateTimeResult: Result<Str> = replaceDateTimeBlocks(numberResult.data, params, locale);

  if (!dateTimeResult.ok) {
    return dateTimeResult;
  }

  // 6. Simple {name} and {name|formatter1|formatter2} placeholders
  // Uses match-then-replace pattern for proper Result error propagation
  // (String.replace callbacks return Str, cannot propagate Result<Str>)
  let result: Str = dateTimeResult.data;
  const builtInResult2: Result<FormatterMap> = builtInFormatters(locale);

  if (!builtInResult2.ok) {
    return builtInResult2;
  }

  const effectiveFormatters: FormatterMap = {
    ...builtInResult2.data,
    ...formatters,
  };

  const simplePlaceholderRegex: RegExp = /\{(\w+)(?:\|([\w]+(?:\|[\w]+)*))?\}/g;
  const simpleMatches: Array<{
    readonly full: Str;
    readonly key: Str;
    readonly pipes: OptionalStr;
  }> = [];
  let simpleMatch: NullableRegExpExecArray = simplePlaceholderRegex.exec(result);

  while (simpleMatch !== null) {
    if (simpleMatch[1] !== undefined) {
      simpleMatches.push({
        full: simpleMatch[0],
        key: simpleMatch[1],
        pipes: simpleMatch[2],
      });
    }
    simpleMatch = simplePlaceholderRegex.exec(result);
  }

  for (const sm of simpleMatches) {
    let value: Str = String(params[sm.key] ?? '');

    if (sm.pipes) {
      const pipeNames: Str[] = sm.pipes.split('|');

      for (const pipeName of pipeNames) {
        const formatter: FormatterFn | undefined = effectiveFormatters[pipeName];

        if (formatter) {
          const fmtResult: Result<Str> = formatter(value, locale);

          if (!fmtResult.ok) {
            return fmtResult;
          }
          value = fmtResult.data;
        }
      }
    }
    result = result.replace(sm.full, value);
  }

  return ok(StrSchema, result);
}

/**
 * Renders a template string by substituting placeholders with param values.
 *
 * Processing order:
 * 0. Escape ICU literals (`'...'` and `''`)
 * 1. `{name, select, ...}` — select blocks (recursive)
 * 2. `{name, selectordinal, ...}` — ordinal plural blocks (recursive)
 * 3. `{count, plural, ...}` — cardinal plural blocks (recursive)
 * 3.5. `{name, range, ...}` — range/interval plural blocks (recursive)
 * 4. `{name, number}` / `{name, number, style}` / `{name, number, ::skeleton}` — number formatting blocks
 * 5. `{name, date, style}` / `{name, time, style}` / `{name, date, ::skeleton}` — date/time formatting blocks
 * 6. `{name}` / `{name|formatter}` — simple placeholder replacement with optional pipe formatters
 * 7. Restore escaped literals
 *
 * Nested ICU blocks are resolved recursively up to a maximum depth of 10.
 *
 * @param {Str} template - The template string. Validated via `StrSchema`.
 * @param {Record<Str, unknown>} params - Key-value map of placeholder values.
 * @param {Str} locale - Optional BCP 47 locale tag for `Intl.PluralRules` and `Intl.NumberFormat`/`Intl.DateTimeFormat`.
 * @param {(key: Str) => Result<Str>} resolver - Optional callback for `@:key` message reference resolution.
 * @param {FormatterMap} formatters - Optional custom formatters for pipe syntax and message ref modifiers.
 * @returns {Result<Str>} The rendered string, or a validation error.
 *
 * @example
 * ```typescript
 * const result = renderMessage('Hello, {name}!', { name: 'Alice' });
 * if (result.ok) result.data; // 'Hello, Alice!'
 * ```
 */
export function renderMessage(
  template: Str,
  params: Record<Str, unknown>,
  locale?: Str,
  resolver?: (key: Str) => Result<Str>,
  formatters?: FormatterMap,
): Result<Str> {
  const templateResult: Result<Str> = safeParse(StrSchema, template);

  if (!templateResult.ok) {
    return templateResult;
  }
  if (locale !== undefined) {
    const localeResult: Result<Str> = safeParse(StrSchema, locale);

    if (!localeResult.ok) {
      return localeResult;
    }
  }

  // 0. Escape ICU literals — replace '...' and '' with sentinels
  const escapeResult: Result<EscapeResult> = escapeICULiterals(templateResult.data);

  if (!escapeResult.ok) {
    return escapeResult;
  }

  // Run internal pipeline
  const renderResult: Result<Str> = renderMessageInternal(
    escapeResult.data.text,
    params,
    locale,
    0,
    escapeResult.data.literals,
    resolver,
    formatters,
  );

  if (!renderResult.ok) {
    return renderResult;
  }

  // Restore escaped literals
  return restoreEscapedLiterals(renderResult.data, escapeResult.data.literals);
}

/**
 * Replaces `{name, plural, ...branches...}` blocks in a template string.
 * Handles nested braces in branch bodies by counting brace depth. Resolved branches
 * are recursively processed for nested ICU blocks.
 *
 * @param template - The template string. Validated via `StrSchema`.
 * @param params - Key-value map of placeholder values.
 * @param locale - Optional BCP 47 locale tag for `Intl.PluralRules`. Defaults to runtime default.
 * @param depth - Current ICU nesting depth.
 * @param escapedLiterals - Escaped literal sentinels from the outermost call.
 * @param formatters - Optional custom formatters for pipe syntax and message ref modifiers.
 * @returns `Result<Str>` — the template with plural blocks resolved, or a validation error.
 */
function replacePluralBlocks(
  template: Str,
  params: Record<Str, unknown>,
  locale: OptionalStr,
  depth: Num,
  escapedLiterals: readonly EscapedLiteral[],
  formatters?: FormatterMap,
): Result<Str> {
  const templateResult: Result<Str> = safeParse(StrSchema, template);

  if (!templateResult.ok) {
    return templateResult;
  }
  if (locale !== undefined) {
    const localeResult: Result<Str> = safeParse(StrSchema, locale);

    if (!localeResult.ok) {
      return localeResult;
    }
  }

  let result: Str = '';
  let i: Num = 0;

  while (i < templateResult.data.length) {
    if (templateResult.data[i] === '{') {
      const remaining: Str = templateResult.data.slice(i + 1);
      const pluralMatch: NullableRegExpMatchArray = remaining.match(/^(\w+)\s*,\s*plural\s*,\s*/);

      if (pluralMatch && pluralMatch[1]) {
        const [, key]: Str[] = pluralMatch;
        const bodyStart: Num = i + 1 + pluralMatch[0].length;

        let braceDepth: Num = 1;
        let j: Num = bodyStart;

        while (j < templateResult.data.length && braceDepth > 0) {
          if (templateResult.data[j] === '{') {
            braceDepth++;
          } else if (templateResult.data[j] === '}') {
            braceDepth--;
          }
          j++;
        }

        const body: Str = templateResult.data.slice(bodyStart, j - 1);
        const count: Num = Number(params[key]);
        const resolvedResult: Result<Str> = resolvePlural(count, body, locale);

        if (!resolvedResult.ok) {
          return resolvedResult;
        }

        // Recursively process the resolved branch for inner ICU blocks
        const recursiveResult: Result<Str> = renderMessageInternal(
          resolvedResult.data,
          params,
          locale,
          depth + 1,
          escapedLiterals,
          undefined,
          formatters,
        );

        if (!recursiveResult.ok) {
          return recursiveResult;
        }
        result += recursiveResult.data;
        i = j;
        continue;
      }
    }

    result += templateResult.data[i];
    i++;
  }

  return ok(StrSchema, result);
}

// =============================================================================
// Range Plural Resolution
// =============================================================================

/** Valibot schema for a single range branch — exact match or min–max range. */
const RangeBranchSchema = v.strictObject({
  /** Minimum value (inclusive). */
  min: NumSchema,
  /** Maximum value (inclusive). `Infinity` for open-ended ranges. */
  max: NumSchema,
  /** Branch body template. */
  body: StrSchema,
});

/** A single range branch. @see {@link RangeBranchSchema} */
type RangeBranch = v.InferOutput<typeof RangeBranchSchema>;

/**
 * Parses range branch definitions from a range body string.
 *
 * Input format: `"(0){none} (1){one} (2-5){a few} (6-inf){many}"`
 *
 * @param body - The range body string. Validated via `StrSchema`.
 * @returns `Result<ReadonlyArray<RangeBranch>>` — parsed branches in order, or a validation error.
 */
function parseRangeBranches(body: Str): Result<readonly RangeBranch[]> {
  const bodyResult: Result<Str> = safeParse(StrSchema, body);

  if (!bodyResult.ok) {
    return bodyResult;
  }

  const branches: RangeBranch[] = [];
  const trimmed: Str = bodyResult.data.trim();
  let i: Num = 0;

  while (i < trimmed.length) {
    // Skip whitespace
    while (i < trimmed.length && /\s/.test(trimmed[i] ?? '')) {
      i++;
    }
    if (i >= trimmed.length) {
      break;
    }

    // Expect '('
    if (trimmed[i] !== '(') {
      break;
    }
    i++;

    // Read range spec until ')'
    let rangeSpec: Str = '';

    while (i < trimmed.length && trimmed[i] !== ')') {
      rangeSpec += trimmed[i];
      i++;
    }
    if (i >= trimmed.length) {
      break;
    }
    i++; // skip ')'

    // Skip whitespace
    while (i < trimmed.length && /\s/.test(trimmed[i] ?? '')) {
      i++;
    }

    // Expect '{'
    if (i >= trimmed.length || trimmed[i] !== '{') {
      break;
    }
    i++;

    // Read branch body with brace depth counting
    let braceDepth: Num = 1;
    let branchBody: Str = '';

    while (i < trimmed.length && braceDepth > 0) {
      if (trimmed[i] === '{') {
        braceDepth++;
      } else if (trimmed[i] === '}') {
        braceDepth--;
        if (braceDepth === 0) {
          i++;
          break;
        }
      }
      branchBody += trimmed[i];
      i++;
    }

    // Parse range spec: "0" (exact), "2-5" (range), "6-inf" (open-ended)
    const dashIndex: Num = rangeSpec.indexOf('-');
    let min: Num;
    let max: Num;

    if (dashIndex === -1) {
      min = Number(rangeSpec);
      max = min;
    } else {
      min = Number(rangeSpec.slice(0, dashIndex));
      const maxStr: Str = rangeSpec.slice(dashIndex + 1);
      max = maxStr === 'inf' ? Infinity : Number(maxStr);
    }

    branches.push({ min, max, body: branchBody });
  }

  return okUnchecked<readonly RangeBranch[]>(branches);
}

/**
 * Resolves a range expression by matching count against range branches.
 * First matching branch wins. `#` in the branch body is replaced with the count value.
 *
 * @param count - The numeric value. Validated via `NumSchema`.
 * @param body - The range body string. Validated via `StrSchema`.
 * @returns `Result<Str>` — the resolved branch body, or empty string if no match.
 */
function resolveRange(count: Num, body: Str): Result<Str> {
  const countResult: Result<Num> = safeParse(NumSchema, count);

  if (!countResult.ok) {
    return countResult;
  }

  const bodyResult: Result<Str> = safeParse(StrSchema, body);

  if (!bodyResult.ok) {
    return bodyResult;
  }

  const branchesResult: Result<readonly RangeBranch[]> = parseRangeBranches(bodyResult.data);

  if (!branchesResult.ok) {
    return branchesResult;
  }

  for (const branch of branchesResult.data) {
    if (countResult.data >= branch.min && countResult.data <= branch.max) {
      return ok(StrSchema, branch.body.replaceAll('#', String(countResult.data)));
    }
  }

  return ok(StrSchema, '');
}

/**
 * Replaces `{name, range, ...branches...}` blocks in a template string.
 * Handles nested braces by counting brace depth. Resolved branches are
 * recursively processed for nested ICU blocks.
 *
 * @param template - The template string. Validated via `StrSchema`.
 * @param params - Key-value map of placeholder values.
 * @param locale - Optional BCP 47 locale tag.
 * @param depth - Current ICU nesting depth.
 * @param escapedLiterals - Escaped literal sentinels from the outermost call.
 * @param formatters - Optional custom formatters.
 * @returns `Result<Str>` — template with range blocks resolved, or a validation error.
 */
function replaceRangeBlocks(
  template: Str,
  params: Record<Str, unknown>,
  locale: OptionalStr,
  depth: Num,
  escapedLiterals: readonly EscapedLiteral[],
  formatters?: FormatterMap,
): Result<Str> {
  const templateResult: Result<Str> = safeParse(StrSchema, template);

  if (!templateResult.ok) {
    return templateResult;
  }
  if (locale !== undefined) {
    const localeResult: Result<Str> = safeParse(StrSchema, locale);

    if (!localeResult.ok) {
      return localeResult;
    }
  }

  let result: Str = '';
  let i: Num = 0;

  while (i < templateResult.data.length) {
    if (templateResult.data[i] === '{') {
      const remaining: Str = templateResult.data.slice(i + 1);
      const rangeMatch: NullableRegExpMatchArray = remaining.match(/^(\w+)\s*,\s*range\s*,\s*/);

      if (rangeMatch && rangeMatch[1]) {
        const [, key]: Str[] = rangeMatch;
        const bodyStart: Num = i + 1 + rangeMatch[0].length;

        let braceDepth: Num = 1;
        let j: Num = bodyStart;

        while (j < templateResult.data.length && braceDepth > 0) {
          if (templateResult.data[j] === '{') {
            braceDepth++;
          } else if (templateResult.data[j] === '}') {
            braceDepth--;
          }
          j++;
        }

        const body: Str = templateResult.data.slice(bodyStart, j - 1);
        const count: Num = Number(params[key]);
        const resolvedResult: Result<Str> = resolveRange(count, body);

        if (!resolvedResult.ok) {
          return resolvedResult;
        }

        // Recursively process the resolved branch for inner ICU blocks
        const recursiveResult: Result<Str> = renderMessageInternal(
          resolvedResult.data,
          params,
          locale,
          depth + 1,
          escapedLiterals,
          undefined,
          formatters,
        );

        if (!recursiveResult.ok) {
          return recursiveResult;
        }
        result += recursiveResult.data;
        i = j;
        continue;
      }
    }

    result += templateResult.data[i];
    i++;
  }

  return ok(StrSchema, result);
}

// =============================================================================
// Block Replacement — Number
// =============================================================================

/**
 * Maps ICU number style names to `Intl.NumberFormatOptions`.
 *
 * @param style - The ICU number style name.
 * @returns `Intl.NumberFormatOptions` for the given style, or `undefined` for unknown styles.
 */
function numberStyleToOptions(style: Str): Intl.NumberFormatOptions | undefined {
  const map: Record<Str, Intl.NumberFormatOptions> = {
    percent: { style: 'percent' },
    compact: { notation: 'compact' },
    scientific: { notation: 'scientific' },
    engineering: { notation: 'engineering' },
  };

  return map[style];
}

/**
 * Replaces `{name, number}` and `{name, number, style}` blocks in a template string.
 * Delegates to `formatNumber()` from `@/locale/format`.
 * Supported styles: `percent`, `compact`, `scientific`, `engineering`.
 *
 * @param template - The template string. Validated via `StrSchema`.
 * @param params - Key-value map of placeholder values.
 * @param locale - Optional BCP 47 locale tag. Defaults to `'en'`.
 * @returns `Result<Str>` — the template with number blocks resolved, or a validation error.
 */
function replaceNumberBlocks(
  template: Str,
  params: Record<Str, unknown>,
  locale?: Str,
): Result<Str> {
  const templateResult: Result<Str> = safeParse(StrSchema, template);

  if (!templateResult.ok) {
    return templateResult;
  }
  if (locale !== undefined) {
    const localeResult: Result<Str> = safeParse(StrSchema, locale);

    if (!localeResult.ok) {
      return localeResult;
    }
  }

  let result: Str = '';
  let i: Num = 0;

  while (i < templateResult.data.length) {
    if (templateResult.data[i] === '{') {
      const remaining: Str = templateResult.data.slice(i + 1);
      // Match: {name, number} or {name, number, percent} or {name, number, ::skeleton}
      const numberMatch: NullableRegExpMatchArray = remaining.match(
        /^(\w+)\s*,\s*number(?:\s*,\s*(::(?:[^}]+)|[\w]+))?\s*\}/,
      );

      if (numberMatch && numberMatch[1]) {
        const [, key]: Str[] = numberMatch;
        const value: Num = Number(params[key]);
        const [, , styleArg]: (OptionalStr)[] = numberMatch;
        let options: Intl.NumberFormatOptions | undefined;

        if (styleArg && styleArg.startsWith('::')) {
          const skeletonStr: Str = styleArg.slice(2).trim();
          const skeletonResult: Result<Intl.NumberFormatOptions> = parseNumberSkeleton(skeletonStr);

          if (!skeletonResult.ok) {
            return skeletonResult;
          }
          options = skeletonResult.data;
        } else if (styleArg) {
          options = numberStyleToOptions(styleArg);
        }

        const formatResult: Result<Str> = formatNumber(value, locale ?? 'en', options);

        if (!formatResult.ok) {
          return formatResult;
        }
        result += formatResult.data;
        i += 1 + numberMatch[0].length;
        continue;
      }
    }

    result += templateResult.data[i];
    i++;
  }

  return ok(StrSchema, result);
}

// =============================================================================
// Block Replacement — Date / Time
// =============================================================================

/**
 * Replaces `{name, date}`, `{name, date, short}`, `{name, time}`, `{name, time, short}`
 * blocks in a template string. Delegates to `formatDate()` / `formatTime()` from `@/locale/format`.
 *
 * @param template - The template string. Validated via `StrSchema`.
 * @param params - Key-value map of placeholder values (Date objects or Unix ms timestamps).
 * @param locale - Optional BCP 47 locale tag. Defaults to `'en'`.
 * @returns `Result<Str>` — the template with date/time blocks resolved, or a validation error.
 */
function replaceDateTimeBlocks(
  template: Str,
  params: Record<Str, unknown>,
  locale?: Str,
): Result<Str> {
  const templateResult: Result<Str> = safeParse(StrSchema, template);

  if (!templateResult.ok) {
    return templateResult;
  }
  if (locale !== undefined) {
    const localeResult: Result<Str> = safeParse(StrSchema, locale);

    if (!localeResult.ok) {
      return localeResult;
    }
  }

  let result: Str = '';
  let i: Num = 0;

  while (i < templateResult.data.length) {
    if (templateResult.data[i] === '{') {
      const remaining: Str = templateResult.data.slice(i + 1);
      // Match: {name, date} or {name, date, short} or {name, time} or {name, time, ::skeleton}
      const dtMatch: NullableRegExpMatchArray = remaining.match(
        /^(\w+)\s*,\s*(date|time)(?:\s*,\s*(::(?:[^}]+)|short|medium|long|full))?\s*\}/,
      );

      if (dtMatch && dtMatch[1] && dtMatch[2]) {
        const [, key, kind, rawStyleArg]: (OptionalStr)[] = dtMatch;
        const rawValue: unknown = params[key];
        const dateValue: Date | Num = rawValue instanceof Date ? rawValue : Number(rawValue);

        let formatResult: Result<Str>;

        if (rawStyleArg && rawStyleArg.startsWith('::')) {
          const skeletonStr: Str = rawStyleArg.slice(2).trim();
          const skeletonResult: Result<Intl.DateTimeFormatOptions> =
            parseDateTimeSkeleton(skeletonStr);

          if (!skeletonResult.ok) {
            return skeletonResult;
          }
          formatResult =
            kind === 'time'
              ? formatTime(dateValue, locale ?? 'en', undefined, skeletonResult.data)
              : formatDate(dateValue, locale ?? 'en', undefined, skeletonResult.data);
        } else {
          // Validate named style via Valibot schema
          let style: DateTimeStyle | undefined = undefined;

          if (rawStyleArg !== undefined) {
            const styleResult: Result<DateTimeStyle> = safeParse(DateTimeStyleSchema, rawStyleArg);

            if (styleResult.ok) {
              style = styleResult.data;
            }
          }
          formatResult =
            kind === 'time'
              ? formatTime(dateValue, locale ?? 'en', style, undefined)
              : formatDate(dateValue, locale ?? 'en', style, undefined);
        }

        if (!formatResult.ok) {
          return formatResult;
        }
        result += formatResult.data;
        i += 1 + dtMatch[0].length;
        continue;
      }
    }

    result += templateResult.data[i];
    i++;
  }

  return ok(StrSchema, result);
}

// =============================================================================
// buildLocale()
// =============================================================================

/**
 * Transforms raw locale strings into a callable locale object.
 *
 * Called by `loadToolLocales()` / `loadCliLocales()` after importing and
 * validating the raw en.ts locale file. For each key in the schema:
 *
 * - **Nested object schema**: recurses into the sub-object
 * - **Plain string** (no params): wraps in `() => Result<Str>`
 * - **Parameterized template**: wraps in `(params) => Result<Str>` that
 *   validates each param via `safeParse` before rendering
 *
 * @param {TSchema} schema - The Valibot locale schema (e.g., `SyncStringsSchema`).
 * @param {RawLocaleStrings} rawStrs - The raw locale strings object (e.g., imported `en`).
 * @param {RawLocaleStrings} context - Optional context values substituted into plain strings and array elements
 *   at build time. Context placeholders use `{key}` syntax (same as `renderMessage`).
 * @param {Str} locale - Optional BCP 47 locale code baked into closures for `Intl.PluralRules`
 *   and `Intl.NumberFormat`/`Intl.DateTimeFormat`. Passed through to `renderMessage()`.
 * @param {FormatterMap} formatters - Optional custom formatters for pipe syntax and message ref modifiers.
 * @returns {Result<BuiltLocale<TSchema>>} A callable locale object where every leaf is a function returning `Result<Str>`.
 *
 * @example
 * ```typescript
 * const built = buildLocale(SyncStringsSchema, en, undefined, 'en');
 * built.configNotFound({ configFilename: 'resist.config.ts' });
 * // => ok('resist.config.ts not found, will create from defaults')
 *
 * built.success();
 * // => ok('Sync completed successfully!')
 * ```
 */
export function buildLocale<TSchema extends v.GenericSchema>(
  schema: TSchema,
  rawStrs: RawLocaleStrings,
  context?: RawLocaleStrings,
  locale?: Str,
  formatters?: FormatterMap,
): Result<BuiltLocale<TSchema>> {
  const entries: NullableSchemaEntries = getSchemaEntries(schema);

  if (!entries) {
    return err(ERRORS.INTERNAL.INVARIANT_VIOLATED, {
      meta: { reason: 'buildLocale requires an object schema', function: 'buildLocale' },
    });
  }

  // Create a mutable container for the built result — the resolver closure
  // captures this by reference. Safe because resolver is only called at runtime
  // (when a user invokes a locale function), by which time `builtRef` is populated.
  /** Schema for the mutable built result container. */
  const BuiltRefSchema = v.strictObject({
    /** Built locale data populated during build phase. */
    data: RawLocaleStringsSchema,
  });

  const builtRef: v.InferOutput<typeof BuiltRefSchema> = { data: {} };

  // Resolver for @:key message references — walks dot-separated key paths.
  const resolver: (key: Str) => Result<Str> = (key: Str): Result<Str> => {
    const parts: Str[] = key.split('.');
    let current: unknown = builtRef.data;

    for (const part of parts) {
      if (typeof current !== 'object' || current === null) {
        return err(ERRORS.LOCALE.FORMAT_FAILED, {
          meta: { type: 'messageRef', reason: `Key not found: ${key}` },
        });
      }
      current = (current as Record<Str, unknown>)[part]; // Runtime-guarded by typeof check above
    }
    if (typeof current === 'function') {
      return (current as () => Result<Str>)(); // Irreducible: locale functions are `() => Result<Str>` — no generic Valibot schema for function types
    }
    return err(ERRORS.LOCALE.FORMAT_FAILED, {
      meta: { type: 'messageRef', reason: `Key is not callable: ${key}` },
    });
  };

  const builtResult: Result<RawLocaleStrings> = buildLocaleEntries(
    entries,
    rawStrs,
    context,
    locale,
    resolver,
    formatters,
  );

  if (!builtResult.ok) {
    return builtResult;
  }

  // Populate the mutable ref so the resolver closure can access the built entries
  builtRef.data = builtResult.data;

  return okUnchecked<BuiltLocale<TSchema>>(builtResult.data as BuiltLocale<TSchema>); // Irreducible: BuiltLocale<TSchema> is a generic mapped type — no runtime schema. Structure guaranteed by buildLocaleEntries.
}

/**
 * Recursively builds locale entries from a schema entries map.
 *
 * @param entries - The schema entries (key → sub-schema).
 * @param rawStrs - The raw strings object matching these entries.
 * @param context - Optional context values for plain string and array element substitution.
 * @param locale - Optional BCP 47 locale code for `Intl.PluralRules` / `Intl.NumberFormat` / `Intl.DateTimeFormat`.
 * @param resolver - Optional callback for `@:key` message reference resolution.
 * @param formatters - Optional custom formatters for pipe syntax and message ref modifiers.
 * @returns `Result<RawLocaleStrings>` — the built entries object.
 */
function buildLocaleEntries(
  entries: Record<Str, v.GenericSchema>,
  rawStrs: RawLocaleStrings,
  context?: RawLocaleStrings,
  locale?: Str,
  resolver?: (key: Str) => Result<Str>,
  formatters?: FormatterMap,
): Result<RawLocaleStrings> {
  const result: RawLocaleStrings = {};

  for (const [key, entrySchema] of Object.entries(entries)) {
    const rawValue: HandlebarsValue = rawStrs[key];

    // Check if this is a nested object schema
    const nestedEntries: NullableSchemaEntries = getSchemaEntries(entrySchema);

    if (nestedEntries && typeof rawValue === 'object' && rawValue !== null) {
      const nestedResult: Result<RawLocaleStrings> = buildLocaleEntries(
        nestedEntries,
        rawValue as RawLocaleStrings, // cast safe: typeof rawValue === 'object' guard above
        context,
        locale,
        resolver,
        formatters,
      ); // Runtime-guarded by typeof check above

      if (!nestedResult.ok) {
        return nestedResult;
      }
      result[key] = nestedResult.data;
      continue;
    }

    // Leaf entry — either plain string or parameterized template
    const paramDefs: NullableParamSchemas = getTemplateParams(entrySchema);

    if (paramDefs && Object.keys(paramDefs).length > 0) {
      // Parameterized template — create a function that validates params and renders
      const template: Str = typeof rawValue === 'string' ? rawValue : '';
      const schemas: ParamSchemas = paramDefs;
      /**
       * @param params - Template parameter values to validate and render
       * @returns Result containing the rendered locale string
       */
      result[key] = (params: RawLocaleStrings): Result<Str> => {
        for (const [paramKey, paramSchema] of Object.entries(schemas)) {
          const paramResult: Result<unknown> = safeParse(paramSchema, params[paramKey]);

          if (!paramResult.ok) {
            return err(ERRORS.TEMPLATE.PARAM_VALIDATION_FAILED, {
              meta: { param: paramKey },
              cause: paramResult.error,
            });
          }
        }

        const renderedResult: Result<Str> = renderMessage(
          template,
          params,
          locale,
          resolver,
          formatters,
        );

        if (!renderedResult.ok) {
          return renderedResult;
        }
        return ok(StrSchema, renderedResult.data);
      };
    } else if (typeof rawValue === 'string') {
      // Plain string — apply context substitution if provided, then wrap
      const value: Str = context
        ? ((): Str => {
            const r: Result<Str> = renderMessage(rawValue, context);

            if (!r.ok) {
              return rawValue;
            } // Fallback to raw — context substitution failure is non-fatal
            return r.data;
          })()
        : rawValue;
      result[key] = (): Result<Str> => {
        return ok(StrSchema, value);
      };
    } else if (Array.isArray(rawValue) && context) {
      // Array of objects — apply context to string fields in each element
      result[key] = rawValue.map((item: unknown): unknown => {
        if (typeof item === 'object' && item !== null) {
          const rendered: RawLocaleStrings = {};

          for (const [fieldKey, fieldValue] of Object.entries(item as Record<Str, unknown>)) { // cast safe: typeof item === 'object' guard above
            // Runtime-guarded by typeof === 'object' check above
            if (typeof fieldValue === 'string') {
              const renderResult: Result<Str> = renderMessage(fieldValue, context);

              if (renderResult.ok) {
                rendered[fieldKey] = renderResult.data;
              } else {
                rendered[fieldKey] = fieldValue;
              }
            } else {
              rendered[fieldKey] = fieldValue;
            }
          }
          return rendered;
        }
        return item;
      });
    } else {
      // Non-string, non-array value (record, undefined, etc.) — pass through unmodified
      result[key] = rawValue;
    }
  }

  return okUnchecked<RawLocaleStrings>(result);
}

// =============================================================================
// Schema Introspection Helpers
// =============================================================================

/**
 * Extracts the entries record from an object-like Valibot schema.
 *
 * Handles:
 * - `v.strictObject(entries)` → entries
 * - `v.object(entries)` → entries
 * - `v.looseObject(entries)` → entries
 * - `v.intersect([...])` → merged entries from all options
 * - `v.pipe(schema, ...)` → unwraps to find inner object schema
 *
 * @param schema - A Valibot schema.
 * @returns `NullableSchemaEntries` — the entries record, or `null` if not an object schema.
 */
function getSchemaEntries(schema: v.GenericSchema): NullableSchemaEntries {
  const s: Record<Str, unknown> = schema as unknown as Record<Str, unknown>; // cast safe: dynamic schema introspection requires cast

  // Object schemas have an `entries` property
  if (s.entries && typeof s.entries === 'object') {
    return s.entries as Record<string, v.GenericSchema>; // Runtime-guarded by typeof check
  }

  // Pipe schemas — unwrap to find the inner object schema
  if (Array.isArray(s.pipe)) {
    for (const item of s.pipe) {
      if (typeof item === 'object' && item !== null) {
        const entries: Record<Str, v.GenericSchema> | undefined = getSchemaEntries(item as v.GenericSchema); // cast safe: runtime-guarded by typeof check

        if (entries) {
          return entries;
        }
      }
    }
  }

  // Intersect schemas — merge entries from all options
  if (Array.isArray(s.options)) {
    const merged: Record<Str, v.GenericSchema> = {};
    let found: Bool = false;

    for (const option of s.options) {
      if (typeof option === 'object' && option !== null) {
        const entries: NullableSchemaEntries = getSchemaEntries(option as v.GenericSchema); // Runtime-guarded by typeof check

        if (entries) {
          Object.assign(merged, entries);
          found = true;
        }
      }
    }
    if (found) {
      return merged;
    }
  }

  return null;
}
