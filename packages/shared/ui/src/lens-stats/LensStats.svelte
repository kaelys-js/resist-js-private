<!-- @convert-to-lens -->
<script module lang="ts">
import * as v from 'valibot';
import { StrSchema, NumSchema } from '@/schemas/common';
import type { Snippet } from 'svelte';
import { LensStatsDataSchema } from './types.js';

/** Schema for the LensStats component props. */
export const LensStatsPropsSchema = v.strictObject({
	/** Unique card key for identifying this stats instance. @values variant:default, variant:secondary, default */
	cardKey: StrSchema,
	/** Callback fired when stats collection completes. */
	onstats: v.custom<(key: string, data: v.InferOutput<typeof LensStatsDataSchema>) => void>(
		(val: unknown): boolean => typeof val === 'function',
	),
	/** Total prop count for prop coverage metric. */
	propsTotal: v.optional(NumSchema, 0),
	/** Count of props with default values for prop coverage metric. */
	propsWithDefaults: v.optional(NumSchema, 0),
	/** Child content to wrap and measure. */
	children: v.custom<Snippet>((val: unknown): boolean => typeof val === 'function'),
});
/** Props for the LensStats component. */
export type LensStatsProps = v.InferOutput<typeof LensStatsPropsSchema>;
</script>

<script lang="ts">
/**
 * Wrapper component that measures performance statistics of its children.
 *
 * Collects mount timing, DOM analysis, accessibility audit, console
 * capture data, event listener counts, heading hierarchy, landmarks,
 * and focus order issues on mount, then reports via the `onstats` callback.
 *
 * @example
 * ```svelte
 * <LensStats cardKey="button:default" {onstats} propsTotal={5} propsWithDefaults={3}>
 *   <Button>Click me</Button>
 * </LensStats>
 * ```
 */
import type { Bool, Num, Str, Void } from '@/schemas/common';
import { onMount } from 'svelte';
import type {
	A11yAudit,
	BudgetLevel,
	CapturedConsoleMessage,
	FocusOrderIssue,
	HeadingInfo,
	LayoutShiftSource,
	LensStatsData,
	MetricBudget,
	UnlabeledElement,
	WebVitals,
} from './types.js';

const {
	cardKey,
	onstats,
	propsTotal = 0,
	propsWithDefaults = 0,
	children,
}: LensStatsProps = $props();

/** Reference to the wrapper div for DOM traversal. */
let wrapperRef: HTMLDivElement | undefined = $state(undefined);

/* ------------------------------------------------------------------ */
/*  Budget thresholds                                                 */
/* ------------------------------------------------------------------ */

/** Mount time thresholds in milliseconds. */
const MOUNT_GREEN: Num = 16;
const MOUNT_YELLOW: Num = 50;

/** DOM node count thresholds. */
const NODES_GREEN: Num = 100;
const NODES_YELLOW: Num = 500;

/** DOM depth thresholds. */
const DEPTH_GREEN: Num = 10;
const DEPTH_YELLOW: Num = 20;

/** Re-render count thresholds. */
const RERENDER_GREEN: Num = 0;
const RERENDER_YELLOW: Num = 3;

/** Event listener count thresholds. */
const LISTENERS_GREEN: Num = 10;
const LISTENERS_YELLOW: Num = 30;

/** CLS score thresholds (matches Google's page-level CLS thresholds). */
const CLS_GREEN: Num = 0;
const CLS_YELLOW: Num = 0.1;

/** Long task count thresholds. */
const LONG_TASK_COUNT_GREEN: Num = 0;
const LONG_TASK_COUNT_YELLOW: Num = 2;

/** Worst long task duration thresholds in ms. */
const LONG_TASK_MS_GREEN: Num = 50;
const LONG_TASK_MS_YELLOW: Num = 100;

/** FID (First Input Delay) thresholds in ms (Google's Web Vitals). */
const FID_GREEN: Num = 100;
const FID_YELLOW: Num = 300;

