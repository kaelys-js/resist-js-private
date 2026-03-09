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
 * [AppName] LCP 2450ms ⚠ needsImprovement   (amber)
 * [AppName] CLS 0.05 ✓ good                  (green)
 * [AppName] INP 650ms ✗ poor                  (red, console.warn)
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

import type { Str, Num, Bool, Void } from '@/schemas/common';
import { okUnchecked, type Result } from '@/schemas/result/result';
import { dev } from '$app/environment';
import { APP_NAME } from '$lib/config/app-meta';
import { styles } from '$lib/debug/console-styles';
import { formatThresholds, type VitalDiagnostics } from '$lib/perf/vitals-diagnostics';

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

/** Dim gray for diagnostic detail lines. */
const DIAG_LABEL_STYLE: Str = 'color:#888;font-family:monospace;font-size:0.9em';

/** Light gray for diagnostic values. */
const DIAG_VALUE_STYLE: Str = 'color:#bbb;font-size:0.9em';

/** Dim italic for threshold context line. */
const THRESHOLD_STYLE: Str = 'color:#666;font-style:italic;font-size:0.9em';

/**
 * Logs a Web Vitals metric to the console with colorized `%c` CSS formatting.
 *
 * Uses the application name prefix (e.g. `[AppName]`) in cyan, the metric
 * name in white bold, and the value + rating in a color matching the rating
 * (green for good, amber for needsImprovement, red for poor). This matches
 * the visual style of the debug banner and state logger.
 *
 * In dev mode, all metrics are logged via `console.log()`. In production,
 * only `poor` metrics are logged via `console.warn()`. This keeps production
 * console clean while still surfacing actionable performance issues.
 *
 * When diagnostics are provided (non-good metrics), logs threshold context
 * and actionable findings (e.g., which element caused slow LCP, which
 * scripts blocked the main thread) in a collapsible group.
 *
 * @param metricName - The Web Vital metric name (e.g. 'LCP', 'CLS', 'INP')
 * @param value - The metric value (milliseconds for timing metrics, unitless for CLS)
 * @param rating - The performance rating ('good', 'needsImprovement', 'poor')
 * @param diagnostics - Optional diagnostics for non-good metrics (thresholds + findings)
 * @returns `Result<Void>` — always succeeds
 *
 * @example
 * logVital('LCP', 2450, 'needsImprovement');
 * // Console: %c[AppName] %cLCP %c2450ms %c⚠ needsImprovement
 * // Styled:  cyan prefix, white name, amber value, amber rating
 *
 * @example
 * logVital('CLS', 0.05, 'good');
 * // Console (dev only): %c[AppName] %cCLS %c0.05 %c✓ good
 * // Styled: cyan prefix, white name, green value, green rating
 */
export function logVital(
	metricName: Str,
	value: Num,
	rating: Str,
	diagnostics?: VitalDiagnostics | null,
): Result<Void> {
	const isTiming: Bool = TIMING_METRICS.has(metricName);
	const displayValue: Str = isTiming ? `${Math.round(value)}ms` : String(value);
	const icon: Str = RATING_ICONS[rating] ?? '?';
	const ratingStyle: Str = RATING_STYLES[rating] ?? styles.reset;

	const fmt: Str = `%c[${APP_NAME}] %c${metricName} %c${displayValue} %c${icon} ${rating}`;

	const hasDiagnostics: Bool =
		diagnostics !== null && diagnostics !== undefined && diagnostics.findings.length > 0;

	if (rating === 'poor') {
		if (hasDiagnostics) {
			// Use a collapsible group so diagnostics are visible but don't flood the console
			console.groupCollapsed(fmt, styles.vitalPrefix, styles.metricName, ratingStyle, ratingStyle);
			logDiagnosticDetails(diagnostics);
			console.groupEnd();
		} else {
			console.warn(fmt, styles.vitalPrefix, styles.metricName, ratingStyle, ratingStyle);
		}
	} else if (dev) {
		if (hasDiagnostics) {
			console.groupCollapsed(fmt, styles.vitalPrefix, styles.metricName, ratingStyle, ratingStyle);
			logDiagnosticDetails(diagnostics);
			console.groupEnd();
		} else {
			console.log(fmt, styles.vitalPrefix, styles.metricName, ratingStyle, ratingStyle);
		}
	}
	// In production, 'good' and 'needsImprovement' are silent — data is beaconed, not console logged

	return okUnchecked<Void>(undefined);
}

/**
 * Logs diagnostic details inside a console group.
 *
 * Shows threshold context and each finding as a labeled row.
 *
 * @param diagnostics - The diagnostics to log
 */
function logDiagnosticDetails(diagnostics: VitalDiagnostics | null | undefined): Void {
	if (!diagnostics) return;

	// Threshold context line
	console.log(`  %cThresholds: ${formatThresholds(diagnostics.thresholds)}`, THRESHOLD_STYLE);

	// Each finding as a labeled row
	for (const finding of diagnostics.findings) {
		if (finding.label) {
			console.log(
				`  %c${finding.label.padEnd(16)}%c ${finding.value}`,
				DIAG_LABEL_STYLE,
				DIAG_VALUE_STYLE,
			);
		} else {
			console.log(`  %c${finding.value}`, DIAG_VALUE_STYLE);
		}
	}
}
