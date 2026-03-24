/**
 * Error Reporting Breadcrumbs — navigation and fetch event tracking.
 *
 * @module
 */

import * as v from 'valibot';

import {
  NullableStrSchema,
  StrSchema,
  VoidSchema,
  type Bool,
  type NullableStr,
  type Str,
  type Void,
} from '@/schemas/common';
import type { BreadcrumbLevel } from '@/schemas/result/captured-error';
import { type AppError, type Result, ok, err, ERRORS } from '@/schemas/result/result';
import { addBreadcrumb } from '@/utils/result/breadcrumbs';
import { safeParse, fromUnknownError } from '@/utils/result/safe';

// =============================================================================
// Schemas
// =============================================================================

/** Original fetch reference, saved for teardown. */
let originalFetch: typeof globalThis.fetch | null = null; // cast safe: nullable state for lazy init

/** Default fetch endpoints to skip (avoids recursion with beacon endpoint). */
const DEFAULT_SKIP_URLS: readonly Str[] = ['/api/errors'];

/** Schema for initFetchBreadcrumbs options. */
const FetchBreadcrumbOptionsSchema = v.strictObject({
  /** URL substrings to skip breadcrumb recording for. */
  skipUrls: v.optional(v.array(StrSchema), ['/api/errors']),
});

// =============================================================================
// Helpers
// =============================================================================

/**
 * Extracts the URL string from a fetch input.
 *
 * @param {RequestInfo | URL} input - The fetch input (string, URL, or Request).
 * @returns {Result<Str>} The URL as a string.
 */
function extractUrl(input: RequestInfo | URL): Result<Str> {
  if (typeof input === 'string') return ok(StrSchema, input);

  if (input instanceof URL) return ok(StrSchema, input.pathname);

  if (input instanceof Request) return ok(StrSchema, input.url);

  return ok(StrSchema, '(unknown)');
}

/**
 * Extracts the HTTP method from a fetch input.
 *
 * @param {RequestInfo | URL} input - The fetch input.
 * @param {RequestInit | undefined} init - The fetch init options.
 * @returns {Result<Str>} The HTTP method (defaults to 'GET').
 */
function extractMethod(input: RequestInfo | URL, init: RequestInit | undefined): Result<Str> {
  if (init?.method) return ok(StrSchema, init.method.toUpperCase());

  if (input instanceof Request) return ok(StrSchema, input.method.toUpperCase());

  return ok(StrSchema, 'GET');
}

// =============================================================================
// API
// =============================================================================

/**
 * Adds a navigation breadcrumb to the global trail.
 *
 * Called from the app's layout component on route changes (via `beforeNavigate`
 * or `afterNavigate`). `from` is null on initial page load.
 *
 * @param {NullableStr} from - The URL path being navigated away from (null on initial load).
 * @param {Str} to - The URL path being navigated to.
 * @returns {Result<Void>} Success or validation error.
 *
 * @example
 * ```typescript
 * import { addNavigationBreadcrumb } from '@/utils/beacon/breadcrumbs';
 *
 * afterNavigate(({ from, to }): Void => {
 *   addNavigationBreadcrumb(
 *     from?.url.pathname ?? null,
 *     to?.url.pathname ?? '/',
 *   );
 * });
 * ```
 */
export function addNavigationBreadcrumb(from: NullableStr, to: Str): Result<Void> {
  const fromResult: Result<NullableStr> = safeParse(NullableStrSchema, from);

  if (!fromResult.ok) return fromResult;

  const toResult: Result<Str> = safeParse(StrSchema, to);

  if (!toResult.ok) return toResult;

  const fromLabel: Str = (fromResult.data ?? '(initial)') as Str; // cast safe: string concatenation

  addBreadcrumb({
    type: 'navigation',
    category: 'route',
    message: `${fromLabel} → ${toResult.data}`,
    level: 'info',
  });

  return ok(VoidSchema, undefined);
}

/**
 * Wraps `globalThis.fetch` to add HTTP breadcrumbs for every request.
 *
 * Records the method, URL, and status code (or error message) for each
 * fetch call. Skips breadcrumbs for configurable endpoints (defaults to
 * `['/api/errors']`) to prevent recursion with the error beacon.
 *
 * Call once during client initialization. Call
 * `teardownFetchBreadcrumbs()` to restore the original `fetch`.
 *
 * @param {readonly Str[]} skipUrls - URL substrings to skip breadcrumb recording for.
 * @returns {Result<Void>} Success or error.
 *
 * @example
 * ```typescript
 * import { initFetchBreadcrumbs } from '@/utils/beacon/breadcrumbs';
 *
 * // Default: skips /api/errors
 * initFetchBreadcrumbs();
 *
 * // Custom: skip multiple endpoints
 * initFetchBreadcrumbs(['/api/errors', '/api/v2/errors', '/healthz']);
 * ```
 */
export function initFetchBreadcrumbs(skipUrls: readonly Str[]): Result<Void> {
  const skipUrlsResult: Result<readonly Str[]> = safeParse(v.array(StrSchema), skipUrls);

  if (!skipUrlsResult.ok) return skipUrlsResult;

  // Already initialized — skip
  if (originalFetch !== null) {
    return ok(VoidSchema, undefined);
  }

  originalFetch = globalThis.fetch;
  const original: typeof fetch = originalFetch;
  const urls: readonly Str[] = skipUrlsResult.data;

  globalThis.fetch = async (
    input: RequestInfo | URL,
    init: RequestInit | undefined,
  ): Promise<Response> => {
    const urlResult: Result<Str> = extractUrl(input);

    if (!urlResult.ok) return original(input, init);

    const methodResult: Result<Str> = extractMethod(input, init);

    if (!methodResult.ok) return original(input, init);

    const url: Str = urlResult.data;
    const method: Str = methodResult.data;

    // Skip configured endpoints to avoid infinite recursion
    if (urls.some((skip: Str): Bool => url.includes(skip))) {
      return original(input, init);
    }

    try {
      const response: Response = await original(input, init);
      const level: BreadcrumbLevel = response.ok ? 'info' : 'error';

      addBreadcrumb({
        type: 'http',
        category: 'fetch',
        message: `${method} ${url} → ${String(response.status)}`,
        level,
        data: { method, url, status_code: response.status },
      });

      return response;
    } catch (error: unknown) {
      // Fetch threw — record breadcrumb then re-throw as structured error
      const cause: AppError = fromUnknownError(error);

      addBreadcrumb({
        type: 'http',
        category: 'fetch',
        message: `${method} ${url} → ${cause.message}`,
        level: 'warning',
        data: { method, url, error: cause.message },
      });

      // integration boundary: fetch API contract requires throw on network errors
      throw new Error(cause.message, { cause });
    }
  };

  return ok(VoidSchema, undefined);
}

/**
 * Restores the original `globalThis.fetch`, removing the breadcrumb wrapper.
 *
 * Safe to call multiple times — no-op if not initialized.
 *
 * @returns {Result<Void>} Success.
 *
 * @example
 * ```typescript
 * import { teardownFetchBreadcrumbs } from '@/utils/beacon/breadcrumbs';
 *
 * teardownFetchBreadcrumbs();
 * ```
 */
export function teardownFetchBreadcrumbs(): Result<Void> {
  if (originalFetch !== null) {
    globalThis.fetch = originalFetch;
    originalFetch = null;
  }

  return ok(VoidSchema, undefined);
}
