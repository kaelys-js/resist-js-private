/**
 * Result Type System
 *
 * Universal return type for every function in the monorepo. Provides a single,
 * consistent contract: every function returns `Result<T>` — either a success
 * with typed data, or a failure with a structured {@link AppError}.
 *
 * Designed from industry consensus:
 * - RFC 9457 (Problem Details for HTTP APIs)
 * - Google AIP-193 (Error Model)
 * - Stripe, Sentry, OpenTelemetry, JSON:API, Cloudflare API conventions
 *
 * This module exports:
 *
 * **Constructors** (primary API):
 * - `ok(schema, data)` — Success Result with runtime schema validation
 * - `okUnchecked(data)` — Success Result without validation (pre-validated data)
 * - `err(code, message?, options?)` — Error Result with structured AppError
 *
 * **Types**:
 * - `Result<T>` — Discriminated union: `{ ok: true, data: T }` | `{ ok: false, error: AppError }`
 * - `AppError` — Universal error object (code, message, id, timestamp, stack, cause chain, severity, tags, retry, etc.)
 * - `KnownErrorCode` — Union of all codes in the `ERRORS` registry
 * - `ErrOptions` — Options for the `err()` constructor
 * - `ValidationDetail` — Typed Valibot validation issue details
 * - `ErrorCode` — Inferred from `ErrorCodeSchema` (wire format)
 * - `ErrorSource` — Inferred from `ErrorSourceSchema` (error source pointer)
 * - `ErrorSeverity` — Error severity levels (fatal, error, warning, info, advice)
 * - `HttpStatusCode` — HTTP status code (100-599)
 * - `ErrorTags` — Indexed string key-value pairs for filtering
 * - `RetryInfo` — Retry information for retryable errors
 * - `ErrorHelpLink` — Documentation/help link
 * - `ErrorDomain` — Error code domain (first segment)
 *
 * For runtime error envelopes (`CapturedError`), see `./captured-error`.
 *
 * **Constants**:
 * - `ERRORS` — Hierarchical error code registry (frozen at runtime)
 *
 * **Schemas** (for deserialization / wire format validation):
 * - `AppErrorSchema`, `ErrorCodeSchema`, `ErrorSourceSchema`, `ValidationDetailSchema`
 * - `ErrorSeveritySchema`, `HttpStatusCodeSchema`, `ErrorTagsSchema`, `RetryInfoSchema`
 * - `ErrorHelpLinkSchema`, `ErrorDomainSchema`
 * - `OkSchema(DataSchema)`, `ErrSchema` — Result variant schemas
 *
 * @example
 * ```typescript
 * import { ok, err, ERRORS, type Result } from '@/schemas/result/result';
 * import { safeParse } from '@/utils/result';
 *
 * function divide(a: Num, b: Num): Result<Num> {
 *   if (b === 0) return err(ERRORS.VALIDATION.INVALID_FORMAT, 'Cannot divide by zero');
 *   return ok(NumSchema, a / b);
 * }
 *
 * const result = divide(10, 0);
 * if (!result.ok) {
 *   result.error.code;    // 'VALIDATION.INVALID_FORMAT'
 *   result.error.message; // 'Cannot divide by zero'
 *   result.error.id;      // '550e8400-e29b-...' (unique UUID)
 * }
 * ```
 *
 * @module
 */

import * as v from 'valibot';

// =============================================================================
// Deep Immutability (inlined to avoid circular dependency with @/utils/core)
// =============================================================================

/**
 * Deep readonly type — makes all nested properties readonly.
 * Sets become `ReadonlySet`, Maps become `ReadonlyMap`,
 * Arrays become `ReadonlyArray`, all recursively.
 *
 * **Why inlined:** `@/schemas/result` is a leaf package with zero dependencies.
 * All external consumers import `DeepReadonly` from `@/utils/core/object` (the
 * canonical source). This inline copy exists solely for the {@link Result} type
 * definition, avoiding a circular dependency between schemas and core utilities.
 *
 * **Why type alias (not schema):** Conditional mapped type with recursive
 * branches for `Set`, `Map`, `Array`, and `object`. No Valibot schema
 * primitive can express recursive conditional type mappings.
 */
export type DeepReadonly<T> =
  T extends Set<infer U>
    ? ReadonlySet<DeepReadonly<U>>
    : T extends Map<infer K, infer V>
      ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
      : T extends Array<infer U>
        ? ReadonlyArray<DeepReadonly<U>>
        : T extends (...args: never[]) => unknown
          ? T
          : T extends object
            ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
            : T;

/**
 * Deeply freezes an object to prevent mutation at runtime.
 * Recursively freezes all nested objects and arrays.
 *
 * **Why inlined:** `@/schemas/result` is a leaf package with zero dependencies.
 * The canonical copy lives in `@/utils/core/object`. This inline copy is used
 * by `ok()`, `okUnchecked()`, and `ERRORS` freezing within this module.
 *
 * @param obj - Object to deep freeze.
 * @returns The same object reference, deeply frozen.
 */
function _deepFreeze<T extends object>(obj: T): T {
  const propNames = Object.getOwnPropertyNames(obj) as Array<keyof T>;
  for (const name of propNames) {
    const value: T[keyof T] = obj[name];
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      _deepFreeze(value as object);
    }
  }
  return Object.freeze(obj) as T;
}

/**
 * Creates a frozen success Result from already-valid data.
 *
 * Centralizes the `Object.freeze` + `_deepFreeze` pattern used by both `ok()` and `okUnchecked()`.
 * The `as object` cast is guarded by `typeof === 'object'` and `as Result<T>` is
 * necessary because `Object.freeze` returns `Readonly<T>` which does not satisfy `Result<T>`.
 *
 * @param data - The success value (already validated or explicitly unchecked).
 * @returns `Result<T>` — frozen success result.
 */
function _okResult<T>(data: T): Result<T> {
  const frozen: T =
    typeof data === 'object' && data !== null ? (_deepFreeze(data as object) as T) : data;
  return Object.freeze({ ok: true as const, data: frozen, error: null }) as Result<T>;
}

// =============================================================================
// Local Type Aliases (inlined to avoid circular dependency with @/schemas/common)
// =============================================================================

/**
 * Schema for extensible error context metadata.
 *
 * **Why inlined:** `@/schemas/result` is a leaf package with zero dependencies.
 * Importing from `@/schemas/common` would create a circular dependency.
 * The canonical definition lives in `@/schemas/common`.
 */
const ErrorMetaSchema = v.record(v.string(), v.unknown());

/** Extensible key-value metadata for error context. @see {@link ErrorMetaSchema} */
type ErrorMeta = v.InferOutput<typeof ErrorMetaSchema>;

// =============================================================================
// Error Severity Schema
// =============================================================================

/**
 * Schema for error severity levels.
 *
 * Classifies how severe an error is for triage, filtering, and alerting.
 * Follows Sentry conventions with the addition of `'advice'` from Rust's miette.
 *
 * - `'fatal'` — Unrecoverable. Process/request must terminate.
 * - `'error'` — Operation failed. Default severity for `err()`.
 * - `'warning'` — Degraded but functional. Operation completed with issues.
 * - `'info'` — Informational. Not a failure, but notable condition.
 * - `'advice'` — Suggestion for improvement (linting, deprecation notices).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { ErrorSeveritySchema } from '@/schemas/result/result';
 *
 * const result = safeParse(ErrorSeveritySchema, 'warning');
 * if (result.ok) result.data; // 'warning'
 * ```
 */
export const ErrorSeveritySchema = v.picklist(['fatal', 'error', 'warning', 'info', 'advice']);

/** Inferred output type of {@link ErrorSeveritySchema}. */
export type ErrorSeverity = v.InferOutput<typeof ErrorSeveritySchema>;

// =============================================================================
// HTTP Status Code Schema
// =============================================================================

/**
 * Schema for HTTP status codes relevant to error responses.
 *
 * Covers standard HTTP status codes (1xx–5xx).
 * Used by {@link AppError} to map error codes to appropriate HTTP responses.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { HttpStatusCodeSchema } from '@/schemas/result/result';
 *
 * const result = safeParse(HttpStatusCodeSchema, 404);
 * if (result.ok) result.data; // 404
 * ```
 */
export const HttpStatusCodeSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(100),
  v.maxValue(599),
);

/** Inferred output type of {@link HttpStatusCodeSchema}. */
export type HttpStatusCode = v.InferOutput<typeof HttpStatusCodeSchema>;

// =============================================================================
// Error Tags Schema
// =============================================================================

/**
 * Schema for indexed error tags.
 *
 * Tags are `string → string` key-value pairs optimized for filtering,
 * searching, and grouping errors. Unlike {@link ErrorMetaSchema} (arbitrary
 * `unknown` values for debugging), tags are always strings and designed
 * for indexing in error tracking systems (Sentry, Datadog, OpenTelemetry).
 *
 * Common tag keys: `'service'`, `'route'`, `'userId'`, `'environment'`,
 * `'release'`, `'transaction'`.
 *
 * @example
 * ```typescript
 * const tags: ErrorTags = {
 *   service: 'api',
 *   route: '/users/:id',
 *   environment: 'production',
 * };
 * ```
 */
