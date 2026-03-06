/**
 * Client Error Beacon
 *
 * Sends PII-stripped error payloads to `/api/errors` via `navigator.sendBeacon()`.
 * The beacon is non-blocking and survives page unload, making it ideal for
 * error reporting that must not interfere with user experience.
 *
 * Uses `text/plain` content type to avoid CORS preflight requests (sendBeacon
 * limitation — only `text/plain`, `application/x-www-form-urlencoded`, and
 * `multipart/form-data` are allowed without preflight).
 *
 * Skips beaconing in dev mode (`import.meta.env.DEV`) to avoid noise during
 * development. Returns `Result<Void>` — always succeeds (fire-and-forget).
 *
 * @module
 */

import type { Void } from '@/schemas/common';
import type { CapturedError } from '@/schemas/result/captured-error';
import { type Result, okUnchecked } from '@/schemas/result/result';
import { log } from '@/utils/core/logger';
import { toBeaconPayload, type BeaconPayload } from './beacon-payload';

/** Beacon endpoint path (same-origin, no CORS issues). */
const BEACON_URL = '/api/errors' as const;

/**
 * Sends a PII-stripped error to the server beacon endpoint.
 *
 * Converts the `CapturedError` to a safe payload via `toBeaconPayload`,
 * serializes as JSON, and sends via `navigator.sendBeacon()`. If the
 * beacon API is unavailable (SSR) or the queue is full, the error is
 * silently dropped — error reporting must never crash the app.
 *
 * @param captured - The full CapturedError envelope to send.
 * @returns `Result<Void>` — always succeeds (fire-and-forget).
 *
 * @example
 * ```typescript
 * import { beaconError } from '$lib/errors/beacon';
 *
 * setupGlobalErrorHandling({
 *   onError: (captured) => {
 *     logErrorToConsole(captured);
 *     beaconError(captured);
 *   },
 * });
 * ```
 */
export function beaconError(captured: CapturedError): Result<Void> {
	// Skip in dev mode — no need to beacon during development
	if (import.meta.env.DEV) {
		return okUnchecked<Void>(undefined);
	}

	// SSR guard — navigator may not exist
	if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
		log.debug('sendBeacon unavailable (SSR or unsupported browser)');
		return okUnchecked<Void>(undefined);
	}

	const payloadResult: Result<BeaconPayload> = toBeaconPayload(captured);
	if (!payloadResult.ok) {
		log.warn(`Failed to build beacon payload (${payloadResult.error.code})`);
		return okUnchecked<Void>(undefined);
	}

	try {
		const json: string = JSON.stringify(payloadResult.data);
		// text/plain avoids CORS preflight — sendBeacon only allows simple content types
		// oxlint-disable-next-line no-undef -- Blob is a browser global
		const blob: Blob = new Blob([json], { type: 'text/plain' });
		navigator.sendBeacon(BEACON_URL, blob);
	} catch {
		/* sendBeacon threw (e.g. payload too large) — non-critical, drop silently */
	}

	return okUnchecked<Void>(undefined);
}
