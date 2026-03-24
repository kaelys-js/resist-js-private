/**
 * Client Error Beacon — sends PII-stripped payloads via sendBeacon().
 *
 * @module
 */

import { VoidSchema, StrSchema, type Str, type Void } from '@/schemas/common';
import { CapturedErrorSchema, type CapturedError } from '@/schemas/result/captured-error';
import { type AppError, type Result, ok, err, ERRORS } from '@/schemas/result/result';
import { log } from '@/utils/core/logger';
import { safeStringify } from '@/utils/core/object';
import { safeParse, fromUnknownError } from '@/utils/result/safe';

import { toBeaconPayload, type BeaconPayload } from '@/utils/beacon/beacon-payload';

// =============================================================================
// API
// =============================================================================

/**
 * Sends a PII-stripped error to a server beacon endpoint.
 *
 * Converts the `CapturedError` to a safe payload via `toBeaconPayload`,
 * serializes as JSON, and sends via `navigator.sendBeacon()`. If the
 * beacon API is unavailable (SSR) or the queue is full, the error is
 * silently dropped — error reporting must never crash the app.
 *
 * @param {CapturedError} captured - The full CapturedError envelope to send.
 * @param {Str} endpoint - The beacon endpoint URL. Defaults to `'/api/errors'`.
 * @returns {Result<Void>} Always succeeds (fire-and-forget).
 *
 * @example
 * ```typescript
 * import { beaconError } from '@/utils/beacon/beacon';
 *
 * setupGlobalErrorHandling({
 *   onError: (captured: CapturedError): Void => {
 *     logErrorToConsole(captured);
 *     beaconError(captured);
 *   },
 * });
 * ```
 */
export function beaconError(
  captured: CapturedError,
  endpoint: Str,
): Result<Void> {
  const capturedResult: Result<CapturedError> = safeParse(CapturedErrorSchema, captured);

  if (!capturedResult.ok) return capturedResult;

  const endpointResult: Result<Str> = safeParse(StrSchema, endpoint);

  if (!endpointResult.ok) return endpointResult;

  // Skip in dev mode — no need to beacon during development
  if (import.meta.env.DEV) {
    return ok(VoidSchema, undefined);
  }

  // SSR guard — navigator may not exist
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
    log.debug('sendBeacon unavailable (SSR or unsupported browser)');

    return ok(VoidSchema, undefined);
  }

  const payloadResult: Result<BeaconPayload> = toBeaconPayload(capturedResult.data as CapturedError); // cast safe: safeParse validates, readonly → mutable for function call

  if (!payloadResult.ok) {
    log.warn(`Failed to build beacon payload (${payloadResult.error.code})`);

    return err(ERRORS.INTERNAL.UNEXPECTED, { cause: payloadResult.error });
  }

  const jsonResult: Result<Str> = safeStringify(payloadResult.data);

  if (!jsonResult.ok) {
    return err(ERRORS.INTERNAL.UNEXPECTED, { cause: jsonResult.error });
  }

  try {
    // text/plain avoids CORS preflight — sendBeacon only allows simple content types
    const blob: Blob = new Blob([jsonResult.data], { type: 'text/plain' });
    navigator.sendBeacon(endpointResult.data, blob);
  } catch (error: unknown) {
    // sendBeacon threw (e.g. payload too large) — propagate as Result error
    const cause: AppError = fromUnknownError(error);

    return err(ERRORS.NETWORK.PORT_UNAVAILABLE, { cause });
  }

  return ok(VoidSchema, undefined);
}