/** TTFB (Time to First Byte) thresholds in ms (Google's Web Vitals). */
const TTFB_GREEN: Num = 800;
const TTFB_YELLOW: Num = 1800;

/**
 * Evaluate a numeric metric against green/yellow/red thresholds.
 *
 * @param value - The measured value
 * @param greenMax - Maximum value for green (inclusive)
 * @param yellowMax - Maximum value for yellow (inclusive)
 * @returns Budget level
 */
function evaluateBudget(value: Num, greenMax: Num, yellowMax: Num): BudgetLevel {
	if (value <= greenMax) return 'green';
	if (value <= yellowMax) return 'yellow';
	return 'red';
}

/**
 * Format threshold range string for display.
 *
 * @param greenMax - Green threshold max
 * @param yellowMax - Yellow threshold max
 * @param unit - Unit suffix (e.g., "ms", "nodes")
 * @returns Formatted threshold string
 */
function formatThresholds(greenMax: Num, yellowMax: Num, unit: Str): Str {
	return `🟢 ≤${greenMax}${unit} · 🟡 ≤${yellowMax}${unit} · 🔴 >${yellowMax}${unit}`;
}

/**
 * Calculate maximum DOM tree depth from a root element.
 *
 * @param el - Root element to traverse
 * @returns Maximum nesting depth (1-based)
 */
function calcDomDepth(el: Element): Num {
	let maxDepth: Num = 0;
	for (const childEl of el.children) {
		const childDepth: Num = calcDomDepth(childEl);
		if (childDepth > maxDepth) maxDepth = childDepth;
	}
	return maxDepth + 1;
}

/**
 * Count text nodes within an element tree.
 *
 * @param el - Root element to traverse
 * @returns Number of TEXT_NODE children
 */
function countTextNodes(el: Element): Num {
	let count: Num = 0;
	const walker: TreeWalker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	while (walker.nextNode()) count++;
	return count;
}

/**
 * Check if an element has an accessible label.
 *
 * @param el - Element to check
 * @returns True if element has aria-label, aria-labelledby, or associated label
 */
function hasAccessibleLabel(el: Element): Bool {
	if (el.getAttribute('aria-label')) return true;
	if (el.getAttribute('aria-labelledby')) return true;
	if (el.getAttribute('title')) return true;
	const id: Str | null = el.getAttribute('id');
	if (id && document.querySelector(`label[for="${id}"]`)) return true;
	/* Check for wrapping <label> */
	if (el.closest('label')) return true;
	return false;
}

/**
 * Get a short parent context string for an element.
 *
 * @param el - Element to describe parent of
 * @returns Parent description like "<div class='toolbar'>"
 */
function getParentContext(el: Element): Str {
	const parent: Element | null = el.parentElement;
	if (!parent) return '';
	const tag: Str = parent.tagName.toLowerCase();
	const cls: Str = parent.className ? String(parent.className).slice(0, 30) : '';
	const role: Str | null = parent.getAttribute('role');
	if (role) return `<${tag} role="${role}">`;
	if (cls) return `<${tag} class="${cls}">`;
	return `<${tag}>`;
}

/**
 * Count elements with inline event handler attributes.
 *
 * @param root - Root element to scan
 * @returns Number of elements with onclick, onmousedown, etc.
 */
function countEventListeners(root: HTMLDivElement): Num {
	const handlerAttrs: Str[] = [
		'onclick', 'onmousedown', 'onmouseup', 'onmousemove', 'onmouseover', 'onmouseout',
		'onkeydown', 'onkeyup', 'onkeypress', 'onfocus', 'onblur', 'onchange', 'oninput',
		'onsubmit', 'onscroll', 'onwheel', 'ontouchstart', 'ontouchend', 'onpointerdown',
		'onpointerup', 'onpointermove',
	];
	let count: Num = 0;
	for (const el of root.querySelectorAll('*')) {
		for (const attr of handlerAttrs) {
			if (el.hasAttribute(attr)) {
				count++;
				break;
			}
		}
	}
	return count;
}

