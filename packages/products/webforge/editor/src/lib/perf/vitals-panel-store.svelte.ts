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

// ── Schema ──────────────────────────────────────────────────────────────────

/** Schema for a single panel metric entry. */
export const PanelMetricSchema = v.strictObject({
	/** Web Vital metric name (e.g. 'LCP', 'FCP', 'CLS'). */
	name: v.string(),
	/** Metric value (ms for timing metrics, unitless for CLS). */
	value: v.number(),
	/** Performance rating ('good', 'needsImprovement', 'poor'). */
	rating: v.string(),
	/** Timestamp when the metric was reported (ms since epoch). */
	timestamp: v.number(),
});

/** Inferred type for a panel metric entry. */
export type PanelMetric = v.InferOutput<typeof PanelMetricSchema>;

// ── Module State ─────────────────────────────────────────────────────────────

/** Collected metrics for panel display. */
let metrics: PanelMetric[] = $state([]);

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Pushes a vitals metric to the panel store for display.
 *
 * Called from the Perfume.js analytics tracker in `hooks.client.ts`.
 *
 * @param name - The Web Vital metric name
 * @param value - The metric value
 * @param rating - The performance rating
 */
export function reportVitalToPanel(name: Str, value: Num, rating: Str): Void {
	metrics = [...metrics, { name, value, rating, timestamp: Date.now() }];
}

/**
 * Returns the current list of collected panel metrics (reactive).
 *
 * @returns Array of PanelMetric entries
 */
export function getVitalsPanelMetrics(): PanelMetric[] {
	return metrics;
}

/**
 * Resets all panel metrics for test isolation.
 */
export function resetPanelMetrics(): Void {
	metrics = [];
}
