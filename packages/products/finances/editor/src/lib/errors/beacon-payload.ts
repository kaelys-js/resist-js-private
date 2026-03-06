/**
 * Beacon Payload Schema
 *
 * Wire format for client error beacons sent to `/api/errors`.
 * A strict subset of {@link CapturedError} with PII fields excluded.
 *
 * PII-containing fields (`user`, `contexts`, `meta`, `original`, `serverName`)
 * are deliberately omitted from the schema so `v.strictObject()` rejects
 * payloads that include them. The error field is PII-stripped via
 * {@link formatErrorSafe} before inclusion.
 *
 * @module
 */

import * as v from 'valibot';

import type { Str } from '@/schemas/common';
import {
	type CapturedError,
	BreadcrumbSchema,
	CapturedErrorTypeSchema,
	ErrorFingerprintSchema,
} from '@/schemas/result/captured-error';
import {
	type AppError,
	AppErrorSchema,
	ErrorTagsSchema,
	type Result,
	okUnchecked,
} from '@/schemas/result/result';
import { formatErrorSafe } from '@/utils/result/format';

// =============================================================================
// Runtime Kind (inlined — same as captured-error.ts, avoids cross-package dep)
// =============================================================================

/**
 * Inlined runtime kind for the beacon payload.
 * Matches the canonical `_RuntimeKindSchema` in `captured-error.ts`.
 *
 * @internal
 */
const _BeaconRuntimeKindSchema = v.picklist([
	'node-tty',
	'node-pipe',
	'worker',
	'browser',
	'web-worker',
	'shared-worker',
	'service-worker',
]);

// =============================================================================
// Beacon Payload Schema
// =============================================================================

/**
 * Schema for the client error beacon wire format.
 *
 * Strict subset of `CapturedError` — excludes `user`, `contexts`, `meta`,
 * `original`, and `serverName` to prevent PII leakage. The `error` field
 * must be PII-stripped (via `formatErrorSafe`) before inclusion.
 *
 * Uses `v.strictObject()` so any extra fields cause validation failure.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { BeaconPayloadSchema } from '$lib/errors/beacon-payload';
 *
 * const result = safeParse(BeaconPayloadSchema, payload);
 * if (!result.ok) return new Response(null, { status: 400 });
 * ```
 */
export const BeaconPayloadSchema = v.strictObject({
	/** UUID v4 unique to this error event. Correlation ID. */
	id: v.pipe(v.string(), v.uuid()),
	/** What kind of runtime error was captured. */
	type: CapturedErrorTypeSchema,
	/** PII-stripped AppError (message replaced with code, stack/meta/source removed). */
	error: v.lazy(() => AppErrorSchema as unknown as v.GenericSchema<AppError>),
	/** Runtime environment where the error was captured. */
	environment: _BeaconRuntimeKindSchema,
	/** ISO 8601 timestamp when the error was captured. */
	timestamp: v.pipe(v.string(), v.isoTimestamp()),
	/** Whether this error is fatal. */
	fatal: v.boolean(),
	/** Trail of events leading up to the error. */
	breadcrumbs: v.optional(v.array(BreadcrumbSchema)),
	/** Indexed string tags for filtering (service, route, side). */
	tags: v.optional(ErrorTagsSchema),
	/** Software release version. */
	release: v.optional(v.string()),
	/** Fingerprint for error grouping/deduplication. */
	fingerprint: v.optional(ErrorFingerprintSchema),
});

/** Inferred output type of {@link BeaconPayloadSchema}. */
export type BeaconPayload = v.InferOutput<typeof BeaconPayloadSchema>;

// =============================================================================
// Conversion
// =============================================================================

/**
 * Converts a `CapturedError` into a beacon-safe payload.
 *
 * Strips PII from the error via `formatErrorSafe`, then builds a
 * `BeaconPayload` containing only the safe subset of fields.
 *
 * @param captured - The full CapturedError envelope.
 * @returns `Result<BeaconPayload>` — the PII-free wire payload.
 *
 * @example
 * ```typescript
 * import { toBeaconPayload } from '$lib/errors/beacon-payload';
 *
 * const result = toBeaconPayload(captured);
 * if (result.ok) navigator.sendBeacon('/api/errors', JSON.stringify(result.data));
 * ```
 */
export function toBeaconPayload(captured: CapturedError): Result<BeaconPayload> {
	const safeError: Result<AppError> = formatErrorSafe(captured.error as AppError);
	if (!safeError.ok) return safeError;

	const payload: BeaconPayload = {
		id: captured.id as Str,
		type: captured.type,
		error: safeError.data as AppError,
		environment: captured.environment,
		timestamp: captured.timestamp as Str,
		fatal: captured.fatal,
		...(captured.breadcrumbs !== undefined && {
			breadcrumbs: captured.breadcrumbs as typeof captured.breadcrumbs,
		}),
		...(captured.tags !== undefined && { tags: captured.tags }),
		...(captured.release !== undefined && { release: captured.release }),
		...(captured.fingerprint !== undefined && { fingerprint: captured.fingerprint }),
	};

	return okUnchecked<BeaconPayload>(payload);
}
