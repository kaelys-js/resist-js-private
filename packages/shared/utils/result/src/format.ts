/**
 * Error Formatting Utilities
 *
 * Format `AppError` objects for different audiences and outputs:
 * - {@link formatErrorDisplay} — Human-readable single-line (for users)
 * - {@link formatErrorDebug} — Multi-line with full details (for developers)
 * - {@link formatErrorJson} — Structured JSON string (for logs)
 * - {@link toRfc9457} — RFC 9457 Problem Details format (for HTTP APIs)
 * - {@link toHttpResponse} — Ready-to-send HTTP Response object
 * - {@link formatErrorSafe} — PII-free format (for telemetry)
 *
 * @module
 */

import * as v from 'valibot';

import { type Str, StrSchema } from '@/schemas/common';
import { type AppError, type Result, ok, okUnchecked } from '@/schemas/result/result';

// =============================================================================
// Display Format (Human-Readable, Single-Line)
// =============================================================================

/**
 * Formats an `AppError` as a human-readable single-line string.
 *
 * Produces a concise summary suitable for user-facing output (CLI, UI toast).
 * Includes the error code, message, and help text if available. Does NOT
 * include stack traces, IDs, or technical details.
 *
 * Inspired by Rust's `Display` trait.
 *
 * @param error - The AppError to format.
 * @returns `Result<Str>` — formatted string.
 *
 * @example
 * ```typescript
 * import { formatErrorDisplay } from '@/utils/result/format';
 *
 * const msg: Result<Str> = formatErrorDisplay(result.error);
 * if (msg.ok) msg.data;
 * // 'AUTH.UNAUTHORIZED: Credentials are missing or invalid'
 * // Or with help: 'AUTH.UNAUTHORIZED: Credentials missing. Tip: Call POST /auth/refresh'
 * ```
 */
export function formatErrorDisplay(error: AppError): Result<Str> {
  let output = `${error.code}: ${error.message}`;
  if (error.help) {
    output = `${output}. Tip: ${error.help}`;
  }
  return ok(StrSchema, output);
}

// =============================================================================
// Debug Format (Developer-Facing, Multi-Line)
// =============================================================================

/**
 * Formats an `AppError` as a detailed multi-line debug string.
 *
 * Includes every field: code, message, ID, timestamp, severity, HTTP status,
 * help, links, tags, retry, meta, validation, source, cause chain (recursive),
 * related errors, and stack trace. Suitable for developer logs and debugging.
 *
 * Inspired by Rust's `Debug` trait and miette's narratable report handler.
 *
 * @param error - The AppError to format.
 * @returns `Result<Str>` — detailed multi-line string.
 *
 * @example
 * ```typescript
 * import { formatErrorDebug } from '@/utils/result/format';
 *
 * const debug: Result<Str> = formatErrorDebug(result.error);
 * if (debug.ok) console.error(debug.data);
 * ```
 */
export function formatErrorDebug(error: AppError): Result<Str> {
  const lines: string[] = [
    `[${error.code}] ${error.message}`,
    `  id: ${error.id}`,
    `  timestamp: ${error.timestamp}`,
  ];

  if (error.severity) {
    lines.push(`  severity: ${error.severity}`);
  }
  if (error.httpStatus) {
    lines.push(`  httpStatus: ${error.httpStatus}`);
  }
  if (error.help) {
    lines.push(`  help: ${error.help}`);
  }
  if (error.retry) {
    const retryParts: string[] = [`retryable=${String(error.retry.retryable)}`];
    if (error.retry.retryAfterMs !== undefined) {
      retryParts.push(`after=${String(error.retry.retryAfterMs)}ms`);
    }
    if (error.retry.maxRetries !== undefined) {
      retryParts.push(`max=${String(error.retry.maxRetries)}`);
    }
    lines.push(`  retry: ${retryParts.join(', ')}`);
  }
  if (error.tags) {
    const tagEntries: string = Object.entries(error.tags)
      .map(([k, val]) => `${k}=${val}`)
      .join(', ');
    lines.push(`  tags: { ${tagEntries} }`);
  }
  if (error.links) {
    for (const link of error.links) {
      lines.push(`  link: ${link.description} → ${link.url}`);
    }
  }
  if (error.meta) {
    lines.push(`  meta: ${JSON.stringify(error.meta)}`);
  }
  if (error.source) {
    const sourceParts: string[] = [];
    if (error.source.pointer) {
      sourceParts.push(`pointer=${error.source.pointer}`);
    }
    if (error.source.parameter) {
      sourceParts.push(`parameter=${error.source.parameter}`);
    }
    if (error.source.header) {
      sourceParts.push(`header=${error.source.header}`);
    }
    lines.push(`  source: { ${sourceParts.join(', ')} }`);
  }
  if (error.validation) {
    lines.push(`  validation: ${String(error.validation.issues.length)} issue(s)`);
    for (const issue of error.validation.issues) {
      const path: string =
        issue.path?.map((p: { key?: unknown }) => String(p.key)).join('.') || 'root';
      lines.push(`    ${path}: ${issue.message}`);
    }
  }
  if (error.related && error.related.length > 0) {
    lines.push(`  related: ${String(error.related.length)} error(s)`);
    for (const rel of error.related) {
      lines.push(`    [${rel.code}] ${rel.message}`);
    }
  }
  if (error.cause) {
    lines.push(`  caused by:`);
    let current: AppError | undefined = error.cause;
    let depth = 1;
    while (current && depth <= 10) {
      lines.push(`    ${'  '.repeat(depth - 1)}[${current.code}] ${current.message}`);
      current = current.cause;
      depth++;
    }
  }
  if (error.stack) {
    lines.push(`  stack:`);
    const stackLines: string[] = error.stack
      .split('\n')
      .slice(0, 10)
      .map((l) => `    ${l.trim()}`);
    lines.push(...stackLines);
  }

  return ok(StrSchema, lines.join('\n'));
}