/**
 * Audit heading hierarchy for proper ordering.
 *
 * @param root - Root element to scan
 * @returns Heading info array and whether levels are skipped
 */
function auditHeadings(root: HTMLDivElement): { headings: HeadingInfo[]; skips: Bool } {
	const headings: HeadingInfo[] = [];
	for (const el of root.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
		const level: Num = Number.parseInt(el.tagName.charAt(1), 10);
		headings.push({
			level,
			text: (el.textContent ?? '').trim().slice(0, 60),
		});
	}

	let skips: Bool = false;
	for (let i: Num = 1; i < headings.length; i++) {
		const prev: HeadingInfo | undefined = headings[i - 1];
		const curr: HeadingInfo | undefined = headings[i];
		if (prev && curr && curr.level > prev.level + 1) {
			skips = true;
			break;
		}
	}

	return { headings, skips };
}

/**
 * Detect landmark regions in the component.
 *
 * @param root - Root element to scan
 * @returns Array of landmark names found
 */
function detectLandmarks(root: HTMLDivElement): Str[] {
	const landmarkSelectors: Array<{ selector: Str; name: Str }> = [
		{ selector: 'main, [role="main"]', name: 'main' },
		{ selector: 'nav, [role="navigation"]', name: 'navigation' },
		{ selector: 'header, [role="banner"]', name: 'banner' },
		{ selector: 'footer, [role="contentinfo"]', name: 'contentinfo' },
		{ selector: 'aside, [role="complementary"]', name: 'complementary' },
		{ selector: '[role="search"]', name: 'search' },
		{ selector: '[role="form"]', name: 'form' },
		{ selector: '[role="region"][aria-label], [role="region"][aria-labelledby]', name: 'region' },
	];

	const found: Str[] = [];
	for (const lm of landmarkSelectors) {
		if (root.querySelector(lm.selector)) {
			found.push(lm.name);
		}
	}
	return found;
}

/**
 * Detect positive tabindex values (focus order anti-pattern).
 *
 * @param root - Root element to scan
 * @returns Array of focus order issues
 */
function detectFocusOrderIssues(root: HTMLDivElement): FocusOrderIssue[] {
	const issues: FocusOrderIssue[] = [];
	for (const el of root.querySelectorAll('[tabindex]')) {
		const tabVal: Num = Number.parseInt(el.getAttribute('tabindex') ?? '0', 10);
		if (tabVal > 0) {
			issues.push({
				tag: el.tagName.toLowerCase(),
				tabindex: tabVal,
				text: (el.textContent ?? '').trim().slice(0, 40),
			});
		}
	}
	return issues;
}

/**
 * Run accessibility audit on a DOM subtree.
 *
 * @param root - Root element to audit
 * @returns Accessibility audit results
 */
function auditAccessibility(root: HTMLDivElement): A11yAudit {
	const focusableSelector: Str =
		'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
	const focusable: NodeListOf<Element> = root.querySelectorAll(focusableSelector);
	let labeledCount: Num = 0;
	const unlabeled: UnlabeledElement[] = [];

	for (const el of focusable) {
		if (hasAccessibleLabel(el)) {
			labeledCount++;
		} else {
			const textContent: Str = (el.textContent ?? '').trim().slice(0, 40);
			/* Skip elements that have visible text content — screen readers can use it */
			if (textContent.length === 0) {
				unlabeled.push({
					tag: el.tagName.toLowerCase(),
					classes: el.className ? String(el.className).slice(0, 60) : '',
					text: textContent,
					parentContext: getParentContext(el),
				});
			}
		}
	}

	const rolesSet: Set<Str> = new Set<Str>();
	for (const roleEl of root.querySelectorAll('[role]')) {
		const role: Str | null = roleEl.getAttribute('role');
		if (role) rolesSet.add(role);
	}

	const buttons: NodeListOf<Element> = root.querySelectorAll('button, [role="button"]');
	const links: NodeListOf<Element> = root.querySelectorAll('a[href], [role="link"]');
	const inputs: NodeListOf<Element> = root.querySelectorAll(
		'input, select, textarea, [role="textbox"], [role="combobox"]',
	);

	const headingResult: { headings: HeadingInfo[]; skips: Bool } = auditHeadings(root);
	const landmarks: Str[] = detectLandmarks(root);
	const focusOrderIssues: FocusOrderIssue[] = detectFocusOrderIssues(root);
	const eventListenerCount: Num = countEventListeners(root);

	return {
		focusableCount: focusable.length,
		labeledCount,
		roles: [...rolesSet].toSorted((a: Str, b: Str): Num => a.localeCompare(b)),
		unlabeled,
		buttonCount: buttons.length,
		linkCount: links.length,
		inputCount: inputs.length,
		headings: headingResult.headings,
		headingSkipsLevel: headingResult.skips,
		landmarks,
		focusOrderIssues,
		eventListenerCount,
	};
}

