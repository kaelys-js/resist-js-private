/**
 * Valibot schemas and types for LensStats component performance metrics.
 *
 * Defines the data shapes for mount/render timing, DOM analysis,
 * accessibility auditing, console capture, and performance budgets.
 */
import * as v from 'valibot';
import { StrSchema, BoolSchema, NumSchema } from '@/schemas/common';

/* ------------------------------------------------------------------ */
/*  Budget level — traffic light system                               */
/* ------------------------------------------------------------------ */

/** Performance budget level for a single metric. */
export const BudgetLevelSchema = v.picklist(['green', 'yellow', 'red']);
export type BudgetLevel = v.InferOutput<typeof BudgetLevelSchema>;

/* ------------------------------------------------------------------ */
/*  Heading audit                                                     */
/* ------------------------------------------------------------------ */

/** A heading element found in the component. */
export const HeadingInfoSchema = v.strictObject({
  /** Heading level (1-6). */
  level: NumSchema,
  /** Text content of the heading (truncated to 60 chars). */
  text: StrSchema,
});
export type HeadingInfo = v.InferOutput<typeof HeadingInfoSchema>;

/* ------------------------------------------------------------------ */
/*  Focus order issue                                                 */
/* ------------------------------------------------------------------ */

/** An element with a positive tabindex (anti-pattern). */
export const FocusOrderIssueSchema = v.strictObject({
  /** HTML tag name. */
  tag: StrSchema,
  /** The tabindex value (positive values disrupt natural focus order). */
  tabindex: NumSchema,
  /** Element text preview for identification. */
  text: StrSchema,
});
export type FocusOrderIssue = v.InferOutput<typeof FocusOrderIssueSchema>;

/* ------------------------------------------------------------------ */
/*  Accessibility audit                                               */
/* ------------------------------------------------------------------ */

/** A single unlabeled interactive element flagged by the accessibility audit. */
export const UnlabeledElementSchema = v.strictObject({
  /** HTML tag name (e.g., `button`, `a`, `input`). */
  tag: StrSchema,
  /** CSS class list for identification (may be empty). */
  classes: StrSchema,
  /** Element text content preview (truncated to 40 chars). */
  text: StrSchema,
  /** Closest identifiable parent context (e.g., `<div class="toolbar">`). */
  parentContext: StrSchema,
});
export type UnlabeledElement = v.InferOutput<typeof UnlabeledElementSchema>;

/** Accessibility snapshot of the rendered component. */
export const A11yAuditSchema = v.strictObject({
  /** Total interactive elements (buttons, links, inputs, selects, textareas, [tabindex]). */
  focusableCount: NumSchema,
  /** Elements with aria-label, aria-labelledby, or associated <label>. */
  labeledCount: NumSchema,
  /** Unique ARIA roles found in the component. */
  roles: v.array(StrSchema),
  /** Interactive elements missing accessible labels. */
  unlabeled: v.array(UnlabeledElementSchema),
  /** Count of buttons found. */
  buttonCount: NumSchema,
  /** Count of links found. */
  linkCount: NumSchema,
  /** Count of form inputs found. */
  inputCount: NumSchema,
  /** Heading elements in document order for hierarchy audit. */
  headings: v.array(HeadingInfoSchema),
  /** Whether headings skip levels (e.g., h1 → h3 with no h2). */
  headingSkipsLevel: BoolSchema,
  /** Landmark regions found (main, nav, header, footer, aside, etc.). */
  landmarks: v.array(StrSchema),
  /** Elements with positive tabindex (disrupts natural focus order). */
  focusOrderIssues: v.array(FocusOrderIssueSchema),
  /** Count of elements with inline event handlers (onclick, onmousedown, etc.). */
  eventListenerCount: NumSchema,
});
export type A11yAudit = v.InferOutput<typeof A11yAuditSchema>;

/* ------------------------------------------------------------------ */
/*  Console capture                                                   */
/* ------------------------------------------------------------------ */

/** A captured console message during component mount. */
export const CapturedConsoleMessageSchema = v.strictObject({
  /** Console level (`warn` or `error`). */
  level: v.picklist(['warn', 'error']),
  /** Message text (first argument stringified). */
  message: StrSchema,
});
export type CapturedConsoleMessage = v.InferOutput<typeof CapturedConsoleMessageSchema>;

/* ------------------------------------------------------------------ */
/*  Per-metric budget result                                          */
/* ------------------------------------------------------------------ */

