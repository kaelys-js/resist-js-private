/// <reference types="svelte" />
/**
 * Vitals Panel Store
 *
 * Reactive store for the DevToolbarPerf panel. Holds collected Web Vitals
 * metrics for display. Metrics are pushed from the Perfume.js analytics
 * tracker in `hooks.client.ts` via `reportVitalToPanel()`.
 *
 * Uses module-level `$state` runes for Svelte 5 reactivity.
 *
 * @module
 */

import * as v from 'valibot';

import type { Str, Num, Void } from '@/schemas/common';
import { StrSchema, NumSchema, NameSchema, MillisecondTimestampSchema } from '@/schemas/common';
import type { Name, MillisecondTimestamp } from '@/schemas/common';
import { ERRORS, err, okUnchecked, type Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

import {
  VitalDiagnosticsSchema,
  type VitalDiagnostics,
} from '@/utils/web-vitals/vitals-diagnostics';

// =============================================================================
// Schema
// =============================================================================

/** Schema for nullable vital diagnostics — wraps {@link VitalDiagnosticsSchema}. */
const NullableVitalDiagnosticsSchema = v.nullable(VitalDiagnosticsSchema);

/** Nullable vital diagnostics type inferred from schema. */
type NullableVitalDiagnostics = v.InferOutput<typeof NullableVitalDiagnosticsSchema>;

/** Schema for a single panel metric entry. */
export const PanelMetricSchema = v.strictObject({
  /** Web Vital metric name (e.g. 'LCP', 'FCP', 'CLS'). */
  name: NameSchema,
  /** Metric value (ms for timing metrics, unitless for CLS). */
  value: v.number(),
  /** Performance rating ('good', 'needsImprovement', 'poor'). */
  rating: v.pipe(v.string(), v.minLength(1), v.maxLength(50)),
  /** Timestamp when the metric was reported (ms since epoch). */
  timestamp: MillisecondTimestampSchema,
  /** Actionable diagnostics — present only for non-good metrics. */
  diagnostics: NullableVitalDiagnosticsSchema,
});

/** Inferred type for a panel metric entry. See {@link PanelMetricSchema}. */
export type PanelMetric = v.InferOutput<typeof PanelMetricSchema>;

// =============================================================================
// Module State
// =============================================================================

/** Collected metrics for panel display. */
let metrics: PanelMetric[] = $state([]);

// =============================================================================
// API
// =============================================================================

/**
 * Pushes a vitals metric to the panel store for display.
 *
 * Called from the Perfume.js analytics tracker in `hooks.client.ts`.
 *
 * @param {Str} name - The Web Vital metric name
 * @param {Num} value - The metric value
 * @param {Str} rating - The performance rating
 * @param {NullableVitalDiagnostics} diagnostics - Actionable diagnostics for non-good metrics
 * @returns {Result<Void>} Ok on success, Err if input validation fails
 *
 * @example
 * ```typescript
 * import { reportVitalToPanel } from '@/utils/web-vitals/vitals-panel-store.svelte';
 * const result = reportVitalToPanel('LCP' as Str, 2500 as Num, 'good' as Str, null);
 * if (!result.ok) console.error(result.error);
 * ```
 */
export function reportVitalToPanel(
  name: Str,
  value: Num,
  rating: Str,
  diagnostics: NullableVitalDiagnostics,
): Result<Void> {
  const nameResult: Result<Name> = safeParse(NameSchema, name);

  if (!nameResult.ok) return nameResult;

  const valueResult: Result<Num> = safeParse(NumSchema, value);

  if (!valueResult.ok) return valueResult;

  const ratingResult: Result<Str> = safeParse(StrSchema, rating);

  if (!ratingResult.ok) return ratingResult;

  const diagResult: Result<NullableVitalDiagnostics> = safeParse(
    NullableVitalDiagnosticsSchema,
    diagnostics,
  );

  if (!diagResult.ok) return diagResult;

  metrics = [
    ...metrics,
    {
      name: nameResult.data,
      value: valueResult.data,
      rating: ratingResult.data,
      // Date.now() returns a valid millisecond timestamp — safe to assert branded type
      timestamp: Date.now() as MillisecondTimestamp,
      diagnostics: diagResult.data as NullableVitalDiagnostics, // cast safe: safeParse validated against NullableVitalDiagnosticsSchema
    },
  ];
  return okUnchecked<Void>(undefined);
}

/**
 * Returns the current list of collected panel metrics (reactive).
 *
 * @returns {Result<PanelMetric[]>} Ok with array of PanelMetric entries
 *
 * @example
 * ```typescript
 * import { getVitalsPanelMetrics } from '@/utils/web-vitals/vitals-panel-store.svelte';
 * const result = getVitalsPanelMetrics();
 * if (result.ok) console.log(result.data);
 * ```
 */
export function getVitalsPanelMetrics(): Result<PanelMetric[]> {
  // Snapshot strips the Svelte $state proxy so _deepFreeze in okUnchecked does not conflict
  return okUnchecked<PanelMetric[]>($state.snapshot(metrics) as PanelMetric[]);
}

/**
 * Resets all panel metrics for test isolation.
 *
 * @returns {Result<Void>} Ok after clearing metrics
 *
 * @example
 * ```typescript
 * import { resetPanelMetrics } from '@/utils/web-vitals/vitals-panel-store.svelte';
 * const result = resetPanelMetrics();
 * if (result.ok) console.log('Metrics cleared');
 * ```
 */
export function resetPanelMetrics(): Result<Void> {
  metrics = [];
  return okUnchecked<Void>(undefined);
}