export const ErrorTagsSchema = v.record(v.string(), v.string());

/** Inferred output type of {@link ErrorTagsSchema}. */
export type ErrorTags = v.InferOutput<typeof ErrorTagsSchema>;

// =============================================================================
// Retry Info Schema
// =============================================================================

/**
 * Schema for retry information attached to retryable errors.
 *
 * Indicates whether the failed operation can be retried and optionally
 * how long to wait before retrying. Follows Google AIP-193 `RetryInfo`.
 *
 * @example
 * ```typescript
 * err(ERRORS.HTTP.SERVER_ERROR, 'Service temporarily unavailable', {
 *   retry: { retryable: true, retryAfterMs: 5000 },
 * })
 * ```
 */
export const RetryInfoSchema = v.strictObject({
  /** Whether the failed operation can be retried. */
  retryable: v.boolean(),
  /** Suggested delay in milliseconds before retrying. */
  retryAfterMs: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  /** Maximum number of retry attempts recommended. */
  maxRetries: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
});

/** Inferred output type of {@link RetryInfoSchema}. */
export type RetryInfo = v.InferOutput<typeof RetryInfoSchema>;

// =============================================================================
// Error Help Link Schema
// =============================================================================

/**
 * Schema for error help links.
 *
 * Provides URLs to documentation, issue trackers, or help resources
 * related to the error. Follows Google AIP-193 `Help` (description + URL pairs).
 *
 * @example
 * ```typescript
 * const link: ErrorHelpLink = {
 *   description: 'Authentication troubleshooting guide',
 *   url: 'https://docs.example.com/auth/troubleshooting',
 * };
 * ```
 */
export const ErrorHelpLinkSchema = v.strictObject({
  /** Human-readable description of what the link points to. */
  description: v.pipe(v.string(), v.minLength(1)),
  /** URL to the help resource. */
  url: v.pipe(v.string(), v.url()),
});

/** Inferred output type of {@link ErrorHelpLinkSchema}. */
export type ErrorHelpLink = v.InferOutput<typeof ErrorHelpLinkSchema>;

// =============================================================================
// Error Code Schema (for deserialization / wire format)
// =============================================================================

/**
 * Schema for hierarchical error codes.
 *
 * Error codes use `SCREAMING_SNAKE_CASE` with dot separators to form a hierarchy.
 * The first segment is the domain, subsequent segments narrow the error type.
 *
 * This schema is used for **deserialization** — validating error codes received
 * from API responses, IPC messages, or other external sources. For constructing
 * errors, use {@link KnownErrorCode} which restricts to codes in the {@link ERRORS} registry.
 *
 * Valid examples: `"AUTH.INVALID_TOKEN"`, `"VALIDATION.SCHEMA_FAILED"`, `"IO.READ_FAILED"`
 *
 * Used by {@link AppErrorSchema} for deserialization. Not part of the primary consumer surface.
 *
 * @internal
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * safeParse(ErrorCodeSchema, 'AUTH.INVALID_TOKEN'); // ok: true
 * safeParse(ErrorCodeSchema, 'DB.NOT_FOUND');       // ok: true
 * safeParse(ErrorCodeSchema, 'lowercase');           // ok: false
 * safeParse(ErrorCodeSchema, 'NO_DOT');              // ok: false (needs hierarchy)
 * ```
 */
export const ErrorCodeSchema = v.pipe(
  v.string(),
  v.regex(
    /^[A-Z][A-Z0-9]*(?:\.[A-Z][A-Z0-9_]*)+$/,
    'Error code must be DOT.SEPARATED.SCREAMING_SNAKE (e.g., "AUTH.INVALID_TOKEN")',
  ),
  v.brand('ErrorCode'),
);

/**
 * Inferred output type of {@link ErrorCodeSchema}. A hierarchical error code string.
 *
 * Used by {@link AppErrorSchema} for deserialization. Not part of the primary consumer surface.
 *
 * @internal
 */
export type ErrorCode = v.InferOutput<typeof ErrorCodeSchema>;

// =============================================================================
// Source Pointer Schema
// =============================================================================

/**
 * Schema for error source pointers.
 *
 * Identifies the specific input that caused the error — a JSON Pointer to a request
 * body field, a query parameter name, or a request header name. Follows the pattern
 * from RFC 9457, JSON:API, and Stripe.
 *
 * At least one field (`pointer`, `parameter`, or `header`) must be present.
 *
 * Used by {@link AppErrorSchema} for deserialization. Not part of the primary consumer surface.
 *
 * @internal
 *
 * @example
 * ```typescript
 * const source: ErrorSource = { pointer: '/body/email' };
 * const source: ErrorSource = { parameter: 'page' };
 * const source: ErrorSource = { header: 'Authorization' };
 * ```
 */
export const ErrorSourceSchema = v.pipe(
  v.strictObject({
    /** JSON Pointer (RFC 6901) to the field in the request body. Example: `"/body/email"` */
    pointer: v.optional(v.string()),
    /** Query parameter name. Example: `"page"` */
    parameter: v.optional(v.string()),
    /** Request header name. Example: `"Authorization"` */
    header: v.optional(v.string()),
  }),
  v.check(
    (obj): boolean => Boolean(obj.pointer || obj.parameter || obj.header),
    'At least one source field (pointer, parameter, or header) must be present',
  ),
);

/**
 * Inferred output type of {@link ErrorSourceSchema}. Points to the input that caused the error.
 *
 * Used by {@link AppError} for error source pointers. Not part of the primary consumer surface.
 *
 * @internal
 */
export type ErrorSource = v.InferOutput<typeof ErrorSourceSchema>;

// =============================================================================
// Validation Detail Schema
// =============================================================================

/**
 * Schema for Valibot validation error details.
 *
 * When an error originates from Valibot schema validation, this field contains
 * both the raw issues array (typed as `v.BaseIssue[]`) and the flattened output
 * from `v.flatten()` for easy consumption.
 *
 * This is typed — not `unknown`. You get full access to issue paths, messages,
 * expected types, and received values.
 *
 * Used by {@link AppErrorSchema} for deserialization. Not part of the primary consumer surface.
 *
 * @internal
 *
 * @example
 * ```typescript
 * if (result.error.validation) {
 *   for (const issue of result.error.validation.issues) {
 *     const path = issue.path?.map(p => p.key).join('.') || 'root';
 *     `${path}: ${issue.message}`; // e.g. 'name: Required'
 *   }
 * }
 * ```
 */
export const ValidationDetailSchema = v.strictObject({
  /** Raw Valibot issues array. Each issue has `type`, `message`, and optional `path`. */
  issues: v.array(v.any()),
  /** Output of `v.flatten(issues)` — nested object with field paths as keys. */
  flattened: v.any(),
});

/**
 * Typed validation details from Valibot.
 *
 * Uses Valibot's actual types for full type safety. The schema uses `v.any()`
 * for serialization compatibility, but the TypeScript type provides proper typing.
 */
export type ValidationDetail = {
  /** Raw Valibot issues. Typed as `v.BaseIssue<unknown>[]` for full access to paths and messages. */
  issues: Array<v.BaseIssue<unknown>>;
  /** Output of `v.flatten(issues)`. Provides field-level error messages as nested object. */
  flattened: v.FlatErrors<undefined>;
};

// =============================================================================
// Error Code Constants
// =============================================================================

/**
 * Hierarchical error code registry.
 *
 * Organized by domain (first segment) with specific error types (second segment).
 * All error codes live in this central registry — products import and use them.
 *
 * Use these constants instead of string literals to avoid typos and enable
 * IDE autocompletion. The {@link KnownErrorCode} union type ensures `err()`
 * only accepts codes from this registry at compile time.
 *
 * @example
 * ```typescript
 * import { err, ERRORS } from '@/schemas/result';
 *
 * // Instead of: err('AUTH.INVALID_TOKEN', ...)
 * return err(ERRORS.AUTH.INVALID_TOKEN, 'Token is invalid');
 *
 * // Pattern matching on error codes
 * if (result.error.code === ERRORS.DB.NOT_FOUND) {
 *   // handle with fallback
 * }
 * ```
 */
