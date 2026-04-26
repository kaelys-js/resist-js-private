/**
 * Common Schemas — general-purpose Valibot schemas reusable across any package.
 *
 * @module
 *
 * Categories:
 * - **Primitives** — Str, Bool, Num, Path, Filename, Void, Never
 * - **Network & Environment** — Port, IPv4, Hostname, Environment
 * - **Versioning** — Semver
 * - **Identifiers** — KebabCaseId, ProductName, CamelCaseString
 * - **Process** — ExitCode, Platform
 * - **Logging** — LogLevel
 * - **Shell & Commands** — Command, StdioOption, SpawnProcessOptions
 * - **Workspace** — EnsureCommandResult, EnsureMiseResult, EnsureWorkspaceRootResult
 * - **Environment Config** — EnvironmentConfig
 *
 * CLI-specific schemas (flags, output format, exit code values, tool names)
 * live in `@/cli/schemas`.
 */

import * as v from 'valibot';

// =============================================================================
// Primitive Schemas
// =============================================================================

/**
 * String schema.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(StrSchema, 'hello');
 * if (result.ok) result.data; // 'hello'
 * ```
 */
export const StrSchema = v.string();

/** Inferred output type of {@link StrSchema}. */
export type Str = v.InferOutput<typeof StrSchema>;

/**
 * String array schema.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(StrArraySchema, ['a', 'b', 'c']);
 * if (result.ok) result.data; // ['a', 'b', 'c']
 * ```
 */
export const StrArraySchema = v.array(StrSchema);

/** Inferred output type of {@link StrArraySchema}. */
export type StrArray = v.InferOutput<typeof StrArraySchema>;

/**
 * Nullable string schema. A string or `null`.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(NullableStrSchema, null);
 * if (result.ok) result.data; // null
 * ```
 */
export const NullableStrSchema = v.nullable(StrSchema);

/** Inferred output type of {@link NullableStrSchema}. A string or `null`. */
export type NullableStr = v.InferOutput<typeof NullableStrSchema>;

/**
 * Optional string schema. A string or `undefined`.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(OptionalStrSchema, undefined);
 * if (result.ok) result.data; // undefined
 * ```
 */
export const OptionalStrSchema = v.optional(StrSchema);

/** Inferred output type of {@link OptionalStrSchema}. A string or `undefined`. */
export type OptionalStr = v.InferOutput<typeof OptionalStrSchema>;

/**
 * Non-empty string schema for locale/i18n strings.
 *
 * Validates that locale strings are never empty. Use this for all locale
 * schema fields (flag descriptions, error messages, labels, headers, etc.).
 * For parameterized locale strings, use `messageTemplate()` instead.
 */
export const LocaleStringSchema = v.pipe(v.string(), v.minLength(1), v.brand('LocaleString'));

/** Inferred output type of {@link LocaleStringSchema}. A non-empty string. */
export type LocaleString = v.InferOutput<typeof LocaleStringSchema>;

/**
 * Boolean schema.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(BoolSchema, true);
 * if (result.ok) result.data; // true
 * ```
 */
export const BoolSchema = v.boolean();

/** Inferred output type of {@link BoolSchema}. */
export type Bool = v.InferOutput<typeof BoolSchema>;

/**
 * Nullable boolean schema. A boolean or `null`.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(NullableBoolSchema, null);
 * if (result.ok) result.data; // null
 * ```
 */
export const NullableBoolSchema = v.nullable(BoolSchema);

/** Inferred output type of {@link NullableBoolSchema}. A boolean or `null`. */
export type NullableBool = v.InferOutput<typeof NullableBoolSchema>;

/**
 * Optional boolean schema. A boolean or `undefined`.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(OptionalBoolSchema, undefined);
 * if (result.ok) result.data; // undefined
 * ```
 */
export const OptionalBoolSchema = v.optional(BoolSchema);

/** Inferred output type of {@link OptionalBoolSchema}. A boolean or `undefined`. */
export type OptionalBool = v.InferOutput<typeof OptionalBoolSchema>;

/**
 * Number schema.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(NumSchema, 42);
 * if (result.ok) result.data; // 42
 * ```
 */
export const NumSchema = v.number();

/** Inferred output type of {@link NumSchema}. */
export type Num = v.InferOutput<typeof NumSchema>;

/**
 * Nullable number schema. A number or `null`.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(NullableNumSchema, null);
 * if (result.ok) result.data; // null
 * ```
 */
export const NullableNumSchema = v.nullable(NumSchema);

/** Inferred output type of {@link NullableNumSchema}. A number or `null`. */
export type NullableNum = v.InferOutput<typeof NullableNumSchema>;

/**
 * Optional number schema. A number or `undefined`.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(OptionalNumSchema, undefined);
 * if (result.ok) result.data; // undefined
 * ```
 */
export const OptionalNumSchema = v.optional(NumSchema);

/** Inferred output type of {@link OptionalNumSchema}. A number or `undefined`. */
export type OptionalNum = v.InferOutput<typeof OptionalNumSchema>;

/**
 * Non-negative integer schema. An integer >= 0.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(NonNegativeIntegerSchema, 0);
 * if (result.ok) result.data; // 0
 * ```
 */
export const NonNegativeIntegerSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(0),
  v.brand('NonNegativeInteger'),
);

/** Inferred output type of {@link NonNegativeIntegerSchema}. An integer >= 0. */
export type NonNegativeInteger = v.InferOutput<typeof NonNegativeIntegerSchema>;

/**
 * Default terminal width: `80` columns.
 *
 * Safe fallback when `process.stdout.columns` is unavailable
 * (e.g., non-TTY, browser, Cloudflare Workers).
 *
 * @example
 * ```typescript
 * const width: NonNegativeInteger = DEFAULT_TERMINAL_WIDTH; // 80
 * ```
 */
export const DEFAULT_TERMINAL_WIDTH: NonNegativeInteger = ((): NonNegativeInteger => {
  const r: v.SafeParseResult<typeof NonNegativeIntegerSchema> = v.safeParse(
    NonNegativeIntegerSchema,
    80,
  );

  if (!r.success) {
    throw new Error('BUG: DEFAULT_TERMINAL_WIDTH schema validation failed');
  }
  return r.output;
})();

/**
 * Default JSON indentation: `2` spaces.
 *
 * Used by `safeStringify`, `log.json`, and `log.raw` for pretty-printing.
 *
 * @example
 * ```typescript
 * const indent: NonNegativeInteger = DEFAULT_JSON_INDENT; // 2
 * ```
 */
export const DEFAULT_JSON_INDENT: NonNegativeInteger = ((): NonNegativeInteger => {
  const r: v.SafeParseResult<typeof NonNegativeIntegerSchema> = v.safeParse(
    NonNegativeIntegerSchema,
    2,
  );

  if (!r.success) {
    throw new Error('BUG: DEFAULT_JSON_INDENT schema validation failed');
  }
  return r.output;
})();

/**
 * Non-negative number schema. A number >= 0 (may be fractional).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(NonNegativeNumberSchema, 0.75);
 * if (result.ok) result.data; // 0.75
 * ```
 */
export const NonNegativeNumberSchema = v.pipe(
  v.number(),
  v.minValue(0),
  v.brand('NonNegativeNumber'),
);

/** Inferred output type of {@link NonNegativeNumberSchema}. A number >= 0 (may be fractional). */
export type NonNegativeNumber = v.InferOutput<typeof NonNegativeNumberSchema>;

/**
 * Positive integer schema. An integer >= 1.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(PositiveIntegerSchema, 25);
 * if (result.ok) result.data; // 25
 * ```
 */
export const PositiveIntegerSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(1),
  v.brand('PositiveInteger'),
);

/** Inferred output type of {@link PositiveIntegerSchema}. An integer >= 1. */
export type PositiveInteger = v.InferOutput<typeof PositiveIntegerSchema>;

/**
 * Default progress bar width: `20` characters.
 *
 * Used by the terminal progress bar renderer.
 *
 * @example
 * ```typescript
 * const width: PositiveInteger = DEFAULT_PROGRESS_BAR_WIDTH; // 20
 * ```
 */
export const DEFAULT_PROGRESS_BAR_WIDTH: PositiveInteger = ((): PositiveInteger => {
  const r: v.SafeParseResult<typeof PositiveIntegerSchema> = v.safeParse(PositiveIntegerSchema, 20);

  if (!r.success) {
    throw new Error('BUG: DEFAULT_PROGRESS_BAR_WIDTH schema validation failed');
  }
  return r.output;
})();

/**
 * Schema for a non-empty file system path string.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(PathSchema, '/usr/local/bin');
 * if (result.ok) result.data; // '/usr/local/bin'
 * ```
 */
export const PathSchema = v.pipe(v.string(), v.minLength(1), v.brand('Path'));

/** Inferred output type of {@link PathSchema}. A non-empty path string. */
export type Path = v.InferOutput<typeof PathSchema>;

/**
 * Schema for an array of path segments. Empty segments are valid (ignored by `path.join`).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(PathArraySchema, ['src', 'utils', 'index.ts']);
 * if (result.ok) result.data; // ['src', 'utils', 'index.ts']
 * ```
 */
export const PathArraySchema = v.array(v.string());

/** Inferred output type of {@link PathArraySchema}. */
export type PathArray = v.InferOutput<typeof PathArraySchema>;

/**
 * Schema for a URL string (e.g., `'file:///app/src'`, `'https://example.com'`).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(UrlStringSchema, 'https://example.com');
 * if (result.ok) result.data; // 'https://example.com'
 * ```
 */
export const UrlStringSchema = v.pipe(v.string(), v.url(), v.brand('UrlString'));

/** Inferred output type of {@link UrlStringSchema}. A valid URL string. */
export type UrlString = v.InferOutput<typeof UrlStringSchema>;

/**
 * Schema for a file or directory name (non-empty, no path separators).
 * Rejects names containing `/` or `\`.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(FilenameSchema, 'package.json');
 * if (result.ok) result.data; // 'package.json'
 * ```
 */
export const FilenameSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.regex(/^[^/\\]+$/, 'Filename must not contain path separators'),
  v.brand('Filename'),
);

/** Inferred output type of {@link FilenameSchema}. A non-empty filename string without path separators. */
export type Filename = v.InferOutput<typeof FilenameSchema>;

/**
 * Void schema for function returns that produce no value.
 *
 * @example
 * ```typescript
 * ok(VoidSchema, undefined);
 * ```
 */
export const VoidSchema = v.undefined();

/** Inferred output type of {@link VoidSchema}. */
export type Void = v.InferOutput<typeof VoidSchema>;

/**
 * Never schema. Validates that no value is ever provided.
 *
 * Used as a return type for functions that never return (e.g., `process.exit`).
 *
 * @example
 * ```typescript
 * export function exit(code: ExitCode = 0): Never { ... }
 * ```
 */
export const NeverSchema = v.never();

/** Inferred output type of {@link NeverSchema}. */
export type Never = v.InferOutput<typeof NeverSchema>;

// =============================================================================
// Validated String Schemas (email, UUID, timestamp, git)
// =============================================================================

/**
 * Schema for email addresses.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(EmailSchema, 'user@example.com');
 * if (result.ok) result.data; // 'user@example.com'
 * ```
 */
export const EmailSchema = v.pipe(v.string(), v.email(), v.brand('Email'));

/** Inferred output type of {@link EmailSchema}. A validated email address. */
export type Email = v.InferOutput<typeof EmailSchema>;

/**
 * Schema for UUID v4 strings.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(UuidSchema, '550e8400-e29b-41d4-a716-446655440000');
 * if (result.ok) result.data; // UUID string
 * ```
 */
export const UuidSchema = v.pipe(v.string(), v.uuid(), v.brand('Uuid'));

/** Inferred output type of {@link UuidSchema}. A validated UUID string. */
export type Uuid = v.InferOutput<typeof UuidSchema>;

/**
 * Schema for ISO 8601 timestamp strings.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(IsoTimestampSchema, '2026-03-24T12:00:00Z');
 * if (result.ok) result.data; // ISO timestamp
 * ```
 */
export const IsoTimestampSchema = v.pipe(v.string(), v.isoTimestamp(), v.brand('IsoTimestamp'));

/** Inferred output type of {@link IsoTimestampSchema}. A validated ISO 8601 timestamp. */
export type IsoTimestamp = v.InferOutput<typeof IsoTimestampSchema>;

/**
 * Schema for short git commit hashes (7 characters).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(GitCommitShortSchema, 'abc1234');
 * if (result.ok) result.data; // 7-char hash
 * ```
 */
export const GitCommitShortSchema = v.pipe(v.string(), v.length(7), v.brand('GitCommitShort'));

/** Inferred output type of {@link GitCommitShortSchema}. A 7-character git commit hash. */
export type GitCommitShort = v.InferOutput<typeof GitCommitShortSchema>;

/**
 * Schema for full git commit hashes (40 characters).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(GitCommitFullSchema, 'abc1234def5678abc1234def5678abc1234def567');
 * if (result.ok) result.data; // 40-char hash
 * ```
 */
export const GitCommitFullSchema = v.pipe(v.string(), v.length(40), v.brand('GitCommitFull'));

/** Inferred output type of {@link GitCommitFullSchema}. A 40-character git commit hash. */
export type GitCommitFull = v.InferOutput<typeof GitCommitFullSchema>;

/**
 * Schema for git branch names (1-255 characters).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(GitBranchSchema, 'main');
 * if (result.ok) result.data; // branch name
 * ```
 */
export const GitBranchSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(255),
  v.brand('GitBranch'),
);

