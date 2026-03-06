/**
 * Web Vitals Diagnostics
 *
 * Provides actionable diagnostic information for Web Vitals metrics by
 * querying browser Performance APIs. Instead of generic hints like
 * "check large images", this module identifies the **actual** elements,
 * resources, and timings causing poor performance.
 *
 * **Diagnostic sources per metric:**
 * - **LCP**: `largest-contentful-paint` entries → element, resource URL, load/render split
 * - **CLS**: `layout-shift` entries → shifting nodes, distances, source rects
 * - **TTFB**: `navigation` timing → DNS, TLS, server, redirect breakdown
 * - **FCP**: `resource` entries → render-blocking resources with durations
 * - **INP**: `event` observer → slowest interaction target, event type, processing time
 * - **TBT/NTBT**: `longtask` observer → blocking scripts with durations
 *
 * Call `setupDiagnosticObservers()` once at startup (before metrics fire) to
 * begin collecting long task and event timing data that isn't queryable
 * retroactively.
 *
 * @module
 */

import * as v from 'valibot';
import type { Str, Num, Bool, Void } from '@/schemas/common';

// =============================================================================
// Schemas & Types
// =============================================================================

/** Threshold boundaries for a Web Vital metric. */
export const VitalThresholdsSchema = v.strictObject({
	/** Upper bound for "good" rating (inclusive). */
	good: v.number(),
	/** Lower bound for "poor" rating (exclusive for timing, inclusive for CLS). */
	poor: v.number(),
	/** Unit of measurement. */
	unit: v.picklist(['ms', 'score']),
});

/** Inferred type for vital thresholds. */
export type VitalThresholds = v.InferOutput<typeof VitalThresholdsSchema>;

/** A single diagnostic finding — one fact about what's causing a metric value. */
export const DiagnosticFindingSchema = v.strictObject({
	/** Short label describing the finding (e.g. "LCP Element", "DNS Lookup"). */
	label: v.string(),
	/** Human-readable value (e.g. "<img.hero>", "45ms", "142px movement"). */
	value: v.string(),
});

/** Inferred type for a diagnostic finding. */
export type DiagnosticFinding = v.InferOutput<typeof DiagnosticFindingSchema>;

/** Full diagnostics for a single metric — thresholds + actionable findings. */
export const VitalDiagnosticsSchema = v.strictObject({
	/** Good/poor threshold boundaries for this metric. */
	thresholds: VitalThresholdsSchema,
	/** Actionable findings from Performance API queries. */
	findings: v.array(DiagnosticFindingSchema),
});

/** Inferred type for vital diagnostics. */
export type VitalDiagnostics = v.InferOutput<typeof VitalDiagnosticsSchema>;

// =============================================================================
// Threshold Data
// =============================================================================

/**
 * Web Vitals threshold boundaries per metric.
 *
 * Sources:
 * - https://web.dev/articles/lcp (LCP)
 * - https://web.dev/articles/cls (CLS)
 * - https://web.dev/articles/fcp (FCP)
 * - https://web.dev/articles/ttfb (TTFB)
 * - https://web.dev/articles/inp (INP)
 * - https://web.dev/articles/tbt (TBT — no official thresholds, Lighthouse uses 200/600)
 */
const THRESHOLDS: Readonly<Record<Str, VitalThresholds>> = {
	LCP: { good: 2500, poor: 4000, unit: 'ms' },
	CLS: { good: 0.1, poor: 0.25, unit: 'score' },
	FCP: { good: 1800, poor: 3000, unit: 'ms' },
	TTFB: { good: 800, poor: 1800, unit: 'ms' },
	INP: { good: 200, poor: 500, unit: 'ms' },
	FID: { good: 100, poor: 300, unit: 'ms' },
	TBT: { good: 200, poor: 600, unit: 'ms' },
	NTBT: { good: 200, poor: 600, unit: 'ms' },
};

/**
 * Returns threshold boundaries for a metric, or null if unknown.
 *
 * @param metricName - Web Vital metric name (e.g. 'LCP', 'CLS')
 * @returns Threshold data or null
 */
export function getThresholds(metricName: Str): VitalThresholds | null {
	return THRESHOLDS[metricName] ?? null;
}