// =============================================================================
// JSON Format (Structured for Logs)
// =============================================================================

/**
 * Formats an `AppError` as a JSON string for structured logging.
 *
 * Serializes the full AppError object (including all optional fields)
 * to a single-line JSON string. Suitable for log aggregation systems
 * that parse structured JSON logs.
 *
 * @param error - The AppError to format.
 * @returns `Result<Str>` — JSON string.
 *
 * @example
 * ```typescript
 * import { formatErrorJson } from '@/utils/result/format';
 *
 * const json: Result<Str> = formatErrorJson(result.error);
 * if (json.ok) console.error(json.data);
 * ```
 */
export function formatErrorJson(error: AppError): Result<Str> {
  return ok(StrSchema, JSON.stringify(error));
}

// =============================================================================
// RFC 9457 Problem Details Format
// =============================================================================

/**
 * Schema for RFC 9457 Problem Details for HTTP APIs.
 *
 * @see https://www.rfc-editor.org/rfc/rfc9457.html
 */
export const ProblemDetailsSchema = v.strictObject({
  /** URI reference identifying the problem type. Defaults to `'about:blank'`. */
  type: v.string(),
  /** Short human-readable summary (stable, not occurrence-specific). */
  title: v.string(),
  /** HTTP status code. */
  status: v.number(),
  /** Occurrence-specific human-readable explanation. */
  detail: v.string(),
  /** URI identifying this specific occurrence (the error ID). */
  instance: v.string(),
  /** Machine-readable error code (extension member). */
  code: v.string(),
  /** Correlation ID (extension member). */
  correlationId: v.string(),
  /** ISO 8601 timestamp (extension member). */
  timestamp: v.string(),
  /** Validation errors (extension member, optional). */
  errors: v.optional(
    v.array(
      v.strictObject({
        field: v.string(),
        message: v.string(),
      }),
    ),
  ),
});

/** Inferred output type of {@link ProblemDetailsSchema}. */
export type ProblemDetails = v.InferOutput<typeof ProblemDetailsSchema>;

/**
 * Converts an `AppError` to RFC 9457 Problem Details format.
 *
 * Produces a JSON-serializable object conforming to `application/problem+json`.
 * Maps error codes to `type` URIs, uses the error code as `title`, and the
 * error message as `detail`.
 *
 * @param error - The AppError to convert.
 * @param baseUrl - Base URL for constructing the `type` URI (e.g., `'https://api.example.com/errors'`).
 * @returns `Result<ProblemDetails>` — RFC 9457 Problem Details object.
 *
 * @example
 * ```typescript
 * import { toRfc9457 } from '@/utils/result/format';
 *
 * const problem: Result<ProblemDetails> = toRfc9457(result.error, 'https://api.example.com/errors');
 * if (problem.ok) {
 *   // {
 *   //   type: 'https://api.example.com/errors/AUTH.UNAUTHORIZED',
 *   //   title: 'AUTH.UNAUTHORIZED',
 *   //   status: 401,
 *   //   detail: 'Credentials are missing or invalid',
 *   //   instance: 'urn:uuid:550e8400-e29b-...',
 *   //   code: 'AUTH.UNAUTHORIZED',
 *   //   correlationId: '550e8400-e29b-...',
 *   //   timestamp: '2026-02-22T12:00:00.000Z',
 *   // }
 * }
 * ```
 */