/** Inferred output type of {@link GitBranchSchema}. A git branch name (1-255 chars). */
export type GitBranch = v.InferOutput<typeof GitBranchSchema>;

/**
 * Schema for CSS font-weight values (e.g., `'400'`, `'100 900'`).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(CssFontWeightSchema, '400');
 * if (result.ok) result.data; // '400'
 * ```
 */
export const CssFontWeightSchema = v.pipe(
  v.string(),
  v.regex(/^\d{1,3}(\s+\d{1,3})?$/),
  v.brand('CssFontWeight'),
);

/** Inferred output type of {@link CssFontWeightSchema}. A CSS font-weight value. */
export type CssFontWeight = v.InferOutput<typeof CssFontWeightSchema>;

// =============================================================================
// Duration & Time Schemas
// =============================================================================

/**
 * Schema for duration strings (e.g., `'15m'`, `'1h'`, `'7d'`).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(DurationSchema, '15m');
 * if (result.ok) result.data; // '15m'
 * ```
 */
export const DurationSchema = v.pipe(
  v.string(),
  v.regex(/^\d+[smhd]$/, 'Must be a duration like "15m" or "7d"'),
  v.brand('Duration'),
);

/** Inferred output type of {@link DurationSchema}. A duration string. */
export type Duration = v.InferOutput<typeof DurationSchema>;

/**
 * Schema for date-only strings (YYYY-MM-DD).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(DateOnlySchema, '2026-03-24');
 * if (result.ok) result.data; // '2026-03-24'
 * ```
 */
export const DateOnlySchema = v.pipe(
  v.string(),
  v.regex(/^\d{4}-\d{2}-\d{2}$/),
  v.brand('DateOnly'),
);

/** Inferred output type of {@link DateOnlySchema}. A YYYY-MM-DD date string. */
export type DateOnly = v.InferOutput<typeof DateOnlySchema>;

/**
 * Schema for IANA timezone strings (e.g., `'America/New_York'`).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(TimezoneSchema, 'America/New_York');
 * if (result.ok) result.data; // 'America/New_York'
 * ```
 */
export const TimezoneSchema = v.pipe(
  v.string(),
  v.check((s: Str): Bool => {
    try {
      const _fmt: Intl.DateTimeFormat = new Intl.DateTimeFormat(undefined, { timeZone: s });
      return _fmt !== undefined;
    } catch {
      return false;
    }
  }, 'Must be a valid IANA timezone'),
  v.brand('Timezone'),
);

/** Inferred output type of {@link TimezoneSchema}. A valid IANA timezone. */
export type Timezone = v.InferOutput<typeof TimezoneSchema>;

/**
 * Schema for cron expressions (5-field format).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(CronExpressionSchema, '0 9 * * 1-5');
 * if (result.ok) result.data; // '0 9 * * 1-5'
 * ```
 */
export const CronExpressionSchema = v.pipe(
  v.string(),
  v.regex(/^(\S+\s+){4}\S+$/),
  v.brand('CronExpression'),
);

/** Inferred output type of {@link CronExpressionSchema}. A 5-field cron expression. */
export type CronExpression = v.InferOutput<typeof CronExpressionSchema>;

// =============================================================================
// Text & Content Schemas
// =============================================================================

/**
 * Schema for descriptions (max 500 characters).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(DescriptionSchema, 'A monorepo for web products');
 * if (result.ok) result.data; // 'A monorepo for web products'
 * ```
 */
export const DescriptionSchema = v.pipe(v.string(), v.maxLength(500), v.brand('Description'));

/** Inferred output type of {@link DescriptionSchema}. A description string (max 500 chars). */
export type Description = v.InferOutput<typeof DescriptionSchema>;

/**
 * Schema for tags/keywords (lowercase alphanumeric with hyphens, max 50 chars).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(TagSchema, 'web-development');
 * if (result.ok) result.data; // 'web-development'
 * ```
 */
export const TagSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(50),
  v.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  v.brand('Tag'),
);

/** Inferred output type of {@link TagSchema}. A lowercase tag/keyword string. */
export type Tag = v.InferOutput<typeof TagSchema>;

/**
 * Schema for URL-friendly slugs (lowercase, hyphens, no spaces).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(SlugSchema, 'my-project');
 * if (result.ok) result.data; // 'my-project'
 * ```
 */
export const SlugSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(100),
  v.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  v.brand('Slug'),
);

/** Inferred output type of {@link SlugSchema}. A URL-friendly slug. */
export type Slug = v.InferOutput<typeof SlugSchema>;

/**
 * Schema for environment variable names (SCREAMING_SNAKE_CASE).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(EnvVarNameSchema, 'DATABASE_URL');
 * if (result.ok) result.data; // 'DATABASE_URL'
 * ```
 */
export const EnvVarNameSchema = v.pipe(
  v.string(),
  v.regex(/^[A-Z][A-Z0-9_]*$/),
  v.brand('EnvVarName'),
);

/** Inferred output type of {@link EnvVarNameSchema}. A SCREAMING_SNAKE_CASE env var name. */
export type EnvVarName = v.InferOutput<typeof EnvVarNameSchema>;

/**
 * Schema for valid JSON strings (parseable by JSON.parse).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(JsonStringSchema, '{"key": "value"}');
 * if (result.ok) result.data; // '{"key": "value"}'
 * ```
 */
export const JsonStringSchema = v.pipe(
  v.string(),
  v.check((s: Str): Bool => {
    try {
      // JSON.parse is correct here: validating string IS parseable JSON
      JSON.parse(s);
      return true;
    } catch {
      return false;
    }
  }, 'Must be valid JSON'),
  v.brand('JsonString'),
);

/** Inferred output type of {@link JsonStringSchema}. A valid JSON string. */
export type JsonString = v.InferOutput<typeof JsonStringSchema>;

// =============================================================================
// Security & Auth Schemas
// =============================================================================

/**
 * Schema for hex colors (#fff, #ffffff, #ffffffff).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(HexColorSchema, '#ff5733');
 * if (result.ok) result.data; // '#ff5733'
 * ```
 */
export const HexColorSchema = v.pipe(
  v.string(),
  v.regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/),
  v.brand('HexColor'),
);

/** Inferred output type of {@link HexColorSchema}. A hex color string. */
export type HexColor = v.InferOutput<typeof HexColorSchema>;

/**
 * Schema for HTTP status codes (100-599).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(HttpStatusCodeSchema, 200);
 * if (result.ok) result.data; // 200
 * ```
 */
export const HttpStatusCodeSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(100),
  v.maxValue(599),
  v.brand('HttpStatusCode'),
);

/** Inferred output type of {@link HttpStatusCodeSchema}. An HTTP status code (100-599). */
export type HttpStatusCode = v.InferOutput<typeof HttpStatusCodeSchema>;

/**
 * Schema for MIME types (e.g., `'application/json'`, `'text/html'`).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(MimeTypeSchema, 'application/json');
 * if (result.ok) result.data; // 'application/json'
 * ```
 */
export const MimeTypeSchema = v.pipe(
  v.string(),
  v.regex(/^[a-z]+\/[a-z0-9.+-]+$/),
  v.brand('MimeType'),
);

/** Inferred output type of {@link MimeTypeSchema}. A MIME type string. */
export type MimeType = v.InferOutput<typeof MimeTypeSchema>;

/**
 * Schema for base64-encoded strings.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(Base64Schema, 'SGVsbG8gV29ybGQ=');
 * if (result.ok) result.data; // 'SGVsbG8gV29ybGQ='
 * ```
 */
export const Base64Schema = v.pipe(
  v.string(),
  v.regex(/^[A-Za-z0-9+/]*={0,2}$/),
  v.brand('Base64'),
);

/** Inferred output type of {@link Base64Schema}. A base64-encoded string. */
export type Base64 = v.InferOutput<typeof Base64Schema>;

/**
 * Schema for SHA-256 hex hashes (64 characters).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(Sha256Schema, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
 * if (result.ok) result.data; // 64-char hex hash
 * ```
 */
export const Sha256Schema = v.pipe(
  v.string(),
  v.length(64),
  v.regex(/^[0-9a-f]+$/),
  v.brand('Sha256'),
);

/** Inferred output type of {@link Sha256Schema}. A 64-character SHA-256 hex hash. */
export type Sha256 = v.InferOutput<typeof Sha256Schema>;

/**
 * Schema for JWT tokens (three base64url segments separated by dots).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(JwtSchema, 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc123');
 * if (result.ok) result.data; // JWT string
 * ```
 */
export const JwtSchema = v.pipe(
  v.string(),
  v.regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/),
  v.brand('Jwt'),
);

/** Inferred output type of {@link JwtSchema}. A JWT token string. */
export type Jwt = v.InferOutput<typeof JwtSchema>;

// =============================================================================
// i18n Schemas
// =============================================================================

/**
 * Schema for ISO 3166-1 alpha-2 country codes (e.g., `'US'`, `'GB'`, `'JP'`).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(CountryCodeSchema, 'US');
 * if (result.ok) result.data; // 'US'
 * ```
 */
export const CountryCodeSchema = v.pipe(
  v.string(),
  v.length(2),
  v.regex(/^[A-Z]{2}$/),
  v.brand('CountryCode'),
);

/** Inferred output type of {@link CountryCodeSchema}. An ISO 3166-1 alpha-2 country code. */
export type CountryCode = v.InferOutput<typeof CountryCodeSchema>;

/**
 * Schema for ISO 639-1 language codes (e.g., `'en'`, `'ja'`, `'pt'`).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(LanguageCodeSchema, 'en');
 * if (result.ok) result.data; // 'en'
 * ```
 */
export const LanguageCodeSchema = v.pipe(
  v.string(),
  v.minLength(2),
  v.maxLength(3),
  v.regex(/^[a-z]{2,3}$/),
  v.brand('LanguageCode'),
);

/** Inferred output type of {@link LanguageCodeSchema}. An ISO 639-1 language code. */
export type LanguageCode = v.InferOutput<typeof LanguageCodeSchema>;

/**
 * Schema for ISO 4217 currency codes (e.g., `'USD'`, `'EUR'`, `'JPY'`).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(CurrencyCodeSchema, 'USD');
 * if (result.ok) result.data; // 'USD'
 * ```
 */
export const CurrencyCodeSchema = v.pipe(
  v.string(),
  v.length(3),
  v.regex(/^[A-Z]{3}$/),
  v.brand('CurrencyCode'),
);

/** Inferred output type of {@link CurrencyCodeSchema}. An ISO 4217 currency code. */
export type CurrencyCode = v.InferOutput<typeof CurrencyCodeSchema>;

// =============================================================================
// Infrastructure Schemas
// =============================================================================

/**
 * Schema for Docker image tags (e.g., `'nginx:latest'`, `'node:22-alpine'`).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(DockerImageTagSchema, 'node:22-alpine');
 * if (result.ok) result.data; // 'node:22-alpine'
 * ```
 */
export const DockerImageTagSchema = v.pipe(
  v.string(),
  v.regex(/^[a-z0-9._/-]+(?::[a-z0-9._-]+)?$/),
  v.brand('DockerImageTag'),
);

/** Inferred output type of {@link DockerImageTagSchema}. A Docker image:tag string. */
export type DockerImageTag = v.InferOutput<typeof DockerImageTagSchema>;

/**
 * Schema for glob patterns (non-empty string).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(GlobPatternSchema, '**\/*.ts');
 * if (result.ok) result.data; // '**\/*.ts'
 * ```
 */
export const GlobPatternSchema = v.pipe(v.string(), v.minLength(1), v.brand('GlobPattern'));

/** Inferred output type of {@link GlobPatternSchema}. A glob pattern string. */
export type GlobPattern = v.InferOutput<typeof GlobPatternSchema>;

/**
 * Schema for regex patterns (must be a valid RegExp).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(RegexPatternSchema, '^[a-z]+$');
 * if (result.ok) result.data; // '^[a-z]+$'
 * ```
 */
export const RegexPatternSchema = v.pipe(
  v.string(),
  v.check((s: Str): Bool => {
    try {
      const _re: RegExp = new RegExp(s);
      return _re !== undefined;
    } catch {
      return false;
    }
  }, 'Must be a valid regex pattern'),
  v.brand('RegexPattern'),
);

/** Inferred output type of {@link RegexPatternSchema}. A valid regex pattern string. */
export type RegexPattern = v.InferOutput<typeof RegexPatternSchema>;

// =============================================================================
// Timestamp Schemas
// =============================================================================

/**
 * Schema for Unix timestamps (seconds since epoch).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(UnixTimestampSchema, 1711296000);
 * if (result.ok) result.data; // 1711296000
 * ```
 */
export const UnixTimestampSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(0),
  v.brand('UnixTimestamp'),
);

/** Inferred output type of {@link UnixTimestampSchema}. */
export type UnixTimestamp = v.InferOutput<typeof UnixTimestampSchema>;

/**
 * Schema for millisecond timestamps (Date.now() format).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(MillisecondTimestampSchema, Date.now());
 * if (result.ok) result.data; // 1711296000000
 * ```
 */
export const MillisecondTimestampSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(0),
  v.brand('MillisecondTimestamp'),
);

/** Inferred output type of {@link MillisecondTimestampSchema}. */
export type MillisecondTimestamp = v.InferOutput<typeof MillisecondTimestampSchema>;

/**
 * Schema for time-only strings (HH:MM or HH:MM:SS).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(TimeOnlySchema, '14:30:00');
 * if (result.ok) result.data; // '14:30:00'
 * ```
 */