/** Budget evaluation for a single metric. */
export const MetricBudgetSchema = v.strictObject({
  /** Metric display label (e.g., "Mount Time", "Node Count"). */
  label: StrSchema,
  /** Formatted value string (e.g., "12.3ms", "47 nodes"). */
  value: StrSchema,
  /** Traffic light level based on thresholds. */
  level: BudgetLevelSchema,
  /** Human-readable explanation of what this metric measures. */
  description: StrSchema,
  /** Formatted threshold ranges (e.g., "🟢 ≤16ms · 🟡 ≤50ms · 🔴 >50ms"). */
  thresholds: StrSchema,
  /** Green threshold max value (for future custom threshold support). */
  greenMax: NumSchema,
  /** Yellow threshold max value (for future custom threshold support). */
  yellowMax: NumSchema,
});
export type MetricBudget = v.InferOutput<typeof MetricBudgetSchema>;

/* ------------------------------------------------------------------ */
/*  Layout shift source                                               */
/* ------------------------------------------------------------------ */

/** A DOM element that contributed to a layout shift. */
export const LayoutShiftSourceSchema = v.strictObject({
  /** HTML tag name of the shifted element. */
  tag: StrSchema,
  /** CSS selector or class list for identification. */
  selector: StrSchema,
  /** Shift contribution value for this element. */
  shiftValue: NumSchema,
});
export type LayoutShiftSource = v.InferOutput<typeof LayoutShiftSourceSchema>;

/* ------------------------------------------------------------------ */
/*  Web Vitals                                                        */
/* ------------------------------------------------------------------ */

/** Component-scoped Web Vitals measured via PerformanceObserver. */
export const WebVitalsSchema = v.strictObject({
  /** Component-scoped CLS score (sum of layout shifts from component elements). */
  clsScore: NumSchema,
  /** Number of layout shift events attributed to this component. */
  clsShiftCount: NumSchema,
  /** Elements that contributed to layout shifts (top 3). */
  clsSources: v.array(LayoutShiftSourceSchema),
  /** Number of long tasks (>50ms) detected during component mount window. */
  longTaskCount: NumSchema,
  /** Duration of the worst long task in ms during mount (-1 if none). */
  worstLongTaskMs: NumSchema,
  /** First Paint time relative to component mount start in ms (-1 if unavailable or pre-mounted). */
  paintTimeMs: NumSchema,
  /** First Contentful Paint time relative to mount start in ms (-1 if unavailable or pre-mounted). */
  fcpTimeMs: NumSchema,
  /** Whether this component contains the page's LCP element. */
  isLcpComponent: BoolSchema,
  /** LCP timing in ms (-1 if this component is not the LCP contributor). */
  lcpTimeMs: NumSchema,
  /** Description of the LCP element if within this component (empty string if not). */
  lcpElement: StrSchema,
  /** First Input Delay in ms — time between first user interaction and browser response (-1 if no interaction yet or unsupported). */
  fidMs: NumSchema,
  /** Time to First Byte in ms — page-level server response time (-1 if unavailable). */
  ttfbMs: NumSchema,
  /** Whether the browser supports the required PerformanceObserver entry types. */
  supported: BoolSchema,
});
export type WebVitals = v.InferOutput<typeof WebVitalsSchema>;

/* ------------------------------------------------------------------ */
/*  Complete stats data                                               */
/* ------------------------------------------------------------------ */

/** Complete performance statistics for a rendered component card. */
export const LensStatsDataSchema = v.strictObject({
  /** Time from mount start to first paint, in milliseconds. */
  mountTimeMs: NumSchema,
  /** Number of DOM mutations observed after initial mount. */
  reRenderCount: NumSchema,
  /** Total DOM element count inside the component. */
  nodeCount: NumSchema,
  /** Maximum nesting depth of the DOM tree. */
  domDepth: NumSchema,
  /** Number of text nodes in the component. */
  textNodeCount: NumSchema,
  /** Whether async content was detected (mutations after mount). */
  hasAsyncContent: BoolSchema,
  /** Accessibility audit results. */
  a11y: A11yAuditSchema,
  /** Console messages captured during mount. */
  consoleMessages: v.array(CapturedConsoleMessageSchema),
  /** Performance budget evaluations for key metrics. */
  budgets: v.array(MetricBudgetSchema),
  /** Overall health level (worst budget level). */
  overallHealth: BudgetLevelSchema,
  /** JS heap delta in bytes (Chrome only, -1 if unavailable). */
  memoryDeltaBytes: NumSchema,
  /** Count of props with default values vs total. */
  propsWithDefaults: NumSchema,
  /** Total prop count. */
  propsTotal: NumSchema,
  /** Count of elements with inline event handlers. */
  eventListenerCount: NumSchema,
  /** Component-scoped Web Vitals (CLS, long tasks, paint timing, LCP). */
  vitals: WebVitalsSchema,
});
export type LensStatsData = v.InferOutput<typeof LensStatsDataSchema>;