export const ERRORS = _deepFreeze({
  /** Schema validation errors. */
  VALIDATION: {
    /** Valibot schema validation failed. The `validation` field will contain issue details. */
    SCHEMA_FAILED: 'VALIDATION.SCHEMA_FAILED',
    /** A required field is missing from the input. */
    MISSING_FIELD: 'VALIDATION.MISSING_FIELD',
    /** A field value does not match the expected format. */
    INVALID_FORMAT: 'VALIDATION.INVALID_FORMAT',
  },
  /** Configuration loading and parsing errors. */
  CONFIG: {
    /** Configuration could not be loaded (file read, parse, or validation failure). */
    LOAD_FAILED: 'CONFIG.LOAD_FAILED',
    /** Configuration file was not found at the expected path. */
    NOT_FOUND: 'CONFIG.NOT_FOUND',
    /** Configuration file exists but contains invalid values. */
    INVALID: 'CONFIG.INVALID',
  },
  /** Authentication and authorization errors. */
  AUTH: {
    /** Token is malformed, revoked, or otherwise invalid. */
    INVALID_TOKEN: 'AUTH.INVALID_TOKEN',
    /** Token has expired (e.g., access token past its TTL). */
    EXPIRED: 'AUTH.EXPIRED',
    /** Credentials are missing or invalid — the request is not authenticated. */
    UNAUTHORIZED: 'AUTH.UNAUTHORIZED',
    /** Authenticated but lacking permission for the requested action. */
    FORBIDDEN: 'AUTH.FORBIDDEN',
    /** Resource already exists (e.g., duplicate email registration). */
    DUPLICATE: 'AUTH.DUPLICATE',
  },
  /** Database operation errors. */
  DB: {
    /** Queried record was not found. */
    NOT_FOUND: 'DB.NOT_FOUND',
    /** Constraint violation (unique, foreign key, check). */
    CONSTRAINT: 'DB.CONSTRAINT',
    /** Database connection failed. */
    CONNECTION: 'DB.CONNECTION',
  },
  /** File system and I/O errors. */
  IO: {
    /** File read failed (missing, permission denied, encoding error). */
    READ_FAILED: 'IO.READ_FAILED',
    /** File write failed (permission denied, disk full). */
    WRITE_FAILED: 'IO.WRITE_FAILED',
    /** Path stat failed (does not exist, permission denied, not accessible). */
    STAT_FAILED: 'IO.STAT_FAILED',
    /** Remote resource fetch failed (download, HTTP request to external source). */
    FETCH_FAILED: 'IO.FETCH_FAILED',
    /** Operation timed out before completing. */
    TIMEOUT: 'IO.TIMEOUT',
  },
  /** Network and HTTP errors. */
  HTTP: {
    /** Request timed out before a response was received. */
    TIMEOUT: 'HTTP.TIMEOUT',
    /** Remote resource not found (404). */
    NOT_FOUND: 'HTTP.NOT_FOUND',
    /** Remote server returned an error (5xx). */
    SERVER_ERROR: 'HTTP.SERVER_ERROR',
  },
  /** Runtime capability errors. */
  RUNTIME: {
    /** Function requires a runtime capability that is not available (e.g. Node.js API called from browser). */
    UNSUPPORTED: 'RUNTIME.UNSUPPORTED',
  },
  /** Function schema validation errors. */
  FUNCTION: {
    /** Value is not a callable function. */
    NOT_CALLABLE: 'FUNCTION.NOT_CALLABLE',
    /** Function arity (`fn.length`) is outside the expected range. */
    INVALID_ARITY: 'FUNCTION.INVALID_ARITY',
    /** Function is not async when async was required. */
    NOT_ASYNC: 'FUNCTION.NOT_ASYNC',
    /** Call-time parameter validation failed against the args schema. */
    PARAM_VALIDATION_FAILED: 'FUNCTION.PARAM_VALIDATION_FAILED',
    /** Call-time return value validation failed against the returns schema. */
    RETURN_VALIDATION_FAILED: 'FUNCTION.RETURN_VALIDATION_FAILED',
  },
  /** Locale loading and validation errors. */
  LOCALE: {
    /** Failed to load a locale file from disk. */
    LOAD_FAILED: 'LOCALE.LOAD_FAILED',
    /** Locale file failed Valibot schema validation. */
    VALIDATION_FAILED: 'LOCALE.VALIDATION_FAILED',
    /** Locale file loaded but failed to build callable functions. */
    BUILD_FAILED: 'LOCALE.BUILD_FAILED',
    /** Locale registry has missing/orphaned entries vs config.locales. */
    REGISTRY_MISMATCH: 'LOCALE.REGISTRY_MISMATCH',
    /** A flag description is missing from a locale file. */
    MISSING_FLAG_DESCRIPTION: 'LOCALE.MISSING_FLAG_DESCRIPTION',
    /** Requested locale is not in config.locales. */
    INVALID_LOCALE: 'LOCALE.INVALID_LOCALE',
    /** Fallback chain references a locale not in the registry. */
    INVALID_FALLBACK: 'LOCALE.INVALID_FALLBACK',
    /** Cannot remove the active or default locale. */
    REMOVE_DENIED: 'LOCALE.REMOVE_DENIED',
    /** Intl formatter received invalid input or locale. */
    FORMAT_FAILED: 'LOCALE.FORMAT_FAILED',
  },
  /** Template rendering errors. */
  TEMPLATE: {
    /** Template references variables not present in the context. */
    UNDEFINED_VARIABLES: 'TEMPLATE.UNDEFINED_VARIABLES',
    /** Template parameter failed schema validation. */
    PARAM_VALIDATION_FAILED: 'TEMPLATE.PARAM_VALIDATION_FAILED',
  },
  /** Resource state errors (Google AIP-193 PreconditionFailure). */
  RESOURCE: {
    /** Resource already exists (conflict). */
    ALREADY_EXISTS: 'RESOURCE.ALREADY_EXISTS',
    /** Resource is in a state that prevents the requested operation. */
    PRECONDITION_FAILED: 'RESOURCE.PRECONDITION_FAILED',
    /** Resource has been deleted or is no longer available. */
    GONE: 'RESOURCE.GONE',
    /** Requested resource version conflicts with current version. */
    CONFLICT: 'RESOURCE.CONFLICT',
    /** Resource quota exceeded (Google AIP-193 QuotaFailure). */
    QUOTA_EXCEEDED: 'RESOURCE.QUOTA_EXCEEDED',
  },
  /** Serialization and encoding errors. */
  ENCODING: {
    /** JSON parse/stringify failed. */
    JSON_FAILED: 'ENCODING.JSON_FAILED',
    /** Base64 encode/decode failed. */
    BASE64_FAILED: 'ENCODING.BASE64_FAILED',
    /** URL encode/decode failed. */
    URL_FAILED: 'ENCODING.URL_FAILED',
  },
  /** 3D scene loading and rendering errors. */
  SCENE: {
    /** Scene file could not be loaded (missing, corrupt, unsupported format). */
    LOAD_FAILED: 'SCENE.LOAD_FAILED',
    /** Scene rendering failed (GPU error, shader compilation, draw call failure). */
    RENDER_FAILED: 'SCENE.RENDER_FAILED',
    /** A required scene asset (texture, model, material) is missing. */
    ASSET_MISSING: 'SCENE.ASSET_MISSING',
  },
  /** Plugin lifecycle and sandbox errors. */
  PLUGIN: {
    /** Plugin module could not be loaded (missing, invalid entry point). */
    LOAD_FAILED: 'PLUGIN.LOAD_FAILED',
    /** Plugin initialization failed (setup hook threw or timed out). */
    INIT_FAILED: 'PLUGIN.INIT_FAILED',
    /** Plugin requires an incompatible API version. */
    API_MISMATCH: 'PLUGIN.API_MISMATCH',
    /** Plugin attempted an operation outside its sandbox permissions. */
    SANDBOX_VIOLATION: 'PLUGIN.SANDBOX_VIOLATION',
  },
  /** Project file management errors. */
  PROJECT: {
    /** Project file could not be loaded (missing, parse failure). */
    LOAD_FAILED: 'PROJECT.LOAD_FAILED',
    /** Project file could not be saved (permission denied, disk full). */
    SAVE_FAILED: 'PROJECT.SAVE_FAILED',
    /** Project file is corrupt or has invalid structure. */
    CORRUPT: 'PROJECT.CORRUPT',
    /** Project file was created with an incompatible version. */
    VERSION_MISMATCH: 'PROJECT.VERSION_MISMATCH',
  },
  /** Asset import and processing errors. */
  ASSET: {
    /** Asset import failed (file read, conversion, processing error). */
    IMPORT_FAILED: 'ASSET.IMPORT_FAILED',
    /** Asset format is not supported by the current pipeline. */
    FORMAT_UNSUPPORTED: 'ASSET.FORMAT_UNSUPPORTED',
    /** Asset exceeds maximum allowed size. */
    TOO_LARGE: 'ASSET.TOO_LARGE',
  },
  /** Internal / unexpected errors (catch-all). */
  INTERNAL: {
    /** An unexpected error occurred that does not fit any other category. */
    UNEXPECTED: 'INTERNAL.UNEXPECTED',
    /** Output validation failed — a function returned data that does not match its schema. */
    OUTPUT_VALIDATION_FAILED: 'INTERNAL.OUTPUT_VALIDATION_FAILED',
    /** Valibot `v.safeParse` threw instead of returning a result. */
    SAFE_PARSE_THREW: 'INTERNAL.SAFE_PARSE_THREW',
    /** A framework invariant was violated — programming error, should never occur in production. */
    INVARIANT_VIOLATED: 'INTERNAL.INVARIANT_VIOLATED',
  },
} as const);

