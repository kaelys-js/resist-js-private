/**
 * Vitals Console Logger
 *
 * Colorized console logging of Web Vitals metrics
 * reported by Perfume.js with `%c` CSS formatting.
 *
 * @module
 */

import * as v from 'valibot';

import type { Str, Num, Bool, Void } from '@/schemas/common';
import { StrSchema, NumSchema } from '@/schemas/common';
import { okUnchecked, type Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';
import {
  formatThresholds,
  VitalDiagnosticsSchema,
  type VitalDiagnostics,
} from '@/utils/web-vitals/vitals-diagnostics';

// =============================================================================
// Types
// =============================================================================

/** Schema for nullable diagnostics parameter. */
const NullableDiagnosticsSchema = v.nullable(VitalDiagnosticsSchema);

/** Nullable diagnostics type — `VitalDiagnostics | null` expressed via schema. */
type NullableDiagnostics = v.InferOutput<typeof NullableDiagnosticsSchema>;

// =============================================================================
// Constants
// =============================================================================

/** CSS styles for vitals console output. */
const vitalsStyles = {
  /** Cyan prefix for app name in vitals output. */
  vitalPrefix: 'color:#8cf;font-weight:bold',
  /** White bold for metric name. */
  metricName: 'color:#fff;font-weight:bold',
  /** Green bold for good-rated metrics. */
  ratingGood: 'color:#4caf50;font-weight:bold',
  /** Amber bold for needs-improvement metrics. */
  ratingWarn: 'color:#ff9800;font-weight:bold',
  /** Red bold for poor-rated metrics. */
  ratingPoor: 'color:#f44;font-weight:bold',
  /** Reset to default inherited color. */
  reset: 'color:inherit',
} as const;

/** Application name for console log prefix. Set via `setVitalsLoggerAppName()`. */
let appName: Str = 'App';

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
  good: vitalsStyles.ratingGood,
  needsImprovement: vitalsStyles.ratingWarn,
  poor: vitalsStyles.ratingPoor,
};

/** Dim gray for diagnostic detail lines. */
const DIAG_LABEL_STYLE: Str = 'color:#888;font-family:monospace;font-size:0.9em';

/** Light gray for diagnostic values. */
const DIAG_VALUE_STYLE: Str = 'color:#bbb;font-size:0.9em';

/** Dim italic for threshold context line. */
const THRESHOLD_STYLE: Str = 'color:#666;font-style:italic;font-size:0.9em';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Prints diagnostic details inside a console group.
 *
 * Shows threshold context and each finding as a labeled row.
 *
 * @param {NullableDiagnostics} diagnostics - The diagnostics to print
 * @returns {Result<Void>} Always succeeds
 */
function printDiagnosticDetails(diagnostics: NullableDiagnostics): Result<Void> {
  if (!diagnostics) {
    return okUnchecked<Void>(undefined);
  }

  // Threshold context line
  void console.log(`  %cThresholds: ${formatThresholds(diagnostics.thresholds)}`, THRESHOLD_STYLE);

  // Each finding as a labeled row
  for (const finding of diagnostics.findings) {
    if (finding.label) {
      void console.log(
        `  %c${finding.label.padEnd(16)}%c ${finding.value}`,
        DIAG_LABEL_STYLE,
        DIAG_VALUE_STYLE,
      );
    } else {
      void console.log(`  %c${finding.value}`, DIAG_VALUE_STYLE);
    }
  }

  return okUnchecked<Void>(undefined);
}

// =============================================================================
// Exported API
// =============================================================================

/**
 * Sets the application name used as prefix in vitals console output.
 *
 * Call once during client initialization (e.g. in `hooks.client.ts`).
 *
 * @param {Str} name - The application name (e.g. 'Storylyne', 'MyApp')
 * @returns {Result<Void>} Always succeeds
 *
 * @example
 * ```typescript
 * import { setVitalsLoggerAppName } from '@/utils/web-vitals/vitals-logger';
 *
 * setVitalsLoggerAppName('Storylyne');
 * ```
 */
export function setVitalsLoggerAppName(name: Str): Result<Void> {
  const nameResult: Result<Str> = safeParse(StrSchema, name);

  if (!nameResult.ok) return nameResult;

  appName = nameResult.data;

  return okUnchecked<Void>(undefined);
}