export const TimeOnlySchema = v.pipe(
  v.string(),
  v.regex(/^\d{2}:\d{2}(:\d{2})?$/),
  v.brand('TimeOnly'),
);

/** Inferred output type of {@link TimeOnlySchema}. */
export type TimeOnly = v.InferOutput<typeof TimeOnlySchema>;

/**
 * Schema for 4-digit years (1900-2100).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(YearSchema, 2026);
 * if (result.ok) result.data; // 2026
 * ```
 */
export const YearSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(1900),
  v.maxValue(2100),
  v.brand('Year'),
);

/** Inferred output type of {@link YearSchema}. */
export type Year = v.InferOutput<typeof YearSchema>;

// =============================================================================
// URL Variant Schemas
// =============================================================================

/**
 * Schema for HTTPS URLs (must start with https://).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(HttpsUrlSchema, 'https://example.com');
 * if (result.ok) result.data; // 'https://example.com'
 * ```
 */
export const HttpsUrlSchema = v.pipe(
  v.string(),
  v.url(),
  v.startsWith('https://'),
  v.brand('HttpsUrl'),
);

/** Inferred output type of {@link HttpsUrlSchema}. */
export type HttpsUrl = v.InferOutput<typeof HttpsUrlSchema>;

/**
 * Schema for relative URLs (must start with /).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(RelativeUrlSchema, '/api/users');
 * if (result.ok) result.data; // '/api/users'
 * ```
 */
export const RelativeUrlSchema = v.pipe(v.string(), v.startsWith('/'), v.brand('RelativeUrl'));

/** Inferred output type of {@link RelativeUrlSchema}. */
export type RelativeUrl = v.InferOutput<typeof RelativeUrlSchema>;

/**
 * Schema for data: URIs (inline data).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(DataUriSchema, 'data:image/png;base64,iVBOR...');
 * if (result.ok) result.data; // data URI string
 * ```
 */
export const DataUriSchema = v.pipe(v.string(), v.startsWith('data:'), v.brand('DataUri'));

/** Inferred output type of {@link DataUriSchema}. */
export type DataUri = v.InferOutput<typeof DataUriSchema>;

// =============================================================================
// Text Length Variant Schemas
// =============================================================================

/**
 * Schema for titles (1-200 characters, longer than Name).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(TitleSchema, 'Getting Started with WebForge');
 * if (result.ok) result.data;
 * ```
 */
export const TitleSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(200), v.brand('Title'));

/** Inferred output type of {@link TitleSchema}. */
export type Title = v.InferOutput<typeof TitleSchema>;

/**
 * Schema for summaries (max 1000 characters).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(SummarySchema, 'A brief overview of the feature...');
 * if (result.ok) result.data;
 * ```
 */
export const SummarySchema = v.pipe(v.string(), v.maxLength(1000), v.brand('Summary'));

/** Inferred output type of {@link SummarySchema}. */
export type Summary = v.InferOutput<typeof SummarySchema>;

/**
 * Schema for long-form content (max 50000 characters).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(ContentSchema, markdownBody);
 * if (result.ok) result.data;
 * ```
 */
export const ContentSchema = v.pipe(v.string(), v.maxLength(50_000), v.brand('Content'));

/** Inferred output type of {@link ContentSchema}. */
export type Content = v.InferOutput<typeof ContentSchema>;

/**
 * Schema for search queries (1-200 characters).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(SearchQuerySchema, 'valibot schema');
 * if (result.ok) result.data;
 * ```
 */
export const SearchQuerySchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(200),
  v.brand('SearchQuery'),
);

/** Inferred output type of {@link SearchQuerySchema}. */
export type SearchQuery = v.InferOutput<typeof SearchQuerySchema>;

/**
 * Schema for user comments (1-5000 characters).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(CommentSchema, 'Great article!');
 * if (result.ok) result.data;
 * ```
 */
export const CommentSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(5000),
  v.brand('Comment'),
);

/** Inferred output type of {@link CommentSchema}. */
export type Comment = v.InferOutput<typeof CommentSchema>;

// =============================================================================
// SEO Schemas
// =============================================================================

/**
 * Schema for meta titles (1-60 characters, Google truncation limit).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(MetaTitleSchema, 'WebForge - Build Better');
 * if (result.ok) result.data;
 * ```
 */
export const MetaTitleSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(60),
  v.brand('MetaTitle'),
);

/** Inferred output type of {@link MetaTitleSchema}. */
export type MetaTitle = v.InferOutput<typeof MetaTitleSchema>;

/**
 * Schema for meta descriptions (1-160 characters, Google truncation limit).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(MetaDescriptionSchema, 'Build type-safe web apps with WebForge');
 * if (result.ok) result.data;
 * ```
 */
export const MetaDescriptionSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(160),
  v.brand('MetaDescription'),
);

/** Inferred output type of {@link MetaDescriptionSchema}. */
export type MetaDescription = v.InferOutput<typeof MetaDescriptionSchema>;

/**
 * Schema for canonical URLs (absolute HTTPS URL).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(CanonicalUrlSchema, 'https://example.com/page');
 * if (result.ok) result.data;
 * ```
 */
export const CanonicalUrlSchema = v.pipe(
  v.string(),
  v.url(),
  v.startsWith('https://'),
  v.brand('CanonicalUrl'),
);

/** Inferred output type of {@link CanonicalUrlSchema}. */
export type CanonicalUrl = v.InferOutput<typeof CanonicalUrlSchema>;

/** Schema for Open Graph type values. */
export const OpenGraphTypeSchema = v.picklist([
  'website',
  'article',
  'profile',
  'product',
  'video.other',
  'music.song',
]);

/** Inferred output type of {@link OpenGraphTypeSchema}. */
export type OpenGraphType = v.InferOutput<typeof OpenGraphTypeSchema>;

/** Schema for robots meta directives. */
export const RobotsDirectiveSchema = v.picklist([
  'index',
  'noindex',
  'follow',
  'nofollow',
  'none',
  'all',
]);

/** Inferred output type of {@link RobotsDirectiveSchema}. */
export type RobotsDirective = v.InferOutput<typeof RobotsDirectiveSchema>;

// =============================================================================
// Auth & Security Schemas
// =============================================================================

/**
 * Schema for passwords (8-128 characters).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(PasswordSchema, 'MySecureP4ss!');
 * if (result.ok) result.data;
 * ```
 */
export const PasswordSchema = v.pipe(
  v.string(),
  v.minLength(8),
  v.maxLength(128),
  v.brand('Password'),
);

/** Inferred output type of {@link PasswordSchema}. */
export type Password = v.InferOutput<typeof PasswordSchema>;

/**
 * Schema for Bearer token authorization header values.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(BearerTokenSchema, 'Bearer eyJhbGci...');
 * if (result.ok) result.data;
 * ```
 */
export const BearerTokenSchema = v.pipe(
  v.string(),
  v.regex(/^Bearer\s+\S+$/),
  v.brand('BearerToken'),
);

/** Inferred output type of {@link BearerTokenSchema}. */
export type BearerToken = v.InferOutput<typeof BearerTokenSchema>;

/**
 * Schema for MD5 hex hashes (32 characters).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(Md5Schema, 'd41d8cd98f00b204e9800998ecf8427e');
 * if (result.ok) result.data;
 * ```
 */
export const Md5Schema = v.pipe(v.string(), v.length(32), v.regex(/^[0-9a-f]+$/), v.brand('Md5'));

/** Inferred output type of {@link Md5Schema}. */
export type Md5 = v.InferOutput<typeof Md5Schema>;

/**
 * Schema for SHA-512 hex hashes (128 characters).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(Sha512Schema, 'cf83e1357eefb8bd...');
 * if (result.ok) result.data;
 * ```
 */
export const Sha512Schema = v.pipe(
  v.string(),
  v.length(128),
  v.regex(/^[0-9a-f]+$/),
  v.brand('Sha512'),
);

/** Inferred output type of {@link Sha512Schema}. */
export type Sha512 = v.InferOutput<typeof Sha512Schema>;

/**
 * Schema for feature flag names (kebab-case).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(FeatureFlagSchema, 'dark-mode');
 * if (result.ok) result.data;
 * ```
 */
export const FeatureFlagSchema = v.pipe(
  v.string(),
  v.regex(/^[a-z][a-z0-9-]*$/),
  v.brand('FeatureFlag'),
);

/** Inferred output type of {@link FeatureFlagSchema}. */
export type FeatureFlag = v.InferOutput<typeof FeatureFlagSchema>;

// =============================================================================
// Locale Schemas (shared)
// =============================================================================

/**
 * Schema for BCP 47 locale tags (e.g., `'en'`, `'en-US'`, `'zh-Hans-CN'`).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(BCP47TagSchema, 'en-US');
 * if (result.ok) result.data;
 * ```
 */
export const BCP47TagSchema = v.pipe(
  v.string(),
  v.regex(/^[a-z]{2,3}(-[A-Z][a-z]{3})?(-[A-Z]{2})?$/),
  v.brand('BCP47Tag'),
);

/** Inferred output type of {@link BCP47TagSchema}. */
export type BCP47Tag = v.InferOutput<typeof BCP47TagSchema>;

/**
 * Schema for translation keys (dot-separated, e.g., `'app.header.title'`).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(TranslationKeySchema, 'app.header.title');
 * if (result.ok) result.data;
 * ```
 */
export const TranslationKeySchema = v.pipe(
  v.string(),
  v.regex(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/),
  v.brand('TranslationKey'),
);

/** Inferred output type of {@link TranslationKeySchema}. */
export type TranslationKey = v.InferOutput<typeof TranslationKeySchema>;

/** Schema for CLDR plural categories. */
export const PluralCategorySchema = v.picklist(['zero', 'one', 'two', 'few', 'many', 'other']);

/** Inferred output type of {@link PluralCategorySchema}. */
export type PluralCategory = v.InferOutput<typeof PluralCategorySchema>;

// =============================================================================
// Error & Logging Schemas
// =============================================================================

/**
 * Schema for structured error codes (DOMAIN.CODE format).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(ErrorCodeSchema, 'IO.READ_FAILED');
 * if (result.ok) result.data;
 * ```
 */
export const ErrorCodeSchema = v.pipe(
  v.string(),
  v.regex(/^[A-Z][A-Z_]*\.[A-Z][A-Z_]*$/),
  v.brand('ErrorCode'),
);

/** Inferred output type of {@link ErrorCodeSchema}. */
export type ErrorCode = v.InferOutput<typeof ErrorCodeSchema>;

/**
 * Schema for correlation/trace IDs (UUID format for request tracing).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(CorrelationIdSchema, '550e8400-e29b-41d4-a716-446655440000');
 * if (result.ok) result.data;
 * ```
 */
export const CorrelationIdSchema = v.pipe(v.string(), v.uuid(), v.brand('CorrelationId'));

/** Inferred output type of {@link CorrelationIdSchema}. */
export type CorrelationId = v.InferOutput<typeof CorrelationIdSchema>;

/**
 * Schema for log messages (1-5000 characters).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(LogMessageSchema, 'User login successful');
 * if (result.ok) result.data;
 * ```
 */
export const LogMessageSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(5000),
  v.brand('LogMessage'),
);

/** Inferred output type of {@link LogMessageSchema}. */
export type LogMessage = v.InferOutput<typeof LogMessageSchema>;

// =============================================================================
// File System Schemas (extended)
// =============================================================================

/**
 * Schema for file extensions (e.g., `'.ts'`, `'.json'`).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(FileExtensionSchema, '.ts');
 * if (result.ok) result.data;
 * ```
 */
export const FileExtensionSchema = v.pipe(
  v.string(),
  v.regex(/^\.[a-z0-9]+$/),
  v.brand('FileExtension'),
);

/** Inferred output type of {@link FileExtensionSchema}. */
export type FileExtension = v.InferOutput<typeof FileExtensionSchema>;

/**
 * Schema for absolute file paths (must start with /).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(AbsolutePathSchema, '/usr/local/bin/node');
 * if (result.ok) result.data;
 * ```
 */
export const AbsolutePathSchema = v.pipe(v.string(), v.startsWith('/'), v.brand('AbsolutePath'));

/** Inferred output type of {@link AbsolutePathSchema}. */
export type AbsolutePath = v.InferOutput<typeof AbsolutePathSchema>;

/**
 * Schema for relative file paths (must not start with /).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(RelativePathSchema, 'src/index.ts');
 * if (result.ok) result.data;
 * ```
 */
export const RelativePathSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.check((s: Str): Bool => !s.startsWith('/'), 'Must be a relative path (no leading /)'),
  v.brand('RelativePath'),
);

/** Inferred output type of {@link RelativePathSchema}. */
export type RelativePath = v.InferOutput<typeof RelativePathSchema>;

// =============================================================================
// CSS Schemas (extended)
// =============================================================================

/**
 * Schema for CSS length values (e.g., `'16px'`, `'1.5rem'`, `'100%'`).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(CssLengthSchema, '16px');
 * if (result.ok) result.data;
 * ```
 */
export const CssLengthSchema = v.pipe(
  v.string(),
  v.regex(/^-?\d+(\.\d+)?(px|rem|em|%|vh|vw|dvh|dvw|ch|ex)$/),
  v.brand('CssLength'),
);

/** Inferred output type of {@link CssLengthSchema}. */
export type CssLength = v.InferOutput<typeof CssLengthSchema>;

/**
 * Schema for CSS class lists (space-separated class names).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(CssClassListSchema, 'btn btn-primary');
 * if (result.ok) result.data;
 * ```
 */