/**
 * Determine overall health from a list of budget evaluations.
 * Returns the worst (most severe) level found.
 *
 * @param budgets - Array of metric budgets
 * @returns Worst budget level
 */
function worstLevel(budgets: MetricBudget[]): BudgetLevel {
	let worst: BudgetLevel = 'green';
	for (const b of budgets) {
		if (b.level === 'red') return 'red';
		if (b.level === 'yellow') worst = 'yellow';
	}
	return worst;
}

/**
 * Build a single MetricBudget entry with description and thresholds.
 *
 * @param label - Display label
 * @param value - Formatted value
 * @param measured - Raw numeric value for budget evaluation
 * @param greenMax - Green threshold
 * @param yellowMax - Yellow threshold
 * @param unit - Unit suffix for threshold display
 * @param description - Human-readable explanation
 * @returns Complete MetricBudget
 */
function buildBudget(
	label: Str,
	value: Str,
	measured: Num,
	greenMax: Num,
	yellowMax: Num,
	unit: Str,
	description: Str,
): MetricBudget {
	return {
		label,
		value,
		level: evaluateBudget(measured, greenMax, yellowMax),
		description,
		thresholds: formatThresholds(greenMax, yellowMax, unit),
		greenMax,
		yellowMax,
	};
}

/**
 * Check whether a PerformanceObserver entry type is supported.
 *
 * @param entryType - Entry type name to check
 * @returns True if the browser supports this entry type
 */
function supportsEntryType(entryType: Str): Bool {
	try {
		return (
			typeof PerformanceObserver !== 'undefined' &&
			PerformanceObserver.supportedEntryTypes !== undefined &&
			PerformanceObserver.supportedEntryTypes.includes(entryType)
		);
	} catch {
		/* PerformanceObserver not available (e.g., SSR or older browser) */
		return false;
	}
}

/**
 * Describe a DOM element for layout shift attribution.
 *
 * @param el - The shifted DOM element (may be null)
 * @returns Human-readable tag + class string
 */
function describeElement(el: Node | null): Str {
	if (!el || !(el instanceof Element)) return '(unknown)';
	const tag: Str = el.tagName.toLowerCase();
	const cls: Str = el.className ? String(el.className).slice(0, 40) : '';
	return cls ? `<${tag} class="${cls}">` : `<${tag}>`;
}

/**
 * Collect component-scoped Web Vitals using PerformanceObserver.
 * Sets up observers for layout-shift, longtask, paint, and largest-contentful-paint.
 * Returns the vitals data and a cleanup function to disconnect observers.
 *
 * @param wrapper - The component wrapper element
 * @param mountStart - Timestamp when mount began (performance.now())
 * @returns Object with vitals data and cleanup function
 */
