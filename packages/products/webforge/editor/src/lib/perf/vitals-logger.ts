/**
 * Vitals Console Logger
 *
 * Colorized console logging of Web Vitals metrics reported by Perfume.js.
 * Uses `%c` CSS formatting to produce styled output in Chrome DevTools,
 * matching the debug banner's visual style (`[AppName]` cyan prefix,
 * white metric name, color-coded values by rating).
 *
 * **Console output example:**
 * ```
 * [Storylyne] LCP 2450ms ⚠ needsImprovement   (amber)
 * [Storylyne] CLS 0.05 ✓ good                  (green)
 * [Storylyne] INP 650ms ✗ poor                  (red, console.warn)
 * ```
 *
 * **Dev mode:** Logs ALL metrics with color-coded rating icons:
 * - `good` → `✓` via `console.log()` (green)
 * - `needsImprovement` → `⚠` via `console.log()` (amber)
 * - `poor` → `✗` via `console.warn()` (red)
 *
 * **Production mode:** Only logs `poor` metrics as warnings.
 * Good and needsImprovement are silent in production (data is beaconed, not logged).
 *
 * Timing metrics (TTFB, FCP, LCP, FID, INP, TBT, NTBT) display values
 * rounded to integers with an `ms` suffix. Non-timing metrics (CLS,
 * navigationTiming, networkInformation) display raw values without a suffix.
 *
 * @module
 */

import type { Str, Num, Void } from '@/schemas/common';
import { okUnchecked, type Result } from '@/schemas/result/result';
import { dev } from '$app/environment';
import { APP_NAME } from '$lib/config/app-meta';
import { styles } from '$lib/debug/console-styles';

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

/** Rating → CSS style mapping for colorized console output. */
const RATING_STYLES: Readonly<Record<Str, Str>> = {
	good: styles.ratingGood,
	needsImprovement: styles.ratingWarn,
	poor: styles.ratingPoor,
};

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Logs a Web Vitals metric to the console with colorized `%c` CSS formatting.
 *
 * Uses the application name prefix (e.g. `[Storylyne]`) in cyan, the metric
 * name in white bold, and the value + rating in a color matching the rating
 * (green for good, amber for needsImprovement, red for poor). This matches
 * the visual style of the debug banner and state logger.
 *
 * In dev mode, all metrics are logged via `console.log()`. In production,
 * only `poor` metrics are logged via `console.warn()`. This keeps production
 * console clean while still surfacing actionable performance issues.
 *
 * @param metricName - The Web Vital metric name (e.g. 'LCP', 'CLS', 'INP')
 * @param value - The metric value (milliseconds for timing metrics, unitless for CLS)
 * @param rating - The performance rating ('good', 'needsImprovement', 'poor')
 * @returns `Result<Void>` — always succeeds
 *
 * @example
 * logVital('LCP', 2450, 'needsImprovement');
 * // Console: %c[Storylyne] %cLCP %c2450ms %c⚠ needsImprovement
 * // Styled:  cyan prefix, white name, amber value, amber rating
 *
 * @example
 * logVital('CLS', 0.05, 'good');
 * // Console (dev only): %c[Storylyne] %cCLS %c0.05 %c✓ good
 * // Styled: cyan prefix, white name, green value, green rating
 */
export function logVital(metricName: Str, value: Num, rating: Str): Result<Void> {
	const isTiming: boolean = TIMING_METRICS.has(metricName);
	const displayValue: Str = isTiming ? `${Math.round(value)}ms` : String(value);
	const icon: Str = RATING_ICONS[rating] ?? '?';
	const ratingStyle: Str = RATING_STYLES[rating] ?? styles.reset;

	const fmt: Str = `%c[${APP_NAME}] %c${metricName} %c${displayValue} %c${icon} ${rating}`;

	if (rating === 'poor') {
		console.warn(fmt, styles.vitalPrefix, styles.metricName, ratingStyle, ratingStyle);
	} else if (dev) {
		console.log(fmt, styles.vitalPrefix, styles.metricName, ratingStyle, ratingStyle);
	}
	// In production, 'good' and 'needsImprovement' are silent — data is beaconed, not console logged

	return okUnchecked<Void>(undefined);
}