export const CssClassListSchema = v.pipe(
  v.string(),
  v.regex(/^[a-zA-Z_-][\w-]*(\s+[a-zA-Z_-][\w-]*)*$/),
  v.brand('CssClassList'),
);

/** Inferred output type of {@link CssClassListSchema}. */
export type CssClassList = v.InferOutput<typeof CssClassListSchema>;

/**
 * Schema for HSL color values (e.g., `'hsl(210, 50%, 80%)'`).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(HslColorSchema, 'hsl(210, 50%, 80%)');
 * if (result.ok) result.data;
 * ```
 */
export const HslColorSchema = v.pipe(
  v.string(),
  v.regex(/^hsl\(\d{1,3},\s*\d{1,3}%,\s*\d{1,3}%\)$/),
  v.brand('HslColor'),
);

/** Inferred output type of {@link HslColorSchema}. */
export type HslColor = v.InferOutput<typeof HslColorSchema>;

// =============================================================================
// Network & Environment Schemas
// =============================================================================

/**
 * Schema for TCP/UDP port number (1–65535).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(PortSchema, 3000);
 * if (result.ok) result.data; // 3000
 * ```
 */
export const PortSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(1, 'Port must be at least 1'),
  v.maxValue(65_535, 'Port must be at most 65535'),
  v.brand('Port'),
);

/** Inferred output type of {@link PortSchema}. A valid TCP/UDP port (1–65535). */
export type Port = v.InferOutput<typeof PortSchema>;

/**
 * Schema for an array of IPv4 address strings.
 *
 * Only validates IPv4 (not IPv6). Used by `getLocalIpAddresses()`
 * which filters for `iface.family === 'IPv4'`.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(Ipv4AddressArraySchema, ['192.168.1.42', '10.0.0.5']);
 * if (result.ok) result.data; // ['192.168.1.42', '10.0.0.5']
 * ```
 */
export const Ipv4Schema = v.pipe(v.string(), v.ipv4());

/** Inferred output type of {@link Ipv4Schema}. A single IPv4 address string. */
export type Ipv4 = v.InferOutput<typeof Ipv4Schema>;

/** Schema for an array of IPv4 addresses. See {@link Ipv4Schema}. */
export const Ipv4AddressArraySchema = v.array(Ipv4Schema);

/** Inferred output type of {@link Ipv4AddressArraySchema}. An array of IPv4 address strings. */
export type Ipv4AddressArray = v.InferOutput<typeof Ipv4AddressArraySchema>;

/**
 * Schema for a non-empty hostname string (max 253 characters per RFC 1035).
 *
 * No strict format regex because `os.hostname()` can return
 * platform-specific formats (underscored Windows names, `.local` macOS suffixes).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(HostnameSchema, 'my-machine.local');
 * if (result.ok) result.data; // 'my-machine.local'
 * ```
 */
export const HostnameSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(253, 'Hostname must not exceed 253 characters (RFC 1035)'),
  v.brand('Hostname'),
);

/** Inferred output type of {@link HostnameSchema}. A non-empty hostname string (max 253 chars). */
export type Hostname = v.InferOutput<typeof HostnameSchema>;

/**
 * Schema for environment names.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(EnvironmentSchema, 'production');
 * if (result.ok) result.data; // 'production'
 * ```
 */
export const EnvironmentSchema = v.picklist(['development', 'staging', 'production']);

/** Inferred output type of {@link EnvironmentSchema}. One of `'development'` | `'staging'` | `'production'`. */
export type Environment = v.InferOutput<typeof EnvironmentSchema>;

// =============================================================================
// Semantic Version Schema
// =============================================================================

/**
 * Semantic version regex pattern.
 * Matches: MAJOR.MINOR.PATCH with optional pre-release and build metadata.
 */
const SEMVER_REGEX: RegExp =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/**
 * Schema for semantic version strings (e.g., "1.0.0", "2.1.3-beta.1").
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(SemverSchema, '1.0.0');
 * if (result.ok) result.data; // '1.0.0'
 * ```
 */
export const SemverSchema = v.pipe(
  v.string(),
  v.regex(SEMVER_REGEX, 'Must be a valid semantic version (e.g., "1.0.0", "2.1.3-beta.1")'),
  v.brand('Semver'),
);

/** Inferred output type of {@link SemverSchema}. A semantic version string (e.g., `"1.0.0"`). */
export type Semver = v.InferOutput<typeof SemverSchema>;

// =============================================================================
// Kebab Case ID Schema
// =============================================================================

/**
 * Kebab-case identifier regex pattern.
 * Matches: lowercase letters and numbers separated by hyphens.
 */
const KEBAB_CASE_REGEX: RegExp = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/**
 * Schema for kebab-case identifiers (e.g., "my-tool", "format-cli").
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(KebabCaseIdSchema, 'my-tool');
 * if (result.ok) result.data; // 'my-tool'
 * ```
 */
export const KebabCaseIdSchema = v.pipe(
  v.string(),
  v.regex(KEBAB_CASE_REGEX, 'Must be kebab-case (e.g., "my-tool", "format-cli")'),
  v.brand('KebabCaseId'),
);

/** Inferred output type of {@link KebabCaseIdSchema}. A kebab-case identifier string. */
export type KebabCaseId = v.InferOutput<typeof KebabCaseIdSchema>;

// =============================================================================
// Name Schema (general-purpose display name)
// =============================================================================

/**
 * Schema for general-purpose display names (1-100 characters, non-empty).
 *
 * Use for human-readable labels like app names, plugin names, or component names.
 * For kebab-case identifiers, use {@link KebabCaseIdSchema} or {@link ProductNameSchema}.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(NameSchema, 'My Application');
 * if (result.ok) result.data; // 'My Application'
 * ```
 */
export const NameSchema = v.pipe(
  v.string(),
  v.minLength(1, 'Name must not be empty'),
  v.maxLength(100, 'Name must not exceed 100 characters'),
  v.brand('Name'),
);

/** Inferred output type of {@link NameSchema}. A non-empty display name (1-100 chars). */
export type Name = v.InferOutput<typeof NameSchema>;

// =============================================================================
// CSS Font Family Schema
// =============================================================================

/**
 * Schema for CSS font-family stack strings (e.g. `"'Inter', sans-serif"`).
 *
 * Validates non-empty strings containing valid CSS font-family characters:
 * letters, digits, spaces, commas, quotes, hyphens, and parentheses.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(CssFontFamilySchema, "'Inter', sans-serif");
 * if (result.ok) result.data; // "'Inter', sans-serif"
 * ```
 */
