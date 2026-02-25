/**
 * Breadcrumb Collection
 *
 * Collects a trail of breadcrumb events for attachment to `CapturedError`.
 * Provides `addBreadcrumb()`, `drainBreadcrumbs()`, `getBreadcrumbs()`,
 * and `clearBreadcrumbs()` for manual breadcrumb management.
 *
 * Breadcrumbs are stored in a global buffer (max 100 entries, FIFO eviction).
 * Call `drainBreadcrumbs()` to collect and clear the buffer when creating
 * a `CapturedError`.
 *
 * @module
 */

import { type Num, VoidSchema } from '@/schemas/common';
import { type Breadcrumb, BreadcrumbSchema } from '@/schemas/result/captured-error';
import { type Result, ok, okUnchecked } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

/** Maximum number of breadcrumbs to retain (oldest are dropped). */
const MAX_BREADCRUMBS: Num = 100 as Num;

/** Global breadcrumb buffer. */
let _breadcrumbs: Breadcrumb[] = [];

/**
 * Adds a breadcrumb to the global breadcrumb trail.
 *
 * If the buffer exceeds {@link MAX_BREADCRUMBS}, the oldest breadcrumb
 * is dropped (FIFO). Timestamp is auto-generated if not provided.
 *
 * @param breadcrumb - The breadcrumb to add (timestamp auto-filled if missing).
 * @returns `Result<void>` — success or validation error.
 *
 * @example
 * ```typescript
 * import { addBreadcrumb } from '@/utils/result/breadcrumbs';
 *
 * addBreadcrumb({
 *   type: 'http',
 *   category: 'fetch',
 *   message: 'GET /api/users → 200',
 *   level: 'info',
 *   timestamp: new Date().toISOString(),
 * });
 * ```
 */
export function addBreadcrumb(
	breadcrumb: Omit<Breadcrumb, 'timestamp'> & { timestamp?: string },
): Result<void> {
	const complete: unknown = {
		...breadcrumb,
		timestamp: breadcrumb.timestamp ?? new Date().toISOString(),
	};

	const validated: Result<Breadcrumb> = safeParse(BreadcrumbSchema, complete);
	if (!validated.ok) return validated;

	_breadcrumbs.push(validated.data as Breadcrumb);

	if (_breadcrumbs.length > MAX_BREADCRUMBS) {
		_breadcrumbs = _breadcrumbs.slice(-MAX_BREADCRUMBS);
	}

	return ok(VoidSchema, undefined);
}

/**
 * Returns all collected breadcrumbs and clears the buffer.
 *
 * Call this when creating a `CapturedError` to attach the breadcrumb trail.
 * The buffer is emptied after draining so subsequent errors get a fresh trail.
 *
 * @returns `Result<ReadonlyArray<Breadcrumb>>` — the breadcrumb trail.
 *
 * @example
 * ```typescript
 * import { drainBreadcrumbs } from '@/utils/result/breadcrumbs';
 *
 * const crumbs: Result<ReadonlyArray<Breadcrumb>> = drainBreadcrumbs();
 * if (crumbs.ok) {
 *   capturedError.breadcrumbs = crumbs.data;
 * }
 * ```
 */
export function drainBreadcrumbs(): Result<readonly Breadcrumb[]> {
	const result: readonly Breadcrumb[] = [..._breadcrumbs];
	_breadcrumbs = [];
	return okUnchecked<readonly Breadcrumb[]>(result);
}

/**
 * Returns all collected breadcrumbs without clearing the buffer.
 *
 * @returns `Result<ReadonlyArray<Breadcrumb>>` — the breadcrumb trail.
 *
 * @example
 * ```typescript
 * import { getBreadcrumbs } from '@/utils/result/breadcrumbs';
 *
 * const crumbs: Result<ReadonlyArray<Breadcrumb>> = getBreadcrumbs();
 * if (crumbs.ok) {
 *   for (const crumb of crumbs.data) {
 *     // `[${crumb.level}] ${crumb.message}`
 *   }
 * }
 * ```
 */
export function getBreadcrumbs(): Result<readonly Breadcrumb[]> {
	return okUnchecked<readonly Breadcrumb[]>([..._breadcrumbs]);
}

/**
 * Clears all breadcrumbs without returning them.
 *
 * Primarily for testing — resets the global breadcrumb buffer to empty.
 *
 * @returns `Result<void>`
 *
 * @example
 * ```typescript
 * import { clearBreadcrumbs } from '@/utils/result/breadcrumbs';
 *
 * clearBreadcrumbs();
 * ```
 */
export function clearBreadcrumbs(): Result<void> {
	_breadcrumbs = [];
	return ok(VoidSchema, undefined);
}
