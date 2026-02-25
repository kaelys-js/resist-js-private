/**
 * Captured Error Envelope
 *
 * Runtime envelope type wrapping uncaught/unhandled errors intercepted
 * at environment boundaries. The `error` field is an {@link AppError}
 * (converted via `fromUnknownError`). The `original` field preserves
 * the raw thrown value for inspection.
 *
 * Used by the global error handler infrastructure (`setupGlobalErrorHandling`
 * in `signal.ts`) and by `reportError()` for Result errors that bubble to
 * the top of the call stack. Not part of the `Result<T>` control flow.
 *
 * @example
 * ```typescript
 * import type { CapturedError } from '@/schemas/result/captured-error';
 *
 * const captured: CapturedError = {
 *   type: 'uncaughtException',
 *   id: '550e8400-e29b-41d4-a716-446655440000',
 *   error: someAppError,
 *   original: thrown,
 *   environment: 'node-tty',
 *   timestamp: '2026-02-22T12:00:00.000Z',
 *   fatal: true,
 *   meta: { signal: 'SIGINT' },
 * };
 * ```
 *
 * @module
 */

import * as v from 'valibot';

import { type AppError, AppErrorSchema, ErrorTagsSchema } from '@/schemas/result/result';

// =============================================================================
// Runtime Kind (inlined to avoid circular dependency with @/schemas/common)
// =============================================================================

/**
 * Inlined runtime kind picklist. Canonical source: `@/schemas/common`.
 *
 * Inlined here because `@/schemas/result` is a leaf package with zero
 * dependencies. Adding `@/schemas/common` would create a circular dependency.
 *
 * Used by {@link CapturedErrorSchema} only.
 *
 * @internal
 */
const _RuntimeKindSchema = v.picklist([
	'node-tty',
	'node-pipe',
	'worker',
	'browser',
	'web-worker',
	'shared-worker',
	'service-worker',
]);

// =============================================================================
// Breadcrumb Schema
// =============================================================================

/**
 * Schema for breadcrumb severity levels.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { BreadcrumbLevelSchema } from '@/schemas/result/captured-error';
 *
 * const result = safeParse(BreadcrumbLevelSchema, 'info');
 * if (result.ok) result.data; // 'info'
 * ```
 */
export const BreadcrumbLevelSchema = v.picklist(['fatal', 'error', 'warning', 'info', 'debug']);

/** Inferred output type of {@link BreadcrumbLevelSchema}. */
export type BreadcrumbLevel = v.InferOutput<typeof BreadcrumbLevelSchema>;

/**
 * Schema for a breadcrumb event.
 *
 * Breadcrumbs are a timestamped trail of events leading up to an error.
 * They provide context about what happened before the failure — navigation,
 * HTTP requests, user actions, console logs, state changes.
 *
 * Follows Sentry breadcrumb conventions.
 *
 * @example
 * ```typescript
 * const breadcrumb: Breadcrumb = {
 *   type: 'http',
 *   category: 'fetch',
 *   message: 'GET /api/users → 200',
 *   level: 'info',
 *   timestamp: '2026-02-22T12:00:00.000Z',
 *   data: { url: '/api/users', method: 'GET', status_code: 200 },
 * };
 * ```
 */
export const BreadcrumbSchema = v.strictObject({
	/** Breadcrumb type: `'default'`, `'http'`, `'navigation'`, `'error'`, `'debug'`, `'query'`, `'ui'`, `'user'`, `'info'`. */
	type: v.optional(
		v.picklist(['default', 'http', 'navigation', 'error', 'debug', 'query', 'ui', 'user', 'info']),
	),
	/** Dot-separated category string (e.g., `'fetch'`, `'console'`, `'ui.click'`). */
	category: v.optional(v.string()),
	/** Human-readable description of the breadcrumb event. */
	message: v.optional(v.string()),
	/** Severity level of this breadcrumb. */
	level: v.optional(BreadcrumbLevelSchema),
	/** ISO 8601 timestamp when this breadcrumb was recorded. */
	timestamp: v.pipe(v.string(), v.isoTimestamp()),
	/** Arbitrary data associated with this breadcrumb. */
	data: v.optional(v.record(v.string(), v.unknown())),
});

/** Inferred output type of {@link BreadcrumbSchema}. */
export type Breadcrumb = v.InferOutput<typeof BreadcrumbSchema>;

// =============================================================================
// Error User Context Schema
// =============================================================================

/**
 * Schema for user context attached to captured errors.
 *
 * Identifies which user was affected by the error. All fields are optional
 * to support anonymous users and privacy requirements.
 *
 * Follows Sentry user context conventions.
 *
 * @example
 * ```typescript
 * const user: ErrorUserContext = {
 *   id: 'user-123',
 *   email: 'user@example.com',
 *   username: 'jdoe',
 * };
 * ```
 */
export const ErrorUserContextSchema = v.strictObject({
	/** Unique user identifier. */
	id: v.optional(v.string()),
	/** User email address. */
	email: v.optional(v.pipe(v.string(), v.email())),
	/** Username or display name. */
	username: v.optional(v.string()),
	/** IP address of the user (for server-side errors). */
	ipAddress: v.optional(v.string()),
});

/** Inferred output type of {@link ErrorUserContextSchema}. */
export type ErrorUserContext = v.InferOutput<typeof ErrorUserContextSchema>;

// =============================================================================
// Error Contexts Schema
// =============================================================================