export const CssFontFamilySchema = v.pipe(
  v.string(),
  v.minLength(1, 'Font family must not be empty'),
  v.regex(/^[\w\s,'"()-]+$/, 'Font family contains invalid characters'),
  v.brand('CssFontFamily'),
);

/** Inferred output type of {@link CssFontFamilySchema}. A CSS font-family stack string. */
export type CssFontFamily = v.InferOutput<typeof CssFontFamilySchema>;

// =============================================================================
// Product Name Schema
// =============================================================================

/**
 * Schema for product names (kebab-case, e.g., `"my-product"`).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(ProductNameSchema, 'my-product');
 * if (result.ok) result.data; // 'my-product'
 * ```
 */
export const ProductNameSchema = v.pipe(
  v.string(),
  v.regex(
    KEBAB_CASE_REGEX,
    'Product name must be lowercase alphanumeric with hyphens (e.g., "my-product")',
  ),
  v.brand('ProductName'),
);

/** Inferred output type of {@link ProductNameSchema}. A kebab-case product name. */
export type ProductName = v.InferOutput<typeof ProductNameSchema>;

/**
 * Schema for an array of product names.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(ProductNameArraySchema, ['my-product', 'another-product']);
 * if (result.ok) result.data; // ['my-product', 'another-product']
 * ```
 */
export const ProductNameArraySchema = v.array(ProductNameSchema);

/** Inferred output type of {@link ProductNameArraySchema}. An array of kebab-case product names. */
export type ProductNameArray = v.InferOutput<typeof ProductNameArraySchema>;

// =============================================================================
// Identifier Schemas
// =============================================================================

/**
 * Schema for camelCase string identifiers (e.g., `'dryRun'`, `'logLevel'`).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(CamelCaseStringSchema, 'dryRun');
 * if (result.ok) result.data; // 'dryRun'
 * ```
 */
export const CamelCaseStringSchema = v.pipe(
  v.string(),
  v.regex(/^[a-z][a-zA-Z0-9]*$/, 'Must be camelCase (e.g., "dryRun", "logLevel")'),
  v.brand('CamelCaseString'),
);

/** Inferred output type of {@link CamelCaseStringSchema}. A camelCase identifier string. */
export type CamelCaseString = v.InferOutput<typeof CamelCaseStringSchema>;

// =============================================================================
// Process Schemas
// =============================================================================

/**
 * Schema for a process exit code (0–255).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(ExitCodeSchema, 0);
 * if (result.ok) result.data; // 0
 * ```
 */
export const ExitCodeSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(0),
  v.maxValue(255),
  v.brand('ExitCode'),
);

/** Inferred output type of {@link ExitCodeSchema}. An integer 0–255. */
export type ExitCode = v.InferOutput<typeof ExitCodeSchema>;

/**
 * Default process exit code: `0` (success).
 *
 * @example
 * ```typescript
 * const code: ExitCode = DEFAULT_EXIT_CODE; // 0
 * ```
 */
export const DEFAULT_EXIT_CODE: ExitCode = ((): ExitCode => {
  const r: v.SafeParseResult<typeof ExitCodeSchema> = v.safeParse(ExitCodeSchema, 0);

  if (!r.success) {
    throw new Error('BUG: DEFAULT_EXIT_CODE schema validation failed');
  }
  return r.output;
})();

/**
 * Failure exit code: `1` (general error).
 *
 * @example
 * ```typescript
 * const code: ExitCode = FAILURE_EXIT_CODE; // 1
 * ```
 */
export const FAILURE_EXIT_CODE: ExitCode = ((): ExitCode => {
  const r: v.SafeParseResult<typeof ExitCodeSchema> = v.safeParse(ExitCodeSchema, 1);

  if (!r.success) {
    throw new Error('BUG: FAILURE_EXIT_CODE schema validation failed');
  }
  return r.output;
})();

/**
 * Schema for an optional process exit code (0–255 or `undefined`).
 * Use for function parameters with defaults (e.g., `exit(code?: OptionalExitCode)`).
 *
 * @example
 * ```typescript
 * const code: OptionalExitCode = undefined; // will default
 * ```
 */
export const OptionalExitCodeSchema = v.optional(ExitCodeSchema);

/** Inferred output type of {@link OptionalExitCodeSchema}. An integer 0–255 or `undefined`. */
export type OptionalExitCode = v.InferOutput<typeof OptionalExitCodeSchema>;

/**
 * Schema for a non-empty message string.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(MessageSchema, 'Something went wrong');
 * if (result.ok) result.data; // 'Something went wrong'
 * ```
 */
export const MessageSchema = v.pipe(v.string(), v.minLength(1), v.brand('Message'));

/** Inferred output type of {@link MessageSchema}. A non-empty string. */
export type Message = v.InferOutput<typeof MessageSchema>;

/**
 * Schema for `fatalExit` options.
 *
 * @example
 * ```typescript
 * const opts: FatalExitOptions = {
 *   message: 'Config file not found',
 *   exitCode: 1,
 *   details: 'Expected resist.config.ts at workspace root',
 * };
 * ```
 */
export const FatalExitOptionsSchema = v.strictObject({
  /** Error message to display (non-empty). */
  message: MessageSchema,
  /** Exit code (0–255). Defaults to `1`. */
  exitCode: v.optional(ExitCodeSchema, FAILURE_EXIT_CODE),
  /** Original error (for stack trace in debug mode). */
  error: v.optional(v.unknown()),
  /** Additional details to display. */
  details: v.optional(v.string()),
});

/**
 * Options for `fatalExit`. See {@link FatalExitOptionsSchema}.
 *
 * @example
 * ```typescript
 * const opts: FatalExitOptions = { message: 'Failed', exitCode: 1 };
 * ```
 */
export type FatalExitOptions = v.InferOutput<typeof FatalExitOptionsSchema>;

/**
 * Schema for Node.js platform identifiers.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(PlatformSchema, 'darwin');
 * if (result.ok) result.data; // 'darwin'
 * ```
 */
export const PlatformSchema = v.picklist([
  'aix',
  'darwin',
  'freebsd',
  'linux',
  'openbsd',
  'sunos',
  'win32',
]);

/** Inferred output type of {@link PlatformSchema}. A Node.js platform string. */
export type Platform = v.InferOutput<typeof PlatformSchema>;

/**
 * Default platform: `'linux'`.
 *
 * Safe fallback for cross-platform guards when `process.platform` is unavailable
 * (e.g., browser, Cloudflare Workers).
 *
 * @example
 * ```typescript
 * const platform: Platform = DEFAULT_PLATFORM; // 'linux'
 * ```
 */
export const DEFAULT_PLATFORM: Platform = 'linux';

// =============================================================================
// Log Level Schema
// =============================================================================

/**
 * Schema for log level options.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(LogLevelSchema, 'info');
 * if (result.ok) result.data; // 'info'
 * ```
 */
export const LogLevelSchema = v.picklist([
  'silent', // No internal logs
  'error', // Errors only
  'warn', // Warnings and errors
  'info', // Info, warnings, and errors
  'debug', // Debug output
  'trace', // Fine-grained diagnostic output (most verbose)
]);

/** Inferred output type of {@link LogLevelSchema}. One of `'silent'` | `'error'` | `'warn'` | `'info'` | `'debug'` | `'trace'`. */
export type LogLevel = v.InferOutput<typeof LogLevelSchema>;

/**
 * Default log level: `'info'`.
 *
 * @example
 * ```typescript
 * const level: LogLevel = DEFAULT_LOG_LEVEL; // 'info'
 * ```
 */
export const DEFAULT_LOG_LEVEL: LogLevel = 'info';

// =============================================================================
// Output Format
// =============================================================================

/**
 * Schema for output format options.
 *
 * - `'pretty'` — Human-readable with colors (default)
 * - `'compact'` — One line per file
 * - `'json'` — JSON to stdout
 * - `'github'` — GitHub Actions annotations
 * - `'junit'` — JUnit XML for CI
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(OutputFormatSchema, 'pretty');
 * if (result.ok) result.data; // 'pretty'
 * ```
 */
export const OutputFormatSchema = v.picklist(['pretty', 'compact', 'json', 'github', 'junit']);

/** Inferred output type of {@link OutputFormatSchema}. */
export type OutputFormat = v.InferOutput<typeof OutputFormatSchema>;

/** Default output format: `'pretty'`. */
export const DEFAULT_OUTPUT_FORMAT: OutputFormat = 'pretty';

// =============================================================================
// Style
// =============================================================================

/**
 * Schema for ANSI style names.
 *
 * **Text decoration:** bold, dim, italic, underline, inverse, strikethrough.
 * **Foreground colors:** red, green, yellow, blue, cyan, magenta, white, gray.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(StyleNameSchema, 'bold');
 * if (result.ok) result.data; // 'bold'
 * ```
 */
export const StyleNameSchema = v.picklist([
  // Text decoration
  'bold',
  'dim',
  'italic',
  'underline',
  'inverse',
  'strikethrough',
  // Foreground colors
  'red',
  'green',
  'yellow',
  'blue',
  'cyan',
  'magenta',
  'white',
  'gray',
]);

/** Inferred output type of {@link StyleNameSchema}. */
export type StyleName = v.InferOutput<typeof StyleNameSchema>;

// =============================================================================
// Symbol Name
// =============================================================================

/**
 * Schema for symbol names used in `{symbol:name}` markup.
 *
 * Each name maps to a key in the `symbols` object in `terminal.ts`.
 * Used for inline symbol references: `{symbol:success}` renders `✔`.
 *
 * **Status:** success, error, warning, info.
 * **Navigation:** arrow, arrowDown, arrowUp, arrowLeft, arrowRight.
 * **Punctuation:** bullet, dot, ellipsis, dash, star, plus, minus, pipe.
 * **Checkbox/Toggle:** check, cross, checkDouble, radioOn, radioOff, toggleOn, toggleOff.
 * **Box drawing:** boxTopLeft, boxTopRight, boxBottomLeft, boxBottomRight, boxVertical, boxHorizontal, boxVerticalRight, boxVerticalLeft.
 * **Progress:** progressFilled, progressEmpty.
 * **Tree:** tree, treeLast.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(SymbolNameSchema, 'success');
 * if (result.ok) result.data; // 'success'
 * ```
 */
export const SymbolNameSchema = v.picklist([
  // Status
  'success',
  'error',
  'warning',
  'info',
  // Navigation
  'bullet',
  'dot',
  'arrow',
  'arrowDown',
  'arrowUp',
  'arrowLeft',
  'arrowRight',
  // Punctuation
  'ellipsis',
  'dash',
  'star',
  'plus',
  'minus',
  'pipe',
  // Checkbox/Toggle
  'check',
  'cross',
  'checkDouble',
  'radioOn',
  'radioOff',
  'toggleOn',
  'toggleOff',
  // Box drawing
  'boxTopLeft',
  'boxTopRight',
  'boxBottomLeft',
  'boxBottomRight',
  'boxVertical',
  'boxHorizontal',
  'boxVerticalRight',
  'boxVerticalLeft',
  // Progress
  'progressFilled',
  'progressEmpty',
  // Tree
  'tree',
  'treeLast',
]);

/** Inferred output type of {@link SymbolNameSchema}. */
export type SymbolName = v.InferOutput<typeof SymbolNameSchema>;

// =============================================================================
// Print Stream
// =============================================================================

/**
 * Schema for output stream target.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(PrintStreamSchema, 'stderr');
 * if (result.ok) result.data; // 'stderr'
 * ```
 */
export const PrintStreamSchema = v.picklist(['stdout', 'stderr']);

/** Inferred output type of {@link PrintStreamSchema}. */
export type PrintStream = v.InferOutput<typeof PrintStreamSchema>;

/**
 * Default print stream: `'stdout'`.
 *
 * @example
 * ```typescript
 * const stream: PrintStream = DEFAULT_PRINT_STREAM; // 'stdout'
 * ```
 */
export const DEFAULT_PRINT_STREAM: PrintStream = 'stdout';

// =============================================================================
// Print Options
// =============================================================================

/**
 * Schema for `log.print` options.
 *
 * @param level - Log level filter (default: `'info'`). Only prints when current log level allows.
 * @param stream - Output stream target (default: `'stdout'`).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(PrintOptionsSchema, { level: 'warn', stream: 'stderr' });
 * if (result.ok) result.data; // { level: 'warn', stream: 'stderr' }
 * ```
 */
export const PrintOptionsSchema = v.strictObject({
  /** Log level filter (default: `'info'`). */
  level: v.optional(LogLevelSchema, DEFAULT_LOG_LEVEL),
  /** Output stream target (default: `'stdout'`). */
  stream: v.optional(PrintStreamSchema, DEFAULT_PRINT_STREAM),
});

/** Inferred output type of {@link PrintOptionsSchema}. */
export type PrintOptions = v.InferOutput<typeof PrintOptionsSchema>;

// =============================================================================
// Shell & Command Schemas
// =============================================================================

/**
 * Non-empty string for shell commands.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(CommandSchema, 'ls -la');
 * if (result.ok) result.data; // 'ls -la'
 * ```
 */
export const CommandSchema = v.pipe(v.string(), v.minLength(1), v.brand('Command'));

/** Inferred output type of {@link CommandSchema}. A non-empty command string. */
export type Command = v.InferOutput<typeof CommandSchema>;

/**
 * stdio option for child processes.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(StdioOptionSchema, 'pipe');
 * if (result.ok) result.data; // 'pipe'
 * ```
 */
export const StdioOptionSchema = v.picklist(['inherit', 'pipe', 'ignore']);

/** Inferred output type of {@link StdioOptionSchema}. One of `'inherit'` | `'pipe'` | `'ignore'`. */
export type StdioOption = v.InferOutput<typeof StdioOptionSchema>;

/**
 * Default stdio option: `'inherit'`.
 *
 * Used as the default for `runCommand` and `runPmCommand` stdio parameters.
 *
 * @example
 * ```typescript
 * const stdio: StdioOption = DEFAULT_STDIO_OPTION; // 'inherit'
 * ```
 */
export const DEFAULT_STDIO_OPTION: StdioOption = 'inherit';

/**
 * Options for `spawnProcess`. Cross-environment compatible.
 *
 * Models the commonly-used subset of Node.js `SpawnOptions` as a proper
 * Valibot schema, plus an `inherit` convenience flag.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(SpawnProcessOptionsSchema, { inherit: true, cwd: '/app' });
 * if (result.ok) result.data; // { inherit: true, cwd: '/app' }
 * ```
 */
export const SpawnProcessOptionsSchema = v.strictObject({
  /** Working directory for the spawned process. */
  cwd: v.optional(v.union([PathSchema, v.pipe(v.string(), v.url())])),
  /** Environment variables. */
  env: v.optional(v.record(v.string(), v.optional(v.string()))),
  /** Whether to run in a shell. */
  shell: v.optional(v.union([BoolSchema, StrSchema])),
  /** Stdio configuration. */
  stdio: v.optional(StdioOptionSchema),
  /** Timeout in milliseconds. */
  timeout: v.optional(NonNegativeIntegerSchema),
  /** Whether to inherit stdio from parent process (convenience flag, default: `true`). */
  inherit: v.optional(BoolSchema, true),
});

/** Inferred output type of {@link SpawnProcessOptionsSchema}. */
export type SpawnProcessOptions = v.InferOutput<typeof SpawnProcessOptionsSchema>;

/**
 * Result of `ensureCommand` — command available or not found with install hint.
 *
 * @example
 * ```typescript
 * const found: EnsureCommandResult = { status: 'available' };
 * const missing: EnsureCommandResult = {
 *   status: 'not_found',
 *   command: 'biome',
 *   installHint: 'pnpm add -g @biomejs/biome',
 * };
 * ```
 */
export const EnsureCommandResultSchema = v.variant('status', [
  v.strictObject({
    /** Command is available on the system PATH. */
    status: v.literal('available'),
  }),
  v.strictObject({
    /** Command was not found on the system PATH. */
    status: v.literal('not_found'),
    /** The command that was not found. */
    command: CommandSchema,
    /** Suggested command to install the missing tool. */
    installHint: v.pipe(v.string(), v.minLength(1), v.maxLength(500)),
  }),
]);

/**
 * Result of `ensureCommand`. See {@link EnsureCommandResultSchema}.
 *
 * @example
 * ```typescript
 * const result: EnsureCommandResult = { status: 'available' };
 * ```
 */
export type EnsureCommandResult = v.InferOutput<typeof EnsureCommandResultSchema>;

/**
 * Result of `ensureMise` — workspace-local mise installation status.
 *
 * @example
 * ```typescript
 * const result: EnsureMiseResult = { status: 'already_installed' };
 * ```
 */
export const EnsureMiseResultSchema = v.variant('status', [
  v.strictObject({
    /** Workspace-local mise already exists at correct version. */
    status: v.literal('already_installed'),
  }),
  v.strictObject({
    /** Workspace-local mise was freshly installed to correct version. */
    status: v.literal('installed'),
  }),
  v.strictObject({
    /** mise installation failed. */
    status: v.literal('install_failed'),
  }),
  v.strictObject({
    /** Installation skipped due to dry-run mode. */
    status: v.literal('skipped_dry_run'),
  }),
  v.strictObject({
    /** Workspace-local mise exists but at wrong version — updated. */
    status: v.literal('updated'),
  }),
]);

/**
 * Result of `ensureMise`. See {@link EnsureMiseResultSchema}.
 *
 * @example
 * ```typescript
 * const result: EnsureMiseResult = { status: 'already_installed' };
 * ```
 */
export type EnsureMiseResult = v.InferOutput<typeof EnsureMiseResultSchema>;

// =============================================================================
// Workspace Root Schema
// =============================================================================

/**
 * Schema for workspace root enforcement result.
 *
 * @example
 * ```typescript
 * const found: EnsureWorkspaceRootResult = { status: 'ok', root: '/app' };
 * const wrong: EnsureWorkspaceRootResult = {
 *   status: 'not_at_root',
 *   root: '/app',
 *   cwd: '/app/packages/shared',
 * };
 * ```
 */
export const EnsureWorkspaceRootResultSchema = v.variant('status', [
  v.strictObject({
    /** CWD is the workspace root. */
    status: v.literal('ok'),
    /** Absolute path to the workspace root. */
    root: PathSchema,
  }),
  v.strictObject({
    /** No workspace root was found in parent directories. */
    status: v.literal('not_found'),
  }),
  v.strictObject({
    /** Workspace root found but CWD is not at root. */
    status: v.literal('not_at_root'),
    /** Absolute path to the workspace root. */
    root: PathSchema,
    /** Current working directory. */
    cwd: PathSchema,
  }),
]);

/**
 * Result of `ensureWorkspaceRoot`. See {@link EnsureWorkspaceRootResultSchema}.
 *
 * @example
 * ```typescript
 * const result: EnsureWorkspaceRootResult = { status: 'ok', root: '/app' };
 * ```
 */
export type EnsureWorkspaceRootResult = v.InferOutput<typeof EnsureWorkspaceRootResultSchema>;

// =============================================================================
// Color Level
// =============================================================================

/**
 * Schema for terminal color support level.
 *
 * - `0` — No color support
 * - `1` — Basic 16 colors (ANSI)
 * - `2` — 256 colors (xterm-256color)
 * - `3` — Truecolor / 16 million colors (24-bit RGB)
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(ColorLevelSchema, 3);
 * if (result.ok) result.data; // 3
 * ```
 */
export const ColorLevelSchema = v.picklist([0, 1, 2, 3]);

/** Inferred output type of {@link ColorLevelSchema}. Terminal color support level (0–3). */
export type ColorLevel = v.InferOutput<typeof ColorLevelSchema>;

// =============================================================================
// Node Major Version
// =============================================================================

/**
 * Schema for Node.js major version number (non-negative integer).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(NodeMajorVersionSchema, 20);
 * if (result.ok) result.data; // 20
 * ```
 */
export const NodeMajorVersionSchema = v.pipe(v.number(), v.integer(), v.minValue(0));

// =============================================================================
// Provider Detection
// =============================================================================

/**
 * Schema for detected CI/hosting provider identifiers.
 *
 * Machine-readable constants for ~71 known providers, covering all vendors
 * from std-env (unjs) and ci-info (watson).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(ProviderKindSchema, 'github_actions');
 * if (result.ok) result.data; // 'github_actions'
 * ```
 */
export const ProviderKindSchema = v.picklist([
  // CI Providers
  'agola',
  'alpic',
  'appcircle',
  'appveyor',
  'aws_codebuild',
  'azure_pipelines',
  'bamboo',
  'bitbucket',
  'bitrise',
  'buddy',
  'buildkite',
  'circleci',
  'cirrus',
  'cloudflare_pages',
  'cloudflare_workers',
  'codemagic',
  'codefresh',
  'codeship',
  'drone',
  'dsari',
  'earthly',
  'eas',
  'gerrit',
  'gitea_actions',
  'github_actions',
  'gitlab',
  'gocd',
  'google_cloud_build',
  'harness',
  'heroku',
  'hudson',
  'jenkins',
  'layerci',
  'magnum',
  'netlify',
  'nevercode',
  'prow',
  'releasehub',
  'render',
  'sail',
  'screwdriver',
  'semaphore',
  'shippable',
  'solano',
  'sourcehut',
  'strider',
  'taskcluster',
  'teamcity',
  'travis',
  'vela',
  'vercel',
  'appcenter',
  'woodpecker',
  'xcode_cloud',
  'xcode_server',
  // Cloud/Hosting
  'aws_amplify',
  'aws_lambda',
  'azure_static',
  'deno_deploy',
  'firebase_app_hosting',
  'fly_io',
  'google_cloudrun',
  'google_cloudrun_job',
  'railway',
  'codesandbox',
  'stackblitz',
  'gitpod',
  'zeabur',
  'codesphere',
  'cleavr',
  'stormkit',
]);

/** Inferred output type of {@link ProviderKindSchema}. CI/hosting provider identifier. */
export type ProviderKind = v.InferOutput<typeof ProviderKindSchema>;

/**
 * Schema for environment variable check used in provider/agent detection.
 *
 * @example
 * ```typescript
 * const check: ProviderEnvCheck = { key: 'GITHUB_ACTIONS' };
 * const valueCheck: ProviderEnvCheck = { key: 'CI_NAME', value: 'codeship' };
 * const includesCheck: ProviderEnvCheck = { key: 'PATH', includes: '.pi/agent' };
 * ```
 */
export const ProviderEnvCheckSchema = v.strictObject({
  /** Environment variable key. */
  key: StrSchema,
  /** If set, env[key] must equal this value (not just exist). */
  value: v.optional(StrSchema),
  /** If set, env[key] must contain this substring (for PATH/EDITOR checks). */
  includes: v.optional(StrSchema),
});

/** Inferred output type of {@link ProviderEnvCheckSchema}. */
export type ProviderEnvCheck = v.InferOutput<typeof ProviderEnvCheckSchema>;

/**
 * Schema for PR detection check for a CI provider.
 *
 * @example
 * ```typescript
 * const prCheck: ProviderPRCheck = {
 *   key: 'GITHUB_EVENT_NAME',
 *   matchValues: ['pull_request', 'pull_request_target'],
 * };
 * ```
 */
export const ProviderPRCheckSchema = v.strictObject({
  /** Environment variable key to check for PR. */
  key: StrSchema,
  /** If set, env[key] must be one of these values to indicate a PR. */
  matchValues: v.optional(v.array(StrSchema)),
  /** If set, env[key] must NOT be one of these values (e.g., `'false'` for Travis). */
  excludeValues: v.optional(v.array(StrSchema)),
});

/** Inferred output type of {@link ProviderPRCheckSchema}. */
export type ProviderPRCheck = v.InferOutput<typeof ProviderPRCheckSchema>;

/**
 * Schema for detected CI/hosting provider information.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(ProviderInfoSchema, {
 *   name: 'GitHub Actions',
 *   id: 'github_actions',
 *   isCI: true,
 *   isPR: true,
 * });
 * if (result.ok) result.data.id; // 'github_actions'
 * ```
 */
export const ProviderInfoSchema = v.strictObject({
  /** Human-readable provider name (e.g., `'GitHub Actions'`). */
  name: StrSchema,
  /** Machine-readable provider ID. */
  id: ProviderKindSchema,
  /** Whether this provider is a CI environment. */
  isCI: BoolSchema,
  /** Whether running in a PR/MR build. `null` if detection unavailable for this provider. */
  isPR: v.nullable(BoolSchema),
});

/** Inferred output type of {@link ProviderInfoSchema}. Detected provider information. */
export type ProviderInfo = v.InferOutput<typeof ProviderInfoSchema>;

/**
 * Schema for a provider definition entry in the detection table.
 *
 * @example
 * ```typescript
 * const provider: ProviderDefinition = {
 *   name: 'GitHub Actions',
 *   id: 'github_actions',
 *   isCI: true,
 *   checks: [{ key: 'GITHUB_ACTIONS' }],
 *   pr: { key: 'GITHUB_EVENT_NAME', matchValues: ['pull_request', 'pull_request_target'] },
 * };
 * ```
 */
export const ProviderDefinitionSchema = v.strictObject({
  /** Human-readable provider name. */
  name: StrSchema,
  /** Machine-readable provider ID. */
  id: ProviderKindSchema,
  /** Whether this provider is a CI environment. */
  isCI: BoolSchema,
  /** ALL checks must pass for this provider to match. */
  checks: v.array(ProviderEnvCheckSchema),
  /** Optional PR/MR detection. */
  pr: v.optional(ProviderPRCheckSchema),
});

/** Inferred output type of {@link ProviderDefinitionSchema}. */
export type ProviderDefinition = v.InferOutput<typeof ProviderDefinitionSchema>;

// =============================================================================
// Agent Detection
// =============================================================================

/**
 * Schema for detected AI coding agent identifiers.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(AgentKindSchema, 'claude');
 * if (result.ok) result.data; // 'claude'
 * ```
 */
export const AgentKindSchema = v.picklist([
  'claude',
  'cursor',
  'codex',
  'devin',
  'gemini',
  'goose',
  'replit',
  'opencode',
  'pi',
  'auggie',
  'kiro',
]);

/** Inferred output type of {@link AgentKindSchema}. AI coding agent identifier. */
export type AgentKind = v.InferOutput<typeof AgentKindSchema>;

/**
 * Schema for detected AI coding agent information.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(AgentInfoSchema, { name: 'Claude Code', id: 'claude' });
 * if (result.ok) result.data.id; // 'claude'
 * ```
 */
export const AgentInfoSchema = v.strictObject({
  /** Human-readable agent name (e.g., `'Claude Code'`). */
  name: StrSchema,
  /** Machine-readable agent ID. */
  id: AgentKindSchema,
});

/** Inferred output type of {@link AgentInfoSchema}. Detected AI agent information. */
export type AgentInfo = v.InferOutput<typeof AgentInfoSchema>;

/**
 * Schema for an AI agent definition entry in the detection table.
 *
 * @example
 * ```typescript
 * const agent: AgentDefinition = {
 *   name: 'Claude Code',
 *   id: 'claude',
 *   checks: [{ key: 'CLAUDECODE' }, { key: 'CLAUDE_CODE' }],
 * };
 * ```
 */
export const AgentDefinitionSchema = v.strictObject({
  /** Human-readable agent name. */
  name: StrSchema,
  /** Machine-readable agent ID. */
  id: AgentKindSchema,
  /** ANY check passing means this agent is detected. */
  checks: v.array(ProviderEnvCheckSchema),
});

/** Inferred output type of {@link AgentDefinitionSchema}. */
export type AgentDefinition = v.InferOutput<typeof AgentDefinitionSchema>;

// =============================================================================
// Runtime Info
// =============================================================================

/**
 * Schema for combined runtime kind and version information.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(RuntimeInfoSchema, { name: 'node-tty', version: '20.11.0' });
 * if (result.ok) result.data; // { name: 'node-tty', version: '20.11.0' }
 * ```
 */
export const RuntimeInfoSchema = v.strictObject({
  /** Detected runtime kind. */
  name: v.lazy((): typeof RuntimeKindSchema => RuntimeKindSchema),
  /** Runtime version string (e.g., `'20.11.0'` for Node), or `undefined` if unavailable. */
  version: v.optional(StrSchema),
});

/** Inferred output type of {@link RuntimeInfoSchema}. Runtime kind with version. */
export type RuntimeInfo = v.InferOutput<typeof RuntimeInfoSchema>;

// =============================================================================
// Environment Config Schema
// =============================================================================

/**
 * Schema for detected environment configuration.
 *
 * Captures runtime environment variables and TTY state that affect CLI behavior.
 * Pure boolean flags with no CLI-specific dependencies.
 *
 * @example
 * ```typescript
 * const env: EnvironmentConfig = {
 *   noColor: false,
 *   forceColor: false,
 *   isCI: true,
 *   isGitHubActions: true,
 *   isTTY: false,
 * };
 * ```
 */
export const EnvironmentConfigSchema = v.strictObject({
  // ─── Color & TTY ───
  /** Whether `NO_COLOR` env var is set. */
  noColor: BoolSchema,
  /** Whether `FORCE_COLOR` env var is set. */
  forceColor: BoolSchema,
  /** Whether stdout is a TTY. */
  isTTY: BoolSchema,

  // ─── CI Providers ───
  /** Whether running in CI (`CI` env var). */
  isCI: BoolSchema,
  /** Whether running in GitHub Actions (`GITHUB_ACTIONS` env var). */
  isGitHubActions: BoolSchema,
  /** Whether running in GitLab CI (`GITLAB_CI` env var). */
  isGitLabCI: BoolSchema,
  /** Whether running in Travis CI (`TRAVIS` env var). */
  isTravisCI: BoolSchema,
  /** Whether running in Jenkins (`JENKINS_URL` env var). */
  isJenkins: BoolSchema,
  /** Whether running in Azure Pipelines (`TF_BUILD` env var). */
  isAzurePipelines: BoolSchema,
  /** Whether running in Bitbucket Pipelines (`BITBUCKET_PIPELINE_UUID` env var). */
  isBitbucketPipelines: BoolSchema,
  /** Whether running in CircleCI (`CIRCLECI` env var). */
  isCircleCI: BoolSchema,

  // ─── Container & Cloud Environments ───
  /** Whether running in Docker (`DOCKER` or `container` env var). */
  isDocker: BoolSchema,
  /** Whether running in WSL (`WSL_DISTRO_NAME` env var). */
  isWSL: BoolSchema,
  /** Whether running in GitHub Codespaces (`CODESPACES` env var). */
  isCodespaces: BoolSchema,

  // ─── Testing Environments ───
  /** Whether running in Vitest (`VITEST` env var). */
  isVitest: BoolSchema,
  /** Whether running in Jest (`JEST_WORKER_ID` env var). */
  isJest: BoolSchema,

  // ─── Runtime Environments ───
  /** Whether running in a Cloudflare Worker or edge runtime. */
  isCloudflareWorker: BoolSchema,
  /** Whether running in a browser environment. */
  isBrowser: BoolSchema,
  /** Whether running in the Deno runtime. */
  isDeno: BoolSchema,
  /** Whether running in the Bun runtime. */
  isBun: BoolSchema,
  /** Whether running in a Node.js environment (includes TTY and pipe). */
  isNode: BoolSchema,
  /** Whether running in a Web Worker. */
  isWebWorker: BoolSchema,
  /** Whether running in a SharedWorker. */
  isSharedWorker: BoolSchema,
  /** Whether running in a Service Worker. */
  isServiceWorker: BoolSchema,

  // ─── Platform Environments ───
  /** Whether running inside a Capacitor WebView (iOS, Android, Mac, Desktop). */
  isCapacitor: BoolSchema,
  /** Whether running inside an Electron renderer process (browser + Node access). */
  isElectronRenderer: BoolSchema,
  /** Whether running inside an Electron main process (pure Node). */
  isElectronMain: BoolSchema,
  /** Whether running inside a Tauri WebView. */
  isTauri: BoolSchema,
  /** Whether running inside React Native (Hermes/JSC). */
  isReactNative: BoolSchema,

  // ─── Capacitor Native Platform ───
  /** Whether running on iOS via Capacitor. */
  isIOS: BoolSchema,
  /** Whether running on Android via Capacitor. */
  isAndroid: BoolSchema,
  /** Whether running on macOS (native Capacitor or Electron). */
  isMacOS: BoolSchema,

  // ─── Capacitor Platform String ───
  /** Capacitor platform string (`'ios'` | `'android'` | `'web'` | `undefined`). */
  capacitorPlatform: v.optional(v.picklist(['ios', 'android', 'web'])),

  // ─── Environment Modes ───
  /** Whether `DEBUG` env var is set. */
  isDebug: BoolSchema,
  /** Whether in test mode (`NODE_ENV === 'test'` or `TEST` env var). */
  isTest: BoolSchema,
  /** Whether `NODE_ENV === 'production'`. */
  isProduction: BoolSchema,
  /** Whether `NODE_ENV` is `'development'` or `'dev'`. */
  isDevelopment: BoolSchema,
  /** CI, test, or non-interactive environment — minimal output preferred. */
  isMinimal: BoolSchema,

  // ─── Platform (OS) ───
  /** Whether running on Windows (`process.platform === 'win32'`). */
  isWindows: BoolSchema,
  /** Whether running on Linux (`process.platform === 'linux'`). */
  isLinux: BoolSchema,

  // ─── SSH ───
  /** Whether running in an SSH session (`SSH_CONNECTION` or `SSH_TTY`). */
  isSSH: BoolSchema,

  // ─── Color Support ───
  /** Whether the environment supports color output. */
  isColorSupported: BoolSchema,
  /** Color support level: 0 (none), 1 (basic 16), 2 (256), 3 (truecolor 16m). */
  colorLevel: ColorLevelSchema,

  // ─── Runtime Environments (edge variants) ───
  /** Whether running in Vercel Edge Runtime (`EdgeRuntime` global). */
  isEdgeLight: BoolSchema,
  /** Whether running in Fastly Compute (`fastly` global). */
  isFastly: BoolSchema,
  /** Whether running in Netlify Edge Functions (`Netlify` global). */
  isNetlify: BoolSchema,
  /** Whether running in Cloudflare Pages (vs Workers). Checks `CF_PAGES` env var. */
  isCloudflarePages: BoolSchema,
  /** Whether running in Deno Deploy (vs local Deno). Checks `DENO_DEPLOYMENT_ID`. */
  isDenoDeployStaging: BoolSchema,

  // ─── PR Detection ───
  /** Whether running in a PR/MR build. `null` if unknown or not in CI. */
  isPR: v.nullable(BoolSchema),

  // ─── Runtime Version Info ───
  /** Node.js version string (e.g., `'20.11.0'`), or `undefined` if not Node. */
  nodeVersion: v.optional(StrSchema),
  /** Node.js major version number (e.g., `20`), or `undefined` if not Node. */
  nodeMajorVersion: v.optional(NodeMajorVersionSchema),

  // ─── Provider & Agent ───
  /** Detected CI/hosting provider, or `undefined` if none detected. */
  provider: v.optional(ProviderInfoSchema),
  /** Detected AI coding agent, or `undefined` if none detected. */
  agent: v.optional(AgentInfoSchema),
});

/** Inferred output type of {@link EnvironmentConfigSchema}. Detected environment configuration. */
export type EnvironmentConfig = v.InferOutput<typeof EnvironmentConfigSchema>;

// =============================================================================
// Runtime Kind
// =============================================================================

/**
 * Schema for detected runtime environment.
 *
 * - `'node-tty'` — Node.js with TTY (full ANSI, spinner, progress, cursor control)
 * - `'node-pipe'` — Node.js piped/non-TTY (ANSI if FORCE_COLOR, no cursor control)
 * - `'worker'` — Cloudflare Worker / generic edge runtime (plain text, no colors, ASCII symbols)
 * - `'browser'` — Browser main thread (CSS styling via %c, Unicode symbols)
 * - `'web-worker'` — Browser Web Worker (background thread, no DOM)
 * - `'shared-worker'` — Browser SharedWorker (multi-page shared thread, port-based)
 * - `'service-worker'` — Browser Service Worker (fetch proxy, no DOM, lifecycle events)
 * - `'deno'` — Deno runtime (Deno.* APIs, TTY support, signal listeners)
 * - `'bun'` — Bun runtime (Node-compatible process.on, TTY support)
 * - `'edge-light'` — Vercel Edge Runtime (`EdgeRuntime` global string)
 * - `'fastly'` — Fastly Compute (`fastly` global)
 * - `'netlify'` — Netlify Edge Functions (`Netlify` global object)
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(RuntimeKindSchema, 'browser');
 * if (result.ok) result.data; // 'browser'
 * ```
 */
export const RuntimeKindSchema = v.picklist([
  'node-tty',
  'node-pipe',
  'worker',
  'browser',
  'web-worker',
  'shared-worker',
  'service-worker',
  'deno',
  'bun',
  'edge-light',
  'fastly',
  'netlify',
]);

/** Inferred output type of {@link RuntimeKindSchema}. */
export type RuntimeKind = v.InferOutput<typeof RuntimeKindSchema>;

/**
 * Schema for required runtime families used by {@link requireRuntime}.
 *
 * Unlike {@link RuntimeKindSchema} which distinguishes Node sub-variants
 * (`'node-tty'`, `'node-pipe'`), this schema groups them under `'node'`
 * for requirement declarations.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(RequiredRuntimeSchema, 'node');
 * if (result.ok) result.data; // 'node'
 * ```
 */
export const RequiredRuntimeSchema = v.picklist([
  'node',
  'browser',
  'worker',
  'deno',
  'bun',
  'edge-light',
  'fastly',
  'netlify',
]);

/** Inferred output type of {@link RequiredRuntimeSchema}. A required runtime family. */
export type RequiredRuntime = v.InferOutput<typeof RequiredRuntimeSchema>;

/**
 * Default runtime kind: `'worker'`.
 *
 * Safe fallback when runtime detection fails or is unavailable
 * (e.g., during module initialization).
 *
 * @example
 * ```typescript
 * const kind: RuntimeKind = DEFAULT_RUNTIME_KIND; // 'worker'
 * ```
 */
export const DEFAULT_RUNTIME_KIND: RuntimeKind = 'worker';

/**
 * Schema for a non-empty array of supported runtime kinds.
 *
 * Used by command and runner definitions to declare which runtimes
 * a tool can execute in. When omitted, the tool is assumed to support
 * all runtimes.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(SupportedRuntimesSchema, ['node-tty', 'node-pipe']);
 * if (result.ok) result.data; // ['node-tty', 'node-pipe']
 * ```
 */
export const SupportedRuntimesSchema = v.pipe(v.array(RuntimeKindSchema), v.minLength(1));

/** Inferred output type of {@link SupportedRuntimesSchema}. Non-empty array of {@link RuntimeKind}. */
export type SupportedRuntimes = v.InferOutput<typeof SupportedRuntimesSchema>;

// =============================================================================
// Log Context
// =============================================================================

/**
 * Schema for operational context attached to log entries and captured errors.
 *
 * Provides a shared, structured context bag that flows through the logging
 * and error systems. Auto-populated fields (runtime, correlationId) are set
 * at startup. Operation-specific fields are set per-request or per-command.
 *
 * Environment-agnostic: works in CLI, API workers, browser, and mobile.
 * All fields are optional — context accumulates progressively.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { LogContextSchema, type LogContext } from '@/schemas/common';
 *
 * // CLI context
 * const cliCtx: LogContext = {
 *   runtime: 'node-tty',
 *   operation: 'sync',
 *   action: 'run',
 *   correlationId: '550e8400-e29b-41d4-a716-446655440000',
 * };
 *
 * // API worker context
 * const apiCtx: LogContext = {
 *   runtime: 'worker',
 *   operation: 'users',
 *   action: 'GET',
 *   requestId: 'req-abc-123',
 *   sessionId: 'sess-def-456',
 * };
 *
 * // Browser context
 * const browserCtx: LogContext = {
 *   runtime: 'browser',
 *   operation: 'checkout',
 *   action: 'submit',
 *   sessionId: 'sess-xyz-789',
 * };
 * ```
 */
export const LogContextSchema = v.strictObject({
  /** Runtime environment kind. Auto-detected via `detectRuntime()`. */
  runtime: v.optional(RuntimeKindSchema),
  /** Whether running in CI. Auto-detected. */
  ci: v.optional(v.boolean()),
  /** Correlation ID for tracing across operations. UUID v4. */
  correlationId: v.optional(v.pipe(v.string(), v.uuid())),
  /** Operation name (CLI tool, API endpoint, worker handler, component). */
  operation: v.optional(v.string()),
  /** Action within the operation (CLI subcommand, HTTP method, user action). */
  action: v.optional(v.string()),
  /** HTTP request ID for API correlation. */
  requestId: v.optional(v.string()),
  /** Browser/mobile session ID. */
  sessionId: v.optional(v.string()),
  /** Product ID when operating in product context. */
  productId: v.optional(v.string()),
  /** User ID when authenticated. */
  userId: v.optional(v.string()),
  /** Extensible key-value pairs for domain-specific context. */
  extra: v.optional(v.record(v.string(), v.unknown())),
  /** Service name for this logger context. Propagated to `LogEntry.service`. Maps to ECS `service.name`. */
  service: v.optional(v.string()),
  /** W3C Trace Context trace ID. Propagated to `LogEntry.traceId`. */
  traceId: v.optional(v.string()),
  /** W3C Trace Context span ID. Propagated to `LogEntry.spanId`. */
  spanId: v.optional(v.string()),
});

/** Operational context for log entries and captured errors. @see {@link LogContextSchema} */
export type LogContext = v.InferOutput<typeof LogContextSchema>;

/**
 * Schema for a structured log entry emitted in machine-readable output formats.
 *
 * When `outputFormat` is `'json'`, log methods emit `LogEntry` objects instead
 * of plain text strings. Integrates with log aggregators (Datadog, Grafana,
 * CloudWatch, etc.).
 *
 * @example
 * ```typescript
 * import type { LogEntry } from '@/schemas/common';
 *
 * const entry: LogEntry = {
 *   level: 'info',
 *   message: 'Processing 42 files',
 *   timestamp: '2026-02-22T12:00:00.000Z',
 *   context: { runtime: 'node-tty', operation: 'format' },
 * };
 * ```
 */
export const LogEntrySchema = v.strictObject({
  /** Log level of this entry. */
  level: LogLevelSchema,
  /** Human-readable log message. */
  message: v.string(),
  /** ISO 8601 timestamp when this entry was created. */
  timestamp: v.pipe(v.string(), v.isoTimestamp()),
  /** Operational context (runtime, operation, correlationId, etc.). */
  context: v.optional(LogContextSchema),
  /** Optional structured data payload (debug data, JSON output). */
  data: v.optional(v.unknown()),
  /** Service name that emitted this log entry. Maps to ECS `service.name` and OTel `service.name`. */
  service: v.optional(v.string()),
  /** Logger instance name (e.g., child logger name). Maps to ECS `log.logger`. */
  logger: v.optional(v.string()),
  /** W3C Trace Context trace ID for distributed tracing correlation. */
  traceId: v.optional(v.string()),
  /** W3C Trace Context span ID for distributed tracing correlation. */
  spanId: v.optional(v.string()),
  /** Duration in milliseconds for timed operations. Maps to ECS `event.duration`. */
  durationMs: v.optional(v.pipe(v.number(), v.minValue(0))),
  /** Indexed string key-value labels for filtering (ECS `labels`). */
  labels: v.optional(v.record(v.string(), v.string())),
  /** Error code when this log entry relates to an error. */
  errorCode: v.optional(v.string()),
  /** Error message when this log entry relates to an error. */
  errorMessage: v.optional(v.string()),
  /** Error stack trace when this log entry relates to an error. */
  errorStack: v.optional(v.string()),
  /** Process ID (for server-side log correlation). */
  pid: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  /** Hostname where the log was emitted. */
  hostname: v.optional(v.string()),
});

/** Structured log entry for machine-readable output. @see {@link LogEntrySchema} */
export type LogEntry = v.InferOutput<typeof LogEntrySchema>;

// =============================================================================
// AbortSignal
// =============================================================================

/**
 * Schema for `AbortSignal` validation.
 *
 * Uses `v.custom()` with an `instanceof` check since AbortSignal
 * is a platform global, not a Valibot primitive.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const controller = new AbortController();
 * const result = safeParse(AbortSignalSchema, controller.signal);
 * ```
 */
export const AbortSignalSchema = v.custom<AbortSignal>(
  (val): val is AbortSignal => val instanceof AbortSignal,
);

/** Inferred output type of {@link AbortSignalSchema}. */
export type AbortSignalType = v.InferOutput<typeof AbortSignalSchema>;

// =============================================================================
// Interrupt Handler
// =============================================================================

/**
 * Schema for interrupt handler callbacks.
 *
 * Validates that a value is a function. The type annotation provides
 * the correct signature: `(signal: Str) => void`.
 *
 * @example
 * ```typescript
 * const handler: InterruptHandler = (signal) => {
 *   console.error(`Received ${signal}, shutting down...`);
 * };
 * ```
 */
export const InterruptHandlerSchema = v.custom<(signal: Str) => Void>(
  (val): val is (signal: Str) => Void => typeof val === 'function',
);

/** Inferred output type of {@link InterruptHandlerSchema}. */
export type InterruptHandler = v.InferOutput<typeof InterruptHandlerSchema>;

// =============================================================================
// Cleanup Callback
// =============================================================================

/**
 * Cleanup callback schema.
 *
 * A no-argument function invoked during process cleanup (SIGINT/SIGTERM).
 * Fire-and-forget — cannot return Result.
 *
 * @example
 * ```typescript
 * const cleanup: CleanupCallback = () => {
 *   watcher.close();
 *   server.stop();
 * };
 * ```
 */
export const CleanupCallbackSchema = v.custom<() => Void>(
  (input: unknown): input is () => Void => typeof input === 'function',
);

/** Inferred output type of {@link CleanupCallbackSchema}. */
export type CleanupCallback = v.InferOutput<typeof CleanupCallbackSchema>;

// =============================================================================
// Environment Records
// =============================================================================

/**
 * Schema for environment variable records with defined values.
 *
 * @example
 * ```typescript
 * const env: EnvRecord = { NODE_ENV: 'production', PORT: '3000' };
 * ```
 */
export const EnvRecordSchema = v.record(v.string(), v.string());

/** Inferred output type of {@link EnvRecordSchema}. */
export type EnvRecord = v.InferOutput<typeof EnvRecordSchema>;

/**
 * Schema for environment variable records with optional (possibly undefined) values.
 *
 * Matches the shape of `process.env` where values may be `undefined`.
 *
 * @example
 * ```typescript
 * const env: EnvRecordWithUndefined = process.env;
 * ```
 */
export const EnvRecordWithUndefinedSchema = v.record(v.string(), v.optional(v.string()));

/** Inferred output type of {@link EnvRecordWithUndefinedSchema}. */
export type EnvRecordWithUndefined = v.InferOutput<typeof EnvRecordWithUndefinedSchema>;

// =============================================================================
// Nullable / Optional — Valibot Schemas
// =============================================================================

/**
 * Schema for `Path | null`.
 *
 * Used for nullable file path state (e.g., temp files that may not exist yet).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(NullablePathSchema, '/tmp/file.txt');
 * if (result.ok) result.data; // '/tmp/file.txt'
 * const nullResult = safeParse(NullablePathSchema, null);
 * if (nullResult.ok) nullResult.data; // null
 * ```
 */
export const NullablePathSchema = v.nullable(PathSchema);

/** Path or `null`. See {@link NullablePathSchema}. */
export type NullablePath = v.InferOutput<typeof NullablePathSchema>;

/**
 * Schema for `Path | undefined`.
 *
 * Used for optional path parameters where the path may not be provided.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(OptionalPathSchema, '/tmp/file.txt');
 * if (result.ok) result.data; // '/tmp/file.txt'
 * const noneResult = safeParse(OptionalPathSchema, undefined);
 * if (noneResult.ok) noneResult.data; // undefined
 * ```
 */
export const OptionalPathSchema = v.optional(PathSchema);

/** Path or `undefined`. See {@link OptionalPathSchema}. */
export type OptionalPath = v.InferOutput<typeof OptionalPathSchema>;

/**
 * Schema for `ExitCode | null`.
 *
 * Used for process close callbacks where the exit code may be `null`
 * (e.g., when a process is killed by a signal).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(NullableExitCodeSchema, 0);
 * if (result.ok) result.data; // 0
 * ```
 */
export const NullableExitCodeSchema = v.nullable(ExitCodeSchema);

/** ExitCode or `null`. See {@link NullableExitCodeSchema}. */
export type NullableExitCode = v.InferOutput<typeof NullableExitCodeSchema>;

/**
 * Schema for `StrArray | null`.
 *
 * Used for nullable cached array state (e.g., lazily-computed path lists).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(NullableStrArraySchema, ['a', 'b']);
 * if (result.ok) result.data; // ['a', 'b']
 * ```
 */
export const NullableStrArraySchema = v.nullable(StrArraySchema);

/** StrArray or `null`. See {@link NullableStrArraySchema}. */
export type NullableStrArray = v.InferOutput<typeof NullableStrArraySchema>;

// =============================================================================
// Platform Global Type Aliases
// =============================================================================
//
// These are type aliases (not Valibot schemas) because these platform
// globals cannot be meaningfully validated by Valibot at runtime.
// Callers narrow with `if (!value)` guards.

/** `NodeJS.Process` or `undefined` — returned by {@link getProcess}. */
export type OptionalNodeProcess = NodeJS.Process | undefined;

/** `AbortController` or `null` — for nullable controller state. */
export type NullableAbortController = AbortController | null;

/** `AbortSignal` or `undefined` — optional signal parameter. */
export type OptionalAbortSignal = AbortSignal | undefined;

/** `AbortSignal` or `null` — nullable signal from fallible Result. */
export type NullableAbortSignal = AbortSignal | null;

/** `RegExpMatchArray` or `null` — return type of `String.match()`. */
export type NullableRegExpMatchArray = RegExpMatchArray | null;

/** `RegExpExecArray` or `null` — return type of `RegExp.exec()`. */
export type NullableRegExpExecArray = RegExpExecArray | null;

/** `ReturnType<typeof setInterval>` or `null` — nullable timer ID. */
export type NullableIntervalId = ReturnType<typeof setInterval> | null;

// =============================================================================
// Serialization & Dynamic Import Aliases
// =============================================================================

/** Any serializable data — parameter type for `safeStringify`, `log.json`, `log.debug`. */
export type JsonData = unknown;

/** Schema for dynamic `import()` module — exports are untyped until validated. */
export const DynamicModuleSchema = v.record(v.string(), v.unknown());

/** Dynamic `import()` module. @see {@link DynamicModuleSchema} */
export type DynamicModule = v.InferOutput<typeof DynamicModuleSchema>;

/**
 * Schema for `console.log` / `console.error` function signature.
 *
 * Uses `v.custom()` instead of `functionSchema()` to avoid a circular
 * dependency (`schemas/common` ← `schemas/function` ← `schemas/common`).
 */
export const ConsoleLogFnSchema = v.custom<typeof console.log>(
  (val: unknown): val is typeof console.log => typeof val === 'function',
  'Expected a callable function',
);

/** `console.log` / `console.error` function signature. @see {@link ConsoleLogFnSchema} */
export type ConsoleLogFn = typeof console.log;

/** Schema for Node.js `process.env` record with optional values. */
export const OptionalEnvRecordSchema = v.optional(v.record(v.string(), v.optional(v.string())));

/** Node.js `process.env` record. @see {@link OptionalEnvRecordSchema} */
export type OptionalEnvRecord = v.InferOutput<typeof OptionalEnvRecordSchema>;

/** Schema for extensible error context metadata. */
export const ErrorMetaSchema = v.record(v.string(), v.unknown());

/** Extensible error context metadata. @see {@link ErrorMetaSchema} */
export type ErrorMeta = v.InferOutput<typeof ErrorMetaSchema>;

/** Handlebars helper callback value — untyped at compile time. */
export type HandlebarsValue = unknown;

/** JSON.parse result before schema validation. */
export type UntypedJson = unknown;

/** Schema for raw locale strings from dynamic import before Valibot build. */
export const RawLocaleStringsSchema = v.record(v.string(), v.unknown());

/** Raw locale strings before Valibot build. @see {@link RawLocaleStringsSchema} */
export type RawLocaleStrings = v.InferOutput<typeof RawLocaleStringsSchema>;

/** Result of safeParse with unknown schema output (generic locale build). */
export type UntypedParseResult = unknown;

// =============================================================================
// Teardown Function
// =============================================================================

/**
 * Schema for teardown/cleanup functions.
 *
 * A no-argument function that performs cleanup.
 * Returned by `setupGlobalErrorHandling` and `captureWebSocketErrors`.
 *
 * Uses `v.custom` because `@/schemas/common` cannot import `functionSchema()`
 * from `@/schemas/function` (circular dependency: function → common → function).
 *
 * @example
 * ```typescript
 * const teardown: TeardownFn = () => { /* cleanup *\/ };
 * ```
 */
export const TeardownFnSchema = v.custom<() => Void>(
  (val: unknown): val is () => Void => typeof val === 'function',
  'Expected a teardown function',
);

/** Inferred output type of {@link TeardownFnSchema}. */
export type TeardownFn = v.InferOutput<typeof TeardownFnSchema>;

// =============================================================================
// Commerce & Pricing
// =============================================================================

/**
 * Schema for non-negative price values with 2-decimal precision.
 *
 * @example
 * ```typescript
 * const result = v.safeParse(PriceSchema, 9.99);
 * ```
 */
export const PriceSchema = v.pipe(v.number(), v.minValue(0));

/** Inferred output type of {@link PriceSchema}. */
export type Price = v.InferOutput<typeof PriceSchema>;

/**
 * Schema for positive integer quantity.
 *
 * @example
 * ```typescript
 * const result = v.safeParse(QuantitySchema, 5);
 * ```
 */
export const QuantitySchema = v.pipe(v.number(), v.integer(), v.minValue(1));

/** Inferred output type of {@link QuantitySchema}. */
export type Quantity = v.InferOutput<typeof QuantitySchema>;

/**
 * Schema for percentage values (0-100).
 *
 * @example
 * ```typescript
 * const result = v.safeParse(PercentageSchema, 50);
 * ```
 */
export const PercentageSchema = v.pipe(v.number(), v.minValue(0), v.maxValue(100));

/** Inferred output type of {@link PercentageSchema}. */
export type Percentage = v.InferOutput<typeof PercentageSchema>;

/**
 * Schema for discount percentage (0-100).
 *
 * @example
 * ```typescript
 * const result = v.safeParse(DiscountPercentSchema, 20);
 * ```
 */
export const DiscountPercentSchema = v.pipe(v.number(), v.minValue(0), v.maxValue(100));

/** Inferred output type of {@link DiscountPercentSchema}. */
export type DiscountPercent = v.InferOutput<typeof DiscountPercentSchema>;

// =============================================================================
// API & Pagination
// =============================================================================

/**
 * Schema for pagination page size (1-100).
 *
 * @example
 * ```typescript
 * const result = v.safeParse(PaginationLimitSchema, 25);
 * ```
 */
export const PaginationLimitSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(1),
  v.maxValue(100),
);