// =============================================================================
// Performance API Type Declarations
// =============================================================================

// These types are not in the standard TypeScript DOM lib.
// Minimal interfaces for the Performance API entries we query.

/** Minimal LargestContentfulPaint entry (not in TS DOM lib). */
type LCPEntry = PerformanceEntry & {
	/** The DOM element that was the largest contentful paint. */
	readonly element: Element | null;
	/** Resource URL (for images/videos). */
	readonly url: Str;
	/** Size of the element in pixels. */
	readonly size: Num;
	/** Time the resource finished loading. */
	readonly loadTime: Num;
	/** Time the element was rendered. */
	readonly renderTime: Num;
};

/** Minimal LayoutShift entry (not in TS DOM lib). */
type LayoutShiftEntry = PerformanceEntry & {
	/** Layout shift score for this entry. */
	readonly value: Num;
	/** Whether the shift was caused by recent user input. */
	readonly hadRecentInput: Bool;
	/** Elements that shifted. */
	readonly sources: ReadonlyArray<{
		/** The DOM node that shifted. */
		readonly node: Node | null;
		/** Rect before the shift. */
		readonly previousRect: DOMRectReadOnly;
		/** Rect after the shift. */
		readonly currentRect: DOMRectReadOnly;
	}>;
};

/** Minimal PerformanceEventTiming entry (not in TS DOM lib). */
type EventTimingEntry = PerformanceEntry & {
	/** When processing started. */
	readonly processingStart: Num;
	/** When processing ended. */
	readonly processingEnd: Num;
	/** The target element of the interaction. */
	readonly target: Element | null;
	/** Interaction ID (groups related events). */
	readonly interactionId: Num;
};

/** Minimal long task entry attribution. */
type LongTaskAttribution = {
	/** Name of the attribution (e.g. 'script'). */
	readonly name: Str;
	/** Container type. */
	readonly containerType: Str;
	/** Container source URL. */
	readonly containerSrc: Str;
};

/** Minimal PerformanceLongTaskTiming entry (not in TS DOM lib). */
type LongTaskEntry = PerformanceEntry & {
	/** Attribution data identifying the source of the long task. */
	readonly attribution: readonly LongTaskAttribution[];
};

// =============================================================================
// Observer Data Collection
// =============================================================================

/** Collected long task entries from PerformanceObserver. */
let longTasks: LongTaskEntry[] = [];

/** Collected event timing entries from PerformanceObserver. */
let eventTimings: EventTimingEntry[] = [];

/** Whether observers have been set up. */
let observersActive: Bool = false;

/**
 * Starts PerformanceObservers for long tasks and event timings.
 *
 * Must be called once at startup (from hooks.client.ts) before metrics
 * fire, because these entries are only available via observers — they
 * can't be queried retroactively via `performance.getEntriesByType()`.
 *
 * Safe to call in environments without PerformanceObserver (no-ops).
 *
 * @example
 * ```typescript
 * import { setupDiagnosticObservers } from '$lib/perf/vitals-diagnostics';
 * setupDiagnosticObservers();
 * ```
 */
export function setupDiagnosticObservers(): Void {
	if (observersActive) return;
	if (typeof PerformanceObserver === 'undefined') return;
	observersActive = true;

	// Long task observer — collects main-thread blocking tasks > 50ms
	try {
		const longTaskObserver: PerformanceObserver = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				longTasks.push(entry as LongTaskEntry);
			}
		});
		longTaskObserver.observe({ type: 'longtask', buffered: true });
	} catch {
		// Long Tasks API not supported in this browser — diagnostics will be partial
	}

	// Event timing observer — collects interaction timings for INP attribution
	try {
		const eventObserver: PerformanceObserver = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				const evt: EventTimingEntry = entry as EventTimingEntry;
				// Only keep entries with an interaction ID (actual user interactions)
				if (evt.interactionId > 0) {
					eventTimings.push(evt);
				}
			}
		});
		eventObserver.observe({ type: 'event', buffered: true });
	} catch {
		// Event Timing API not supported in this browser — diagnostics will be partial
	}
}

/**
 * Resets all collected observer data and observer state.
 * Intended for test isolation.
 */