// =============================================================================
// Known Error Code Union Type
// =============================================================================

/**
 * Recursively extracts all string leaf values from a nested object type.
 * Used to derive the `KnownErrorCode` union from the `ERRORS` constant.
 */
type FlattenErrors<T> = T extends string ? T : { [K in keyof T]: FlattenErrors<T[K]> }[keyof T];

/**
 * Union of all error codes defined in the {@link ERRORS} registry.
 *
 * Derived at the type level from the `ERRORS` constant — every leaf value
 * becomes a member of this union. This ensures `err()` only accepts codes
 * that exist in the registry, catching typos at compile time.
 *
 * @example
 * ```typescript
 * // These compile:
 * const code1: KnownErrorCode = ERRORS.AUTH.INVALID_TOKEN;
 * const code2: KnownErrorCode = 'DB.NOT_FOUND';
 *
 * // This does NOT compile:
 * const code3: KnownErrorCode = 'TYPO.WRONG_CODE'; // TS error
 * ```
 */
export type KnownErrorCode = FlattenErrors<typeof ERRORS>;

// =============================================================================
// Error Message Templates
// =============================================================================

/**
 * Default message templates for error codes.
 *
 * Maps known error codes to functions that generate human-readable messages
 * from the `meta` field. When `err()` is called without an explicit message,
 * the template for the given code is used. If no template exists, the code
 * string itself is used as the message.
 *
 * Explicit messages always override templates.
 *
 * @example
 * ```typescript
 * // Uses template: "Cannot read file: /app/config.ts"
 * err(ERRORS.IO.READ_FAILED, { meta: { path: '/app/config.ts' } })
 *
 * // Explicit message overrides template:
 * err(ERRORS.IO.READ_FAILED, 'Custom message here')
 * ```
 */
const ERROR_MESSAGES: Partial<Record<KnownErrorCode, (meta?: ErrorMeta) => string>> = {
  [ERRORS.VALIDATION.SCHEMA_FAILED]: (meta) =>
    meta?.errors && Array.isArray(meta.errors)
      ? meta.errors.map(String).join('; ')
      : `Schema validation failed${meta?.flag ? ` for flag '${meta.flag}'` : ''}${meta?.reason ? `: ${meta.reason}` : ''}`,
  [ERRORS.VALIDATION.MISSING_FIELD]: (meta) =>
    `Required field missing${meta?.field ? `: ${meta.field}` : ''}${meta?.locale ? ` in locale '${meta.locale}'` : ''}${meta?.location ? `. Add to ${meta.location}` : ''}`,
  [ERRORS.VALIDATION.INVALID_FORMAT]: (meta) =>
    `Format mismatch${meta?.field ? ` on ${meta.field}` : ''}${meta?.reason ? `: ${meta.reason}` : ''}${meta?.template ? ` in template "${meta.template}"` : ''}${meta?.missingVariables && Array.isArray(meta.missingVariables) ? `: undefined variables: ${meta.missingVariables.map(String).join(', ')}` : ''}`,
  [ERRORS.CONFIG.LOAD_FAILED]: (meta) =>
    `Failed to load config${meta?.configPath ? `: ${meta.configPath}` : ''}`,
  [ERRORS.CONFIG.NOT_FOUND]: (meta) =>
    `Configuration not found${meta?.path ? `: ${meta.path}` : ''}`,
  [ERRORS.CONFIG.INVALID]: (meta) =>
    `Invalid configuration${meta?.path ? ` in ${meta.path}` : ''}${meta?.error ? `: ${meta.error}` : ''}`,
  [ERRORS.AUTH.INVALID_TOKEN]: () => 'Token is malformed, revoked, or invalid',
  [ERRORS.AUTH.EXPIRED]: () => 'Token has expired',
  [ERRORS.AUTH.UNAUTHORIZED]: (meta) =>
    `Credentials are missing or invalid${meta?.tool ? ` for ${meta.tool}` : ''}${meta?.reason ? ` — ${meta.reason}` : ''}`,
  [ERRORS.AUTH.FORBIDDEN]: (meta) =>
    `Insufficient permissions for this action${meta?.tool ? ` (${meta.tool})` : ''}${meta?.reason ? ` — ${meta.reason}` : ''}`,
  [ERRORS.AUTH.DUPLICATE]: (meta) =>
    `Resource already exists${meta?.field ? `: ${meta.field}` : ''}`,
  [ERRORS.DB.NOT_FOUND]: (meta) => `Record not found${meta?.id ? `: ${meta.id}` : ''}`,
  [ERRORS.DB.CONSTRAINT]: (meta) =>
    `Constraint violation${meta?.constraint ? `: ${meta.constraint}` : ''}`,
  [ERRORS.DB.CONNECTION]: () => 'Database connection failed',
  [ERRORS.IO.READ_FAILED]: (meta) =>
    `Cannot read file${meta?.path ? `: ${meta.path}` : ''}${meta?.operation ? ` (${meta.operation})` : ''}`,
  [ERRORS.IO.WRITE_FAILED]: (meta) => `Cannot write file${meta?.path ? `: ${meta.path}` : ''}`,
  [ERRORS.IO.TIMEOUT]: (meta) =>
    `Operation timed out${meta?.timeoutMs ? ` after ${meta.timeoutMs}ms` : ''}`,
  [ERRORS.IO.STAT_FAILED]: (meta) =>
    `Path does not exist or is not accessible${meta?.path ? `: ${meta.path}` : ''}${meta?.reason ? ` — ${meta.reason}` : ''}`,
  [ERRORS.IO.FETCH_FAILED]: (meta) =>
    `Failed to fetch remote resource${meta?.url ? `: ${meta.url}` : ''}${meta?.reason ? ` — ${meta.reason}` : ''}`,
  [ERRORS.HTTP.TIMEOUT]: () => 'Request timed out',
  [ERRORS.HTTP.NOT_FOUND]: (meta) => `Resource not found${meta?.url ? `: ${meta.url}` : ''}`,
  [ERRORS.HTTP.SERVER_ERROR]: () => 'Server returned an error',
  [ERRORS.RUNTIME.UNSUPPORTED]: (meta) =>
    `${meta?.function ?? 'Operation'} requires ${meta?.requires ?? 'a different runtime'} but the current environment does not support it`,
  [ERRORS.FUNCTION.NOT_CALLABLE]: () => 'Value is not a callable function',
  [ERRORS.FUNCTION.INVALID_ARITY]: (meta) =>
    `Function arity mismatch${meta?.expected ? `: expected ${meta.expected}, got ${meta.actual}` : ''}`,
  [ERRORS.FUNCTION.NOT_ASYNC]: (meta) =>
    `Function is not async${meta?.functionName ? `: ${meta.functionName}` : ''}`,
  [ERRORS.FUNCTION.PARAM_VALIDATION_FAILED]: (meta) =>
    `Parameter validation failed${meta?.functionName ? ` in ${meta.functionName}` : ''}`,
  [ERRORS.FUNCTION.RETURN_VALIDATION_FAILED]: (meta) =>
    `Return value validation failed${meta?.functionName ? ` in ${meta.functionName}` : ''}`,
  [ERRORS.LOCALE.LOAD_FAILED]: (meta) =>
    `Failed to load locale${meta?.locale ? ` '${meta.locale}'` : ''}${meta?.toolId ? ` for tool '${meta.toolId}'` : ''}${meta?.component ? ` (${meta.component})` : ''}`,
  [ERRORS.LOCALE.VALIDATION_FAILED]: (meta) =>
    `Locale${meta?.locale ? ` '${meta.locale}'` : ''} failed schema validation${meta?.toolId ? ` for tool '${meta.toolId}'` : ''}${meta?.component ? ` (${meta.component})` : ''}`,
  [ERRORS.LOCALE.BUILD_FAILED]: (meta) =>
    `Failed to build locale${meta?.locale ? ` '${meta.locale}'` : ''}${meta?.component ? ` (${meta.component})` : ''}`,
  [ERRORS.LOCALE.REGISTRY_MISMATCH]: (meta) =>
    `Locale registry mismatch${meta?.module ? ` in ${meta.module}` : ''}${meta?.errors && Array.isArray(meta.errors) ? `: ${meta.errors.map(String).join('; ')}` : ''}`,
  [ERRORS.LOCALE.MISSING_FLAG_DESCRIPTION]: (meta) =>
    `Missing flag description${meta?.field ? ` for '${meta.field}'` : ''} in locale${meta?.locale ? ` '${meta.locale}'` : ''}${meta?.location ? `. Add to ${meta.location}` : ''}`,
  [ERRORS.LOCALE.INVALID_LOCALE]: (meta) =>
    `Invalid locale${meta?.locale ? ` '${meta.locale}'` : ''}${meta?.available && Array.isArray(meta.available) ? `. Available: ${meta.available.map(String).join(', ')}` : ''}`,
  [ERRORS.LOCALE.INVALID_FALLBACK]: (meta) =>
    `Fallback locale${meta?.locale ? ` '${meta.locale}'` : ''} not found in registry${meta?.available && Array.isArray(meta.available) ? `. Available: ${meta.available.map(String).join(', ')}` : ''}`,
  [ERRORS.LOCALE.REMOVE_DENIED]: (meta) =>
    `Cannot remove locale${meta?.locale ? ` '${meta.locale}'` : ''}${meta?.reason ? `: ${meta.reason}` : ''}`,
  [ERRORS.LOCALE.FORMAT_FAILED]: (meta) =>
    `Failed to format${meta?.type ? ` ${meta.type}` : ''}${meta?.locale ? ` for locale '${meta.locale}'` : ''}${meta?.reason ? `: ${meta.reason}` : ''}`,
  [ERRORS.TEMPLATE.UNDEFINED_VARIABLES]: (meta) =>
    `Template${meta?.template ? ` "${meta.template}"` : ''} has undefined variables${meta?.missingVariables && Array.isArray(meta.missingVariables) ? `: ${meta.missingVariables.map(String).join(', ')}` : ''}`,
  [ERRORS.TEMPLATE.PARAM_VALIDATION_FAILED]: (meta) =>
    `Template param${meta?.param ? ` '${meta.param}'` : ''} failed validation`,
  [ERRORS.SCENE.LOAD_FAILED]: (meta) =>
    `Failed to load scene${meta?.scene ? ` '${meta.scene}'` : ''}${meta?.reason ? `: ${meta.reason}` : ''}`,
  [ERRORS.SCENE.RENDER_FAILED]: (meta) =>
    `Scene rendering failed${meta?.scene ? ` for '${meta.scene}'` : ''}${meta?.reason ? `: ${meta.reason}` : ''}`,
  [ERRORS.SCENE.ASSET_MISSING]: (meta) =>
    `Scene asset missing${meta?.asset ? `: ${meta.asset}` : ''}${meta?.scene ? ` in scene '${meta.scene}'` : ''}`,
  [ERRORS.PLUGIN.LOAD_FAILED]: (meta) =>
    `Failed to load plugin${meta?.plugin ? ` '${meta.plugin}'` : ''}${meta?.reason ? `: ${meta.reason}` : ''}`,
  [ERRORS.PLUGIN.INIT_FAILED]: (meta) =>
    `Plugin initialization failed${meta?.plugin ? ` for '${meta.plugin}'` : ''}${meta?.reason ? `: ${meta.reason}` : ''}`,
  [ERRORS.PLUGIN.API_MISMATCH]: (meta) =>
    `Plugin API version mismatch${meta?.plugin ? ` for '${meta.plugin}'` : ''}${meta?.expected ? ` (expected: ${meta.expected}, got: ${meta.actual})` : ''}`,
  [ERRORS.PLUGIN.SANDBOX_VIOLATION]: (meta) =>
    `Plugin sandbox violation${meta?.plugin ? ` by '${meta.plugin}'` : ''}${meta?.operation ? `: attempted ${meta.operation}` : ''}`,
  [ERRORS.PROJECT.LOAD_FAILED]: (meta) =>
    `Failed to load project${meta?.path ? `: ${meta.path}` : ''}${meta?.reason ? ` — ${meta.reason}` : ''}`,
  [ERRORS.PROJECT.SAVE_FAILED]: (meta) =>
    `Failed to save project${meta?.path ? `: ${meta.path}` : ''}${meta?.reason ? ` — ${meta.reason}` : ''}`,
  [ERRORS.PROJECT.CORRUPT]: (meta) =>
    `Project file is corrupt${meta?.path ? `: ${meta.path}` : ''}${meta?.reason ? ` — ${meta.reason}` : ''}`,
  [ERRORS.PROJECT.VERSION_MISMATCH]: (meta) =>
    `Project version mismatch${meta?.path ? ` for ${meta.path}` : ''}${meta?.expected ? ` (expected: ${meta.expected}, got: ${meta.actual})` : ''}`,
  [ERRORS.ASSET.IMPORT_FAILED]: (meta) =>
    `Failed to import asset${meta?.asset ? `: ${meta.asset}` : ''}${meta?.reason ? ` — ${meta.reason}` : ''}`,
  [ERRORS.ASSET.FORMAT_UNSUPPORTED]: (meta) =>
    `Unsupported asset format${meta?.format ? `: ${meta.format}` : ''}${meta?.asset ? ` for '${meta.asset}'` : ''}`,
  [ERRORS.ASSET.TOO_LARGE]: (meta) =>
    `Asset exceeds size limit${meta?.asset ? `: ${meta.asset}` : ''}${meta?.size ? ` (${meta.size})` : ''}${meta?.limit ? `, max: ${meta.limit}` : ''}`,
  [ERRORS.INTERNAL.UNEXPECTED]: () => 'An unexpected error occurred',
  [ERRORS.INTERNAL.OUTPUT_VALIDATION_FAILED]: () => 'Output validation failed',
  [ERRORS.INTERNAL.SAFE_PARSE_THREW]: () => 'Valibot safeParse threw unexpectedly',
  [ERRORS.INTERNAL.INVARIANT_VIOLATED]: (meta) =>
    `Internal invariant violated${meta?.reason ? `: ${meta.reason}` : ''}${meta?.function ? ` in ${meta.function}` : ''}`,
  [ERRORS.RESOURCE.ALREADY_EXISTS]: (meta) =>
    `Resource already exists${meta?.resource ? `: ${meta.resource}` : ''}${meta?.id ? ` (${meta.id})` : ''}`,
  [ERRORS.RESOURCE.PRECONDITION_FAILED]: (meta) =>
    `Precondition failed${meta?.condition ? `: ${meta.condition}` : ''}`,
  [ERRORS.RESOURCE.GONE]: (meta) =>
    `Resource is no longer available${meta?.resource ? `: ${meta.resource}` : ''}`,
  [ERRORS.RESOURCE.CONFLICT]: (meta) =>
    `Version conflict${meta?.resource ? ` on ${meta.resource}` : ''}${meta?.expected ? ` (expected: ${meta.expected}, got: ${meta.actual})` : ''}`,
  [ERRORS.RESOURCE.QUOTA_EXCEEDED]: (meta) =>
    `Quota exceeded${meta?.quota ? ` for ${meta.quota}` : ''}${meta?.limit ? ` (limit: ${meta.limit})` : ''}`,
  [ERRORS.ENCODING.JSON_FAILED]: (meta) =>
    `JSON ${meta?.operation ?? 'operation'} failed${meta?.reason ? `: ${meta.reason}` : ''}`,
  [ERRORS.ENCODING.BASE64_FAILED]: (meta) =>
    `Base64 ${meta?.operation ?? 'operation'} failed${meta?.reason ? `: ${meta.reason}` : ''}`,
  [ERRORS.ENCODING.URL_FAILED]: (meta) =>
    `URL ${meta?.operation ?? 'operation'} failed${meta?.reason ? `: ${meta.reason}` : ''}`,
};