/** Inferred output type of {@link PaginationLimitSchema}. */
export type PaginationLimit = v.InferOutput<typeof PaginationLimitSchema>;

/**
 * Schema for pagination offset (non-negative integer).
 *
 * @example
 * ```typescript
 * const result = v.safeParse(PaginationOffsetSchema, 50);
 * ```
 */
export const PaginationOffsetSchema = v.pipe(v.number(), v.integer(), v.minValue(0));

/** Inferred output type of {@link PaginationOffsetSchema}. */
export type PaginationOffset = v.InferOutput<typeof PaginationOffsetSchema>;

/**
 * Schema for sort direction.
 *
 * @example
 * ```typescript
 * const result = v.safeParse(SortDirectionSchema, 'asc');
 * ```
 */
export const SortDirectionSchema = v.picklist(['asc', 'desc']);

/** Inferred output type of {@link SortDirectionSchema}. */
export type SortDirection = v.InferOutput<typeof SortDirectionSchema>;

/**
 * Schema for query filter operators.
 *
 * @example
 * ```typescript
 * const result = v.safeParse(FilterOperatorSchema, 'eq');
 * ```
 */
export const FilterOperatorSchema = v.picklist([
  'eq',
  'ne',
  'gt',
  'lt',
  'gte',
  'lte',
  'in',
  'contains',
]);

