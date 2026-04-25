/**
 * Web Vitals Diagnostics
 *
 * Provides actionable diagnostic information for Web Vitals
 * metrics by querying browser Performance APIs.
 *
 * @module
 */

import * as v from 'valibot';

import {
  StrSchema,
  NumSchema,
  type Str,
  type Num,
  type Bool,
  type Void,
  type OptionalStr,
} from '@/schemas/common';
import { ok, okUnchecked, err, ERRORS, type AppError, type Result } from '@/schemas/result/result';
import { safeParse, fromUnknownError } from '@/utils/result/safe';

// =============================================================================
// Schemas & Types
// =============================================================================

/**
 * Threshold boundaries for a Web Vital metric.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(VitalThresholdsSchema, { good: 2500, poor: 4000, unit: 'ms' });
 * ```
 */
export const VitalThresholdsSchema = v.strictObject({
  /** Upper bound for "good" rating (inclusive). */
  good: v.number(),
  /** Lower bound for "poor" rating (exclusive for timing, inclusive for CLS). */
  poor: v.number(),
  /** Unit of measurement. */
  unit: v.picklist(['ms', 'score']),
});

/** Inferred type for vital thresholds. {@link VitalThresholdsSchema} */
export type VitalThresholds = v.InferOutput<typeof VitalThresholdsSchema>;

/**
 * A single diagnostic finding — one fact about what's causing a metric value.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(DiagnosticFindingSchema, { label: 'LCP Element', value: '<img.hero>' });
 * ```
 */
export const DiagnosticFindingSchema = v.strictObject({
  /** Short label describing the finding (e.g. "LCP Element", "DNS Lookup"). */
  label: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
  /** Human-readable value (e.g. "<img.hero>", "45ms", "142px movement"). */
  value: v.pipe(v.string(), v.minLength(1), v.maxLength(500)),
});

/** Inferred type for a diagnostic finding. {@link DiagnosticFindingSchema} */
export type DiagnosticFinding = v.InferOutput<typeof DiagnosticFindingSchema>;

/**
 * Full diagnostics for a single metric — thresholds + actionable findings.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(VitalDiagnosticsSchema, {
 *   thresholds: { good: 2500, poor: 4000, unit: 'ms' },
 *   findings: [{ label: 'LCP Element', value: '<img.hero>' }],
 * });
 * ```
 */
export const VitalDiagnosticsSchema = v.strictObject({
  /** Good/poor threshold boundaries for this metric. */
  thresholds: VitalThresholdsSchema,
  /** Actionable findings from Performance API queries. */
  findings: v.array(DiagnosticFindingSchema),
});

/** Inferred type for vital diagnostics. {@link VitalDiagnosticsSchema} */
export type VitalDiagnostics = v.InferOutput<typeof VitalDiagnosticsSchema>;

// =============================================================================
// Internal Types
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

/** Source of a layout shift — element and rects. */
type LayoutShiftSource = LayoutShiftEntry['sources'][number];

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
const LongTaskAttributionSchema = v.strictObject({
  /** Name of the attribution (e.g. 'script'). */
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
  /** Container type (e.g. 'iframe', 'embed', 'object'). */
  containerType: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
  /** Container source URL (can be empty for same-origin scripts). */
  containerSrc: v.pipe(v.string(), v.maxLength(2000)),
});

/** Inferred type for long task attribution. {@link LongTaskAttributionSchema} */
type LongTaskAttribution = v.InferOutput<typeof LongTaskAttributionSchema>;

/** Minimal PerformanceLongTaskTiming entry (not in TS DOM lib). */
type LongTaskEntry = PerformanceEntry & {
  /** Attribution data identifying the source of the long task. */
  readonly attribution: readonly LongTaskAttribution[];
};

// =============================================================================
// Constants
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

// =============================================================================
// Internal Helpers
// =============================================================================

/** Collected LCP entries from PerformanceObserver. */
let lcpEntries: LCPEntry[] = [];

/** Collected layout shift entries from PerformanceObserver. */
let layoutShiftEntries: LayoutShiftEntry[] = [];

/** Collected long task entries from PerformanceObserver. */
let longTasks: LongTaskEntry[] = [];

/** Collected event timing entries from PerformanceObserver. */
let eventTimings: EventTimingEntry[] = [];