// =============================================================================
// Error Domain Schema
// =============================================================================

/**
 * Schema for error code domains.
 *
 * The domain is the first segment of a {@link KnownErrorCode} — the category
 * that groups related error codes. Derived from the top-level keys of the
 * {@link ERRORS} registry.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { ErrorDomainSchema } from '@/schemas/result/result';
 *
 * const result = safeParse(ErrorDomainSchema, 'AUTH');
 * if (result.ok) result.data; // 'AUTH'
 * ```
 */
export const ErrorDomainSchema = v.picklist([
  'VALIDATION',
  'CONFIG',
  'AUTH',
  'DB',
  'IO',
  'HTTP',
  'RUNTIME',
  'RESOURCE',
  'ENCODING',
  'FUNCTION',
  'LOCALE',
  'TEMPLATE',
  'SCENE',
  'PLUGIN',
  'PROJECT',
  'ASSET',
  'INTERNAL',
]);

/** Inferred output type of {@link ErrorDomainSchema}. */
export type ErrorDomain = v.InferOutput<typeof ErrorDomainSchema>;

// =============================================================================
// Error Defaults Registry
// =============================================================================

/**
 * Per-error-code default metadata.
 *
 * Maps each {@link KnownErrorCode} to default values for severity and HTTP status.
 * These defaults are applied by `err()` when the caller does not provide explicit values.
 *
 * @example
 * ```typescript
 * // err() auto-applies defaults:
 * const result = err(ERRORS.AUTH.UNAUTHORIZED);
 * result.error.severity;   // 'error' (from ERROR_DEFAULTS)
 * result.error.httpStatus; // 401 (from ERROR_DEFAULTS)
 * ```
 */
const ERROR_DEFAULTS: Partial<
  Record<
    KnownErrorCode,
    {
      severity?: ErrorSeverity;
      httpStatus?: HttpStatusCode;
    }
  >