/** Inferred output type of {@link FilterOperatorSchema}. */
export type FilterOperator = v.InferOutput<typeof FilterOperatorSchema>;

// =============================================================================
// User & Identity
// =============================================================================

/**
 * Schema for E.164 phone numbers.
 *
 * @example
 * ```typescript
 * const result = v.safeParse(PhoneSchema, '+14155551234');
 * ```
 */
export const PhoneSchema = v.pipe(v.string(), v.regex(/^\+[1-9]\d{1,14}$/));

/** Inferred output type of {@link PhoneSchema}. */
export type Phone = v.InferOutput<typeof PhoneSchema>;

/**
 * Schema for usernames (3-30 chars, alphanumeric + underscores/hyphens).
 *
 * @example
 * ```typescript
 * const result = v.safeParse(UsernameSchema, 'john_doe');
 * ```
 */
export const UsernameSchema = v.pipe(
  v.string(),
  v.minLength(3),
  v.maxLength(30),
  v.regex(/^[a-zA-Z0-9_-]+$/),
);

/** Inferred output type of {@link UsernameSchema}. */
export type Username = v.InferOutput<typeof UsernameSchema>;

// =============================================================================
// Analytics & Events
// =============================================================================

/**
 * Schema for analytics event names (snake_case).
 *
 * @example
 * ```typescript
 * const result = v.safeParse(EventNameSchema, 'page_view');
 * ```
 */