/**
 * Logs a Web Vitals metric to the console with colorized `%c` CSS formatting.
 *
 * Uses the application name prefix (e.g. `[AppName]`) in cyan, the metric
 * name in white bold, and the value + rating in a color matching the rating
 * (green for good, amber for needsImprovement, red for poor).
 *
 * In dev mode, all metrics are logged via `console.log()`. In production,
 * only `poor` metrics are logged via `console.warn()`. This keeps production
 * console clean while still surfacing actionable performance issues.
 *
 * When diagnostics are provided (non-good metrics), logs threshold context
 * and actionable findings (e.g., which element caused slow LCP, which
 * scripts blocked the main thread) in a collapsible group.
 *
 * @param {Str} metricName - The Web Vital metric name (e.g. 'LCP', 'CLS', 'INP')
 * @param {Num} value - The metric value (milliseconds for timing metrics, unitless for CLS)
 * @param {Str} rating - The performance rating ('good', 'needsImprovement', 'poor')
 * @param {NullableDiagnostics} diagnostics - Diagnostics for non-good metrics (thresholds + findings), or null
 * @returns {Result<Void>} Always succeeds
 *
 * @example
 * ```typescript
 * logVital('LCP', 2450, 'needsImprovement', null);
 * // Console: %c[AppName] %cLCP %c2450ms %c⚠ needsImprovement
 * // Styled:  cyan prefix, white name, amber value, amber rating
 * ```
 *
 * @example
 * ```typescript
 * logVital('CLS', 0.05, 'good', null);
 * // Console (dev only): %c[AppName] %cCLS %c0.05 %c✓ good
 * // Styled: cyan prefix, white name, green value, green rating
 * ```
 */
export function logVital(
  metricName: Str,
  value: Num,
  rating: Str,
  diagnostics: NullableDiagnostics,
): Result<Void> {
  const metricNameResult: Result<Str> = safeParse(StrSchema, metricName);

  if (!metricNameResult.ok) return metricNameResult;

  const valueResult: Result<Num> = safeParse(NumSchema, value);

  if (!valueResult.ok) return valueResult;

  const ratingResult: Result<Str> = safeParse(StrSchema, rating);

  if (!ratingResult.ok) return ratingResult;

  const diagnosticsResult: Result<NullableDiagnostics> = safeParse(
    NullableDiagnosticsSchema,
    diagnostics,
  );

  if (!diagnosticsResult.ok) return diagnosticsResult;

  const isTiming: Bool = TIMING_METRICS.has(metricName);
  const displayValue: Str = isTiming ? `${Math.round(value)}ms` : String(value);
  const icon: Str = RATING_ICONS[rating] ?? '?';
  const ratingStyle: Str = RATING_STYLES[rating] ?? vitalsStyles.reset;
  const fmt: Str = `%c[${appName}] %c${metricName} %c${displayValue} %c${icon} ${rating}`;
  const validDiagnostics: NullableDiagnostics = diagnosticsResult.data as NullableDiagnostics; // cast safe: safeParse validated against NullableDiagnosticsSchema
  const hasDiagnostics: Bool =
    validDiagnostics !== null &&
    validDiagnostics !== undefined &&
    validDiagnostics.findings.length > 0;

  if (rating === 'poor') {
    if (hasDiagnostics) {
      // Use a collapsible group so diagnostics are visible but don't flood the console
      console.groupCollapsed(
        fmt,
        vitalsStyles.vitalPrefix,
        vitalsStyles.metricName,
        ratingStyle,
        ratingStyle,
      );
      const _diagResult: Result<Void> = printDiagnosticDetails(validDiagnostics);
      console.groupEnd();
    } else {
      console.warn(
        fmt,
        vitalsStyles.vitalPrefix,
        vitalsStyles.metricName,
        ratingStyle,
        ratingStyle,
      );
    }
  } else if (import.meta.env.DEV) {
    if (hasDiagnostics) {
      console.groupCollapsed(
        fmt,
        vitalsStyles.vitalPrefix,
        vitalsStyles.metricName,
        ratingStyle,
        ratingStyle,
      );
      const _diagResult: Result<Void> = printDiagnosticDetails(validDiagnostics);
      console.groupEnd();
    } else {
      void console.log(
        fmt,
        vitalsStyles.vitalPrefix,
        vitalsStyles.metricName,
        ratingStyle,
        ratingStyle,
      );
    }
  }
  // In production, 'good' and 'needsImprovement' are silent — data is beaconed, not console logged

  return okUnchecked<Void>(undefined);
}