/**
 * Schema for structured error contexts.
 *
 * Named contexts provide structured debugging information about the
 * environment where the error occurred. Each context is a named bag
 * of key-value pairs. Standard contexts (`os`, `browser`, `device`,
 * `runtime`, `app`) follow Sentry conventions.
 *
 * @example
 * ```typescript
 * const contexts: ErrorContexts = {
 *   os: { name: 'macOS', version: '15.2' },
 *   browser: { name: 'Chrome', version: '120.0' },
 *   app: { name: 'my-api', version: '1.2.3' },
 * };
 * ```
 */
export const ErrorContextsSchema = v.record(v.string(), v.record(v.string(), v.unknown()));

/** Inferred output type of {@link ErrorContextsSchema}. */
export type ErrorContexts = v.InferOutput<typeof ErrorContextsSchema>;

// =============================================================================
// Error Fingerprint Schema
// =============================================================================

/**
 * Schema for error fingerprints.
 *
 * A fingerprint is an array of strings used to group error occurrences.
 * Errors with identical fingerprints are grouped together for counting
 * and deduplication. Follows Sentry fingerprinting conventions.
 *
 * Default fingerprint is `['{{ default }}']` which groups by stack trace.
 * Custom fingerprints override the default grouping.
 *
 * @example
 * ```typescript
 * // Group by error code only (ignore stack trace)
 * const fingerprint: ErrorFingerprint = ['AUTH.UNAUTHORIZED'];
 *
 * // Group by code + route
 * const fingerprint: ErrorFingerprint = ['DB.CONNECTION', '/api/users'];
 *
 * // Default grouping (by stack trace)
 * const fingerprint: ErrorFingerprint = ['{{ default }}'];
 * ```
 */
export const ErrorFingerprintSchema = v.array(v.string());

/** Inferred output type of {@link ErrorFingerprintSchema}. */
export type ErrorFingerprint = v.InferOutput<typeof ErrorFingerprintSchema>;

// =============================================================================
// CapturedError Type & Schema
// =============================================================================

/**
 * Schema for the type of captured runtime error.
 *
 * Discriminates between different classes of unhandled errors
 * intercepted by the global error handler, plus `'resultError'`
 * for Result errors that bubble to the top of the call stack.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { CapturedErrorTypeSchema } from '@/schemas/result/captured-error';
 *
 * const result = safeParse(CapturedErrorTypeSchema, 'uncaughtException');
 * if (result.ok) result.data; // 'uncaughtException'
 * ```
 */
export const CapturedErrorTypeSchema = v.picklist([
	'uncaughtException',
	'unhandledRejection',
	'resourceError',
	'cspViolation',
	'webSocketError',
	'signal',
	'resultError',
]);

/** Inferred output type of {@link CapturedErrorTypeSchema}. */
export type CapturedErrorType = v.InferOutput<typeof CapturedErrorTypeSchema>;

/**
 * Schema for a captured runtime error event.
 *
 * Envelope type wrapping uncaught/unhandled errors intercepted at the
 * environment boundary, or Result errors that propagated to the top of
 * the call stack. The `error` field is an `AppError` (converted via
 * `fromUnknownError` or preserved directly for `resultError` type).
 * The `original` field preserves the raw thrown value for inspection.
 *
 * @example
 * ```typescript
 * import type { CapturedError } from '@/schemas/result/captured-error';
 * import type { AppError } from '@/schemas/result/result';
 *
 * const someAppError: AppError = { ... };
 * const captured: CapturedError = {
 *   type: 'uncaughtException',
 *   id: '550e8400-e29b-41d4-a716-446655440000',
 *   error: someAppError,
 *   original: thrown,
 *   environment: 'node-tty',
 *   timestamp: '2026-02-22T12:00:00.000Z',
 *   fatal: true,
 *   meta: { signal: 'SIGINT' },
 * };
 * ```
 */
export const CapturedErrorSchema = v.strictObject({
	/** Discriminant: what kind of runtime error. */
	type: CapturedErrorTypeSchema,
	/** UUID v4 unique to this captured error event. For correlation with logs. */
	id: v.pipe(v.string(), v.uuid()),
	/** Structured error (converted from the original via fromUnknownError). */
	error: v.lazy(() => AppErrorSchema as unknown as v.GenericSchema<AppError>),
	/** The original thrown/rejected value, preserved for inspection. */
	original: v.unknown(),
	/** Runtime environment where the error was captured. */
	environment: _RuntimeKindSchema,
	/** ISO 8601 timestamp when the error was captured. */
	timestamp: v.pipe(v.string(), v.isoTimestamp()),
	/** Whether this error is fatal (will cause process termination). */
	fatal: v.boolean(),
	/** Extensible key-value pairs for context (signal name, resource URL, log context, etc.). */
	meta: v.optional(v.record(v.string(), v.unknown())),
	/** Trail of events leading up to this error. */
	breadcrumbs: v.optional(v.array(BreadcrumbSchema)),
	/** User affected by this error. */
	user: v.optional(ErrorUserContextSchema),
	/** Structured contexts (OS, browser, device, runtime, app, custom). */
	contexts: v.optional(ErrorContextsSchema),
	/** Fingerprint for error grouping/deduplication. */
	fingerprint: v.optional(ErrorFingerprintSchema),
	/** Indexed string tags for filtering (service, route, environment). */
	tags: v.optional(ErrorTagsSchema),
	/** Software release version where this error occurred. */
	release: v.optional(v.string()),
	/** Deployment environment name (e.g., `'production'`, `'staging'`). */
	serverName: v.optional(v.string()),
});

/** Inferred output type of {@link CapturedErrorSchema}. */
export type CapturedError = v.InferOutput<typeof CapturedErrorSchema>;