/** Whether observers have been set up. */
let observersActive: Bool = false;

/**
 * Describes a DOM element concisely for diagnostic output.
 *
 * @param el - The element to describe
 * @returns A string like "<img.hero>" or "<div#main>"
 */
function describeElement(el: Element): Result<Str> {
  const tag: Str = el.tagName.toLowerCase();

  if (el.id) {
    return ok(StrSchema, `<${tag}#${el.id}>`);
  }

  const firstClass: OptionalStr =
    el.className && typeof el.className === 'string' ? el.className.split(/\s+/)[0] : undefined;

  if (firstClass) {
    return ok(StrSchema, `<${tag}.${firstClass}>`);
  }

  return ok(StrSchema, `<${tag}>`);
}

/**
 * Describes a Node concisely (handles non-Element nodes).
 *
 * @param node - The node to describe
 * @returns A string description
 */
function describeNode(node: Node): Result<Str> {
  if (node instanceof Element) {
    return describeElement(node);
  }

  return ok(StrSchema, `[${node.nodeName}]`);
}

/**
 * Shortens a URL to just the pathname + filename for display.
 *
 * @param url - Full URL string
 * @returns Shortened display string (e.g. "/images/hero.jpg")
 */
function shortenUrl(url: Str): Result<Str> {
  try {
    const parsed: URL = new URL(url, window.location.origin);

    // Same origin — show pathname only
    if (parsed.origin === window.location.origin) {
      return ok(StrSchema, parsed.pathname);
    }

    // Cross-origin — show host + pathname
    return ok(StrSchema, `${parsed.host}${parsed.pathname}`);
  } catch (error: unknown) {
    // Malformed URL — return truncated fallback
    return err(ERRORS.ENCODING.URL_FAILED, { cause: fromUnknownError(error) });
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
function diagnoseLCP(): Result<DiagnosticFinding[]> {
  const findings: DiagnosticFinding[] = [];

  try {
    if (lcpEntries.length === 0) {
      return okUnchecked(findings);
    }

    // Use the latest LCP entry from the observer
    const lcp: LCPEntry = lcpEntries.at(-1) as LCPEntry; // cast safe: length > 0 guarantees at(-1) is defined

    // Identify the LCP element
    if (lcp.element) {
      const elResult: Result<Str> = describeElement(lcp.element);
      let elDesc: Str = '(unknown)';

      if (elResult.ok) {
        elDesc = elResult.data;
      }

      findings.push({ label: 'LCP Element', value: elDesc });
    }

    // Resource URL (for images/videos)
    if (lcp.url) {
      const urlResult: Result<Str> = shortenUrl(lcp.url);
      let urlDisplay: Str = lcp.url;

      if (urlResult.ok) {
        urlDisplay = urlResult.data;
      }

      findings.push({ label: 'Resource', value: urlDisplay });
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
      findings.push({ label: 'Element Size', value: `${lcp.size.toLocaleString()}px\u00B2` });
    }
  } catch (error: unknown) {
    // LCP API not available — return partial findings with error context
    const appError: AppError = fromUnknownError(error);

    return err(ERRORS.RUNTIME.UNSUPPORTED, { cause: appError });
  }

  return okUnchecked(findings);
}

/**
 * Collects CLS diagnostic findings from the Performance API.
 *
 * Identifies which DOM elements shifted, how far they moved, and
 * whether shifts were triggered by user input.
 *
 * @returns Array of diagnostic findings
 */
function diagnoseCLS(): Result<DiagnosticFinding[]> {
  const findings: DiagnosticFinding[] = [];

  try {
    if (layoutShiftEntries.length === 0) {
      return okUnchecked(findings);
    }

    const shifts: LayoutShiftEntry[] = layoutShiftEntries;
    const unexpectedShifts: LayoutShiftEntry[] = shifts.filter(
      (s: LayoutShiftEntry): Bool => !s.hadRecentInput,
    );

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
      const [source]: ReadonlyArray<LayoutShiftSource | undefined> = largestShift.sources;

      if (source) {
        let nodeDesc: Str = '(unknown)';

        if (source.node) {
          const nodeResult: Result<Str> = describeNode(source.node);

          if (nodeResult.ok) {
            nodeDesc = nodeResult.data;
          }
        }

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
    }
  } catch (error: unknown) {
    // Layout Shift API not available
    const appError: AppError = fromUnknownError(error);

    return err(ERRORS.RUNTIME.UNSUPPORTED, { cause: appError });
  }

  return okUnchecked(findings);
}

/**
 * Collects TTFB diagnostic findings from Navigation Timing API.
 *
 * Breaks down the network waterfall into DNS, TLS, server response,
 * and redirect timings to identify the specific bottleneck.
 *
 * @returns Array of diagnostic findings
 */
function diagnoseTTFB(): Result<DiagnosticFinding[]> {
  const findings: DiagnosticFinding[] = [];

  try {
    const navEntries: PerformanceEntryList = performance.getEntriesByType('navigation');

    if (navEntries.length === 0) {
      return okUnchecked(findings);
    }

    // Cast needed: PerformanceEntry -> PerformanceNavigationTiming (type narrowing from getEntriesByType)
    const [navEntry]: ReadonlyArray<PerformanceEntry | undefined> = navEntries;

    if (!navEntry) {
      return okUnchecked(findings);
    }

    const nav: PerformanceNavigationTiming = navEntry as PerformanceNavigationTiming; // cast safe: getEntriesByType('navigation') returns PerformanceNavigationTiming

    const dns: Num = Math.round(nav.domainLookupEnd - nav.domainLookupStart);
    const tcp: Num = Math.round(nav.connectEnd - nav.connectStart);
    const tls: Num =
      nav.secureConnectionStart > 0 ? Math.round(nav.connectEnd - nav.secureConnectionStart) : 0;
    const serverTime: Num = Math.round(nav.responseStart - nav.requestStart);
    const redirect: Num = Math.round(nav.redirectEnd - nav.redirectStart);

    // Build a waterfall breakdown
    const parts: Str[] = [];

    if (redirect > 0) {
      parts.push(`redirect ${redirect}ms`);
    }
    if (dns > 0) {
      parts.push(`DNS ${dns}ms`);
    }
    if (tls > 0) {
      parts.push(`TLS ${tls}ms`);
    } else if (tcp > 0) {
      parts.push(`TCP ${tcp}ms`);
    }
    parts.push(`server ${serverTime}ms`);

    findings.push({ label: 'Waterfall', value: parts.join(' \u2192 ') });

    // Identify the biggest bottleneck
    const bottlenecks: Array<[Str, Num]> = [
      ['Redirect', redirect],
      ['DNS', dns],
      ['TLS', tls],
      ['TCP', tcp],
      ['Server response', serverTime],
    ];

    bottlenecks.sort((a: [Str, Num], b: [Str, Num]): Num => b[1] - a[1]);

    const [biggest]: ReadonlyArray<[Str, Num] | undefined> = bottlenecks;

    if (!biggest) {
      return okUnchecked(findings);
    }

    if (biggest[1] > 50) {
      findings.push({
        label: 'Bottleneck',
        value: `${biggest[0]} (${biggest[1]}ms)`,
      });
    }
  } catch (error: unknown) {
    // Navigation Timing API not available
    const appError: AppError = fromUnknownError(error);

    return err(ERRORS.RUNTIME.UNSUPPORTED, { cause: appError });
  }

  return okUnchecked(findings);
}

/**
 * Collects FCP diagnostic findings.
 *
 * Identifies render-blocking resources that delay first paint by
 * checking the `renderBlockingStatus` property on Resource Timing entries.
 *
 * @returns Array of diagnostic findings
 */
function diagnoseFCP(): Result<DiagnosticFinding[]> {
  const findings: DiagnosticFinding[] = [];

  try {
    // Check for render-blocking resources
    const resources: PerformanceEntryList = performance.getEntriesByType('resource');
    const blocking: Array<{ url: Str; duration: Num }> = [];

    for (const entry of resources) {
      const res: PerformanceResourceTiming = entry as PerformanceResourceTiming; // cast safe: getEntriesByType('resource') returns PerformanceResourceTiming

      // renderBlockingStatus is a newer property — may not be present
      const status: OptionalStr = (res as unknown as Record<Str, Str>).renderBlockingStatus; // cast safe: duck-typing check for optional browser API property

      if (status === 'blocking') {
        const urlResult: Result<Str> = shortenUrl(res.name);
        let displayUrl: Str = res.name;

        if (urlResult.ok) {
          displayUrl = urlResult.data;
        }

        blocking.push({
          url: displayUrl,
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
          label: '  \u2026',
          value: `\u2026and ${blocking.length - 3} more`,
        });
      }
    }

    // Check if TTFB contributes significantly to FCP
    const navEntries: PerformanceEntryList = performance.getEntriesByType('navigation');

    if (navEntries.length > 0) {
      // Cast needed: PerformanceEntry -> PerformanceNavigationTiming (type narrowing from getEntriesByType)
      const [fcpNavEntry]: ReadonlyArray<PerformanceEntry | undefined> = navEntries;

      if (fcpNavEntry) {
        const nav: PerformanceNavigationTiming = fcpNavEntry as PerformanceNavigationTiming; // cast safe: getEntriesByType('navigation') returns PerformanceNavigationTiming

        const ttfb: Num = Math.round(nav.responseStart);

        if (ttfb > 400) {
          findings.push({
            label: 'TTFB Impact',
            value: `${ttfb}ms server response delays first paint`,
          });
        }
      }
    }
  } catch (error: unknown) {
    // Resource Timing API not available
    const appError: AppError = fromUnknownError(error);

    return err(ERRORS.RUNTIME.UNSUPPORTED, { cause: appError });
  }

  return okUnchecked(findings);
}

/**
 * Collects INP diagnostic findings from observed event timings.
 *
 * Identifies the slowest user interaction, its target element,
 * event type, and processing duration breakdown.
 *
 * @returns Array of diagnostic findings
 */
function diagnoseINP(): Result<DiagnosticFinding[]> {
  const findings: DiagnosticFinding[] = [];

  if (eventTimings.length === 0) {
    findings.push({
      label: 'Note',
      value: 'No interactions recorded yet \u2014 interact with the page first',
    });

    return okUnchecked(findings);
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
    let targetDesc: Str = '(unknown)';

    if (slowest.target) {
      const targetResult: Result<Str> = describeElement(slowest.target);

      if (targetResult.ok) {
        targetDesc = targetResult.data;
      }
    }

    const processing: Num = Math.round(slowest.processingEnd - slowest.processingStart);
    const inputDelay: Num = Math.round(slowest.processingStart - slowest.startTime);
    const presentationDelay: Num = Math.round(
      slowest.duration - (slowest.processingEnd - slowest.startTime),
    );

    findings.push({
      label: 'Slowest',
      value: `${slowest.name} on ${targetDesc} \u2014 ${Math.round(slowest.duration)}ms total`,
    });

    findings.push({
      label: 'Breakdown',
      value: `input delay ${inputDelay}ms \u2192 processing ${processing}ms \u2192 presentation ${presentationDelay}ms`,
    });

    // Identify the biggest phase
    const phases: Array<[Str, Num]> = [
      ['Input delay (main thread blocked)', inputDelay],
      ['Processing (event handler)', processing],
      ['Presentation (rendering)', presentationDelay],
    ];

    phases.sort((a: [Str, Num], b: [Str, Num]): Num => b[1] - a[1]);

    const [biggestPhase]: ReadonlyArray<[Str, Num] | undefined> = phases;

    if (!biggestPhase) {
      return okUnchecked(findings);
    }

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

  return okUnchecked(findings);
}

/**
 * Collects TBT/NTBT diagnostic findings from observed long tasks.
 *
 * Identifies main-thread blocking tasks, their durations, and
 * the scripts responsible for them.
 *
 * @returns Array of diagnostic findings
 */
function diagnoseTBT(): Result<DiagnosticFinding[]> {
  const findings: DiagnosticFinding[] = [];

  if (longTasks.length === 0) {
    findings.push({
      label: 'Long Tasks',
      value: 'None observed (main thread was responsive)',
    });

    return okUnchecked(findings);
  }

  // Calculate total blocking time (duration - 50ms for each task)
  let totalBlocking: Num = 0;
  let longestTask: LongTaskEntry | null = null;
  let longestDuration: Num = 0;

  for (const task of longTasks) {
    const blocking: Num = task.duration - 50;

    if (blocking > 0) {
      totalBlocking += blocking;
    }

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
      const [attr]: ReadonlyArray<LongTaskAttribution | undefined> = longestTask.attribution;

      if (attr) {
        if (attr.containerSrc) {
          const srcResult: Result<Str> = shortenUrl(attr.containerSrc);
          let srcDisplay: Str = attr.containerSrc;

          if (srcResult.ok) {
            srcDisplay = srcResult.data;
          }

          scriptInfo = ` \u2014 ${srcDisplay}`;
        } else if (attr.containerType) {
          scriptInfo = ` \u2014 ${attr.containerType}`;
        }
      }
    }

    findings.push({
      label: 'Longest',
      value: `${Math.round(longestTask.duration)}ms${scriptInfo}`,
    });
  }

  return okUnchecked(findings);
}

// =============================================================================
// Exported API
// =============================================================================

/** Metric name -> diagnostic collector mapping. */
const COLLECTORS: Readonly<Record<Str, () => Result<DiagnosticFinding[]>>> = {
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
 * Returns threshold boundaries for a metric, or null if unknown.
 *
 * @param {Str} metricName - Web Vital metric name (e.g. 'LCP', 'CLS')
 * @returns {Result<VitalThresholds | null>} Threshold data or null
 *
 * @example
 * ```typescript
 * const result = getThresholds('LCP');
 * if (result.ok && result.data) {
 *   console.log(result.data.good); // 2500
 * }
 * ```
 */
export function getThresholds(metricName: Str): Result<VitalThresholds | null> {
  const parsed: Result<Str> = safeParse(StrSchema, metricName);

  if (!parsed.ok) {
    return parsed;
  }

  return okUnchecked(THRESHOLDS[parsed.data] ?? null);
}

/**
 * Starts PerformanceObservers for long tasks and event timings.
 *
 * Must be called once at startup (from hooks.client.ts) before metrics
 * fire, because these entries are only available via observers — they
 * can't be queried retroactively via `performance.getEntriesByType()`.
 *
 * Safe to call in environments without PerformanceObserver (no-ops).
 *
 * @returns {Result<Void>} Always succeeds
 *
 * @example
 * ```typescript
 * import { setupDiagnosticObservers } from '$lib/perf/vitals-diagnostics';
 * setupDiagnosticObservers();
 * ```
 */
export function setupDiagnosticObservers(): Result<Void> {
  if (observersActive) {
    return okUnchecked<Void>(undefined);
  }
  if (typeof PerformanceObserver === 'undefined') {
    return okUnchecked<Void>(undefined);
  }
  observersActive = true;

  // LCP observer — collects largest-contentful-paint entries (deprecated via getEntriesByType)
  try {
    const lcpObserver: PerformanceObserver = new PerformanceObserver(
      (list: PerformanceObserverEntryList): Void => {
        for (const entry of list.getEntries()) {
          lcpEntries.push(
            entry as LCPEntry, // cast safe: PerformanceObserver type:'largest-contentful-paint' guarantees LCPEntry
          );
        }
      },
    );

    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (error: unknown) {
    // LCP API not supported in this browser — diagnostics will be partial
    fromUnknownError(error);
  }

  // Layout shift observer — collects layout-shift entries (deprecated via getEntriesByType)
  try {
    const clsObserver: PerformanceObserver = new PerformanceObserver(
      (list: PerformanceObserverEntryList): Void => {
        for (const entry of list.getEntries()) {
          layoutShiftEntries.push(
            entry as LayoutShiftEntry, // cast safe: PerformanceObserver type:'layout-shift' guarantees LayoutShiftEntry
          );
        }
      },
    );

    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch (error: unknown) {
    // Layout Shift API not supported in this browser — diagnostics will be partial
    fromUnknownError(error);
  }

  // Long task observer — collects main-thread blocking tasks > 50ms
  try {
    const longTaskObserver: PerformanceObserver = new PerformanceObserver(
      (list: PerformanceObserverEntryList): Void => {
        for (const entry of list.getEntries()) {
          longTasks.push(
            entry as LongTaskEntry, // cast safe: PerformanceObserver type:'longtask' guarantees LongTaskEntry
          );
        }
      },
    );

    longTaskObserver.observe({ type: 'longtask', buffered: true });
  } catch (error: unknown) {
    // Long Tasks API not supported in this browser — diagnostics will be partial
    fromUnknownError(error);
  }

  // Event timing observer — collects interaction timings for INP attribution
  try {
    const eventObserver: PerformanceObserver = new PerformanceObserver(
      (list: PerformanceObserverEntryList): Void => {
        for (const entry of list.getEntries()) {
          const evt: EventTimingEntry = entry as EventTimingEntry; // cast safe: PerformanceObserver type:'event' guarantees EventTimingEntry

          // Only keep entries with an interaction ID (actual user interactions)
          if (evt.interactionId > 0) {
            eventTimings.push(evt);
          }
        }
      },
    );

    eventObserver.observe({ type: 'event', buffered: true });
  } catch (error: unknown) {
    // Event Timing API not supported in this browser — diagnostics will be partial
    fromUnknownError(error);
  }

  return okUnchecked<Void>(undefined);
}

/**
 * Resets all collected observer data and observer state.
 * Intended for test isolation.
 *
 * @returns {Result<Void>} Always succeeds
 *
 * @example
 * ```typescript
 * resetDiagnostics();
 * ```
 */
export function resetDiagnostics(): Result<Void> {
  lcpEntries = [];
  layoutShiftEntries = [];
  longTasks = [];
  eventTimings = [];
  observersActive = false;

  return okUnchecked<Void>(undefined);
}

/**
 * Injects mock LCP entries for testing. Test-only — not part of the public API.
 *
 * @param {unknown[]} entries - Mock LCP entries to inject
 * @returns {Result<Void>} Always succeeds
 *
 * @example
 * ```typescript
 * _injectLCPEntries([{ element: null, url: '', size: 100, loadTime: 50, renderTime: 100 }]);
 * ```
 */
export function _injectLCPEntries(entries: unknown[]): Result<Void> {
  const parsed: Result<unknown[]> = safeParse(v.array(v.unknown()), entries);

  if (!parsed.ok) {
    return parsed;
  }

  // Test helper — cast from unknown is safe because only test mocks are passed
  lcpEntries = entries as LCPEntry[]; // cast safe: test-only helper, callers pass mock LCPEntry objects

  return okUnchecked<Void>(undefined);
}

/**
 * Injects mock layout shift entries for testing. Test-only — not part of the public API.
 *
 * @param {unknown[]} entries - Mock layout shift entries to inject
 * @returns {Result<Void>} Always succeeds
 *
 * @example
 * ```typescript
 * _injectLayoutShiftEntries([{ value: 0.1, hadRecentInput: false, sources: [] }]);
 * ```
 */
export function _injectLayoutShiftEntries(entries: unknown[]): Result<Void> {
  const parsed: Result<unknown[]> = safeParse(v.array(v.unknown()), entries);

  if (!parsed.ok) {
    return parsed;
  }

  // Test helper — cast from unknown is safe because only test mocks are passed
  layoutShiftEntries = entries as LayoutShiftEntry[]; // cast safe: test-only helper, callers pass mock LayoutShiftEntry objects

  return okUnchecked<Void>(undefined);
}

/**
 * Injects mock long task entries for testing. Test-only — not part of the public API.
 *
 * @param {unknown[]} entries - Mock long task entries to inject
 * @returns {Result<Void>} Always succeeds
 *
 * @example
 * ```typescript
 * _injectLongTasks([{ duration: 120, attribution: [{ name: 'script', containerType: 'iframe', containerSrc: '' }] }]);
 * ```
 */
export function _injectLongTasks(entries: unknown[]): Result<Void> {
  const parsed: Result<unknown[]> = safeParse(v.array(v.unknown()), entries);

  if (!parsed.ok) {
    return parsed;
  }

  // Test helper — cast from unknown is safe because only test mocks are passed
  longTasks = entries as LongTaskEntry[]; // cast safe: test-only helper, callers pass mock LongTaskEntry objects

  return okUnchecked<Void>(undefined);
}

/**
 * Injects mock event timing entries for testing. Test-only — not part of the public API.
 *
 * @param {unknown[]} entries - Mock event timing entries to inject
 * @returns {Result<Void>} Always succeeds
 *
 * @example
 * ```typescript
 * _injectEventTimings([{ name: 'click', duration: 300, processingStart: 50, processingEnd: 250, target: null, interactionId: 1 }]);
 * ```
 */
export function _injectEventTimings(entries: unknown[]): Result<Void> {
  const parsed: Result<unknown[]> = safeParse(v.array(v.unknown()), entries);

  if (!parsed.ok) {
    return parsed;
  }

  // Test helper — cast from unknown is safe because only test mocks are passed
  eventTimings = entries as EventTimingEntry[]; // cast safe: test-only helper, callers pass mock EventTimingEntry objects

  return okUnchecked<Void>(undefined);
}

/**
 * Collects full diagnostics for a Web Vital metric.
 *
 * Queries browser Performance APIs to identify what's actually causing
 * the metric value. Returns threshold context and specific findings.
 *
 * Only collects diagnostics for non-good ratings — returns null for
 * good metrics to avoid unnecessary Performance API queries.
 *
 * @param {Str} metricName - The metric name (e.g. 'LCP', 'CLS', 'INP')
 * @param {Num} _value - The metric value (reserved for future use)
 * @param {Str} rating - The performance rating ('good', 'needsImprovement', 'poor')
 * @returns {Result<VitalDiagnostics | null>} Diagnostics object or null if metric is good or unknown
 *
 * @example
 * ```typescript
 * const result = collectDiagnostics('LCP', 3200, 'needsImprovement');
 * if (result.ok && result.data) {
 *   console.log(result.data.thresholds); // { good: 2500, poor: 4000, unit: 'ms' }
 *   console.log(result.data.findings);   // [{ label: 'LCP Element', value: '<img.hero>' }, ...]
 * }
 * ```
 */
export function collectDiagnostics(
  metricName: Str,
  _value: Num,
  rating: Str,
): Result<VitalDiagnostics | null> {
  const metricParsed: Result<Str> = safeParse(StrSchema, metricName);

  if (!metricParsed.ok) {
    return metricParsed;
  }

  const valueParsed: Result<Num> = safeParse(NumSchema, _value);

  if (!valueParsed.ok) {
    return valueParsed;
  }

  const ratingParsed: Result<Str> = safeParse(StrSchema, rating);

  if (!ratingParsed.ok) {
    return ratingParsed;
  }

  // Skip diagnostics for good metrics — no action needed
  if (ratingParsed.data === 'good') {
    return okUnchecked(null);
  }

  const thresholdsResult: Result<VitalThresholds | null> = getThresholds(metricParsed.data);

  if (!thresholdsResult.ok) {
    return thresholdsResult;
  }

  if (!thresholdsResult.data) {
    return okUnchecked(null);
  }

  const thresholds: VitalThresholds = thresholdsResult.data;
  const collector: (() => Result<DiagnosticFinding[]>) | undefined = COLLECTORS[metricParsed.data];

  let findings: DiagnosticFinding[] = [];

  if (collector) {
    const collectorResult: Result<DiagnosticFinding[]> = collector();

    if (!collectorResult.ok) {
      return collectorResult;
    }

    findings = collectorResult.data as DiagnosticFinding[]; // cast safe: Result.data is DeepReadonly but DiagnosticFinding[] is compatible
  }

  return okUnchecked({ thresholds, findings });
}

/**
 * Formats a threshold boundary as a human-readable string.
 *
 * @param {VitalThresholds} thresholds - The threshold data
 * @returns {Result<Str>} A string like "good < 2500ms - poor > 4000ms"
 *
 * @example
 * ```typescript
 * const result = formatThresholds({ good: 2500, poor: 4000, unit: 'ms' });
 * if (result.ok) {
 *   console.log(result.data); // "good < 2500ms \u00B7 poor > 4000ms"
 * }
 * ```
 */
export function formatThresholds(thresholds: VitalThresholds): Result<Str> {
  const parsed: Result<VitalThresholds> = safeParse(VitalThresholdsSchema, thresholds);

  if (!parsed.ok) {
    return parsed;
  }

  const suffix: Str = parsed.data.unit === 'ms' ? 'ms' : '';
  const goodVal: Str =
    parsed.data.unit === 'score'
      ? parsed.data.good.toString()
      : Math.round(parsed.data.good).toString();
  const poorVal: Str =
    parsed.data.unit === 'score'
      ? parsed.data.poor.toString()
      : Math.round(parsed.data.poor).toString();

  return ok(StrSchema, `good < ${goodVal}${suffix} \u00B7 poor > ${poorVal}${suffix}`);
}
