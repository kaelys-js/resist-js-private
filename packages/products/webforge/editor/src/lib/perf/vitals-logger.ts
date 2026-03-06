/**
 * Vitals Console Logger
 *
 * Color-coded console logging of Web Vitals metrics reported by Perfume.js.
 *
 * **Dev mode:** Logs ALL metrics with rating icons:
 * - `good` → `✓` via `log.info()`
 * - `needsImprovement` → `⚠` via `log.info()`
 * - `poor` → `✗` via `log.warn()`
 *
 * **Production mode:** Only logs `poor` metrics as warnings.
 * Good and needsImprovement are silent in production (data is beaconed, not logged).
 *
 * Format: `[perf] LCP 2450ms ⚠ needsImprovement`
 *
 * Timing metrics (TTFB, FCP, LCP, FID, INP, TBT, NTBT) display values
 * rounded to integers with an `ms` suffix. Non-timing metrics (CLS,
 * navigationTiming, networkInformation) display raw values without a suffix.
 *
 * @module
 */

import type { Str, Num, Void } from '@/schemas/common';
import { log } from '@/utils/core/logger';
import { okUnchecked, type Result } from '@/schemas/result/result';
import { dev } from '$app/environment';

// ── Constants ───────────────────────────────────────────────────────────────

/** Metrics whose values are in milliseconds and should be rounded + suffixed. */
const TIMING_METRICS: ReadonlySet<Str> = new Set([
	'TTFB',
	'FCP',
	'LCP',
	'FID',
	'INP',
	'TBT',
	'NTBT',
]);

/** Rating → icon mapping for log output. */
const RATING_ICONS: Readonly<Record<Str, Str>> = {
	good: '✓',
	needsImprovement: '⚠',
	poor: '✗',
};

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Logs a Web Vitals metric to the console with color-coded rating.
 *
 * In dev mode, all metrics are logged. In production, only `poor` metrics
 * are logged as warnings. This keeps production console clean while still
 * surfacing actionable performance issues.
 *
 * @param metricName - The Web Vital metric name (e.g. 'LCP', 'CLS', 'INP')
 * @param value - The metric value (milliseconds for timing metrics, unitless for CLS)
 * @param rating - The performance rating ('good', 'needsImprovement', 'poor')
 * @returns `Result<Void>` — always succeeds
 *
 * @example
 * logVital('LCP', 2450, 'needsImprovement');
 * // Console: [perf] LCP 2450ms ⚠ needsImprovement
 *
 * @example
 * logVital('CLS', 0.05, 'good');
 * // Console (dev only): [perf] CLS 0.05 ✓ good
 */
export function logVital(metricName: Str, value: Num, rating: Str): Result<Void> {
	const isTiming: boolean = TIMING_METRICS.has(metricName);
	const displayValue: Str = isTiming ? `${Math.round(value)}ms` : String(value);
	const icon: Str = RATING_ICONS[rating] ?? '?';
	const msg: Str = `[perf] ${metricName} ${displayValue} ${icon} ${rating}`;

	if (rating === 'poor') {
		log.warn(msg);
	} else if (dev) {
		log.info(msg);
	}
	// In production, 'good' and 'needsImprovement' are silent — data is beaconed, not console logged

	return okUnchecked<Void>(undefined);
}