export function resetDiagnostics(): Void {
	longTasks = [];
	eventTimings = [];
	observersActive = false;
}

// =============================================================================
// Diagnostic Collection
// =============================================================================

/**
 * Describes a DOM element concisely for diagnostic output.
 *
 * @param el - The element to describe
 * @returns A string like "<img.hero>" or "<div#main>"
 */
function describeElement(el: Element): Str {
	const tag: Str = el.tagName.toLowerCase();
	if (el.id) return `<${tag}#${el.id}>`;
	const firstClass: Str | undefined =
		el.className && typeof el.className === 'string' ? el.className.split(/\s+/)[0] : undefined;
	if (firstClass) return `<${tag}.${firstClass}>`;
	return `<${tag}>`;
}

/**
 * Describes a Node concisely (handles non-Element nodes).
 *
 * @param node - The node to describe
 * @returns A string description
 */
function describeNode(node: Node): Str {
	if (node instanceof Element) return describeElement(node);
	return `[${node.nodeName}]`;
}

/**
 * Shortens a URL to just the pathname + filename for display.
 *
 * @param url - Full URL string
 * @returns Shortened display string (e.g. "/images/hero.jpg")
 */
function shortenUrl(url: Str): Str {
	try {
		const parsed: URL = new URL(url, window.location.origin);
		// Same origin — show pathname only
		if (parsed.origin === window.location.origin) {
			return parsed.pathname;
		}
		// Cross-origin — show host + pathname
		return `${parsed.host}${parsed.pathname}`;
	} catch {
		// Malformed URL — return as-is, truncated
		return url.length > 60 ? `${url.slice(0, 57)}...` : url;
	}
}

/**
 * Collects LCP diagnostic findings from the Performance API.
 *
 * Identifies the actual LCP element, its resource URL, and the
 * timing breakdown between resource loading and rendering.
 *
 * @returns Array of diagnostic findings
 */
function diagnoseLCP(): DiagnosticFinding[] {
	const findings: DiagnosticFinding[] = [];

	try {
		const entries: PerformanceEntryList = performance.getEntriesByType('largest-contentful-paint');
		if (entries.length === 0) return findings;

		// Cast needed: PerformanceEntry → LCPEntry (extended type not in TS DOM lib)
		const lcp: LCPEntry = entries.at(-1) as LCPEntry;

		// Identify the LCP element
		if (lcp.element) {
			findings.push({ label: 'LCP Element', value: describeElement(lcp.element) });
		}

		// Resource URL (for images/videos)
		if (lcp.url) {
			findings.push({ label: 'Resource', value: shortenUrl(lcp.url) });
		}

		// Timing breakdown
		if (lcp.renderTime > 0 && lcp.loadTime > 0) {
			const renderDelay: Num = Math.round(lcp.renderTime - lcp.loadTime);
			findings.push({
				label: 'Timing',
				value: `load ${Math.round(lcp.loadTime)}ms + render delay ${renderDelay}ms`,
			});
		} else if (lcp.renderTime > 0) {
			findings.push({ label: 'Render Time', value: `${Math.round(lcp.renderTime)}ms` });
		} else if (lcp.loadTime > 0) {
			findings.push({ label: 'Load Time', value: `${Math.round(lcp.loadTime)}ms` });
		}

		// Element size
		if (lcp.size > 0) {
			findings.push({ label: 'Element Size', value: `${lcp.size.toLocaleString()}px²` });
		}
	} catch {
		// LCP API not available — return empty findings
	}

	return findings;
}

/**
 * Collects CLS diagnostic findings from the Performance API.
 *
 * Identifies which DOM elements shifted, how far they moved, and
 * whether shifts were triggered by user input.
 *
 * @returns Array of diagnostic findings
 */