> = {
  // VALIDATION
  [ERRORS.VALIDATION.SCHEMA_FAILED]: { severity: 'error', httpStatus: 400 },
  [ERRORS.VALIDATION.MISSING_FIELD]: { severity: 'error', httpStatus: 400 },
  [ERRORS.VALIDATION.INVALID_FORMAT]: { severity: 'error', httpStatus: 400 },
  // CONFIG
  [ERRORS.CONFIG.LOAD_FAILED]: { severity: 'error', httpStatus: 500 },
  [ERRORS.CONFIG.NOT_FOUND]: { severity: 'error', httpStatus: 500 },
  [ERRORS.CONFIG.INVALID]: { severity: 'error', httpStatus: 500 },
  // AUTH
  [ERRORS.AUTH.INVALID_TOKEN]: { severity: 'error', httpStatus: 401 },
  [ERRORS.AUTH.EXPIRED]: { severity: 'warning', httpStatus: 401 },
  [ERRORS.AUTH.UNAUTHORIZED]: { severity: 'error', httpStatus: 401 },
  [ERRORS.AUTH.FORBIDDEN]: { severity: 'error', httpStatus: 403 },
  [ERRORS.AUTH.DUPLICATE]: { severity: 'error', httpStatus: 409 },
  // DB
  [ERRORS.DB.NOT_FOUND]: { severity: 'error', httpStatus: 404 },
  [ERRORS.DB.CONSTRAINT]: { severity: 'error', httpStatus: 409 },
  [ERRORS.DB.CONNECTION]: { severity: 'fatal', httpStatus: 503 },
  // IO
  [ERRORS.IO.READ_FAILED]: { severity: 'error', httpStatus: 500 },
  [ERRORS.IO.WRITE_FAILED]: { severity: 'error', httpStatus: 500 },
  [ERRORS.IO.STAT_FAILED]: { severity: 'error', httpStatus: 500 },
  [ERRORS.IO.FETCH_FAILED]: { severity: 'error', httpStatus: 502 },
  [ERRORS.IO.TIMEOUT]: { severity: 'error', httpStatus: 504 },
  // HTTP
  [ERRORS.HTTP.TIMEOUT]: { severity: 'error', httpStatus: 504 },
  [ERRORS.HTTP.NOT_FOUND]: { severity: 'error', httpStatus: 404 },
  [ERRORS.HTTP.SERVER_ERROR]: { severity: 'error', httpStatus: 502 },
  // RUNTIME
  [ERRORS.RUNTIME.UNSUPPORTED]: { severity: 'error', httpStatus: 500 },
  // FUNCTION
  [ERRORS.FUNCTION.NOT_CALLABLE]: { severity: 'error', httpStatus: 500 },
  [ERRORS.FUNCTION.INVALID_ARITY]: { severity: 'error', httpStatus: 500 },
  [ERRORS.FUNCTION.NOT_ASYNC]: { severity: 'error', httpStatus: 500 },
  [ERRORS.FUNCTION.PARAM_VALIDATION_FAILED]: { severity: 'error', httpStatus: 400 },
  [ERRORS.FUNCTION.RETURN_VALIDATION_FAILED]: { severity: 'error', httpStatus: 500 },
  // LOCALE
  [ERRORS.LOCALE.LOAD_FAILED]: { severity: 'error', httpStatus: 500 },
  [ERRORS.LOCALE.VALIDATION_FAILED]: { severity: 'error', httpStatus: 500 },
  [ERRORS.LOCALE.BUILD_FAILED]: { severity: 'error', httpStatus: 500 },
  [ERRORS.LOCALE.REGISTRY_MISMATCH]: { severity: 'error', httpStatus: 500 },
  [ERRORS.LOCALE.MISSING_FLAG_DESCRIPTION]: { severity: 'warning', httpStatus: 500 },
  [ERRORS.LOCALE.INVALID_LOCALE]: { severity: 'error', httpStatus: 400 },
  [ERRORS.LOCALE.INVALID_FALLBACK]: { severity: 'error', httpStatus: 400 },
  [ERRORS.LOCALE.REMOVE_DENIED]: { severity: 'error', httpStatus: 400 },
  [ERRORS.LOCALE.FORMAT_FAILED]: { severity: 'error', httpStatus: 500 },
  // TEMPLATE
  [ERRORS.TEMPLATE.UNDEFINED_VARIABLES]: { severity: 'error', httpStatus: 500 },
  [ERRORS.TEMPLATE.PARAM_VALIDATION_FAILED]: { severity: 'error', httpStatus: 400 },
  // RESOURCE
  [ERRORS.RESOURCE.ALREADY_EXISTS]: { severity: 'error', httpStatus: 409 },
  [ERRORS.RESOURCE.PRECONDITION_FAILED]: { severity: 'error', httpStatus: 412 },
  [ERRORS.RESOURCE.GONE]: { severity: 'error', httpStatus: 410 },
  [ERRORS.RESOURCE.CONFLICT]: { severity: 'error', httpStatus: 409 },
  [ERRORS.RESOURCE.QUOTA_EXCEEDED]: { severity: 'error', httpStatus: 429 },
  // ENCODING
  [ERRORS.ENCODING.JSON_FAILED]: { severity: 'error', httpStatus: 400 },
  [ERRORS.ENCODING.BASE64_FAILED]: { severity: 'error', httpStatus: 400 },
  [ERRORS.ENCODING.URL_FAILED]: { severity: 'error', httpStatus: 400 },
  // SCENE
  [ERRORS.SCENE.LOAD_FAILED]: { severity: 'error', httpStatus: 500 },
  [ERRORS.SCENE.RENDER_FAILED]: { severity: 'error', httpStatus: 500 },
  [ERRORS.SCENE.ASSET_MISSING]: { severity: 'error', httpStatus: 404 },
  // PLUGIN
  [ERRORS.PLUGIN.LOAD_FAILED]: { severity: 'error', httpStatus: 500 },
  [ERRORS.PLUGIN.INIT_FAILED]: { severity: 'error', httpStatus: 500 },
  [ERRORS.PLUGIN.API_MISMATCH]: { severity: 'error', httpStatus: 409 },
  [ERRORS.PLUGIN.SANDBOX_VIOLATION]: { severity: 'error', httpStatus: 403 },
  // PROJECT
  [ERRORS.PROJECT.LOAD_FAILED]: { severity: 'error', httpStatus: 500 },
  [ERRORS.PROJECT.SAVE_FAILED]: { severity: 'error', httpStatus: 500 },
  [ERRORS.PROJECT.CORRUPT]: { severity: 'error', httpStatus: 422 },
  [ERRORS.PROJECT.VERSION_MISMATCH]: { severity: 'error', httpStatus: 409 },
  // ASSET
  [ERRORS.ASSET.IMPORT_FAILED]: { severity: 'error', httpStatus: 500 },
  [ERRORS.ASSET.FORMAT_UNSUPPORTED]: { severity: 'error', httpStatus: 415 },
  [ERRORS.ASSET.TOO_LARGE]: { severity: 'error', httpStatus: 413 },
  // INTERNAL
  [ERRORS.INTERNAL.UNEXPECTED]: { severity: 'error', httpStatus: 500 },
  [ERRORS.INTERNAL.OUTPUT_VALIDATION_FAILED]: { severity: 'error', httpStatus: 500 },
  [ERRORS.INTERNAL.SAFE_PARSE_THREW]: { severity: 'error', httpStatus: 500 },
  [ERRORS.INTERNAL.INVARIANT_VIOLATED]: { severity: 'fatal', httpStatus: 500 },
};

// =============================================================================
// AppError Type & Schema
// =============================================================================

/**
 * Universal error object for the entire monorepo.
 *
 * Every error, everywhere, has this shape. Designed from industry consensus
 * (RFC 9457, Google AIP-193, Stripe, Sentry, OpenTelemetry, JSON:API, Cloudflare).
 *
 * The `id` field (UUID v4) enables log correlation, support tickets, and deduplication
 * across systems. The `cause` field creates a typed error chain where every level
 * has the same shape — `error.cause.cause.code` is always a `KnownErrorCode`.
 *
 * **Relationship to AppErrorSchema:** `AppError` uses `KnownErrorCode` (codes
 * from the `ERRORS` registry). `AppErrorSchema` uses `ErrorCodeSchema` (regex-
 * based). The type is stricter — for construction; the schema for deserialization.
 *
 * @example
 * ```typescript
 * const error: AppError = {
 *   code: 'AUTH.INVALID_TOKEN',
 *   message: 'Token has expired',
 *   id: '550e8400-e29b-41d4-a716-446655440000',
 *   timestamp: '2026-02-08T12:34:56.789Z',
 *   stack: 'Error\n    at ...',
 *   meta: { tokenAge: 3600 },
 * };
 * ```
 */
