/**
 * Common Schemas
 *
 * General-purpose Valibot schemas reusable across any package.
 * All type annotations use Valibot-inferred types via `v.InferOutput`.
 *
 * Categories:
 * - **Primitives** — Str, Bool, Num, Path, Filename, Void, Never
 * - **Network & Environment** — Port, IPv4 addresses, Hostname, Environment
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
 *
 * @module
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
export const DEFAULT_TERMINAL_WIDTH: NonNegativeInteger = (() => {
  const r = v.safeParse(NonNegativeIntegerSchema, 80);
  if (!r.success) throw new Error('BUG: DEFAULT_TERMINAL_WIDTH schema validation failed');
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
export const DEFAULT_JSON_INDENT: NonNegativeInteger = (() => {
  const r = v.safeParse(NonNegativeIntegerSchema, 2);
  if (!r.success) throw new Error('BUG: DEFAULT_JSON_INDENT schema validation failed');
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
export const DEFAULT_PROGRESS_BAR_WIDTH: PositiveInteger = (() => {
  const r = v.safeParse(PositiveIntegerSchema, 20);
  if (!r.success) throw new Error('BUG: DEFAULT_PROGRESS_BAR_WIDTH schema validation failed');
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
export const Ipv4AddressArraySchema = v.array(v.pipe(v.string(), v.ipv4()));

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
const SEMVER_REGEX =
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
const KEBAB_CASE_REGEX = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

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
export const DEFAULT_EXIT_CODE: ExitCode = (() => {
  const r = v.safeParse(ExitCodeSchema, 0);
  if (!r.success) throw new Error('BUG: DEFAULT_EXIT_CODE schema validation failed');
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
export const FAILURE_EXIT_CODE: ExitCode = (() => {
  const r = v.safeParse(ExitCodeSchema, 1);
  if (!r.success) throw new Error('BUG: FAILURE_EXIT_CODE schema validation failed');
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
 * Options for `fatalExit`.
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
export const SpawnProcessOptionsSchema = v.object({
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
    installHint: v.pipe(v.string(), v.minLength(1)),
  }),
]);

/**
 * Result of `ensureCommand`.
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
 * Result of `ensureMise`.
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
 * Result of `ensureWorkspaceRoot`.
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
  name: v.lazy(() => RuntimeKindSchema),
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
export const AbortSignalSchema = v.custom<AbortSignal>((val) => val instanceof AbortSignal);

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
export const InterruptHandlerSchema = v.custom<(signal: Str) => void>(
  (val) => typeof val === 'function',
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
export const CleanupCallbackSchema = v.custom<() => void>(
  (input: unknown): input is () => void => typeof input === 'function',
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

/** Path or `null`. */
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

/** Path or `undefined`. */
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

/** ExitCode or `null`. */
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

/** StrArray or `null`. */
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
export const ConsoleLogFnSchema = v.custom<(...args: unknown[]) => void>(
  (val: unknown): boolean => typeof val === 'function',
  'Expected a callable function',
);

/** `console.log` / `console.error` function signature. @see {@link ConsoleLogFnSchema} */
export type ConsoleLogFn = (...args: unknown[]) => void;

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
export const TeardownFnSchema = v.custom<() => void>(
  (val: unknown): val is () => void => typeof val === 'function',
  'Expected a teardown function',
);

/** Inferred output type of {@link TeardownFnSchema}. */
export type TeardownFn = v.InferOutput<typeof TeardownFnSchema>;

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