function collectVitals(
	wrapper: HTMLDivElement,
	mountStart: Num,
): { vitals: WebVitals; cleanup: () => void } {
	const observers: PerformanceObserver[] = [];

	const vitals: WebVitals = {
		clsScore: 0,
		clsShiftCount: 0,
		clsSources: [],
		longTaskCount: 0,
		worstLongTaskMs: -1,
		paintTimeMs: -1,
		fcpTimeMs: -1,
		isLcpComponent: false,
		lcpTimeMs: -1,
		lcpElement: '',
		fidMs: -1,
		ttfbMs: -1,
		supported: false,
	};

	const hasLayoutShift: Bool = supportsEntryType('layout-shift');
	const hasLongTask: Bool = supportsEntryType('longtask');
	const hasPaint: Bool = supportsEntryType('paint');
	const hasLcp: Bool = supportsEntryType('largest-contentful-paint');
	const hasFid: Bool = supportsEntryType('first-input');
	vitals.supported = hasLayoutShift || hasLongTask || hasPaint || hasLcp || hasFid;

	/* ---- Layout Shift (CLS) ---- */
	if (hasLayoutShift) {
		const clsObserver: PerformanceObserver = new PerformanceObserver(
			(list: PerformanceObserverEntryList): Void => {
				for (const entry of list.getEntries()) {
					/* Skip shifts triggered by user input (hadRecentInput) */
					const shift: PerformanceEntry & {
						hadRecentInput?: boolean;
						value?: number;
						sources?: Array<{ node?: Node }>;
					} = entry;
					if (shift.hadRecentInput) continue;

					const shiftValue: Num = shift.value ?? 0;
					const sources: Array<{ node?: Node }> = shift.sources ?? [];

					/* Check if any source node is within our component */
					let componentShift: Bool = false;
					for (const src of sources) {
						if (src.node && src.node instanceof Element && wrapper.contains(src.node)) {
							componentShift = true;
							if (vitals.clsSources.length < 3) {
								vitals.clsSources.push({
									tag: src.node.tagName.toLowerCase(),
									selector: describeElement(src.node),
									shiftValue: Math.round(shiftValue * 10_000) / 10_000,
								});
							}
						}
					}

					if (componentShift) {
						vitals.clsScore = Math.round((vitals.clsScore + shiftValue) * 10_000) / 10_000;
						vitals.clsShiftCount++;
					}
				}
			},
		);
		clsObserver.observe({ type: 'layout-shift', buffered: true });
		observers.push(clsObserver);
	}

	/* ---- Long Tasks ---- */
	if (hasLongTask) {
		const ltObserver: PerformanceObserver = new PerformanceObserver(
			(list: PerformanceObserverEntryList): Void => {
				for (const entry of list.getEntries()) {
					/* Only count tasks that overlap with mount window (mountStart to mountStart + 1000ms) */
					const taskEnd: Num = entry.startTime + entry.duration;
					if (taskEnd >= mountStart && entry.startTime <= mountStart + 1000) {
						vitals.longTaskCount++;
						if (entry.duration > vitals.worstLongTaskMs) {
							vitals.worstLongTaskMs = Math.round(entry.duration * 100) / 100;
						}
					}
				}
			},
		);
		ltObserver.observe({ type: 'longtask', buffered: true });
		observers.push(ltObserver);
	}

	/* ---- Paint Timing (FP / FCP) ---- */
	if (hasPaint) {
		const paintObserver: PerformanceObserver = new PerformanceObserver(
			(list: PerformanceObserverEntryList): Void => {
				for (const entry of list.getEntries()) {
					const relativeTime: Num = Math.round((entry.startTime - mountStart) * 100) / 100;
					if (entry.name === 'first-paint' && vitals.paintTimeMs < 0) {
						vitals.paintTimeMs = relativeTime;
					}
					if (entry.name === 'first-contentful-paint' && vitals.fcpTimeMs < 0) {
						vitals.fcpTimeMs = relativeTime;
					}
				}
			},
		);
		paintObserver.observe({ type: 'paint', buffered: true });
		observers.push(paintObserver);
	}

	/* ---- Largest Contentful Paint (LCP) ---- */
	if (hasLcp) {
		const lcpObserver: PerformanceObserver = new PerformanceObserver(
			(list: PerformanceObserverEntryList): Void => {
				for (const entry of list.getEntries()) {
					const lcpEntry: PerformanceEntry & { element?: Element; startTime: number } = entry;
					if (lcpEntry.element && wrapper.contains(lcpEntry.element)) {
						vitals.isLcpComponent = true;
						vitals.lcpTimeMs = Math.round(lcpEntry.startTime * 100) / 100;
						vitals.lcpElement = describeElement(lcpEntry.element);
					}
				}
			},
		);
		lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
		observers.push(lcpObserver);
	}

	/* ---- First Input Delay (FID) ---- */
	if (hasFid) {
		const fidObserver: PerformanceObserver = new PerformanceObserver(
			(list: PerformanceObserverEntryList): Void => {
				for (const entry of list.getEntries()) {
					const fidEntry: PerformanceEntry & { target?: Element; processingStart?: number } = entry;
					/* Only attribute FID to this component if the interaction target is within wrapper */
					if (fidEntry.target && fidEntry.target instanceof Element && wrapper.contains(fidEntry.target)) {
						const delay: Num = (fidEntry.processingStart ?? entry.startTime) - entry.startTime;
						vitals.fidMs = Math.round(delay * 100) / 100;
					}
				}
			},
		);
		fidObserver.observe({ type: 'first-input', buffered: true });
		observers.push(fidObserver);
	}

	/* ---- TTFB (Time to First Byte) — page-level from navigation timing ---- */
	try {
		const navEntries: PerformanceEntryList = performance.getEntriesByType('navigation');
		if (navEntries.length > 0) {
			const nav: PerformanceEntry & { responseStart?: number; requestStart?: number } = navEntries[0];
			if (typeof nav.responseStart === 'number' && typeof nav.requestStart === 'number' && nav.responseStart > 0) {
				vitals.ttfbMs = Math.round((nav.responseStart - nav.requestStart) * 100) / 100;
			}
		}
	} catch (_) {
		/* Navigation timing unavailable (e.g., cross-origin iframe) — leave as -1 */
	}

	return {
		vitals,
		cleanup: (): Void => {
			for (const obs of observers) obs.disconnect();
		},
	};
}