export type AppError = {
  /** Machine-readable hierarchical error code. Example: `"AUTH.INVALID_TOKEN"` */
  code: KnownErrorCode;
  /** Human-readable, occurrence-specific description. */
  message: string;
  /** UUID v4 unique to this error occurrence. Auto-generated by `err()`. */
  id: string;
  /** ISO 8601 timestamp when the error occurred. Auto-generated by `err()`. */
  timestamp: string;
  /** Stack trace where the error originated. Auto-captured by `err()`. */
  stack: string;
  /** Typed Valibot validation details. Only present on validation errors. */
  validation?: ValidationDetail;
  /** Points to the input that caused the error (JSON Pointer, parameter, or header). */
  source?: ErrorSource;
  /** The `AppError` that caused this one. Typed — walk `cause.cause.cause` safely. */
  cause?: AppError;
  /** Extensible key-value pairs for domain-specific context. */
  meta?: ErrorMeta;
  /** Error severity level. Defaults to `'error'` when not specified. */
  severity?: ErrorSeverity;
  /** Advisory HTTP status code for this error. Used by API response formatting. */
  httpStatus?: HttpStatusCode;
  /** Suggested fix or remediation. Displayed as actionable guidance (miette `help()`, Swift `recoverySuggestion`). */
  help?: string;
  /** Links to documentation, issue trackers, or help resources. */
  links?: ErrorHelpLink[];
  /** Indexed string key-value tags for error filtering and searching. */
  tags?: ErrorTags;
  /** Retry information for retryable errors. */
  retry?: RetryInfo;
  /** Non-causal related errors. Unlike `cause` (linear chain), `related` holds sibling errors from the same context. */
  related?: AppError[];
};

/**
 * Schema for the universal error object.
 *
 * `AppError` is the single error format for the entire monorepo — CLI tools,
 * Cloudflare Workers, Svelte frontend, shared packages, structured logging.
 * Every error, everywhere, has this shape.
 *
 * Note: The schema uses {@link ErrorCodeSchema} (regex-based) rather than
 * {@link KnownErrorCode} for the `code` field. This allows deserialization of
 * errors from external sources that may use codes not in the local registry.
 *
 * Used for deserialization of errors from external sources. Not part of the primary consumer surface.
 *
 * **Core fields** (always present):
 * - `code` — Machine-readable hierarchical identifier (`"AUTH.INVALID_TOKEN"`)
 * - `message` — Human-readable, occurrence-specific description
 * - `id` — UUID v4 unique to this error occurrence (auto-generated by `err()`)
 * - `timestamp` — ISO 8601 when the error occurred (auto-generated by `err()`)
 * - `stack` — Stack trace where the error originated (auto-captured by `err()`)
 *
 * **Optional fields** (present when relevant):
 * - `validation` — Typed Valibot issues (only on validation errors)
 * - `source` — JSON Pointer / parameter / header that caused the error
 * - `cause` — The `AppError` that caused this one (error chaining)
 * - `meta` — Extensible key-value pairs for domain-specific context
 *
 * @example
 * ```typescript
 * import { AppErrorSchema, type AppError } from '@/schemas/result';
 * import { safeParse } from '@/utils/result/safe';
 *
 * // Validate a deserialized error
 * const parsed = safeParse(AppErrorSchema, jsonData);
 *
 * // Walk the cause chain
 * let current: AppError | undefined = error;
 * while (current) {
 *   // `[${current.code}] ${current.message}`
 *   current = current.cause;
 * }
 * ```
 *
 * @internal
 */
// Recursive schema: branded ErrorCode widens to `string` in StrictObjectSchema
// output, but runtime validation guarantees KnownErrorCode conformance.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AppErrorSchema: v.GenericSchema<any> = v.strictObject({
  // Core — always present
  code: ErrorCodeSchema,
  message: v.pipe(v.string(), v.minLength(1)),
  id: v.pipe(v.string(), v.uuid()),
  timestamp: v.pipe(v.string(), v.isoTimestamp()),
  stack: v.string(),

  // Validation — only on validation errors
  validation: v.optional(ValidationDetailSchema),

  // Source pointer — what input caused this
  source: v.optional(ErrorSourceSchema),

  // Error chain — typed as AppError for walkable cause chain
  cause: v.optional(v.lazy(() => AppErrorSchema)),

  // Extensibility — domain-specific context
  meta: v.optional(v.record(v.string(), v.unknown())),

  // Severity classification
  severity: v.optional(ErrorSeveritySchema),

  // HTTP status code mapping
  httpStatus: v.optional(HttpStatusCodeSchema),

  // Remediation suggestion
  help: v.optional(v.string()),

  // Documentation/help links
  links: v.optional(v.array(ErrorHelpLinkSchema)),

  // Indexed tags for filtering
  tags: v.optional(ErrorTagsSchema),

  // Retry information
  retry: v.optional(RetryInfoSchema),

  // Related errors (non-causal siblings)
  related: v.optional(v.array(v.lazy(() => AppErrorSchema))),
});

// =============================================================================
// Result Type & Schema
// =============================================================================

/**
 * Universal return type for every function in the monorepo.
 *
 * A discriminated union on the `ok` field:
 * - `{ ok: true, data: T, error: null }` — success with typed data
 * - `{ ok: false, data: null, error: AppError }` — failure with structured error
 *
 * **Usage pattern:**
 * 1. Every function returns `Result<T>`
 * 2. Callers check `if (!result.ok)` before accessing `result.data`
 * 3. Errors bubble via `return result` (pass through to caller)
 * 4. Top-level boundaries (API routes, CLI entry points) handle the final error
 *
 * TypeScript narrows correctly:
 * - After `if (!result.ok)` → `result.error` is `AppError`, `result.data` is `null`
 * - After `if (result.ok)` → `result.data` is `T`, `result.error` is `null`
 *
 * @example
 * ```typescript
 * import * as v from 'valibot';
 *
 * function loadConfig(root: string): Result<Config> {
 *   const raw = readFile(configPath);
 *   if (!raw.ok) return raw;  // bubble the error
 *
 *   const parsed = safeParse(ConfigSchema, raw.data);
 *   if (!parsed.ok) return parsed;  // bubble validation error
 *
 *   return ok(ConfigSchema, parsed.data);
 * }
 * ```
 *
 * **Runtime schemas:** `OkSchema(DataSchema)` and `ErrSchema` provide runtime
 * validation for deserialization. For construction, use `ok()` and `err()`.
 */
export type Result<T> =
  | { readonly ok: true; readonly data: DeepReadonly<T>; readonly error: null }
  | { readonly ok: false; readonly data: null; readonly error: AppError };

/**
 * Schema for the success variant of a Result.
 *
 * Used for deserialization of Result objects from external sources. Not part of the primary consumer surface.
 *
 * @internal
 *
 * @param DataSchema - Valibot schema for the `data` field.
 * @returns A strict object schema for `{ ok: true, data: T, error: null }`.
 *
 * @example Deserialization context (validating Result objects from external sources)
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const OkNumberSchema = OkSchema(v.number());
 * const result = safeParse(OkNumberSchema, { ok: true, data: 42, error: null });
 * // result.ok === true, result.data.data === 42
 * ```
 */
export function OkSchema<T extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
  DataSchema: T,
) {
  return v.strictObject({
    ok: v.literal(true),
    data: DataSchema,
    error: v.null(),
  });
}

/**
 * Schema for the failure variant of a Result.
 *
 * Used for deserialization of Result objects from external sources. Not part of the primary consumer surface.
 *
 * @internal
 *
 * @returns A strict object schema for `{ ok: false, data: null, error: AppError }`.
 *
 * @example Deserialization context (validating error Results from external sources)
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(ErrSchema, { ok: false, data: null, error: appError });
 * // result.ok === true, result.data.error.code === 'AUTH.INVALID_TOKEN'
 * ```
 */
export const ErrSchema = v.strictObject({
  ok: v.literal(false),
  data: v.null(),
  error: AppErrorSchema,
});

/**
 * Inferred output type of {@link ErrSchema}.
 *
 * Used for deserialization. Not part of the primary consumer surface.
 *
 * @internal
 */
export type ErrResult = v.InferOutput<typeof ErrSchema>;

// =============================================================================
// Constructors
// =============================================================================

/**
 * Schema for `err()` constructor options.
 *
 * All fields are optional — only provide what's relevant to the error.
 *
 * Configuration type for `err()`. Consumers use `err()` directly; this type is not typically imported.
 *
 * @internal
 *
 * @example
 * ```typescript
 * err(ERRORS.CONFIG.LOAD_FAILED, 'Failed to load config', {
 *   cause: fromUnknownError(thrown),
 *   meta: { configPath: '/app/config.ts' },
 * });
 * ```
 */
