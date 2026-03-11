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
	LensStatsData,
	MetricBudget,
	UnlabeledElement,
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