/* ------------------------------------------------------------------ */
/*  Mount & collect stats                                             */
/* ------------------------------------------------------------------ */

onMount((): (() => void) => {
	if (!wrapperRef) return (): Void => { /* no-op — wrapper ref not available at mount */ };

	const mountStart: Num = performance.now();

	/* Capture console messages during mount analysis */
	const captured: CapturedConsoleMessage[] = [];
	const origWarn: typeof console.warn = console.warn;
	const origError: typeof console.error = console.error;

	console.warn = (...args: unknown[]): Void => {
		captured.push({ level: 'warn', message: String(args[0] ?? '') });
		origWarn.apply(console, args);
	};
	console.error = (...args: unknown[]): Void => {
		captured.push({ level: 'error', message: String(args[0] ?? '') });
		origError.apply(console, args);
	};

	/* Start vitals collection immediately (observers accumulate data asynchronously) */
	const vitalsResult: { vitals: WebVitals; cleanup: () => void } = collectVitals(wrapperRef, mountStart);

	/* Use requestAnimationFrame to measure after paint */
	const rafId: Num = requestAnimationFrame((): Void => {
		const mountTimeMs: Num = Math.round((performance.now() - mountStart) * 100) / 100;

		/* Restore console */
		console.warn = origWarn;
		console.error = origError;

		if (!wrapperRef) return;

		/* DOM stats */
		const allNodes: NodeListOf<Element> = wrapperRef.querySelectorAll('*');
		const nodeCount: Num = allNodes.length;
		const domDepth: Num = calcDomDepth(wrapperRef);
		const textNodeCount: Num = countTextNodes(wrapperRef);

		/* Accessibility audit (includes headings, landmarks, focus order, event listeners) */
		const a11y: A11yAudit = auditAccessibility(wrapperRef);

		/* Memory delta (Chrome only) */
		let memoryDeltaBytes: Num = -1;
		/* Chrome-only performance.memory API — cast needed since TS doesn't type it */
		const perfMemory: { usedJSHeapSize?: number } | undefined = (
			performance as unknown as { memory?: { usedJSHeapSize?: number } }
		).memory;
		if (perfMemory && typeof perfMemory.usedJSHeapSize === 'number') {
			memoryDeltaBytes = perfMemory.usedJSHeapSize;
		}

		/* Console error count */
		const errorCount: Num = captured.filter((c) => c.level === 'error').length;

		/* Budget evaluations */
		const budgets: MetricBudget[] = [
			buildBudget(
				'Mount Time', `${mountTimeMs}ms`, mountTimeMs,
				MOUNT_GREEN, MOUNT_YELLOW, 'ms',
				'Time from component mount to first paint. Affects perceived load speed.',
			),
			buildBudget(
				'Node Count', `${nodeCount}`, nodeCount,
				NODES_GREEN, NODES_YELLOW, '',
				'Total DOM elements inside the component. More nodes = slower layout and paint.',
			),
			buildBudget(
				'DOM Depth', `${domDepth}`, domDepth,
				DEPTH_GREEN, DEPTH_YELLOW, '',
				'Maximum nesting depth of the DOM tree. Deep trees slow CSS selector matching.',
			),
			buildBudget(
				'Re-renders', '0', 0,
				RERENDER_GREEN, RERENDER_YELLOW, '',
				'DOM mutations after initial mount. Frequent re-renders cause layout thrashing.',
			),
			{
				label: 'Console Errors',
				value: `${errorCount}`,
				level: errorCount > 0 ? 'red' : 'green',
				description: 'Errors logged to console during component mount. Any error is a red flag.',
				thresholds: '🟢 0 · 🔴 >0',
				greenMax: 0,
				yellowMax: 0,
			},
			{
				label: 'Unlabeled Interactive',
				value: `${a11y.unlabeled.length}`,
				level: a11y.unlabeled.length > 0 ? 'red' : 'green',
				description: 'Interactive elements (buttons, links, inputs) missing accessible labels for screen readers.',
				thresholds: '🟢 0 · 🔴 >0',
				greenMax: 0,
				yellowMax: 0,
			},
			buildBudget(
				'Event Listeners', `${a11y.eventListenerCount}`, a11y.eventListenerCount,
				LISTENERS_GREEN, LISTENERS_YELLOW, '',
				'Elements with inline event handlers. Many listeners can impact memory and performance.',
			),
		];

		/* Vitals budgets — only add when the browser supports the APIs */
		const componentVitals: WebVitals = vitalsResult.vitals;
		if (componentVitals.supported) {
			if (supportsEntryType('layout-shift')) {
				budgets.push(
					buildBudget(
						'CLS', `${componentVitals.clsScore}`, componentVitals.clsScore,
						CLS_GREEN, CLS_YELLOW, '',
						'Cumulative Layout Shift — visual stability of the component. Lower is better.',
					),
				);
			}
			if (supportsEntryType('longtask') && componentVitals.longTaskCount > 0) {
				budgets.push(
					buildBudget(
						'Long Tasks', `${componentVitals.longTaskCount}`, componentVitals.longTaskCount,
						LONG_TASK_COUNT_GREEN, LONG_TASK_COUNT_YELLOW, '',
						'Tasks blocking the main thread for >50ms during component mount.',
					),
				);
				if (componentVitals.worstLongTaskMs > 0) {
					budgets.push(
						buildBudget(
							'Worst Task', `${componentVitals.worstLongTaskMs}ms`, componentVitals.worstLongTaskMs,
							LONG_TASK_MS_GREEN, LONG_TASK_MS_YELLOW, 'ms',
							'Duration of the longest main-thread-blocking task during mount.',
						),
					);
				}
			}
			if (supportsEntryType('first-input') && componentVitals.fidMs >= 0) {
				budgets.push(
					buildBudget(
						'FID', `${componentVitals.fidMs}ms`, componentVitals.fidMs,
						FID_GREEN, FID_YELLOW, 'ms',
						'First Input Delay — time between first user interaction and browser response.',
					),
				);
			}
			if (componentVitals.ttfbMs >= 0) {
				budgets.push(
					buildBudget(
						'TTFB', `${componentVitals.ttfbMs}ms`, componentVitals.ttfbMs,
						TTFB_GREEN, TTFB_YELLOW, 'ms',
						'Time to First Byte — server response time for the page (page-level metric).',
					),
				);
			}
		}

		if (a11y.headingSkipsLevel) {
			budgets.push({
				label: 'Heading Hierarchy',
				value: 'Skipped',
				level: 'yellow',
				description: 'Headings should not skip levels (e.g., h1 → h3 without h2). Skipping levels confuses screen readers.',
				thresholds: '🟢 Sequential · 🟡 Skipped levels',
				greenMax: 0,
				yellowMax: 1,
			});
		}

		if (a11y.focusOrderIssues.length > 0) {
			budgets.push({
				label: 'Focus Order',
				value: `${a11y.focusOrderIssues.length} issue${a11y.focusOrderIssues.length === 1 ? '' : 's'}`,
				level: 'red',
				description: 'Positive tabindex values disrupt natural focus order. Use tabindex="0" or "-1" instead.',
				thresholds: '🟢 0 · 🔴 >0',
				greenMax: 0,
				yellowMax: 0,
			});
		}

		const overallHealth: BudgetLevel = worstLevel(budgets);

		const statsData: LensStatsData = {
			mountTimeMs,
			reRenderCount: 0,
			nodeCount,
			domDepth,
			textNodeCount,
			hasAsyncContent: false,
			a11y,
			consoleMessages: captured,
			budgets,
			overallHealth,
			memoryDeltaBytes,
			propsWithDefaults,
			propsTotal,
			eventListenerCount: a11y.eventListenerCount,
			vitals: componentVitals,
		};

		/* Track re-renders via MutationObserver */
		let reRenderCount: Num = 0;
		const observer: MutationObserver = new MutationObserver((): Void => {
			reRenderCount++;
			statsData.reRenderCount = reRenderCount;
			statsData.hasAsyncContent = true;

			/* Update re-render budget */
			const rrBudget: MetricBudget | undefined = statsData.budgets.find(
				(b) => b.label === 'Re-renders',
			);
			if (rrBudget) {
				rrBudget.value = `${reRenderCount}`;
				rrBudget.level = evaluateBudget(reRenderCount, RERENDER_GREEN, RERENDER_YELLOW);
			}
			statsData.overallHealth = worstLevel(statsData.budgets);

			/* Re-emit updated stats */
			onstats(cardKey, statsData);
		});

		if (wrapperRef) {
			observer.observe(wrapperRef, { childList: true, subtree: true, attributes: true });
		}

		/* Emit initial stats */
		onstats(cardKey, statsData);

		/* Store observer cleanup in a variable accessible to the returned cleanup */
		(wrapperRef as HTMLDivElement & { __lensObserver?: MutationObserver }).__lensObserver =
			observer;
	});

	return (): Void => {
		cancelAnimationFrame(rafId);
		vitalsResult.cleanup();
		console.warn = origWarn;
		console.error = origError;
		if (wrapperRef) {
			const obs: MutationObserver | undefined = (
				wrapperRef as HTMLDivElement & { __lensObserver?: MutationObserver }
			).__lensObserver;
			if (obs) obs.disconnect();
		}
	};
});
</script>

<div bind:this={wrapperRef} class="contents">
	{@render children()}
</div>