export function toRfc9457(error: AppError, baseUrl: Str): Result<ProblemDetails> {
  const validationErrors: { field: string; message: string }[] | undefined =
    error.validation?.issues.map((issue) => ({
      field: issue.path?.map((p: { key?: unknown }) => String(p.key)).join('.') || 'root',
      message: issue.message as string,
    }));

  const details: ProblemDetails = {
    type: `${baseUrl}/${error.code}`,
    title: error.code,
    status: error.httpStatus ?? 500,
    detail: error.message,
    instance: `urn:uuid:${error.id}`,
    code: error.code,
    correlationId: error.id,
    timestamp: error.timestamp,
    ...(validationErrors && validationErrors.length > 0 && { errors: validationErrors }),
  };

  return ok(ProblemDetailsSchema, details);
}

// =============================================================================
// HTTP Response
// =============================================================================

/**
 * Converts an `AppError` to an HTTP `Response` object.
 *
 * Creates a `Response` with `application/problem+json` content type,
 * the appropriate HTTP status code, and the error body in RFC 9457 format.
 *
 * Replaces the hardcoded `Response("Internal Server Error", { status: 500 })`
 * in `wrapFetchHandler`.
 *
 * @param error - The AppError to convert.
 * @param baseUrl - Base URL for RFC 9457 type URIs.
 * @returns `Result<Response>` — HTTP Response ready to send.
 *
 * @example
 * ```typescript
 * import { toHttpResponse } from '@/utils/result/format';
 *
 * const response: Result<Response> = toHttpResponse(result.error, 'https://api.example.com/errors');
 * if (response.ok) return response.data;
 * ```
 */
export function toHttpResponse(error: AppError, baseUrl: Str): Result<Response> {
  const problem: Result<ProblemDetails> = toRfc9457(error, baseUrl);
  if (!problem.ok) {
    return problem;
  }

  const response: Response = new Response(JSON.stringify(problem.data), {
    status: error.httpStatus ?? 500,
    headers: {
      'Content-Type': 'application/problem+json',
    },
  });

  return okUnchecked<Response>(response);
}

// =============================================================================
// Safe Format (PII-Free for Telemetry)
// =============================================================================

/**
 * Formats an `AppError` without PII for safe telemetry/logging.
 *
 * Strips fields that may contain user data: `message` (replaced with code),
 * `meta` (stripped), `source` (stripped), `validation.issues` (stripped).
 * Preserves: `code`, `id`, `timestamp`, `severity`, `httpStatus`, `tags`,
 * `retry`, and the cause chain (also sanitized).
 *
 * Inspired by cockroachdb/errors `GetSafeDetails()`.
 *
 * @param error - The AppError to sanitize.
 * @returns `Result<AppError>` — PII-free copy of the error.
 *
 * @example
 * ```typescript
 * import { formatErrorSafe } from '@/utils/result/format';
 *
 * const safe: Result<AppError> = formatErrorSafe(result.error);
 * if (safe.ok) sendToTelemetry(safe.data);
 * // safe.data.message === 'AUTH.UNAUTHORIZED' (code, not user message)
 * // safe.data.meta === undefined (stripped)
 * ```
 */
export function formatErrorSafe(error: AppError): Result<AppError> {
  const safeCause: AppError | undefined = error.cause
    ? (() => {
        // oxlint-disable-next-line typescript/no-non-null-assertion -- guarded by error.cause truthiness check in ternary condition
        const result: Result<AppError> = formatErrorSafe(error.cause!);
        return result.ok ? (result.data as AppError) : undefined;
      })()
    : undefined;

  const safeRelated: AppError[] | undefined = error.related
    ? error.related.map((r) => {
        const result: Result<AppError> = formatErrorSafe(r);
        return result.ok
          ? (result.data as AppError)
          : ({
              code: r.code,
              message: r.code,
              id: r.id,
              timestamp: r.timestamp,
              stack: '',
            } as AppError);
      })
    : undefined;

  const safeError: AppError = {
    code: error.code,
    message: error.code, // Replace occurrence-specific message with code
    id: error.id,
    timestamp: error.timestamp,
    stack: '', // Strip stack traces (may contain file paths)
    ...(error.severity !== undefined && { severity: error.severity }),
    ...(error.httpStatus !== undefined && { httpStatus: error.httpStatus }),
    ...(error.tags !== undefined && { tags: error.tags }), // Tags are safe (string→string)
    ...(error.retry !== undefined && { retry: error.retry }),
    ...(safeCause !== undefined && { cause: safeCause }),
    ...(safeRelated !== undefined && safeRelated.length > 0 && { related: safeRelated }),
  };

  return okUnchecked<AppError>(safeError);
}