export const ErrOptionsSchema = v.strictObject({
  /** Typed Valibot validation details. Provide when the error is from schema validation. */
  validation: v.optional(ValidationDetailSchema),
  /** Points to the input that caused the error. */
  source: v.optional(ErrorSourceSchema),
  /** The AppError that caused this one. Creates a typed cause chain. */
  cause: v.optional(v.lazy(() => AppErrorSchema as unknown as v.GenericSchema<AppError>)),
  /** Domain-specific key-value context. Put anything you need here. */
  meta: v.optional(ErrorMetaSchema),
  /** Error severity level. Defaults to `'error'`. */
  severity: v.optional(ErrorSeveritySchema),
  /** Advisory HTTP status code. */
  httpStatus: v.optional(HttpStatusCodeSchema),
  /** Suggested fix or remediation for the user. */
  help: v.optional(v.string()),
  /** Links to documentation, issue trackers, or help resources. */
  links: v.optional(v.array(ErrorHelpLinkSchema)),
  /** Indexed string tags for filtering/searching. */
  tags: v.optional(ErrorTagsSchema),
  /** Retry information for retryable errors. */
  retry: v.optional(RetryInfoSchema),
  /** Non-causal related errors. */
  related: v.optional(
    v.array(v.lazy(() => AppErrorSchema as unknown as v.GenericSchema<AppError>)),
  ),
});

/** Options for the `err()` constructor. @see {@link ErrOptionsSchema} */
export type ErrOptions = v.InferOutput<typeof ErrOptionsSchema>;

/**
 * Captures a stack trace starting from the caller of `err()`.
 *
 * Uses `Error.captureStackTrace` (V8-specific) to skip the `err()` and
 * `_captureCallerStack` frames, so the stack begins at the actual call site.
 * Falls back to `new Error().stack` on non-V8 engines.
 *
 * @param message - Error message for the stack trace
 * @returns Stack trace string starting from the `err()` caller
 *
 * @internal
 */
function _captureCallerStack(message: string): string {
  const target: { stack?: string } = { stack: '' };
  if (typeof Error.captureStackTrace === 'function') {
    Error.captureStackTrace(target, err);
    return target.stack ? `Error: ${message}\n${target.stack.split('\n').slice(1).join('\n')}` : '';
  }
  return new Error(message).stack ?? '';
}

/**
 * Creates a failed `Result<never>`.
 *
 * Wraps an error in `{ ok: false, data: null, error: AppError }`.
 * The `id` (UUID v4), `timestamp` (ISO 8601), and `stack` are auto-generated.
 *
 * Use this as the return value of any function when an error condition is detected.
 * The `Result<never>` return type is assignable to any `Result<T>`, so you can
 * return `err(...)` from any function regardless of its success type.
 *
 * The `message` parameter is optional. If omitted, the message is generated from
 * the {@link ERROR_MESSAGES} template registry using the `meta` field. If no
 * template exists, the error code string itself is used as the message.
 * Explicit messages always override templates.
 *
 * @param code - A known error code from the {@link ERRORS} registry.
 * @param message - Optional human-readable description. If omitted, uses template.
 * @param options - Optional details: validation, source, cause, meta, severity,
 *   httpStatus, help, links, tags, retry, related.
 * @returns A Result with `ok: false` and a fully populated AppError.
 *
 * @example
 * ```typescript
 * // Simple error with explicit message
 * err(ERRORS.IO.READ_FAILED, 'Could not read config file')
 *
 * // Error using template message (from meta)
 * err(ERRORS.IO.READ_FAILED, { meta: { path: '/app/config.ts' } })
 *
 * // Error with severity and help text
 * err(ERRORS.AUTH.EXPIRED, 'Token expired', {
 *   severity: 'warning',
 *   help: 'Call POST /auth/refresh to obtain a new token',
 *   httpStatus: 401,
 * })
 *
 * // Retryable error with documentation link
 * err(ERRORS.HTTP.SERVER_ERROR, 'Service temporarily unavailable', {
 *   retry: { retryable: true, retryAfterMs: 5000, maxRetries: 3 },
 *   links: [{ description: 'Rate limiting docs', url: 'https://docs.example.com/rate-limits' }],
 *   httpStatus: 503,
 * })
 *
 * // Error with indexed tags for filtering
 * err(ERRORS.DB.CONNECTION, 'Database unreachable', {
 *   tags: { service: 'user-api', region: 'us-east-1' },
 *   severity: 'fatal',
 * })
 *
 * // Multiple related errors from parallel operations
 * err(ERRORS.VALIDATION.SCHEMA_FAILED, 'Multiple validation failures', {
 *   related: [emailError.error, nameError.error],
 * })
 * ```
 */
export function err(
  code: KnownErrorCode,
  message?: string | ErrOptions,
  options?: ErrOptions,
): Result<never> {
  // Support `err(code, options)` shorthand (message omitted, options as second arg)
  let resolvedMessage: string;
  let resolvedOptions: ErrOptions | undefined;

  if (typeof message === 'string') {
    resolvedMessage = message;
    resolvedOptions = options;
  } else {
    resolvedOptions = message ?? options;
    resolvedMessage = ERROR_MESSAGES[code]?.(resolvedOptions?.meta) ?? code;
  }

  const defaults = ERROR_DEFAULTS[code];

  const error: AppError = {
    code,
    message: resolvedMessage,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    stack: _captureCallerStack(resolvedMessage),
    // Apply defaults first (options override below)
    ...(defaults?.severity !== undefined && { severity: defaults.severity }),
    ...(defaults?.httpStatus !== undefined && { httpStatus: defaults.httpStatus }),
    // Existing optional fields
    ...(resolvedOptions?.validation !== undefined && {
      validation: resolvedOptions.validation,
    }),
    ...(resolvedOptions?.source !== undefined && { source: resolvedOptions.source }),
    ...(resolvedOptions?.cause !== undefined && { cause: resolvedOptions.cause }),
    ...(resolvedOptions?.meta !== undefined && { meta: resolvedOptions.meta }),
    // New fields — options override defaults
    ...(resolvedOptions?.severity !== undefined && { severity: resolvedOptions.severity }),
    ...(resolvedOptions?.httpStatus !== undefined && { httpStatus: resolvedOptions.httpStatus }),
    ...(resolvedOptions?.help !== undefined && { help: resolvedOptions.help }),
    ...(resolvedOptions?.links !== undefined && { links: resolvedOptions.links }),
    ...(resolvedOptions?.tags !== undefined && { tags: resolvedOptions.tags }),
    ...(resolvedOptions?.retry !== undefined && { retry: resolvedOptions.retry }),
    ...(resolvedOptions?.related !== undefined && { related: resolvedOptions.related }),
  };

  return Object.freeze({ ok: false as const, data: null, error: Object.freeze(error) });
}

/**
 * Creates a successful `Result<T>` with runtime schema validation.
 *
 * Every success value is validated against the provided Valibot schema at
 * runtime. This enforces correctness at three levels:
 * - **Type-check time** — `data` must satisfy `v.InferInput<TSchema>`
 * - **Compile time** — single-arg `ok(data)` calls are TS errors
 * - **Runtime** — `v.safeParse(schema, data)` validates the actual value
 *
 * If validation fails (e.g., a type assertion bypassed the type checker),
 * returns `err(ERRORS.INTERNAL.OUTPUT_VALIDATION_FAILED)` instead of a
 * success Result. No codepath skips schema validation.
 *
 * @param schema - Valibot schema to validate the data against.
 * @param data - The success value to validate and wrap.
 * @returns A Result with `ok: true` and validated data, or an error if validation fails.
 *
 * @example
 * ```typescript
 * import * as v from 'valibot';
 *
 * const UserSchema = v.strictObject({ name: v.string(), age: v.number() });
 *
 * function getUser(id: Str): Result<{ name: Str; age: Num }> {
 *   const user = db.get(id);
 *   if (!user) return err(ERRORS.DB.NOT_FOUND, `User ${id} not found`);
 *   return ok(UserSchema, user);
 * }
 *
 * ok(NumSchema, 42)             // { ok: true, data: 42, error: null }
 * ok(VoidSchema, undefined)     // { ok: true, data: undefined, error: null }
 * ok(BoolSchema, true)          // { ok: true, data: true, error: null }
 * ```
 */
export function ok<TSchema extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
  schema: TSchema,
  data: v.InferInput<TSchema>,
): Result<v.InferOutput<TSchema>> {
  const result: v.SafeParseResult<TSchema> = v.safeParse(schema, data);

  if (!result.success) {
    const validation: ValidationDetail = {
      issues: result.issues,
      flattened: v.flatten(result.issues),
    };

    return err(ERRORS.INTERNAL.OUTPUT_VALIDATION_FAILED, {
      validation,
    });
  }

  return _okResult<v.InferOutput<TSchema>>(result.output);
}

/**
 * Creates a successful Result without schema validation.
 *
 * Use when the output type has no Valibot schema (e.g., `Record<string, unknown>`,
 * discriminated unions, opaque library types). Prefer `ok(schema, data)` when a
 * schema exists — it catches output bugs at runtime.
 *
 * @param data - The success value to wrap.
 * @returns `Result<T>` — frozen success result with deep-frozen data.
 *
 * @example
 * ```typescript
 * // Types without Valibot schemas
 * okUnchecked<Record<string, unknown>>({ key: 'value' })
 * okUnchecked<StandardFlagsResult>({ kind: 'exit', code: 0 })
 * okUnchecked<NullableStr>(null)
 * ```
 */
export function okUnchecked<T>(data: T): Result<T> {
  return _okResult<T>(data);
}