function diagnoseCLS(): DiagnosticFinding[] {
	const findings: DiagnosticFinding[] = [];

	try {
		const entries: PerformanceEntryList = performance.getEntriesByType('layout-shift');
		if (entries.length === 0) return findings;

		const shifts: LayoutShiftEntry[] = entries as LayoutShiftEntry[];
		const unexpectedShifts: LayoutShiftEntry[] = shifts.filter((s) => !s.hadRecentInput);

		findings.push({
			label: 'Layout Shifts',
			value: `${unexpectedShifts.length} unexpected (${shifts.length} total)`,
		});

		// Find the largest single shift
		let largestShift: LayoutShiftEntry | null = null;
		let largestValue: Num = 0;
		for (const shift of unexpectedShifts) {
			if (shift.value > largestValue) {
				largestValue = shift.value;
				largestShift = shift;
			}
		}

		if (largestShift && largestShift.sources.length > 0) {
			const [source] = largestShift.sources;
			const nodeDesc: Str = source.node ? describeNode(source.node) : '(unknown)';
			const dy: Num = Math.round(Math.abs(source.currentRect.top - source.previousRect.top));
			const dx: Num = Math.round(Math.abs(source.currentRect.left - source.previousRect.left));
			let movement: Str;
			if (dy > 0 && dx > 0) {
				movement = `${dx}px horizontal, ${dy}px vertical`;
			} else if (dy > 0) {
				movement = `${dy}px vertical`;
			} else {
				movement = `${dx}px horizontal`;
			}
			findings.push({
				label: 'Largest Shift',
				value: `${nodeDesc} moved ${movement} (score: ${largestValue.toFixed(4)})`,
			});
		}
	} catch {
		// Layout Shift API not available
	}

	return findings;
}

/**
 * Collects TTFB diagnostic findings from Navigation Timing API.
 *
 * Breaks down the network waterfall into DNS, TLS, server response,
 * and redirect timings to identify the specific bottleneck.
 *
 * @returns Array of diagnostic findings
 */
function diagnoseTTFB(): DiagnosticFinding[] {
	const findings: DiagnosticFinding[] = [];

	try {
		const navEntries: PerformanceEntryList = performance.getEntriesByType('navigation');
		if (navEntries.length === 0) return findings;

		// Cast needed: PerformanceEntry → PerformanceNavigationTiming (type narrowing from getEntriesByType)
		const [navEntry] = navEntries;
		const nav: PerformanceNavigationTiming = navEntry as PerformanceNavigationTiming;

		const dns: Num = Math.round(nav.domainLookupEnd - nav.domainLookupStart);
		const tcp: Num = Math.round(nav.connectEnd - nav.connectStart);
		const tls: Num =
			nav.secureConnectionStart > 0 ? Math.round(nav.connectEnd - nav.secureConnectionStart) : 0;
		const serverTime: Num = Math.round(nav.responseStart - nav.requestStart);
		const redirect: Num = Math.round(nav.redirectEnd - nav.redirectStart);

		// Build a waterfall breakdown
		const parts: Str[] = [];
		if (redirect > 0) parts.push(`redirect ${redirect}ms`);
		if (dns > 0) parts.push(`DNS ${dns}ms`);
		if (tls > 0) parts.push(`TLS ${tls}ms`);
		else if (tcp > 0) parts.push(`TCP ${tcp}ms`);
		parts.push(`server ${serverTime}ms`);

		findings.push({ label: 'Waterfall', value: parts.join(' → ') });

		// Identify the biggest bottleneck
		const bottlenecks: Array<[Str, Num]> = [
			['Redirect', redirect],
			['DNS', dns],
			['TLS', tls],
			['TCP', tcp],
			['Server response', serverTime],
		];
		bottlenecks.sort((a, b) => b[1] - a[1]);
		const [biggest] = bottlenecks;
		if (biggest[1] > 50) {
			findings.push({
				label: 'Bottleneck',
				value: `${biggest[0]} (${biggest[1]}ms)`,
			});
		}
	} catch {
		// Navigation Timing API not available
	}

	return findings;
}

/**
 * Collects FCP diagnostic findings.
 *
 * Identifies render-blocking resources that delay first paint by
 * checking the `renderBlockingStatus` property on Resource Timing entries.
 *
 * @returns Array of diagnostic findings
 */