export const EventNameSchema = v.pipe(v.string(), v.regex(/^[a-z][a-z0-9_]*$/));

/** Inferred output type of {@link EventNameSchema}. */
export type EventName = v.InferOutput<typeof EventNameSchema>;

// =============================================================================
// Package Management
// =============================================================================

/**
 * Schema for valid npm package names.
 *
 * @example
 * ```typescript
 * const result = v.safeParse(NpmPackageNameSchema, '@scope/package');
 * ```
 */
export const NpmPackageNameSchema = v.pipe(v.string(), v.regex(/^(@[a-z0-9-]+\/)?[a-z0-9.-]+$/));

/** Inferred output type of {@link NpmPackageNameSchema}. */
export type NpmPackageName = v.InferOutput<typeof NpmPackageNameSchema>;

// =============================================================================
// HTTP
// =============================================================================

/**
 * Standard HTTP request methods (RFC 9110).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(HttpMethodSchema, 'GET');
 * // { ok: true, data: 'GET' }
 * ```
 */
export const HttpMethodSchema = v.picklist([
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'DELETE',
  'CONNECT',
  'OPTIONS',
  'TRACE',
  'PATCH',
]);

/** @see {@link HttpMethodSchema} */
export type HttpMethod = v.InferOutput<typeof HttpMethodSchema>;

// =============================================================================
// Numeric Ranges
// =============================================================================

/**
 * Unit interval — a number between 0 and 1 inclusive.
 * Commonly used for sampling rates, opacity, percentages (as decimal), and probabilities.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(UnitIntervalSchema, 0.5);
 * // { ok: true, data: 0.5 }
 * ```
 */
export const UnitIntervalSchema = v.pipe(v.number(), v.minValue(0), v.maxValue(1));

/** @see {@link UnitIntervalSchema} */
export type UnitInterval = v.InferOutput<typeof UnitIntervalSchema>;

// =============================================================================
// Capacitor Platform
// =============================================================================

/**
 * Schema for Capacitor native platform identifiers.
 *
 * Detected via `window.Capacitor.getPlatform()` when running in a
 * Capacitor WebView. Returns `undefined` outside Capacitor.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(CapacitorPlatformSchema, 'ios');
 * if (result.ok) result.data; // 'ios'
 * ```
 */
export const CapacitorPlatformSchema = v.picklist(['ios', 'android', 'web']);

/** Inferred output type of {@link CapacitorPlatformSchema}. */
export type CapacitorPlatform = v.InferOutput<typeof CapacitorPlatformSchema>;