function diagnoseFCP(): DiagnosticFinding[] {
	const findings: DiagnosticFinding[] = [];

	try {
		// Check for render-blocking resources
		const resources: PerformanceEntryList = performance.getEntriesByType('resource');
		const blocking: Array<{ url: Str; duration: Num }> = [];

		for (const entry of resources) {
			const res: PerformanceResourceTiming = entry as PerformanceResourceTiming;
			// renderBlockingStatus is a newer property — may not be present
			const status: Str | undefined = (res as unknown as Record<Str, Str>).renderBlockingStatus;
			if (status === 'blocking') {
				blocking.push({
					url: shortenUrl(res.name),
					duration: Math.round(res.duration),
				});
			}
		}

		if (blocking.length > 0) {
			findings.push({
				label: 'Render-Blocking',
				value: `${blocking.length} resource${blocking.length > 1 ? 's' : ''}`,
			});
			// Show up to 3 blocking resources
			for (const res of blocking.slice(0, 3)) {
				findings.push({
					label: '  Resource',
					value: `${res.url} (${res.duration}ms)`,
				});
			}
			if (blocking.length > 3) {
				findings.push({
					label: '',
					value: `…and ${blocking.length - 3} more`,
				});
			}
		}

		// Check if TTFB contributes significantly to FCP
		const navEntries: PerformanceEntryList = performance.getEntriesByType('navigation');
		if (navEntries.length > 0) {
			// Cast needed: PerformanceEntry → PerformanceNavigationTiming (type narrowing from getEntriesByType)
			const [fcpNavEntry] = navEntries;
			const nav: PerformanceNavigationTiming = fcpNavEntry as PerformanceNavigationTiming;
			const ttfb: Num = Math.round(nav.responseStart);
			if (ttfb > 400) {
				findings.push({
					label: 'TTFB Impact',
					value: `${ttfb}ms server response delays first paint`,
				});
			}
		}
	} catch {
		// Resource Timing API not available
	}

	return findings;
}

/**
 * Collects INP diagnostic findings from observed event timings.
 *
 * Identifies the slowest user interaction, its target element,
 * event type, and processing duration breakdown.
 *
 * @returns Array of diagnostic findings
 */
function diagnoseINP(): DiagnosticFinding[] {
	const findings: DiagnosticFinding[] = [];

	if (eventTimings.length === 0) {
		findings.push({
			label: 'Note',
			value: 'No interactions recorded yet — interact with the page first',
		});
		return findings;
	}

	// Find the slowest interaction
	let slowest: EventTimingEntry | null = null;
	let slowestDuration: Num = 0;
	for (const evt of eventTimings) {
		if (evt.duration > slowestDuration) {
			slowestDuration = evt.duration;
			slowest = evt;
		}
	}

	if (slowest) {
		const targetDesc: Str = slowest.target ? describeElement(slowest.target) : '(unknown)';
		const processing: Num = Math.round(slowest.processingEnd - slowest.processingStart);
		const inputDelay: Num = Math.round(slowest.processingStart - slowest.startTime);
		const presentationDelay: Num = Math.round(
			slowest.duration - (slowest.processingEnd - slowest.startTime),
		);

		findings.push({
			label: 'Slowest',
			value: `${slowest.name} on ${targetDesc} — ${Math.round(slowest.duration)}ms total`,
		});
		findings.push({
			label: 'Breakdown',
			value: `input delay ${inputDelay}ms → processing ${processing}ms → presentation ${presentationDelay}ms`,
		});

		// Identify the biggest phase
		const phases: Array<[Str, Num]> = [
			['Input delay (main thread blocked)', inputDelay],
			['Processing (event handler)', processing],
			['Presentation (rendering)', presentationDelay],
		];
		phases.sort((a, b) => b[1] - a[1]);
		const [biggestPhase] = phases;
		if (biggestPhase[1] > 50) {
			findings.push({
				label: 'Bottleneck',
				value: biggestPhase[0],
			});
		}
	}

	findings.push({
		label: 'Interactions',
		value: `${eventTimings.length} recorded`,
	});

	return findings;
}

/**
 * Collects TBT/NTBT diagnostic findings from observed long tasks.
 *
 * Identifies main-thread blocking tasks, their durations, and
 * the scripts responsible for them.
 *
 * @returns Array of diagnostic findings
 */
function diagnoseTBT(): DiagnosticFinding[] {
	const findings: DiagnosticFinding[] = [];

	if (longTasks.length === 0) {
		findings.push({
			label: 'Long Tasks',
			value: 'None observed (main thread was responsive)',
		});
		return findings;
	}

	// Calculate total blocking time (duration - 50ms for each task)
	let totalBlocking: Num = 0;
	let longestTask: LongTaskEntry | null = null;
	let longestDuration: Num = 0;
	for (const task of longTasks) {
		const blocking: Num = task.duration - 50;
		if (blocking > 0) totalBlocking += blocking;
		if (task.duration > longestDuration) {
			longestDuration = task.duration;
			longestTask = task;
		}
	}

	findings.push({
		label: 'Long Tasks',
		value: `${longTasks.length} tasks, ${Math.round(totalBlocking)}ms total blocking time`,
	});

	if (longestTask) {
		let scriptInfo: Str = '';
		if (longestTask.attribution.length > 0) {
			const [attr] = longestTask.attribution;
			if (attr.containerSrc) {
				scriptInfo = ` — ${shortenUrl(attr.containerSrc)}`;
			} else if (attr.containerType) {
				scriptInfo = ` — ${attr.containerType}`;
			}
		}
		findings.push({
			label: 'Longest',
			value: `${Math.round(longestTask.duration)}ms${scriptInfo}`,
		});
	}

	return findings;
}

// =============================================================================
// Public API
// =============================================================================

/** Metric name → diagnostic collector mapping. */
const COLLECTORS: Readonly<Record<Str, () => DiagnosticFinding[]>> = {
	LCP: diagnoseLCP,
	CLS: diagnoseCLS,
	TTFB: diagnoseTTFB,
	FCP: diagnoseFCP,
	INP: diagnoseINP,
	FID: diagnoseINP, // FID uses the same event timing data
	TBT: diagnoseTBT,
	NTBT: diagnoseTBT,
};

/**
 * Collects full diagnostics for a Web Vital metric.
 *
 * Queries browser Performance APIs to identify what's actually causing
 * the metric value. Returns threshold context and specific findings.
 *
 * Only collects diagnostics for non-good ratings — returns null for
 * good metrics to avoid unnecessary Performance API queries.
 *
 * @param metricName - The metric name (e.g. 'LCP', 'CLS', 'INP')
 * @param _value - The metric value (reserved for future use)
 * @param rating - The performance rating ('good', 'needsImprovement', 'poor')
 * @returns Diagnostics object or null if metric is good or unknown
 *
 * @example
 * ```typescript
 * const diag = collectDiagnostics('LCP', 3200, 'needsImprovement');
 * if (diag) {
 *   console.log(diag.thresholds); // { good: 2500, poor: 4000, unit: 'ms' }
 *   console.log(diag.findings);   // [{ label: 'LCP Element', value: '<img.hero>' }, ...]
 * }
 * ```
 */
export function collectDiagnostics(
	metricName: Str,
	_value: Num,
	rating: Str,
): VitalDiagnostics | null {
	// Skip diagnostics for good metrics — no action needed
	if (rating === 'good') return null;

	const thresholds: VitalThresholds | null = getThresholds(metricName);
	if (!thresholds) return null;

	const collector: (() => DiagnosticFinding[]) | undefined = COLLECTORS[metricName];
	const findings: DiagnosticFinding[] = collector ? collector() : [];

	return { thresholds, findings };
}

/**
 * Formats a threshold boundary as a human-readable string.
 *
 * @param thresholds - The threshold data
 * @returns A string like "good < 2500ms · poor > 4000ms"
 *
 * @example
 * ```typescript
 * formatThresholds({ good: 2500, poor: 4000, unit: 'ms' });
 * // → "good < 2500ms · poor > 4000ms"
 * ```
 */
export function formatThresholds(thresholds: VitalThresholds): Str {
	const suffix: Str = thresholds.unit === 'ms' ? 'ms' : '';
	const goodVal: Str =
		thresholds.unit === 'score'
			? thresholds.good.toString()
			: Math.round(thresholds.good).toString();
	const poorVal: Str =
		thresholds.unit === 'score'
			? thresholds.poor.toString()
			: Math.round(thresholds.poor).toString();
	return `good < ${goodVal}${suffix} · poor > ${poorVal}${suffix}`;
}
