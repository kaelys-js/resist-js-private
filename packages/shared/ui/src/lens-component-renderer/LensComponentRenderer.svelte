<script module lang="ts">
import * as v from 'valibot';
import { StrSchema, BoolSchema } from '@/schemas/common';
import { PropMetaSchema, VariantMetaSchema } from '../lens/types.js';
import type { Component, Snippet } from 'svelte';

/** Schema for the LensComponentRenderer component props. @convert-to-lens */
export const LensComponentRendererPropsSchema = v.strictObject({
	/** The Svelte component to render. */
	component: v.custom<Component>((val: unknown): boolean => typeof val === 'function'),
	/** Variant metadata — when provided, renders per-option cards. When absent, renders a single default card. */
	meta: v.optional(VariantMetaSchema),
	/** Full prop metadata for building base props from defaults/mock values. */
	props: v.optional(v.array(PropMetaSchema)),
	/** PascalCase tag name for generating code snippets. @values Button, Input, Badge */
	tagName: v.optional(StrSchema),
	/** Component directory name for building isolation URLs. @values button, badge, input */
	componentName: v.optional(StrSchema),
	/** Default slot content text for each rendered component. @values Example, Click me, Label */
	label: v.optional(StrSchema),
	/** Custom content to render instead of the auto-instantiated component. Used for hand-written examples. */
	children: v.optional(v.custom<Snippet>((val: unknown): boolean => typeof val === 'function')),
	/** Code snippet text to display instead of auto-generated snippet. @values <Button>Click</Button>, <Input placeholder="Type..." />, <Badge>New</Badge> */
	codeText: v.optional(StrSchema),
	/** Additional CSS classes for the root element. */
	class: v.optional(StrSchema),
	/** Suppress error logging for intentional boundary errors (e.g., Error Boundary demo section). */
	silent: v.optional(BoolSchema),
	/** Optional wrapper component providing required parent context (e.g. DropdownMenu.Root for Sub components). */
	contextWrapper: v.optional(v.custom<Component>((val: unknown): boolean => typeof val === 'function')),
});
/** Props for the LensComponentRenderer component. */
export type LensComponentRendererProps = v.InferOutput<typeof LensComponentRendererPropsSchema>;
</script>

<script lang="ts">
/**
 * Unified component renderer for Lens documentation pages.
 *
 * Renders a single default preview card OR a grid of variant option cards
 * depending on whether variant metadata is provided. Each card includes
 * an error boundary with LensError fallback, per-card code
 * expand/collapse with copy-to-clipboard, zoom controls, background
 * switcher, outline toggle, isolation link, and accessibility
 * simulation dropdown.
 *
 * @example
 * ```svelte
 * <!-- Default preview (no variants) -->
 * <LensComponentRenderer component={Button} props={extractedProps} tagName="Button" />
 *
 * <!-- Variant grid -->
 * <LensComponentRenderer component={Button} meta={variantMeta} props={extractedProps} tagName="Button" />
 * ```
 */
import type { Bool, Num, Str, Void } from '@/schemas/common';
import { log } from '@/utils/core/logger';
import type { PropMeta, VariantMeta } from '../lens/types.js';
import { buildBaseProps } from '../lens/extract-props.js';
import LensError from '../lens-error/LensError.svelte';
import LensStats from '../lens-stats/LensStats.svelte';
import type { LensStatsData, BudgetLevel, MetricBudget, WebVitals, AriaIssue, ContrastIssue, TabOrderEntry } from '../lens-stats/types.js';
import CopyButton from '../copy-button/CopyButton.svelte';
import CodeBlock from '../code-block/CodeBlock.svelte';
import ColorPicker from '../color-picker/ColorPicker.svelte';
import { Slider } from '../slider/index.js';
import Activity from '@lucide/svelte/icons/activity';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import Code from '@lucide/svelte/icons/code';
import Check from '@lucide/svelte/icons/check';
import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
import ExternalLink from '@lucide/svelte/icons/external-link';
import Eye from '@lucide/svelte/icons/eye';
import Grid3x3 from '@lucide/svelte/icons/grid-3x3';
import Maximize from '@lucide/svelte/icons/maximize';
import Maximize2 from '@lucide/svelte/icons/maximize-2';
import Minimize2 from '@lucide/svelte/icons/minimize-2';
import Monitor from '@lucide/svelte/icons/monitor';
import Moon from '@lucide/svelte/icons/moon';
import Paintbrush from '@lucide/svelte/icons/paintbrush';
import Palette from '@lucide/svelte/icons/palette';
import Search from '@lucide/svelte/icons/search';
import SearchX from '@lucide/svelte/icons/search-x';
import Settings2 from '@lucide/svelte/icons/settings-2';
import Smartphone from '@lucide/svelte/icons/smartphone';
import Sun from '@lucide/svelte/icons/sun';
import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
import SquareDashedMousePointer from '@lucide/svelte/icons/square-dashed-mouse-pointer';
import Tablet from '@lucide/svelte/icons/tablet';
import Tv from '@lucide/svelte/icons/tv';
import Watch from '@lucide/svelte/icons/watch';
import Car from '@lucide/svelte/icons/car';
import Glasses from '@lucide/svelte/icons/glasses';
import Refrigerator from '@lucide/svelte/icons/refrigerator';
import MonitorSmartphone from '@lucide/svelte/icons/monitor-smartphone';
import Wifi from '@lucide/svelte/icons/wifi';
import WifiOff from '@lucide/svelte/icons/wifi-off';
import ZoomIn from '@lucide/svelte/icons/zoom-in';
import ZoomOut from '@lucide/svelte/icons/zoom-out';
import Download from '@lucide/svelte/icons/download';
import Clipboard from '@lucide/svelte/icons/clipboard';
import FileImage from '@lucide/svelte/icons/file-image';
import FileType from '@lucide/svelte/icons/file-type';
import FileCode from '@lucide/svelte/icons/file-code';
import Link from '@lucide/svelte/icons/link';
import LoaderCircle from '@lucide/svelte/icons/loader-circle';
import Globe from '@lucide/svelte/icons/globe';
import Languages from '@lucide/svelte/icons/languages';
import ALargeSmall from '@lucide/svelte/icons/a-large-small';
import ChevronRight from '@lucide/svelte/icons/chevron-right';
import FileJson from '@lucide/svelte/icons/file-json';
import ClipboardCopy from '@lucide/svelte/icons/clipboard-copy';
import CopyCheck from '@lucide/svelte/icons/copy-check';
import Ruler from '@lucide/svelte/icons/ruler';
import ScanLine from '@lucide/svelte/icons/scan-line';
import MousePointerClick from '@lucide/svelte/icons/mouse-pointer-click';
import Camera from '@lucide/svelte/icons/camera';
import Chrome from '@lucide/svelte/icons/chrome';
import ImageIcon from '@lucide/svelte/icons/image';
import X from '@lucide/svelte/icons/x';
import Terminal from '@lucide/svelte/icons/terminal';
import Trash2 from '@lucide/svelte/icons/trash-2';
import * as DropdownMenu from '../dropdown-menu/index.js';
import * as Popover from '../popover/index.js';
import { exportPng, exportJpeg, exportSvg, exportWebp, copyImageToClipboard, copyHtml, copyDataUri, downloadHtml, downloadStandaloneHtml } from '../lens/export-utils.js';
import * as Tooltip from '../tooltip/index.js';
import { fade, slide } from 'svelte/transition';
import { cn } from '../utils.js';
import LensPortalScope from './LensPortalScope.svelte';

const {
	component: Target,
	meta,
	props: propsMeta = [],
	tagName,
	componentName,
	label = 'Example',
	children,
	codeText,
	class: className,
	silent = false,
	contextWrapper: ContextWrapper,
}: LensComponentRendererProps = $props();

const baseProps: Record<Str, unknown> = $derived(buildBaseProps(propsMeta));

/** Whether rendering in variant mode (has variant options). */
const hasVariants: Bool = $derived(Boolean(meta) && (meta?.variants.length ?? 0) > 0);

/** Per-card code panel visibility keyed by card identifier. */
let openCards: Record<Str, Bool> = $state({});

/** Per-card accessibility simulation keyed by card identifier. */
let cardSimulations: Record<Str, Str> = $state({});

/** Per-card background keyed by card identifier. */
let cardBackgrounds: Record<Str, Str> = $state({});

/** Per-card zoom level (1 = 100%) keyed by card identifier. */
let cardZoom: Record<Str, Num> = $state({});

/** Per-card outline color keyed by card identifier ('none' = off). */
let cardOutlines: Record<Str, Str> = $state({});

/** Per-card grid style keyed by card identifier ('none' = off). */
let cardGrids: Record<Str, Str> = $state({});

/** Per-card grid size in pixels keyed by card identifier. */
let cardGridSizes: Record<Str, Num> = $state({});

/** Per-card grid fill/background color keyed by card identifier ('none' = transparent). */
let cardGridFills: Record<Str, Str> = $state({});

/** Per-card orientation keyed by card identifier ('default' = no rotation). */
let cardOrientations: Record<Str, Str> = $state({});

/** Per-card color mode keyed by card identifier ('auto' = inherit from page). */
let cardModes: Record<Str, Str> = $state({});

/** Per-card theme keyed by card identifier ('' = inherit from page). */
let cardThemes: Record<Str, Str> = $state({});

/** Per-card media query preferences keyed by card identifier. Values: Record<prefName, activeValue>. */
let cardMediaPrefs: Record<Str, Record<Str, Str>> = $state({});

/** Per-card network simulation keyed by card identifier ('none' = no throttle). */
let cardNetworkSim: Record<Str, Str> = $state({});

/** Per-card network loading state (true while simulated latency overlay is visible). */
let cardNetworkLoading: Record<Str, Bool> = $state({});

/** Per-card viewport constraint keyed by card identifier ('auto' = full width). */
let cardViewports: Record<Str, Str> = $state({});

/** Per-card custom viewport dimensions keyed by card identifier. Used when viewport is 'custom'. */
let cardCustomViewports: Record<Str, { w: Num; h: Num }> = $state({});

/** Per-card custom network conditions keyed by card identifier. Used when network is 'custom'. */
let cardCustomNetwork: Record<Str, { delay: Num; label: Str }> = $state({});

/** Per-card measured visual height of the inner content (accounts for zoom + rotation transforms). */
let cardContentHeights: Record<Str, Num> = $state({});

/** Per-card text direction override keyed by card identifier ('auto' | 'ltr' | 'rtl'). */
let cardTextDir: Record<Str, Str> = $state({});

/** Per-card font size override keyed by card identifier (0 = default, else px value). */
let cardFontSize: Record<Str, Num> = $state({});

/** Per-card debug outline mode (Pesticide-style element-type outlines). */
let cardDebugOutline: Record<Str, Bool> = $state({});

/** Per-card measure mode (hover box model overlay). */
let cardMeasureActive: Record<Str, Bool> = $state({});

/** Per-card inspect mode (click element to see computed CSS). */
let cardInspectActive: Record<Str, Bool> = $state({});

/** Per-card inspected element data (computed styles + bounding rect). */
let cardInspectedEl: Record<Str, {
	/** Element tag name. */
	tag: Str;
	/** Element CSS classes. */
	classes: Str;
	/** Element id attribute. */
	id: Str;
	/** Bounding client rect dimensions. */
	rect: { width: Num; height: Num; top: Num; left: Num };
	/** Key computed CSS properties grouped by category. */
	styles: Record<Str, Record<Str, Str>>;
} | null> = $state({});

/** Per-card measure overlay data (hovered element box model). */
let cardMeasureData: Record<Str, {
	/** Content box dimensions and position relative to preview container. */
	content: { x: Num; y: Num; w: Num; h: Num };
	/** Padding values in px. */
	padding: { top: Num; right: Num; bottom: Num; left: Num };
	/** Border values in px. */
	border: { top: Num; right: Num; bottom: Num; left: Num };
	/** Margin values in px. */
	margin: { top: Num; right: Num; bottom: Num; left: Num };
	/** Overall element dimensions. */
	width: Num;
	/** Overall element height. */
	height: Num;
} | null> = $state({});

/** Per-card console panel visibility keyed by card identifier. */
let cardConsoleOpen: Record<Str, Bool> = $state({});

/** Per-card console log entries keyed by card identifier. */
let cardConsoleLogs: Record<Str, ConsoleLogEntry[]> = $state({});

/** Per-card console observer cleanup functions keyed by card identifier. */
let cardConsoleCleanup: Record<Str, (() => void) | null> = $state({});

/** Per-card console mount timestamp keyed by card identifier. */
let cardConsoleMountTime: Record<Str, Num> = $state({});

/** Per-card fullscreen state keyed by card identifier. */
let cardFullscreen: Record<Str, Bool> = $state({});

/** The element that triggered fullscreen, for focus restoration on exit. */
let fullscreenTrigger: HTMLElement | null = $state(null);

/** Per-card performance statistics collected by LensStats wrapper. */
let cardStats: Record<Str, LensStatsData> = $state({});

/* ---- Real Browser Screenshot State ---- */

/** Console log entry captured during Playwright page load. */
type ScreenshotConsoleEntry = {
	/** Console message severity. @values log, warn, error, info, debug */
	level: Str;
	/** Console message text. @values Hello world, TypeError: x is not a function */
	text: Str;
};

/** Performance timing data captured from the Playwright page. */
type ScreenshotPerfData = {
	/** Time to DOMContentLoaded in ms. @values 42, 120, 350 */
	domContentLoaded: Num;
	/** Time to load event in ms. @values 80, 200, 500 */
	load: Num;
	/** Time to DOM interactive in ms. @values 30, 100, 250 */
	domInteractive: Num;
	/** Time to response end in ms. @values 10, 50, 150 */
	responseEnd: Num;
	/** Time to first paint in ms. @values 25, 80, 200 */
	firstPaint: Num;
	/** Time to first contentful paint in ms. @values 30, 100, 250 */
	firstContentfulPaint: Num;
};

/** Screenshot engine source identifier. */
type ScreenshotSource = 'playwright' | 'ios-simulator' | 'android-emulator';

/** Individual screenshot capture result. */
type ScreenshotCapture = {
	/** Screenshot engine that produced this capture. @values playwright, ios-simulator, android-emulator */
	source: ScreenshotSource;
	/** Browser engine used. @values chromium, firefox, webkit, safari, chrome-mobile */
	browser: Str;
	/** Human-readable browser engine name. @values Chromium, Firefox, WebKit, Safari, Chrome Mobile */
	browserDisplayName: Str;
	/** Browser engine version string. @values 131.0.6778.33, 132.0, 18.2 */
	browserVersion: Str;
	/** Device name from engine (Playwright device, simulator name, or emulator AVD). @values iPhone 15 Pro Max, Pixel 9, custom */
	device: Str;
	/** OS/platform string for the device. @values iOS 17.5, iOS 26.0, Android 14, macOS */
	deviceOS: Str;
	/** Object URL for the captured PNG image. @values blob:http://localhost:5173/... */
	imageUrl: Str;
	/** Capture timestamp (ms since epoch). @values 1710000000000 */
	timestamp: Num;
	/** Console messages captured during page load. */
	consoleLogs: ScreenshotConsoleEntry[];
	/** Performance timing data from the rendered page. */
	performance: Partial<ScreenshotPerfData>;
	/** Safe area insets in CSS pixels (iOS simulator only). */
	safeAreaInsets?: { top: Num; right: Num; bottom: Num; left: Num };
	/** Device frame metadata for bezel compositing. */
	deviceFrame?: { frameId: Str; screenRegion: { x: Num; y: Num; width: Num; height: Num } };
};

/** Per-card selected browser engine for real browser screenshots. */
let cardScreenBrowser: Record<Str, Str> = $state({});

/** Per-card selected Playwright device name. */
let cardScreenDevice: Record<Str, Str> = $state({});

/** Per-card captured screenshot results. */
let cardScreenshots: Record<Str, ScreenshotCapture[]> = $state({});

/** Per-card screenshot capture loading state. */
let cardScreenCapturing: Record<Str, Bool> = $state({});

/** Search query for the Real Browser device list. */
let browserSearchQuery: Str = $state('');

/** Playwright device info from /api/lens/screenshot/devices. */
type PlaywrightDevice = {
	/** Playwright device name (exact key). @values iPhone 15 Pro Max, Pixel 9, iPad Pro 13 */
	name: Str;
	/** Viewport width in CSS pixels. @values 375, 768, 1280 */
	width: Num;
	/** Viewport height in CSS pixels. @values 812, 1024, 800 */
	height: Num;
	/** Device pixel ratio. @values 1, 2, 3 */
	scale: Num;
	/** Whether the device emulates mobile. */
	mobile: Bool;
	/** Whether the device supports touch. */
	touch: Bool;
	/** Recommended browser engine. @values chromium, firefox, webkit */
	defaultBrowser: Str;
	/** OS/platform string from user agent. @values iOS 17.5, Android 14, macOS */
	os: Str;
};

/** Cached Playwright device list. */
let playwrightDevices: PlaywrightDevice[] = $state([]);

/** Whether the device list has been loaded. */
let devicesLoaded: Bool = $state(false);

/**
 * Callback for LensStats to report collected statistics.
 *
 * @param key - Card identifier
 * @param data - Collected stats data
 */
function handleStats(key: Str, data: LensStatsData): Void {
	cardStats[key] = data;
}

/**
 * Get the CSS color for a budget level traffic light dot.
 *
 * @param level - Budget level
 * @returns Tailwind text color class
 */
function budgetColor(level: BudgetLevel): Str {
	if (level === 'green') return 'text-emerald-500';
	if (level === 'yellow') return 'text-amber-500';
	return 'text-red-500';
}

/** Count of props with default values for prop coverage metric. */
const propsWithDefaultsCount: Num = $derived(
	propsMeta.filter((p: PropMeta): Bool => p.default !== '').length,
);

/* ------------------------------------------------------------------ */
/*  Stats popover — collapsible section state                         */
/* ------------------------------------------------------------------ */

/** Collapsible section open states for the stats popover. */
let budgetExpanded: Record<Str, Bool> = $state({});
let statsReportOpen: Bool = $state(true);
let statsVitalsOpen: Bool = $state(true);
let statsDomOpen: Bool = $state(true);
let statsMemoryOpen: Bool = $state(true);
let statsA11yOpen: Bool = $state(true);
let statsConsoleOpen: Bool = $state(true);
let statsPropCoverageOpen: Bool = $state(true);

/* ------------------------------------------------------------------ */
/*  Stats popover — export                                            */
/* ------------------------------------------------------------------ */

/** Which stats export button was recently clicked ('json' | 'markdown' | '' for none). */
let statsExportCopied: Str = $state('');

/**
 * Format stats data as a JSON string for export.
 *
 * @param stats - The LensStatsData to format
 * @param name - Display name of the component
 * @returns Pretty-printed JSON string
 */
function formatStatsJson(stats: LensStatsData, name: Str): Str {
	return JSON.stringify({ component: name, ...stats }, null, 2);
}

/**
 * Format stats data as a human-readable Markdown report.
 *
 * @param stats - The LensStatsData to format
 * @param name - Display name of the component
 * @returns Markdown string
 */
function formatStatsMarkdown(stats: LensStatsData, name: Str): Str {
	const lines: Str[] = [
		`# Performance Report: ${name}`,
		'',
		`**Overall Health:** ${stats.overallHealth}`,
		'',
		'## Budget Metrics',
		'',
		'| Metric | Value | Level | Thresholds |',
		'|--------|-------|-------|------------|',
		...stats.budgets.map((b: MetricBudget): Str => `| ${b.label} | ${b.value} | ${b.level} | ${b.thresholds} |`),
		'',
		'## Timing',
		'',
		`- **Mount Time:** ${stats.mountTimeMs}ms`,
		`- **Re-renders:** ${stats.reRenderCount}`,
		`- **Async Content:** ${stats.hasAsyncContent ? 'Yes' : 'No'}`,
		'',
		'## Web Vitals',
		'',
		`- **CLS:** ${stats.vitals.clsScore} (${stats.vitals.clsShiftCount} shifts)`,
	];
	if (stats.vitals.clsSources.length > 0) {
		for (const src of stats.vitals.clsSources) {
			lines.push(`  - \`${src.selector}\` (${src.tag}, shift: ${src.shiftValue})`);
		}
	}
	lines.push(
		`- **Long Tasks:** ${stats.vitals.longTaskCount === 0 ? 'None' : `${stats.vitals.longTaskCount} · ${stats.vitals.worstLongTaskMs}ms peak`}`,
		`- **First Paint:** ${stats.vitals.paintTimeMs < 0 ? 'Before mount' : `${stats.vitals.paintTimeMs}ms`}`,
		`- **FCP:** ${stats.vitals.fcpTimeMs < 0 ? 'Before mount' : `${stats.vitals.fcpTimeMs}ms`}`,
		`- **LCP:** ${stats.vitals.isLcpComponent ? `${stats.vitals.lcpTimeMs}ms` : '—'}`,
	);
	if (stats.vitals.isLcpComponent && stats.vitals.lcpElement) {
		lines.push(`  - Element: \`${stats.vitals.lcpElement}\``);
	}
	lines.push(
		`- **FID:** ${stats.vitals.fidMs < 0 ? 'Waiting' : `${stats.vitals.fidMs}ms`}`,
		`- **TTFB:** ${stats.vitals.ttfbMs < 0 ? 'Unavailable' : `${stats.vitals.ttfbMs}ms`}`,
		`- **Supported:** ${stats.vitals.supported ? 'Yes' : 'No'}`,
		'',
		'## DOM Structure',
		'',
		`- **Nodes:** ${stats.nodeCount}`,
		`- **Depth:** ${stats.domDepth}`,
		`- **Text Nodes:** ${stats.textNodeCount}`,
		`- **Event Listeners:** ${stats.eventListenerCount}`,
		'',
		'## Accessibility',
		'',
		`- **Labels:** ${stats.a11y.labeledCount}/${stats.a11y.focusableCount}`,
		`- **Buttons:** ${stats.a11y.buttonCount}`,
		`- **Links:** ${stats.a11y.linkCount}`,
		`- **Inputs:** ${stats.a11y.inputCount}`,
		`- **Focus Order Issues:** ${stats.a11y.focusOrderIssues.length}`,
	);
	if (stats.a11y.focusOrderIssues.length > 0) {
		for (const issue of stats.a11y.focusOrderIssues) {
			lines.push(`  - \`<${issue.tag} tabindex="${issue.tabindex}">\` ${issue.text}`);
		}
	}
	lines.push(`- **Headings:** ${stats.a11y.headings.length} (${stats.a11y.headingSkipsLevel ? 'skips levels' : 'sequential'})`);
	if (stats.a11y.headings.length > 0) {
		for (const h of stats.a11y.headings) {
			lines.push(`  - h${h.level}: ${h.text}`);
		}
	}
	if (stats.a11y.roles.length > 0) {
		lines.push(`- **ARIA Roles:** ${stats.a11y.roles.join(', ')}`);
	}
	if (stats.a11y.landmarks.length > 0) {
		lines.push(`- **Landmarks:** ${stats.a11y.landmarks.join(', ')}`);
	}
	if (stats.a11y.unlabeled.length > 0) {
		lines.push(`- **Unlabeled Elements:** ${stats.a11y.unlabeled.length}`);
		for (const el of stats.a11y.unlabeled) {
			lines.push(`  - \`<${el.tag}${el.classes ? ` class="${el.classes}"` : ''}>\`${el.parentContext ? ` in ${el.parentContext}` : ''}`);
		}
	}
	if (stats.a11y.contrastIssues.length > 0) {
		lines.push(`- **Contrast Issues:** ${stats.a11y.contrastIssues.length}`);
		for (const ci of stats.a11y.contrastIssues) {
			lines.push(`  - \`<${ci.tag}>\` "${ci.text}" — ${ci.ratio}:1 (need ${ci.required}:1)`);
		}
	}
	if (stats.a11y.imagesWithoutAlt > 0) {
		lines.push(`- **Images Without Alt:** ${stats.a11y.imagesWithoutAlt}`);
	}
	if (stats.a11y.ariaIssues.length > 0) {
		lines.push(`- **ARIA Issues:** ${stats.a11y.ariaIssues.length}`);
		for (const ai of stats.a11y.ariaIssues) {
			lines.push(`  - \`<${ai.tag}>\` ${ai.issue}`);
		}
	}
	if (stats.a11y.svgsWithoutLabel > 0) {
		lines.push(`- **SVGs Without Label:** ${stats.a11y.svgsWithoutLabel}`);
	}
	lines.push(`- **Animated Elements:** ${stats.a11y.animatedElementCount}`);
	lines.push(`- **Reduced Motion Override:** ${stats.a11y.hasReducedMotionOverride ? 'Yes' : 'No'}`);
	if (stats.a11y.tabOrder.length > 0) {
		lines.push(`- **Tab Order:** ${stats.a11y.tabOrder.length} elements`);
		for (const entry of stats.a11y.tabOrder.slice(0, 10)) {
			lines.push(`  - \`<${entry.tag}>\` ${entry.text}${entry.tabindex > 0 ? ` (tabindex=${entry.tabindex})` : ''}`);
		}
	}
	lines.push(
		'',
		'## Prop Coverage',
		'',
		`- **With Defaults:** ${stats.propsWithDefaults}/${stats.propsTotal} (${stats.propsTotal > 0 ? Math.round((stats.propsWithDefaults / stats.propsTotal) * 100) : 0}%)`,
	);
	if (stats.reRenderTimings.length > 0) {
		lines.push(`- **Re-render Timings:** ${stats.reRenderTimings.map((t: Num): Str => `${t}ms`).join(', ')}`);
	}
	if (stats.memoryDeltaBytes >= 0) {
		lines.push('', '## Memory', '', `- **JS Heap (page total):** ${(stats.memoryDeltaBytes / 1_048_576).toFixed(1)} MB`);
	}
	if (stats.consoleMessages.length > 0) {
		lines.push('', '## Console Messages', '');
		for (const msg of stats.consoleMessages) {
			lines.push(`- **[${msg.level}]** ${msg.message}`);
		}
	}
	return lines.join('\n');
}

/**
 * Copy stats to clipboard in the given format.
 *
 * @param stats - The LensStatsData to copy
 * @param name - Display name of the component
 * @param format - 'json' or 'markdown'
 */
async function copyStatsToClipboard(stats: LensStatsData, name: Str, format: 'json' | 'markdown'): Promise<void> {
	const text: Str = format === 'json'
		? formatStatsJson(stats, name)
		: formatStatsMarkdown(stats, name);
	await navigator.clipboard.writeText(text);
	statsExportCopied = format;
	setTimeout((): Void => { statsExportCopied = ''; }, 2000);
}

/**
 * Download stats as a JSON file.
 *
 * @param stats - The LensStatsData to download
 * @param name - Display name of the component
 */
function downloadStatsJson(stats: LensStatsData, name: Str): Void {
	const json: Str = formatStatsJson(stats, name);
	const blob: Blob = new Blob([json], { type: 'application/json' });
	const url: Str = URL.createObjectURL(blob);
	const a: HTMLAnchorElement = document.createElement('a');
	a.href = url;
	a.download = `${name.toLowerCase().replaceAll(/\s+/g, '-')}-stats.json`;
	a.click();
	URL.revokeObjectURL(url);
}

/**
 * Toggle fullscreen mode for a specific card.
 * Captures the triggering element for focus restoration on exit.
 *
 * @param key - Card identifier
 */
function toggleFullscreen(key: Str): Void {
	if (!cardFullscreen[key]) {
		/* Entering fullscreen — remember trigger for focus restoration */
		fullscreenTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
	}
	cardFullscreen[key] = !cardFullscreen[key];
	if (!cardFullscreen[key] && fullscreenTrigger) {
		/* Exiting fullscreen — restore focus to the trigger element */
		const trigger: HTMLElement | null = fullscreenTrigger;
		fullscreenTrigger = null;
		requestAnimationFrame((): Void => { trigger?.focus(); });
	}
}

/**
 * Exit fullscreen for any card that's currently fullscreen (ESC handler).
 * Restores focus to the element that triggered fullscreen.
 */
function exitFullscreen(): Void {
	const trigger: HTMLElement | null = fullscreenTrigger;
	fullscreenTrigger = null;
	for (const key of Object.keys(cardFullscreen)) {
		if (cardFullscreen[key]) {
			cardFullscreen[key] = false;
		}
	}
	if (trigger) {
		requestAnimationFrame((): Void => { trigger.focus(); });
	}
}

/** Whether any card is currently fullscreen — drives body scroll lock. */
const anyFullscreen: Bool = $derived(Object.values(cardFullscreen).some(Boolean));

/** Lock body scroll while any card is in fullscreen mode. */
$effect(() => {
	if (anyFullscreen) {
		document.body.style.overflow = 'hidden';
	}
	return (): Void => {
		document.body.style.overflow = '';
	};
});

/** DOM references to card preview areas for export. */
let cardPreviewRefs: Record<Str, HTMLDivElement | undefined> = $state({});

/**
 * Extract a short human-readable cause from a caught error.
 *
 * @param error - The caught error value
 * @returns A one-line error cause string
 */
function getErrorCause(error: unknown): Str {
	if (!silent) log.warn('Component preview error', { error });
	if (error instanceof Error) return error.message;
	if (typeof error === 'object' && error !== null) {
		// Cast once for property access — error is an unknown object from svelte:boundary
		const obj: Record<Str, unknown> = error as Record<Str, unknown>;
		const code: Str = typeof obj.code === 'string' ? obj.code : '';
		const msg: Str = typeof obj.message === 'string' ? obj.message : '';
		if (msg) return code ? `[${code}] ${msg}` : msg;
		if (code) return code;
	}
	return String(error);
}

/**
 * Serialize a caught error into a formatted JSON string for code display.
 * Handles Error instances (extracts name/message/stack), AppError objects
 * (includes validation details), and unknown values.
 *
 * @param error - The caught error value
 * @returns A pretty-printed JSON string of the error details
 */
function serializeError(error: unknown): Str {
	if (error instanceof Error) {
		const errorObj: Record<Str, unknown> = {
			name: error.name,
			message: error.message,
		};
		if (error.stack) errorObj.stack = error.stack;
		return JSON.stringify(errorObj, null, 2);
	}
	if (typeof error === 'object' && error !== null) {
		try {
			return JSON.stringify(error, null, 2);
		} catch {
			// Circular reference or non-serializable — fall back to String
			return String(error);
		}
	}
	return String(error);
}

/**
 * Svelte action that measures an element's visual bounding height via getBoundingClientRect.
 * Re-measures on resize and when the `landscape` param changes (orientation toggle).
 * Used to set container min-height so rotated+zoomed content fits without clipping.
 *
 * @param node - The DOM element to observe
 * @param params - Card key and whether landscape orientation is active
 * @returns Svelte action lifecycle with update and destroy methods
 */
function trackContentSize(
	node: HTMLElement,
	params: { key: Str; landscape: Bool },
): { update: (p: { key: Str; landscape: Bool }) => Void; destroy: () => Void } {
	let current: { key: Str; landscape: Bool } = params;

	function measure(): Void {
		if (current.landscape) {
			const rect: DOMRect = node.getBoundingClientRect();
			cardContentHeights[current.key] = rect.height;
		} else {
			cardContentHeights[current.key] = 0;
		}
	}

	const observer: ResizeObserver = new ResizeObserver((): Void => {
		requestAnimationFrame(measure);
	});
	observer.observe(node);
	requestAnimationFrame(measure);

	return {
		update(newParams: { key: Str; landscape: Bool }): Void {
			current = newParams;
			requestAnimationFrame(measure);
		},
		destroy(): Void {
			observer.disconnect();
			cardContentHeights[current.key] = 0;
		},
	};
}

/**
 * Tracks whether the page is in dark mode (html has `.dark` class).
 * Used to mirror the page mode on per-card preview divs when mode is "auto"
 * so that CSS selectors like `[data-theme='X'].dark` match correctly.
 */
let pageIsDark: Bool = $state(false);

$effect(() => {
	const html: HTMLElement = document.documentElement;
	pageIsDark = html.classList.contains('dark');

	const observer: MutationObserver = new MutationObserver((): Void => {
		pageIsDark = html.classList.contains('dark');
	});
	observer.observe(html, { attributes: true, attributeFilter: ['class'] });

	return (): Void => {
		observer.disconnect();
	};
});

/** Search query for filtering accessibility simulation items. */
let simSearchQuery: Str = $state('');

/** Search query for filtering viewport/device presets. */
let viewportSearchQuery: Str = $state('');

/** Search query for filtering network simulation presets. */
let networkSearchQuery: Str = $state('');

/** Search query for filtering background presets. */
let bgSearchQuery: Str = $state('');

/** Search query for filtering outline presets. */
let outlineSearchQuery: Str = $state('');

/** Search query for filtering grid presets. */
let gridSearchQuery: Str = $state('');

/** Search query for filtering color mode presets. */
let modeSearchQuery: Str = $state('');

/** Search query for filtering theme presets. */
let themeSearchQuery: Str = $state('');

/** Search query for filtering orientation presets. */
let orientationSearchQuery: Str = $state('');

/** Search query for filtering media preference groups. */
let mediaPrefSearchQuery: Str = $state('');

/** Search query for filtering export format items. */
let exportSearchQuery: Str = $state('');

/** Search query for filtering text direction items. */
let dirSearchQuery: Str = $state('');

/** Search query for filtering font size items. */
let fontSizeSearchQuery: Str = $state('');

/**
 * Svelte action that locks an element's height to its initial rendered value.
 * Prevents dropdown SubContent from shrinking when search filtering reduces
 * the item count, which would trigger bits-ui's GraceArea pointerleave and
 * close the submenu before the user can click a filtered result.
 *
 * @param node - The scrollable container element inside a SubContent
 * @returns Action lifecycle with destroy cleanup
 */
function lockHeight(node: HTMLElement): { destroy: () => void } {
	const raf: Num = requestAnimationFrame((): void => {
		node.style.minHeight = `${node.offsetHeight}px`;
	});
	return {
		destroy(): void {
			cancelAnimationFrame(raf);
			node.style.minHeight = '';
		},
	};
}

/* ------------------------------------------------------------------ */
/*  Background presets                                                */
/* ------------------------------------------------------------------ */

const BG_PRESETS: Array<{ id: Str; label: Str; style: Str }> = [
	{ id: 'default', label: 'Default', style: '' },
	{ id: 'white', label: 'White', style: 'background-color: #ffffff' },
	{ id: 'light', label: 'Light', style: 'background-color: #f8f8f8' },
	{ id: 'light-gray', label: 'Light Gray', style: 'background-color: #e5e5e5' },
	{ id: 'medium-gray', label: 'Medium Gray', style: 'background-color: #a3a3a3' },
	{ id: 'dark-gray', label: 'Dark Gray', style: 'background-color: #404040' },
	{ id: 'near-black', label: 'Near Black', style: 'background-color: #1a1a1a' },
	{ id: 'black', label: 'Black', style: 'background-color: #000000' },
	{
		id: 'checkerboard',
		label: 'Checkerboard',
		style:
			'background-image: repeating-conic-gradient(#d4d4d4 0% 25%, transparent 0% 50%); background-size: 16px 16px',
	},
	{
		id: 'dot-grid',
		label: 'Dot Grid',
		style:
			'background-image: radial-gradient(circle, #d4d4d4 1px, transparent 1px); background-size: 16px 16px',
	},
];

/* ------------------------------------------------------------------ */
/*  Zoom presets                                                      */
/* ------------------------------------------------------------------ */

const ZOOM_PRESETS: Array<{ value: Num; label: Str }> = [
	{ value: 0.25, label: '25%' },
	{ value: 0.5, label: '50%' },
	{ value: 0.75, label: '75%' },
	{ value: 1, label: '100%' },
	{ value: 1.25, label: '125%' },
	{ value: 1.5, label: '150%' },
	{ value: 2, label: '200%' },
	{ value: 3, label: '300%' },
	{ value: 4, label: '400%' },
];

const ZOOM_STEP: Num = 0.25;
const ZOOM_MIN: Num = 0.25;
const ZOOM_MAX: Num = 4;

/* ------------------------------------------------------------------ */
/*  Outline presets                                                    */
/* ------------------------------------------------------------------ */

const OUTLINE_PRESETS: Array<{ id: Str; label: Str; color: Str }> = [
	{ id: 'red', label: 'Red', color: 'rgba(239, 68, 68, 0.25)' },
	{ id: 'blue', label: 'Blue', color: 'rgba(59, 130, 246, 0.35)' },
	{ id: 'green', label: 'Green', color: 'rgba(34, 197, 94, 0.35)' },
	{ id: 'yellow', label: 'Yellow', color: 'rgba(234, 179, 8, 0.35)' },
	{ id: 'white', label: 'White', color: 'rgba(255, 255, 255, 0.5)' },
	{ id: 'black', label: 'Black', color: 'rgba(0, 0, 0, 0.25)' },
];

/* ------------------------------------------------------------------ */
/*  Grid presets                                                       */
/* ------------------------------------------------------------------ */

const GRID_DEFAULT_SIZE: Num = 16;

const GRID_PRESETS: Array<{ id: Str; label: Str; color: Str }> = [
	{ id: 'light', label: 'Light', color: 'rgba(0, 0, 0, 0.06)' },
	{ id: 'medium', label: 'Medium', color: 'rgba(0, 0, 0, 0.12)' },
	{ id: 'dark', label: 'Dark', color: 'rgba(0, 0, 0, 0.25)' },
	{ id: 'red', label: 'Red', color: 'rgba(239, 68, 68, 0.15)' },
	{ id: 'blue', label: 'Blue', color: 'rgba(59, 130, 246, 0.2)' },
	{ id: 'green', label: 'Green', color: 'rgba(34, 197, 94, 0.2)' },
];

const GRID_FILL_PRESETS: Array<{ id: Str; label: Str; color: Str }> = [
	{ id: 'white', label: 'White', color: 'rgba(255, 255, 255, 0.5)' },
	{ id: 'black', label: 'Black', color: 'rgba(0, 0, 0, 0.3)' },
	{ id: 'red', label: 'Red', color: 'rgba(239, 68, 68, 0.08)' },
	{ id: 'blue', label: 'Blue', color: 'rgba(59, 130, 246, 0.08)' },
	{ id: 'green', label: 'Green', color: 'rgba(34, 197, 94, 0.08)' },
	{ id: 'yellow', label: 'Yellow', color: 'rgba(234, 179, 8, 0.08)' },
];

/* ------------------------------------------------------------------ */
/*  Orientation presets                                                */
/* ------------------------------------------------------------------ */

const ORIENTATION_PRESETS: Array<{ id: Str; label: Str; rotation: Num }> = [
	{ id: 'portrait-primary', label: 'Portrait Primary (0°)', rotation: 0 },
	{ id: 'portrait-secondary', label: 'Portrait Secondary (180°)', rotation: 180 },
	{ id: 'landscape-primary', label: 'Landscape Primary (90°)', rotation: 90 },
	{ id: 'landscape-secondary', label: 'Landscape Secondary (270°)', rotation: 270 },
];

/* ------------------------------------------------------------------ */
/*  Color mode presets                                                 */
/* ------------------------------------------------------------------ */

const MODE_PRESETS: Array<{ id: Str; label: Str; icon: Component }> = [
	{ id: 'auto', label: 'Auto (inherit)', icon: Monitor },
	{ id: 'light', label: 'Light', icon: Sun },
	{ id: 'dark', label: 'Dark', icon: Moon },
];

/* ------------------------------------------------------------------ */
/*  Theme presets                                                      */
/* ------------------------------------------------------------------ */

const THEME_PRESETS: Array<{ id: Str; label: Str; dot: Str }> = [
	{ id: '', label: 'Default (inherit)', dot: '' },
	{ id: 'midnight', label: 'Midnight', dot: 'oklch(0.55 0.22 260)' },
	{ id: 'warm', label: 'Warm', dot: 'oklch(0.50 0.16 50)' },
	{ id: 'forest', label: 'Forest', dot: 'oklch(0.50 0.16 155)' },
	{ id: 'ocean', label: 'Ocean', dot: 'oklch(0.52 0.15 200)' },
	{ id: 'rose', label: 'Rose', dot: 'oklch(0.55 0.18 350)' },
	{ id: 'lavender', label: 'Lavender', dot: 'oklch(0.52 0.20 290)' },
	{ id: 'sunset', label: 'Sunset', dot: 'oklch(0.55 0.20 30)' },
	{ id: 'slate', label: 'Slate', dot: 'oklch(0.48 0.08 240)' },
	{ id: 'copper', label: 'Copper', dot: 'oklch(0.52 0.16 60)' },
	{ id: 'aurora', label: 'Aurora', dot: 'oklch(0.52 0.15 170)' },
	{ id: 'amethyst', label: 'Amethyst', dot: 'oklch(0.52 0.22 310)' },
];

/* ------------------------------------------------------------------ */
/*  Media query preference presets                                     */
/* ------------------------------------------------------------------ */

/** Media query preference groups with their options. */
const MEDIA_PREF_GROUPS: Array<{ pref: Str; label: Str; defaultValue: Str; options: Array<{ value: Str; label: Str }> }> = [
	{
		pref: 'reduced-motion',
		label: 'Reduced Motion',
		defaultValue: 'no-preference',
		options: [
			{ value: 'no-preference', label: 'No Preference' },
			{ value: 'reduce', label: 'Reduce' },
		],
	},
	{
		pref: 'contrast',
		label: 'Contrast',
		defaultValue: 'no-preference',
		options: [
			{ value: 'no-preference', label: 'No Preference' },
			{ value: 'more', label: 'More' },
			{ value: 'less', label: 'Less' },
		],
	},
	{
		pref: 'reduced-transparency',
		label: 'Reduced Transparency',
		defaultValue: 'no-preference',
		options: [
			{ value: 'no-preference', label: 'No Preference' },
			{ value: 'reduce', label: 'Reduce' },
		],
	},
	{
		pref: 'forced-colors',
		label: 'Forced Colors',
		defaultValue: 'none',
		options: [
			{ value: 'none', label: 'None' },
			{ value: 'active', label: 'Active' },
		],
	},
];

/* ------------------------------------------------------------------ */
/*  Network condition presets                                          */
/* ------------------------------------------------------------------ */

/** Network simulation presets with latency delays in ms (-1 = permanent/offline). */
const NETWORK_PRESETS: Array<{ id: Str; label: Str; delay: Num; description: Str; category: Str }> = [
	{ id: 'none', label: 'No throttling', delay: 0, description: '', category: '' },
	// Mobile
	{ id: 'gprs', label: 'GPRS', delay: 500, description: '~50 kbps, 500ms RTT', category: 'Mobile' },
	{ id: '2g-edge', label: '2G / EDGE', delay: 300, description: '~240 kbps, 300ms RTT', category: 'Mobile' },
	{ id: '3g', label: '3G', delay: 2000, description: '~400 kbps, 2s RTT', category: 'Mobile' },
	{ id: '3g-hspa', label: '3G / HSPA', delay: 120, description: '~1.5 Mbps, 120ms RTT', category: 'Mobile' },
	{ id: '3g-hspa-plus', label: '3G / HSPA+', delay: 80, description: '~4 Mbps, 80ms RTT', category: 'Mobile' },
	{ id: 'slow-4g', label: 'Slow 4G', delay: 562, description: '~1.4 Mbps, 562ms RTT', category: 'Mobile' },
	{ id: 'fast-4g', label: 'Fast 4G / LTE', delay: 165, description: '~9 Mbps, 165ms RTT', category: 'Mobile' },
	{ id: 'lte-a', label: 'LTE-Advanced', delay: 30, description: '~15 Mbps, 30ms RTT', category: 'Mobile' },
	{ id: '5g-sub6', label: '5G Sub-6 GHz', delay: 10, description: '~100 Mbps, 10ms RTT', category: 'Mobile' },
	{ id: '5g-mmwave', label: '5G mmWave', delay: 5, description: '~1 Gbps, 5ms RTT', category: 'Mobile' },
	{ id: '5g-plus', label: '5G+ / 5G UC', delay: 3, description: '~2 Gbps, 3ms RTT', category: 'Mobile' },
	// Fixed
	{ id: '56k', label: '56K Dial-up', delay: 120, description: '~50 kbps, 120ms RTT', category: 'Fixed' },
	{ id: 'dsl', label: 'DSL', delay: 25, description: '~2 Mbps, 25ms RTT', category: 'Fixed' },
	{ id: 'cable-5', label: 'Cable 5 Mbps', delay: 28, description: '~5 Mbps, 28ms RTT', category: 'Fixed' },
	{ id: 'cable-50', label: 'Cable 50 Mbps', delay: 10, description: '~50 Mbps, 10ms RTT', category: 'Fixed' },
	{ id: 'cable-100', label: 'Cable 100 Mbps', delay: 8, description: '~100 Mbps, 8ms RTT', category: 'Fixed' },
	{ id: 'wifi', label: 'Wi-Fi', delay: 5, description: '~30 Mbps, 5ms RTT', category: 'Fixed' },
	{ id: 'wifi-6', label: 'Wi-Fi 6', delay: 3, description: '~100 Mbps, 3ms RTT', category: 'Fixed' },
	{ id: 'fiber', label: 'Fiber / FIOS', delay: 4, description: '~100 Mbps, 4ms RTT', category: 'Fixed' },
	{ id: 'fiber-gigabit', label: 'Fiber Gigabit', delay: 2, description: '~1 Gbps, 2ms RTT', category: 'Fixed' },
	{ id: 'fiber-10g', label: '10G Fiber', delay: 1, description: '~10 Gbps, 1ms RTT', category: 'Fixed' },
	{ id: 'wifi-6e', label: 'Wi-Fi 6E', delay: 2, description: '~200 Mbps, 2ms RTT', category: 'Fixed' },
	{ id: 'wifi-7', label: 'Wi-Fi 7', delay: 1, description: '~300 Mbps, 1ms RTT', category: 'Fixed' },
	// Satellite
	{ id: 'satellite-geo', label: 'Satellite GEO (HughesNet)', delay: 600, description: '~25 Mbps, 600ms RTT', category: 'Satellite' },
	{ id: 'satellite-leo', label: 'Satellite LEO (Starlink)', delay: 25, description: '~50 Mbps, 25ms RTT', category: 'Satellite' },
	// Special
	{ id: 'offline', label: 'Offline', delay: -1, description: 'No connection', category: 'Special' },
];

/* ------------------------------------------------------------------ */
/*  Viewport / device simulation presets                               */
/* ------------------------------------------------------------------ */

/** Viewport presets organized by device category. Width and height in CSS pixels. */
const VIEWPORT_PRESETS: Array<{ id: Str; label: Str; width: Num; height: Num; category: Str }> = [
	// ── Watches ──
	{ id: 'watch-sm', label: 'Apple Watch (38–40mm)', width: 197, height: 162, category: 'Watches' },
	{ id: 'watch-md', label: 'Apple Watch (42–44mm)', width: 224, height: 184, category: 'Watches' },
	{ id: 'watch-ultra', label: 'Apple Watch Ultra (49mm)', width: 205, height: 251, category: 'Watches' },
	{ id: 'watch-galaxy', label: 'Galaxy Watch', width: 240, height: 240, category: 'Watches' },
	{ id: 'watch-wear-os', label: 'Wear OS (round)', width: 240, height: 240, category: 'Watches' },
	// ── Phones ──
	{ id: 'galaxy-z-fold-cover', label: 'Galaxy Z Fold (Cover)', width: 323, height: 694, category: 'Phones' },
	{ id: 'galaxy-s25', label: 'Galaxy S25 / S24 / S23', width: 360, height: 800, category: 'Phones' },
	{ id: 'galaxy-a-760', label: 'Galaxy A (budget, 760)', width: 360, height: 760, category: 'Phones' },
	{ id: 'galaxy-a-780', label: 'Galaxy A13 / A23', width: 360, height: 780, category: 'Phones' },
	{ id: 'galaxy-a-804', label: 'Galaxy A (mid, 804)', width: 360, height: 804, category: 'Phones' },
	{ id: 'galaxy-a-806', label: 'Galaxy A / Xiaomi (806)', width: 360, height: 806, category: 'Phones' },
	{ id: 'iphone-se', label: 'iPhone SE', width: 375, height: 667, category: 'Phones' },
	{ id: 'iphone-x', label: 'iPhone X / XS / 12 Mini / 13 Mini', width: 375, height: 812, category: 'Phones' },
	{ id: 'galaxy-s24', label: 'Galaxy S24 / A55', width: 384, height: 832, category: 'Phones' },
	{ id: 'galaxy-a-854', label: 'Galaxy A14 / A series (854)', width: 384, height: 854, category: 'Phones' },
	{ id: 'galaxy-a-857', label: 'Galaxy A series (857)', width: 384, height: 857, category: 'Phones' },
	{ id: 'galaxy-s25-new', label: 'Galaxy S25 / S25+', width: 385, height: 854, category: 'Phones' },
	{ id: 'iphone-16', label: 'iPhone 16 / 15 / 14 / 13', width: 390, height: 844, category: 'Phones' },
	{ id: 'xiaomi-851', label: 'Xiaomi / Samsung (851)', width: 393, height: 851, category: 'Phones' },
	{ id: 'iphone-16-pro', label: 'iPhone 16 Pro / 15 Pro / Z Flip', width: 393, height: 852, category: 'Phones' },
	{ id: 'galaxy-a54', label: 'Galaxy A54 / A55', width: 393, height: 873, category: 'Phones' },
	{ id: 'iphone-17', label: 'iPhone 17 / 17 Pro', width: 402, height: 874, category: 'Phones' },
	{ id: 'pixel-10-pro', label: 'Pixel 10 Pro', width: 410, height: 892, category: 'Phones' },
	{ id: 'pixel-9-pro', label: 'Pixel 9 Pro / OnePlus', width: 412, height: 892, category: 'Phones' },
	{ id: 'pixel-10', label: 'Pixel 10 / 9 / 8 / Galaxy S Ultra', width: 412, height: 915, category: 'Phones' },
	{ id: 'iphone-11', label: 'iPhone 11 / XR / Pixel Pro XL', width: 414, height: 896, category: 'Phones' },
	{ id: 'iphone-16-plus', label: 'iPhone 16 Plus / 15 Plus', width: 428, height: 926, category: 'Phones' },
	{ id: 'iphone-16-pro-max', label: 'iPhone 16 Pro Max / 15 Pro Max', width: 430, height: 932, category: 'Phones' },
	{ id: 'iphone-17-pro-max', label: 'iPhone 17 Pro Max', width: 440, height: 956, category: 'Phones' },
	// ── Foldables (unfolded) ──
	{ id: 'galaxy-z-fold-main', label: 'Galaxy Z Fold (Main)', width: 619, height: 876, category: 'Foldables' },
	{ id: 'pixel-fold-main', label: 'Pixel Fold (Main)', width: 692, height: 1004, category: 'Foldables' },
	// ── E-Readers ──
	{ id: 'kindle-pw', label: 'Kindle Paperwhite', width: 632, height: 842, category: 'E-Readers' },
	{ id: 'kindle-oasis', label: 'Kindle Oasis', width: 640, height: 920, category: 'E-Readers' },
	// ── Fire Tablets ──
	{ id: 'fire-7', label: 'Amazon Fire 7', width: 600, height: 1024, category: 'Fire Tablets' },
	{ id: 'fire-hd-8', label: 'Amazon Fire HD 8', width: 601, height: 1007, category: 'Fire Tablets' },
	{ id: 'fire-hd-10', label: 'Amazon Fire HD 10', width: 810, height: 1080, category: 'Fire Tablets' },
	{ id: 'fire-max-11', label: 'Amazon Fire Max 11', width: 1200, height: 2000, category: 'Fire Tablets' },
	// ── Tablets ──
	{ id: 'ipad-mini', label: 'iPad Mini', width: 744, height: 1133, category: 'Tablets' },
	{ id: 'surface-go', label: 'Surface Go', width: 768, height: 1024, category: 'Tablets' },
	{ id: 'galaxy-tab', label: 'Galaxy Tab S7+', width: 800, height: 1280, category: 'Tablets' },
	{ id: 'ipad-10', label: 'iPad 10th gen', width: 810, height: 1080, category: 'Tablets' },
	{ id: 'ipad-air', label: 'iPad Air', width: 820, height: 1180, category: 'Tablets' },
	{ id: 'ipad-pro-11', label: 'iPad Pro 11"', width: 834, height: 1194, category: 'Tablets' },
	{ id: 'surface-pro', label: 'Surface Pro', width: 912, height: 1368, category: 'Tablets' },
	{ id: 'ipad-pro-12', label: 'iPad Pro 12.9"', width: 1024, height: 1366, category: 'Tablets' },
	{ id: 'xiaomi-pad', label: 'Xiaomi Pad 6', width: 1200, height: 2000, category: 'Tablets' },
	// ── Chromebooks ──
	{ id: 'chromebook', label: 'Chromebook (common)', width: 1366, height: 768, category: 'Chromebooks' },
	{ id: 'chromebook-hd', label: 'Chromebook HD+', width: 1536, height: 864, category: 'Chromebooks' },
	// ── Handhelds ──
	{ id: 'steam-deck', label: 'Steam Deck', width: 1280, height: 800, category: 'Handhelds' },
	{ id: 'steam-deck-oled', label: 'Steam Deck OLED', width: 1280, height: 800, category: 'Handhelds' },
	{ id: 'switch', label: 'Nintendo Switch', width: 1280, height: 720, category: 'Handhelds' },
	{ id: 'switch-oled', label: 'Nintendo Switch OLED', width: 1280, height: 720, category: 'Handhelds' },
	{ id: 'switch-2', label: 'Nintendo Switch 2', width: 1920, height: 1080, category: 'Handhelds' },
	{ id: 'ps-portal', label: 'PlayStation Portal', width: 1920, height: 1080, category: 'Handhelds' },
	{ id: 'rog-ally', label: 'ASUS ROG Ally', width: 1920, height: 1080, category: 'Handhelds' },
	{ id: 'lenovo-legion-go', label: 'Lenovo Legion Go', width: 2560, height: 1600, category: 'Handhelds' },
	// ── Laptop / Desktop ──
	{ id: 'laptop-sm', label: 'Laptop (small)', width: 1280, height: 800, category: 'Laptop / Desktop' },
	{ id: 'laptop-lg', label: 'Laptop (large)', width: 1440, height: 900, category: 'Laptop / Desktop' },
	{ id: 'desktop-fhd', label: 'Desktop Full HD', width: 1920, height: 1080, category: 'Laptop / Desktop' },
	{ id: 'desktop-qhd', label: 'Desktop QHD', width: 2560, height: 1440, category: 'Laptop / Desktop' },
	{ id: 'ultrawide', label: 'Ultrawide', width: 3440, height: 1440, category: 'Laptop / Desktop' },
	{ id: 'desktop-4k', label: 'Desktop 4K', width: 3840, height: 2160, category: 'Laptop / Desktop' },
	// ── Smart Displays ──
	{ id: 'echo-show-5', label: 'Echo Show 5', width: 960, height: 480, category: 'Smart Displays' },
	{ id: 'nest-hub', label: 'Google Nest Hub', width: 1024, height: 600, category: 'Smart Displays' },
	{ id: 'echo-show-8', label: 'Echo Show 8', width: 1200, height: 800, category: 'Smart Displays' },
	{ id: 'echo-show-10', label: 'Echo Show 10', width: 1200, height: 800, category: 'Smart Displays' },
	{ id: 'nest-hub-max', label: 'Google Nest Hub Max', width: 1280, height: 800, category: 'Smart Displays' },
	{ id: 'echo-show-15', label: 'Echo Show 15', width: 1920, height: 1080, category: 'Smart Displays' },
	// ── Automotive ──
	{ id: 'car-cluster', label: 'Car Instrument Cluster', width: 1280, height: 480, category: 'Automotive' },
	{ id: 'tesla-rear', label: 'Tesla Rear Display', width: 1440, height: 900, category: 'Automotive' },
	{ id: 'tesla-3y', label: 'Tesla Model 3 / Y', width: 1920, height: 1200, category: 'Automotive' },
	{ id: 'tesla-sx', label: 'Tesla Model S / X', width: 2200, height: 1300, category: 'Automotive' },
	{ id: 'mbux', label: 'Mercedes MBUX Hyperscreen', width: 2400, height: 900, category: 'Automotive' },
	// ── VR / AR ──
	{ id: 'quest-browser', label: 'Meta Quest Browser', width: 1280, height: 670, category: 'VR / AR' },
	{ id: 'vision-pro', label: 'Apple Vision Pro (Safari)', width: 1280, height: 720, category: 'VR / AR' },
	// ── Smart Appliances ──
	{ id: 'family-hub', label: 'Samsung Family Hub (21.5")', width: 1920, height: 1080, category: 'Smart Appliances' },
	{ id: 'family-hub-plus', label: 'Samsung Family Hub+ (32")', width: 1920, height: 1080, category: 'Smart Appliances' },
	// ── Kiosk / Signage ──
	{ id: 'kiosk-portrait', label: 'Kiosk Portrait', width: 1080, height: 1920, category: 'Kiosk / Signage' },
	{ id: 'kiosk-landscape', label: 'Kiosk Landscape', width: 1920, height: 1080, category: 'Kiosk / Signage' },
	// ── TV ──
	{ id: 'tv-hd', label: 'TV 720p / HD', width: 1280, height: 720, category: 'TV' },
	{ id: 'tv-fhd', label: 'TV 1080p / Full HD', width: 1920, height: 1080, category: 'TV' },
	{ id: 'tv-4k', label: 'TV 4K / Ultra HD', width: 3840, height: 2160, category: 'TV' },
];

/* ------------------------------------------------------------------ */
/*  Accessibility simulation data                                     */
/* ------------------------------------------------------------------ */

/** SVG feColorMatrix values for color vision deficiency simulations. */
const COLOR_MATRICES: Record<Str, Str> = {
	protanopia: '0.567 0.433 0 0 0 0.558 0.442 0 0 0 0 0.242 0.758 0 0 0 0 0 1 0',
	protanomaly: '0.817 0.183 0 0 0 0.333 0.667 0 0 0 0 0.125 0.875 0 0 0 0 0 1 0',
	deuteranopia: '0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0',
	deuteranomaly: '0.8 0.2 0 0 0 0.258 0.742 0 0 0 0 0.142 0.858 0 0 0 0 0 1 0',
	tritanopia: '0.95 0.05 0 0 0 0 0.433 0.567 0 0 0 0.475 0.525 0 0 0 0 0 1 0',
	tritanomaly: '0.967 0.033 0 0 0 0 0.733 0.267 0 0 0 0.183 0.817 0 0 0 0 0 1 0',
	achromatopsia: '0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0 0 0 1 0',
	achromatomaly: '0.618 0.320 0.062 0 0 0.163 0.775 0.062 0 0 0.163 0.320 0.516 0 0 0 0 0 1 0',
};

/** CSS filter strings for vision impairment simulations. */
const CSS_FILTERS: Record<Str, Str> = {
	'blurred-vision': 'blur(2px)',
	cataracts: 'blur(0.5px) brightness(1.15) contrast(0.7) sepia(0.25)',
	'low-contrast': 'contrast(0.4)',
};

/** Color vision deficiency menu items. */
const COLOR_VISION_ITEMS: Array<{ id: Str; label: Str }> = [
	{ id: 'protanopia', label: 'Protanopia (no red)' },
	{ id: 'protanomaly', label: 'Protanomaly (low red)' },
	{ id: 'deuteranopia', label: 'Deuteranopia (no green)' },
	{ id: 'deuteranomaly', label: 'Deuteranomaly (low green)' },
	{ id: 'tritanopia', label: 'Tritanopia (no blue)' },
	{ id: 'tritanomaly', label: 'Tritanomaly (low blue)' },
	{ id: 'achromatopsia', label: 'Achromatopsia (no color)' },
	{ id: 'achromatomaly', label: 'Achromatomaly (low color)' },
];

/** Vision impairment menu items. */
const VISION_ITEMS: Array<{ id: Str; label: Str }> = [
	{ id: 'blurred-vision', label: 'Blurred Vision' },
	{ id: 'cataracts', label: 'Cataracts' },
	{ id: 'low-contrast', label: 'Low Contrast' },
	{ id: 'tunnel-vision', label: 'Tunnel Vision' },
];

/** Color vision items filtered by search query. */
const filteredColorItems: Array<{ id: Str; label: Str }> = $derived(
	COLOR_VISION_ITEMS.filter((item) => item.label.toLowerCase().includes(simSearchQuery.toLowerCase())),
);

/** Vision impairment items filtered by search query. */
const filteredVisionItems: Array<{ id: Str; label: Str }> = $derived(
	VISION_ITEMS.filter((item) => item.label.toLowerCase().includes(simSearchQuery.toLowerCase())),
);

/** Viewport presets filtered by search query. */
const filteredViewportPresets: Array<{ id: Str; label: Str; width: Num; height: Num; category: Str }> = $derived(
	VIEWPORT_PRESETS.filter((item) => item.label.toLowerCase().includes(viewportSearchQuery.toLowerCase())),
);

/** Unique viewport categories present after filtering. */
const filteredViewportCategories: Str[] = $derived(
	[...new Set(filteredViewportPresets.map((p) => p.category))],
);

/** Network presets filtered by search query (excludes 'No throttling' from search). */
const filteredNetworkPresets: Array<{ id: Str; label: Str; delay: Num; description: Str; category: Str }> = $derived(
	NETWORK_PRESETS.filter(
		(item) => item.id === 'none' || item.label.toLowerCase().includes(networkSearchQuery.toLowerCase()),
	),
);

/** Unique network categories present after filtering (excludes empty category for 'none'). */
const filteredNetworkCategories: Str[] = $derived(
	[...new Set(filteredNetworkPresets.filter((p) => p.category).map((p) => p.category))],
);

/** Background presets filtered by search query. */
const filteredBgPresets: Array<{ id: Str; label: Str; style: Str }> = $derived(
	bgSearchQuery.length === 0
		? BG_PRESETS
		: BG_PRESETS.filter((p) => p.label.toLowerCase().includes(bgSearchQuery.toLowerCase())),
);

/** Outline presets filtered by search query. */
const filteredOutlinePresets: Array<{ id: Str; label: Str; color: Str }> = $derived(
	outlineSearchQuery.length === 0
		? OUTLINE_PRESETS
		: OUTLINE_PRESETS.filter((p) => p.label.toLowerCase().includes(outlineSearchQuery.toLowerCase())),
);

/** Grid presets filtered by search query. */
const filteredGridPresets: Array<{ id: Str; label: Str; color: Str }> = $derived(
	gridSearchQuery.length === 0
		? GRID_PRESETS
		: GRID_PRESETS.filter((p) => p.label.toLowerCase().includes(gridSearchQuery.toLowerCase())),
);

/** Color mode presets filtered by search query. */
const filteredModePresets: Array<{ id: Str; label: Str; icon: Component }> = $derived(
	modeSearchQuery.length === 0
		? MODE_PRESETS
		: MODE_PRESETS.filter((p) => p.label.toLowerCase().includes(modeSearchQuery.toLowerCase())),
);

/** Theme presets filtered by search query. */
const filteredThemePresets: Array<{ id: Str; label: Str; dot: Str }> = $derived(
	themeSearchQuery.length === 0
		? THEME_PRESETS
		: THEME_PRESETS.filter((p) => p.label.toLowerCase().includes(themeSearchQuery.toLowerCase())),
);

/** Orientation presets filtered by search query. */
const filteredOrientationPresets: Array<{ id: Str; label: Str; rotation: Num }> = $derived(
	orientationSearchQuery.length === 0
		? ORIENTATION_PRESETS
		: ORIENTATION_PRESETS.filter((p) => p.label.toLowerCase().includes(orientationSearchQuery.toLowerCase())),
);

/** Media preference groups filtered by search query (matches group label OR option labels). */
const filteredMediaPrefGroups: Array<{ pref: Str; label: Str; defaultValue: Str; options: Array<{ value: Str; label: Str }> }> = $derived(
	mediaPrefSearchQuery.length === 0
		? MEDIA_PREF_GROUPS
		: MEDIA_PREF_GROUPS.filter(
				(g) =>
					g.label.toLowerCase().includes(mediaPrefSearchQuery.toLowerCase()) ||
					g.options.some((o) => o.label.toLowerCase().includes(mediaPrefSearchQuery.toLowerCase())),
			),
);

/* ------------------------------------------------------------------ */
/*  Text direction items                                              */
/* ------------------------------------------------------------------ */

/** Text direction presets. */
const DIR_PRESETS: Array<{ id: Str; label: Str }> = [
	{ id: 'auto', label: 'Auto' },
	{ id: 'ltr', label: 'LTR (Left to Right)' },
	{ id: 'rtl', label: 'RTL (Right to Left)' },
];

/** Text direction presets filtered by search query. */
const filteredDirPresets: Array<{ id: Str; label: Str }> = $derived(
	dirSearchQuery.length === 0
		? DIR_PRESETS
		: DIR_PRESETS.filter((p) => p.label.toLowerCase().includes(dirSearchQuery.toLowerCase())),
);

/* ------------------------------------------------------------------ */
/*  Font size items                                                   */
/* ------------------------------------------------------------------ */

/** Font size presets. */
const FONT_SIZE_PRESETS: Array<{ px: Num; label: Str }> = [
	{ px: 0, label: 'Default' },
	{ px: 12, label: '12px' },
	{ px: 14, label: '14px' },
	{ px: 16, label: '16px' },
	{ px: 18, label: '18px' },
	{ px: 20, label: '20px' },
	{ px: 24, label: '24px' },
];

/** Font size presets filtered by search query. */
const filteredFontSizePresets: Array<{ px: Num; label: Str }> = $derived(
	fontSizeSearchQuery.length === 0
		? FONT_SIZE_PRESETS
		: FONT_SIZE_PRESETS.filter((p) => p.label.toLowerCase().includes(fontSizeSearchQuery.toLowerCase())),
);

/* ------------------------------------------------------------------ */
/*  Export format items                                                */
/* ------------------------------------------------------------------ */

/** Export format menu items with id, label, and icon reference. */
const EXPORT_ITEMS: Array<{ id: Str; label: Str; icon: Component; category: Str }> = [
	{ id: 'png', label: 'PNG', icon: FileImage, category: 'Image' },
	{ id: 'jpeg', label: 'JPEG', icon: FileImage, category: 'Image' },
	{ id: 'svg', label: 'SVG', icon: FileImage, category: 'Image' },
	{ id: 'webp', label: 'WebP', icon: FileImage, category: 'Image' },
	{ id: 'html', label: 'HTML', icon: FileType, category: 'Document' },
	{ id: 'standalone-html', label: 'Standalone HTML', icon: Globe, category: 'Document' },
	{ id: 'copy-image', label: 'Copy as Image', icon: Clipboard, category: 'Clipboard' },
	{ id: 'copy-html', label: 'Copy as HTML', icon: FileType, category: 'Clipboard' },
	{ id: 'copy-svelte', label: 'Copy as Svelte', icon: FileCode, category: 'Clipboard' },
	{ id: 'copy-data-uri', label: 'Copy as Data URI', icon: Link, category: 'Clipboard' },
];

/** Export items filtered by search query. */
const filteredExportItems: Array<{ id: Str; label: Str; icon: Component; category: Str }> = $derived(
	exportSearchQuery.length === 0
		? EXPORT_ITEMS
		: EXPORT_ITEMS.filter((p) => p.label.toLowerCase().includes(exportSearchQuery.toLowerCase())),
);

/** Unique export categories present after filtering. */
const filteredExportCategories: Str[] = $derived(
	[...new Set(filteredExportItems.map((p) => p.category))],
);

/* ------------------------------------------------------------------ */
/*  Helper functions                                                  */
/* ------------------------------------------------------------------ */

/**
 * Toggle the code panel for a specific card.
 *
 * @param key - Unique key for the card
 */
function toggleCode(key: Str): Void {
	openCards[key] = !openCards[key];
}

/**
 * Toggle an accessibility simulation for a specific card.
 * Clicking the active simulation deselects it.
 *
 * @param key - Card key
 * @param simId - Simulation identifier
 */
function toggleSimulation(key: Str, simId: Str): Void {
	cardSimulations[key] = cardSimulations[key] === simId ? 'none' : simId;
}

/**
 * Set background for a card.
 *
 * @param key - Card key
 * @param bgId - Background preset ID or custom hex color
 */
function setBackground(key: Str, bgId: Str): Void {
	cardBackgrounds[key] = bgId;
}

/**
 * Set zoom level for a card.
 *
 * @param key - Card key
 * @param level - Zoom level (1 = 100%)
 */
function setZoom(key: Str, level: Num): Void {
	cardZoom[key] = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, level));
}

/**
 * Increment zoom for a card by ZOOM_STEP.
 *
 * @param key - Card key
 */
function zoomIn(key: Str): Void {
	const current: Num = cardZoom[key] ?? 1;
	setZoom(key, current + ZOOM_STEP);
}

/**
 * Decrement zoom for a card by ZOOM_STEP.
 *
 * @param key - Card key
 */
function zoomOut(key: Str): Void {
	const current: Num = cardZoom[key] ?? 1;
	setZoom(key, current - ZOOM_STEP);
}

/**
 * Reset zoom to 100% for a card.
 *
 * @param key - Card key
 */
function zoomFit(key: Str): Void {
	cardZoom[key] = 1;
}

/**
 * Set outline color for a card.
 *
 * @param key - Card key
 * @param colorId - Outline preset ID, custom hex color, or 'none'
 */
function setOutline(key: Str, colorId: Str): Void {
	cardOutlines[key] = colorId;
}

/**
 * Get the resolved outline CSS color value for a card.
 *
 * @param key - Card key
 * @returns CSS color string or empty if no outline
 */
function getOutlineColor(key: Str): Str {
	const id: Str = cardOutlines[key] ?? 'none';
	if (id === 'none') return '';
	if (id.startsWith('#') || id.startsWith('rgb')) return id;
	const preset = OUTLINE_PRESETS.find((p) => p.id === id);
	return preset?.color ?? '';
}

/**
 * Set grid style for a card.
 *
 * @param key - Card key
 * @param gridId - Grid preset ID, custom hex color, or 'none'
 */
function setGrid(key: Str, gridId: Str): Void {
	cardGrids[key] = gridId;
}

/**
 * Set grid size for a card.
 *
 * @param key - Card key
 * @param size - Grid cell size in pixels
 */
function setGridSize(key: Str, size: Num): Void {
	cardGridSizes[key] = Math.min(128, Math.max(4, size));
}

/**
 * Set grid fill (cell background) color for a card.
 *
 * @param key - Card key
 * @param fillId - Fill color preset ID, hex color, or 'none'
 */
function setGridFill(key: Str, fillId: Str): Void {
	cardGridFills[key] = fillId;
}

/**
 * Get the resolved grid CSS color value for a card.
 *
 * @param key - Card key
 * @returns CSS color string or empty if no grid
 */
function getGridColor(key: Str): Str {
	const id: Str = cardGrids[key] ?? 'none';
	if (id === 'none') return '';
	if (id.startsWith('#') || id.startsWith('rgb')) return id;
	const preset = GRID_PRESETS.find((p) => p.id === id);
	return preset?.color ?? '';
}

/**
 * Get the resolved grid fill CSS color value for a card.
 *
 * @param key - Card key
 * @returns CSS color string or empty if no fill
 */
function getGridFillColor(key: Str): Str {
	const id: Str = cardGridFills[key] ?? 'none';
	if (id === 'none') return '';
	if (id.startsWith('#') || id.startsWith('rgb')) return id;
	const preset = GRID_FILL_PRESETS.find((p) => p.id === id);
	return preset?.color ?? '';
}

/**
 * Get the CSS background-image style for a grid overlay.
 *
 * @param key - Card key
 * @returns CSS style string or empty
 */
function getGridStyle(key: Str): Str {
	const color: Str = getGridColor(key);
	if (!color) return '';
	const size: Num = cardGridSizes[key] ?? GRID_DEFAULT_SIZE;
	const fillColor: Str = getGridFillColor(key);
	const fillStyle: Str = fillColor ? `; background-color: ${fillColor}` : '';
	return `background-image: linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px); background-size: ${size}px ${size}px${fillStyle}`;
}

/**
 * Set orientation for a card.
 *
 * @param key - Card key
 * @param orientationId - Orientation preset ID or 'default'
 */
function setOrientation(key: Str, orientationId: Str): Void {
	cardOrientations[key] = orientationId;
}

/**
 * Get the CSS transform style for a card's orientation rotation.
 *
 * @param key - Card key
 * @returns CSS style string or empty
 */
function getOrientationStyle(key: Str): Str {
	const id: Str = cardOrientations[key] ?? 'default';
	if (id === 'default') return '';
	const preset = ORIENTATION_PRESETS.find((p) => p.id === id);
	if (!preset || preset.rotation === 0) return '';
	return `transform: rotate(${preset.rotation}deg); transform-origin: center center`;
}

/**
 * Check if a card's orientation is landscape (90° or 270°).
 *
 * @param key - Card key
 * @returns True if the rotation swaps width/height
 */
function isLandscapeOrientation(key: Str): Bool {
	const id: Str = cardOrientations[key] ?? 'default';
	if (id === 'default') return false;
	const preset = ORIENTATION_PRESETS.find((p) => p.id === id);
	return preset?.rotation === 90 || preset?.rotation === 270;
}

/**
 * Set color mode for a card.
 *
 * @param key - Card key
 * @param modeId - Color mode: 'auto', 'light', or 'dark'
 */
function setCardMode(key: Str, modeId: Str): Void {
	cardModes[key] = modeId;
}

/**
 * Set theme for a card.
 *
 * @param key - Card key
 * @param themeId - Theme ID or '' for default (inherit)
 */
function setCardTheme(key: Str, themeId: Str): Void {
	cardThemes[key] = themeId;
}

/**
 * Collect all non-default computed styles for a card as a serialisable map.
 *
 * Adding a new card-level state? Just add one block here — the isolation
 * page will pick it up automatically because it applies computed CSS, not
 * raw preset IDs.
 *
 * @param key - Card key
 * @returns Flat record of style keys → CSS values (only non-default entries)
 */
function collectCardStyles(key: Str): Record<Str, Str> {
	const s: Record<Str, Str> = {};
	const bg: Str = getBackgroundStyle(key);
	if (bg) s.bg = bg;
	const zoom: Str = getZoomStyle(key);
	if (zoom) s.zoom = zoom;
	const outline: Str = cardOutlines[key] ?? 'none';
	if (outline !== 'none') s.outlineColor = getOutlineColor(key);
	const grid: Str = getGridStyle(key);
	if (grid) s.grid = grid;
	const orient: Str = getOrientationStyle(key);
	if (orient) s.orient = orient;
	const mode: Str = cardModes[key] ?? 'auto';
	if (mode !== 'auto') s.mode = mode;
	const theme: Str = cardThemes[key] ?? '';
	if (theme) s.theme = theme;
	const mp: Str = getMediaPrefClasses(key);
	if (mp) s.mp = mp;
	const sim: Str = cardSimulations[key] ?? 'none';
	if (sim !== 'none') {
		s.simId = sim;
		if (sim in COLOR_MATRICES) s.simMatrix = COLOR_MATRICES[sim] ?? '';
		if (sim in CSS_FILTERS) s.simCss = CSS_FILTERS[sim] ?? '';
	}
	if (hasTunnelVision(key)) s.tunnel = '1';
	const net: Str = cardNetworkSim[key] ?? 'none';
	if (net !== 'none') {
		if (net === 'custom') {
			const custom = cardCustomNetwork[key];
			s.net = custom ? `Custom (${custom.delay}ms)` : 'Custom';
		} else {
			const preset = NETWORK_PRESETS.find((p) => p.id === net);
			s.net = preset?.label ?? net;
		}
	}
	const vp: Str = cardViewports[key] ?? 'auto';
	if (vp !== 'auto') {
		if (vp === 'custom') {
			const dims = cardCustomViewports[key];
			if (dims) s.vp = `${dims.w}x${dims.h}`;
		} else {
			const preset = VIEWPORT_PRESETS.find((p) => p.id === vp);
			if (preset) s.vp = `${preset.width}x${preset.height}`;
		}
	}
	const dir: Str = cardTextDir[key] ?? 'auto';
	if (dir !== 'auto') s.dir = dir;
	const fontSize: Num = cardFontSize[key] ?? 0;
	if (fontSize > 0) s.fontSize = `${fontSize}px (${(fontSize / 16).toFixed(2)}x)`;
	if (cardDebugOutline[key]) s.debugOutline = '1';
	if (cardMeasureActive[key]) s.measure = '1';
	if (cardInspectActive[key]) s.inspect = '1';
	if (cardConsoleOpen[key]) s.console = '1';
	return s;
}

/**
 * Open component in isolation in a new tab.
 *
 * Serialises all non-default toolbar state as computed CSS in a single `s`
 * query param (base64 JSON). The isolation page decodes and applies it with
 * no preset knowledge required.
 *
 * @param key - Card key for reading toolbar state
 * @param variantKey - Optional variant prop name
 * @param option - Optional variant option value
 */
/**
 * Build the isolation URL for a card.
 *
 * @param key - Card key
 * @param variantKey - Variant prop name
 * @param option - Variant option value
 * @returns Absolute isolation URL string
 */
function buildIsolationUrl(key: Str, variantKey: Str, option: Str): Str {
	if (!componentName) return '';
	const params: URLSearchParams = new URLSearchParams();
	if (variantKey) params.set('variant', variantKey);
	if (option) params.set('option', option);
	const styles: Record<Str, Str> = collectCardStyles(key);
	if (Object.keys(styles).length > 0) {
		params.set('s', btoa(JSON.stringify(styles)));
	}
	const qs: Str = params.toString();
	return `/isolate/${componentName}${qs ? `?${qs}` : ''}`;
}

/**
 * Open the isolation URL for a card in a new tab.
 *
 * @param key - Card key
 * @param variantKey - Variant prop name
 * @param option - Variant option value
 */
function openIsolation(key: Str, variantKey: Str, option: Str): Void {
	const url: Str = buildIsolationUrl(key, variantKey, option);
	if (url) window.open(url, '_blank');
}

/** Whether "link copied" feedback is currently showing. */
let linkCopied: Bool = $state(false);

/** Which export format was last triggered ('' = none, shows feedback on export item). */
let exportFeedback: Str = $state('');

/** Which export format is currently in progress ('' = none, shows spinner on export item). */
let exportInProgress: Str = $state('');

/** Per-card dropdown open state for programmatic close after showing action feedback. */
let cardDropdownOpen: Record<Str, Bool> = $state({});

/**
 * Copy the isolation URL for a card to clipboard.
 *
 * @param key - Card key
 * @param variantKey - Variant prop name
 * @param option - Variant option value
 */
async function copyIsolationUrl(key: Str, variantKey: Str, option: Str): Promise<void> {
	const path: Str = buildIsolationUrl(key, variantKey, option);
	if (!path) return;
	const url: Str = `${window.location.origin}${path}`;
	await navigator.clipboard.writeText(url);
	linkCopied = true;
	setTimeout((): Void => {
		linkCopied = false;
		cardDropdownOpen[key] = false;
	}, 1200);
}

/**
 * Generate a safe CSS identifier for an SVG filter from a card key.
 *
 * @param key - Card key
 * @returns A safe CSS identifier string
 */
function filterId(key: Str): Str {
	return `lens-sim-${key.replaceAll(/[^a-zA-Z0-9-]/g, '-')}`;
}

/**
 * Get the inline filter style for a card's accessibility simulation.
 *
 * @param key - Card key
 * @returns CSS filter string or empty
 */
function getSimulationFilter(key: Str): Str {
	const sim: Str = cardSimulations[key] ?? 'none';
	if (sim === 'none') return '';
	if (sim in COLOR_MATRICES) return `filter: url(#${filterId(key)})`;
	if (sim in CSS_FILTERS) return `filter: ${CSS_FILTERS[sim]}`;
	return '';
}

/**
 * Get the background style for a card's preview area.
 *
 * @param key - Card key
 * @returns CSS style string or empty
 */
function getBackgroundStyle(key: Str): Str {
	const bgId: Str = cardBackgrounds[key] ?? 'default';
	if (bgId === 'default') return '';
	// Check if it's a custom hex color
	if (bgId.startsWith('#')) return `background-color: ${bgId}`;
	const preset: { id: Str; label: Str; style: Str } | undefined = BG_PRESETS.find((p) => p.id === bgId);
	return preset?.style ?? '';
}

/**
 * Get the zoom transform style for a card.
 *
 * @param key - Card key
 * @returns CSS style string or empty
 */
function getZoomStyle(key: Str): Str {
	const zoom: Num = cardZoom[key] ?? 1;
	if (zoom === 1) return '';
	return `zoom: ${zoom}`;
}

/**
 * Get the current zoom percentage label for a card.
 *
 * @param key - Card key
 * @returns Zoom percentage string (e.g. "150%")
 */
function getZoomLabel(key: Str): Str {
	const zoom: Num = cardZoom[key] ?? 1;
	return `${Math.round(zoom * 100)}%`;
}

/**
 * Tailwind v4 text-size CSS custom properties and their default rem values.
 * Tailwind utility classes like `text-sm` resolve to `font-size: var(--text-sm)`,
 * so overriding these variables on a container scales all child text proportionally.
 */
const TW_TEXT_VARS: ReadonlyArray<{ prop: Str; rem: Num }> = [
	{ prop: '--text-xs', rem: 0.75 },
	{ prop: '--text-sm', rem: 0.875 },
	{ prop: '--text-base', rem: 1 },
	{ prop: '--text-lg', rem: 1.125 },
	{ prop: '--text-xl', rem: 1.25 },
	{ prop: '--text-2xl', rem: 1.5 },
	{ prop: '--text-3xl', rem: 1.875 },
	{ prop: '--text-4xl', rem: 2.25 },
	{ prop: '--text-5xl', rem: 3 },
];

/**
 * Generate CSS variable overrides for Tailwind text sizes scaled to target font size.
 *
 * @param key - Card key
 * @returns CSS string with `--text-*` variable overrides, or empty string if default
 */
function getFontSizeVars(key: Str): Str {
	const targetPx: Num = cardFontSize[key] ?? 0;
	if (targetPx <= 0) return '';
	const scale: Num = targetPx / 16;
	return TW_TEXT_VARS.map((v) => `${v.prop}: ${(v.rem * scale).toFixed(4)}rem`).join('; ');
}

/* ------------------------------------------------------------------ */
/*  Debug Outline CSS (Pesticide-inspired)                             */
/* ------------------------------------------------------------------ */

/**
 * CSS rules for debug outline mode — colored outlines per HTML element type.
 * Inspired by Pesticide CSS debugger. Applied inside the preview container only.
 */
/**
 * Build scoped debug outline CSS for a specific card's preview container.
 * Uses `[data-lens-debug]` attribute selector to scope outlines to only that container.
 *
 * @param cardKey - Card key used as the data attribute value
 * @returns Scoped CSS string
 */
function buildDebugOutlineCSS(cardKey: Str): Str {
	const s: Str = `[data-lens-debug="${cardKey}"]`;
	return [
		`${s} article,${s} nav,${s} aside,${s} section,${s} header,${s} footer,${s} main{outline:1px solid rgba(59,130,246,0.6)!important}`,
		`${s} h1,${s} h2,${s} h3,${s} h4,${s} h5,${s} h6{outline:1px solid rgba(99,102,241,0.6)!important}`,
		`${s} div{outline:1px solid rgba(147,197,253,0.4)!important}`,
		`${s} p,${s} hr,${s} pre,${s} blockquote{outline:1px solid rgba(96,165,250,0.5)!important}`,
		`${s} ol,${s} ul,${s} li,${s} dl,${s} dt,${s} dd{outline:1px solid rgba(239,68,68,0.5)!important}`,
		`${s} figure,${s} img,${s} iframe,${s} video,${s} audio,${s} canvas,${s} svg{outline:1px solid rgba(168,85,247,0.6)!important}`,
		`${s} table,${s} thead,${s} tbody,${s} tfoot,${s} tr,${s} th,${s} td,${s} caption{outline:1px solid rgba(20,184,166,0.5)!important}`,
		`${s} button,${s} input,${s} select,${s} textarea,${s} form,${s} fieldset,${s} label,${s} legend{outline:1px solid rgba(249,115,22,0.6)!important}`,
		`${s} a{outline:1px solid rgba(236,72,153,0.5)!important}`,
		`${s} em,${s} strong,${s} i,${s} b,${s} u,${s} s,${s} code,${s} kbd,${s} samp,${s} var,${s} mark,${s} small,${s} sub,${s} sup,${s} abbr,${s} time,${s} span{outline:1px solid rgba(244,63,94,0.4)!important}`,
	].join('\n');
}

/**
 * Legend entries mapping debug outline colors to element categories.
 * Colors match those used in `buildDebugOutlineCSS`.
 */
const DEBUG_OUTLINE_LEGEND: ReadonlyArray<{ color: Str; label: Str; elements: Str }> = [
	{ color: 'rgba(59,130,246,0.6)', label: 'Semantic', elements: 'article, nav, aside, section, header, footer, main' },
	{ color: 'rgba(99,102,241,0.6)', label: 'Headings', elements: 'h1–h6' },
	{ color: 'rgba(147,197,253,0.4)', label: 'Containers', elements: 'div' },
	{ color: 'rgba(96,165,250,0.5)', label: 'Text blocks', elements: 'p, hr, pre, blockquote' },
	{ color: 'rgba(239,68,68,0.5)', label: 'Lists', elements: 'ol, ul, li, dl, dt, dd' },
	{ color: 'rgba(168,85,247,0.6)', label: 'Media', elements: 'figure, img, iframe, video, audio, canvas, svg' },
	{ color: 'rgba(20,184,166,0.5)', label: 'Tables', elements: 'table, thead, tbody, tr, th, td' },
	{ color: 'rgba(249,115,22,0.6)', label: 'Forms', elements: 'button, input, select, textarea, form, fieldset, label' },
	{ color: 'rgba(236,72,153,0.5)', label: 'Links', elements: 'a' },
	{ color: 'rgba(244,63,94,0.4)', label: 'Inline', elements: 'em, strong, code, kbd, span, mark, abbr, …' },
];

/* ------------------------------------------------------------------ */
/*  Debug Console — types + capture helpers                            */
/* ------------------------------------------------------------------ */

/** A single debug console log entry. */
type ConsoleLogEntry = {
	/** Entry type category. */
	type: 'console' | 'event' | 'mutation' | 'lifecycle' | 'render';
	/** Console level or event sub-type. */
	level: 'log' | 'info' | 'warn' | 'error' | 'debug' | 'event' | 'mutation' | 'lifecycle' | 'render';
	/** Primary message text. @values Hello world, click fired, attribute changed */
	message: Str;
	/** Optional detail (expanded args, mutation diff, event info). @values {x: 1}, class: old → new */
	detail: Str;
	/** Milliseconds since component mount. @values 0, 42, 1500 */
	ts: Num;
	/** Source file:line from __svelte_meta when available. @values Button.svelte:12, , Dialog.svelte:45 */
	source: Str;
};

/** Maximum console entries per card before oldest are dropped. */
const CONSOLE_MAX_ENTRIES: Num = 500;

/** DOM events to capture from the preview container. */
const CAPTURED_EVENTS: readonly Str[] = ['click', 'input', 'change', 'focus', 'blur', 'keydown', 'submit', 'pointerdown', 'pointerup'];

/**
 * Serialize a value for console log display.
 *
 * @param val - Value to serialize
 * @returns Formatted string representation
 */
function serializeArg(val: unknown): Str {
	if (val === null) return 'null';
	if (val === undefined) return 'undefined';
	if (typeof val === 'string') return val;
	if (typeof val === 'number' || typeof val === 'boolean') return String(val);
	try {
		return JSON.stringify(val, null, 2);
	} catch {
		/* Circular or unserializable — fall back to toString */
		return String(val);
	}
}

/**
 * Get the __svelte_meta source location from a DOM element if available.
 *
 * @param el - DOM element to inspect
 * @returns Source location string like "Button.svelte:15" or empty string
 */
function getSvelteMeta(el: Element | null): Str {
	if (!el) return '';
	/* __svelte_meta is attached by Svelte 5 compiler in dev mode */
	const svelteMeta = (el as unknown as Record<Str, unknown>).__svelte_meta as { loc?: { file?: Str; line?: Num } } | undefined;
	if (!svelteMeta?.loc?.file) return '';
	const file: Str = svelteMeta.loc.file.split('/').pop() ?? svelteMeta.loc.file;
	return `${file}:${svelteMeta.loc.line ?? '?'}`;
}

/**
 * Push a log entry to a card's console log, enforcing max capacity.
 *
 * @param key - Card identifier
 * @param entry - Log entry to add
 */
function pushConsoleLog(key: Str, entry: ConsoleLogEntry): Void {
	const logs: ConsoleLogEntry[] = cardConsoleLogs[key] ?? [];
	logs.push(entry);
	if (logs.length > CONSOLE_MAX_ENTRIES) logs.splice(0, logs.length - CONSOLE_MAX_ENTRIES);
	cardConsoleLogs[key] = logs;
}

/**
 * Start capturing console output, DOM events, and mutations for a card.
 * Returns a cleanup function that restores originals and disconnects observers.
 *
 * @param key - Card identifier
 * @param container - Preview container div element
 * @returns Cleanup function that restores console and disconnects observers
 */
// oxlint-ignore-next-line max-lines-per-function -- orchestrates 4 capture systems (console, events, mutations, lifecycle)
function startConsoleCapture(key: Str, container: HTMLDivElement): () => void {
	const mountTime: Num = performance.now();
	cardConsoleMountTime[key] = mountTime;

	/* --- Lifecycle: mount --- */
	pushConsoleLog(key, { type: 'lifecycle', level: 'lifecycle', message: 'Component mounted', detail: '', ts: 0, source: '' });

	/* --- Console interception --- */
	const origLog: typeof console.log = console.log;
	const origInfo: typeof console.info = console.info;
	const origWarn: typeof console.warn = console.warn;
	const origError: typeof console.error = console.error;
	const origDebug: typeof console.debug = console.debug;

	/**
	 * Create a console method interceptor that captures output.
	 *
	 * @param level - Console level to capture
	 * @param orig - Original console method
	 * @returns Wrapped console method
	 */
	function makeInterceptor(level: 'log' | 'info' | 'warn' | 'error' | 'debug', orig: (...args: unknown[]) => void): (...args: unknown[]) => void {
		return (...args: unknown[]): void => {
			const ts: Num = Math.round((performance.now() - mountTime) * 100) / 100;
			let msg: Str = serializeArg(args[0]);
			/* Count %c directives so we can skip the corresponding CSS style args */
			const formatCount: Num = typeof args[0] === 'string' ? (args[0].match(/%c/g) ?? []).length : 0;
			msg = msg.replaceAll('%c', '');
			/* Skip the CSS style args that follow %c directives */
			const detailArgs: unknown[] = args.slice(1 + formatCount);
			pushConsoleLog(key, {
				type: 'console',
				level,
				message: msg,
				detail: detailArgs.length > 0 ? detailArgs.map(serializeArg).join(' ') : '',
				ts,
				source: '',
			});
			orig.apply(console, args);
		};
	}

	console.log = makeInterceptor('log', origLog);
	console.info = makeInterceptor('info', origInfo);
	console.warn = makeInterceptor('warn', origWarn);
	console.error = makeInterceptor('error', origError);
	console.debug = makeInterceptor('debug', origDebug);

	/* --- DOM event capture --- */
	/**
	 * Handle a captured DOM event from the preview container.
	 *
	 * @param e - The captured DOM event
	 */
	function handleEvent(e: Event): void {
		const ts: Num = Math.round((performance.now() - mountTime) * 100) / 100;
		const target: Element | null = e.target instanceof Element ? e.target : null;
		const tag: Str = target?.tagName.toLowerCase() ?? '?';
		const cls: Str = target?.className && typeof target.className === 'string' ? `.${target.className.split(/\s+/).slice(0, 3).join('.')}` : '';
		let detail: Str = '';
		if (e instanceof KeyboardEvent) detail = `key: ${e.key}`;
		else if (e instanceof InputEvent || (e.target instanceof HTMLInputElement)) {
			const inp = e.target as HTMLInputElement | null;
			if (inp) detail = `value: ${inp.value?.slice(0, 80) ?? ''}`;
		}
		pushConsoleLog(key, {
			type: 'event',
			level: 'event',
			message: `${e.type} <${tag}${cls}>`,
			detail,
			ts,
			source: getSvelteMeta(target),
		});
	}

	for (const evt of CAPTURED_EVENTS) {
		container.addEventListener(evt, handleEvent, true);
	}

	/* --- MutationObserver --- */
	let lastMutationTime: Num = mountTime;

	const observer: MutationObserver = new MutationObserver((mutations: MutationRecord[]): void => {
		const now: Num = performance.now();
		const delta: Num = Math.round((now - lastMutationTime) * 100) / 100;
		lastMutationTime = now;
		const ts: Num = Math.round((now - mountTime) * 100) / 100;

		/* Log render cycle */
		pushConsoleLog(key, {
			type: 'render',
			level: 'render',
			message: `Re-render (${mutations.length} mutation${mutations.length === 1 ? '' : 's'}, +${delta}ms)`,
			detail: '',
			ts,
			source: '',
		});

		/* Log individual mutations (cap at 10 per batch to avoid flooding) */
		const mutCap: Num = Math.min(mutations.length, 10);
		for (let i: Num = 0; i < mutCap; i++) {
			const m: MutationRecord | undefined = mutations[i];
			if (!m) continue;
			const target: Element | null = m.target instanceof Element ? m.target : m.target.parentElement;
			const tag: Str = target?.tagName.toLowerCase() ?? '?';
			const source: Str = getSvelteMeta(target);

			if (m.type === 'attributes' && m.attributeName) {
				const newVal: Str = (target?.getAttribute(m.attributeName) ?? '').slice(0, 60);
				const oldVal: Str = (m.oldValue ?? '').slice(0, 60);
				pushConsoleLog(key, {
					type: 'mutation',
					level: 'mutation',
					message: `attr <${tag}> ${m.attributeName}`,
					detail: `"${oldVal}" → "${newVal}"`,
					ts,
					source,
				});
			} else if (m.type === 'characterData') {
				const oldVal: Str = (m.oldValue ?? '').slice(0, 60);
				const newVal: Str = (m.target.textContent ?? '').slice(0, 60);
				pushConsoleLog(key, {
					type: 'mutation',
					level: 'mutation',
					message: `text <${tag}>`,
					detail: `"${oldVal}" → "${newVal}"`,
					ts,
					source,
				});
			} else if (m.type === 'childList') {
				const added: Num = m.addedNodes.length;
				const removed: Num = m.removedNodes.length;
				const parts: Str[] = [];
				if (added > 0) parts.push(`+${added} added`);
				if (removed > 0) parts.push(`-${removed} removed`);
				pushConsoleLog(key, {
					type: 'mutation',
					level: 'mutation',
					message: `children <${tag}>`,
					detail: parts.join(', '),
					ts,
					source,
				});
			}
		}
		if (mutations.length > 10) {
			pushConsoleLog(key, {
				type: 'mutation',
				level: 'mutation',
				message: `… and ${mutations.length - 10} more mutations`,
				detail: '',
				ts,
				source: '',
			});
		}
	});

	observer.observe(container, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeOldValue: true,
		characterData: true,
		characterDataOldValue: true,
	});

	/* --- Cleanup function --- */
	return (): void => {
		console.log = origLog;
		console.info = origInfo;
		console.warn = origWarn;
		console.error = origError;
		console.debug = origDebug;
		for (const evt of CAPTURED_EVENTS) {
			container.removeEventListener(evt, handleEvent, true);
		}
		observer.disconnect();
		const ts: Num = Math.round((performance.now() - mountTime) * 100) / 100;
		pushConsoleLog(key, { type: 'lifecycle', level: 'lifecycle', message: 'Component unmounted', detail: '', ts, source: '' });
	};
}

/**
 * Get the Tailwind text color class for a console log level.
 *
 * @param level - Log level
 * @returns CSS class string
 */
function getConsoleColor(level: ConsoleLogEntry['level']): Str {
	if (level === 'error') return 'text-red-500';
	if (level === 'warn') return 'text-amber-500';
	if (level === 'info') return 'text-blue-400';
	if (level === 'debug') return 'text-muted-foreground/60';
	if (level === 'event') return 'text-violet-400';
	if (level === 'mutation') return 'text-teal-400';
	if (level === 'lifecycle') return 'text-emerald-400';
	if (level === 'render') return 'text-indigo-400';
	return 'text-muted-foreground';
}

/**
 * Get a short label for a console log level.
 *
 * @param level - Log level
 * @returns Short label string
 */
function getConsoleLabel(level: ConsoleLogEntry['level']): Str {
	if (level === 'error') return 'ERR';
	if (level === 'warn') return 'WRN';
	if (level === 'info') return 'INF';
	if (level === 'debug') return 'DBG';
	if (level === 'event') return 'EVT';
	if (level === 'mutation') return 'MUT';
	if (level === 'lifecycle') return 'LCY';
	if (level === 'render') return 'RND';
	return 'LOG';
}

/**
 * Svelte use: action to start console capture on mount and clean up on destroy.
 *
 * @param node - The preview container div
 * @param key - Card identifier
 * @returns Action lifecycle object with destroy callback
 */
function consoleCapture(node: HTMLDivElement, key: Str): { destroy: () => void } {
	const cleanup: () => void = startConsoleCapture(key, node);
	cardConsoleCleanup[key] = cleanup;
	return {
		destroy(): void {
			cleanup();
			cardConsoleCleanup[key] = null;
		},
	};
}

/* ------------------------------------------------------------------ */
/*  Measure / Inspect helpers                                          */
/* ------------------------------------------------------------------ */

/**
 * CSS property groups to display in the Inspect panel.
 */
const INSPECT_GROUPS: ReadonlyArray<{ label: Str; props: readonly Str[] }> = [
	{ label: 'Dimensions', props: ['width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'box-sizing'] },
	{ label: 'Layout', props: ['display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'float', 'clear', 'overflow', 'overflow-x', 'overflow-y', 'visibility'] },
	{ label: 'Flexbox', props: ['flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis', 'align-items', 'align-self', 'align-content', 'justify-content', 'justify-items', 'justify-self', 'gap', 'row-gap', 'column-gap', 'order'] },
	{ label: 'Grid', props: ['grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row', 'grid-auto-flow', 'grid-auto-columns', 'grid-auto-rows', 'place-items', 'place-content', 'place-self'] },
	{ label: 'Spacing', props: ['margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left'] },
	{ label: 'Typography', props: ['font-family', 'font-size', 'font-weight', 'font-style', 'font-variant', 'line-height', 'letter-spacing', 'word-spacing', 'text-align', 'text-decoration', 'text-transform', 'text-indent', 'text-overflow', 'text-wrap', 'white-space', 'word-break', 'overflow-wrap', 'color', 'text-shadow'] },
	{ label: 'Border', props: ['border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius', 'outline-width', 'outline-style', 'outline-color', 'outline-offset'] },
	{ label: 'Background', props: ['background-color', 'background-image', 'background-size', 'background-position', 'background-repeat', 'background-attachment', 'background-clip', 'background-origin'] },
	{ label: 'Effects', props: ['opacity', 'box-shadow', 'filter', 'backdrop-filter', 'mix-blend-mode', 'isolation', 'clip-path', 'mask-image'] },
	{ label: 'Transform', props: ['transform', 'transform-origin', 'perspective', 'perspective-origin'] },
	{ label: 'Transition & Animation', props: ['transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay', 'animation-name', 'animation-duration', 'animation-timing-function', 'animation-delay', 'animation-iteration-count', 'animation-direction'] },
	{ label: 'Interaction', props: ['cursor', 'pointer-events', 'user-select', 'touch-action', 'scroll-behavior', 'scroll-snap-type', 'scroll-snap-align', 'resize'] },
	{ label: 'Container', props: ['container-type', 'container-name', 'contain', 'content-visibility'] },
];

/**
 * Collect box model data for the hovered element relative to the preview container.
 *
 * @param el - The hovered DOM element
 * @param container - The preview container div
 * @returns Box model data or null
 */
function collectBoxModel(el: Element, container: HTMLDivElement): typeof cardMeasureData[Str] {
	const cs: CSSStyleDeclaration = getComputedStyle(el);
	const elRect: DOMRect = el.getBoundingClientRect();
	const cRect: DOMRect = container.getBoundingClientRect();

	const pt: Num = Number.parseFloat(cs.paddingTop) || 0;
	const pr: Num = Number.parseFloat(cs.paddingRight) || 0;
	const pb: Num = Number.parseFloat(cs.paddingBottom) || 0;
	const pl: Num = Number.parseFloat(cs.paddingLeft) || 0;

	const bt: Num = Number.parseFloat(cs.borderTopWidth) || 0;
	const br: Num = Number.parseFloat(cs.borderRightWidth) || 0;
	const bb: Num = Number.parseFloat(cs.borderBottomWidth) || 0;
	const bl: Num = Number.parseFloat(cs.borderLeftWidth) || 0;

	const mt: Num = Number.parseFloat(cs.marginTop) || 0;
	const mr: Num = Number.parseFloat(cs.marginRight) || 0;
	const mb: Num = Number.parseFloat(cs.marginBottom) || 0;
	const ml: Num = Number.parseFloat(cs.marginLeft) || 0;

	const x: Num = elRect.left - cRect.left + container.scrollLeft;
	const y: Num = elRect.top - cRect.top + container.scrollTop;

	return {
		content: { x: x + bl + pl, y: y + bt + pt, w: elRect.width - bl - br - pl - pr, h: elRect.height - bt - bb - pt - pb },
		padding: { top: pt, right: pr, bottom: pb, left: pl },
		border: { top: bt, right: br, bottom: bb, left: bl },
		margin: { top: mt, right: mr, bottom: mb, left: ml },
		width: elRect.width,
		height: elRect.height,
	};
}

/**
 * Collect computed CSS properties for the inspected element.
 *
 * @param el - The clicked DOM element
 * @returns Grouped computed styles
 */
function collectInspectData(el: Element): typeof cardInspectedEl[Str] {
	const cs: CSSStyleDeclaration = getComputedStyle(el);
	const rect: DOMRect = el.getBoundingClientRect();
	const styles: Record<Str, Record<Str, Str>> = {};

	for (const group of INSPECT_GROUPS) {
		const groupStyles: Record<Str, Str> = {};
		/** Default/empty values to skip — reduces noise in the panel. */
		const SKIP_VALS: ReadonlySet<Str> = new Set(['', 'none', 'normal', '0px', '0', 'auto', 'rgba(0, 0, 0, 0)', 'start', 'stretch', 'baseline', 'visible', 'static', 'content-box', 'ltr', 'separate', 'inline', 'repeat', 'padding-box', 'border-box', 'scroll']);
		for (const prop of group.props) {
			const val: Str = cs.getPropertyValue(prop);
			if (val && !SKIP_VALS.has(val)) {
				groupStyles[prop] = val;
			}
		}
		if (Object.keys(groupStyles).length > 0) {
			styles[group.label] = groupStyles;
		}
	}

	return {
		tag: el.tagName.toLowerCase(),
		classes: el.className && typeof el.className === 'string' ? el.className.split(/\s+/).slice(0, 20).join(' ') : '',
		id: el.id || '',
		rect: { width: Math.round(rect.width), height: Math.round(rect.height), top: Math.round(rect.top), left: Math.round(rect.left) },
		styles,
	};
}

/**
 * Handle mousemove in measure mode — update box model data for hovered element.
 *
 * @param e - Mouse event
 * @param key - Card key
 */
function handleMeasureMove(e: MouseEvent, key: Str): Void {
	if (!cardMeasureActive[key]) return;
	const container: HTMLDivElement | undefined = cardPreviewRefs[key];
	if (!container) return;
	const target: Element | null = document.elementFromPoint(e.clientX, e.clientY);
	if (!target || target === container || !container.contains(target)) {
		cardMeasureData[key] = null;
		return;
	}
	cardMeasureData[key] = collectBoxModel(target, container);
}

/**
 * Handle mouseleave in measure mode — clear box model data.
 *
 * @param key - Card key
 */
function handleMeasureLeave(key: Str): Void {
	cardMeasureData[key] = null;
}

/**
 * Handle click in inspect mode — capture element styles.
 *
 * @param e - Mouse event
 * @param key - Card key
 */
function handleInspectClick(e: MouseEvent, key: Str): Void {
	if (!cardInspectActive[key]) return;
	const container: HTMLDivElement | undefined = cardPreviewRefs[key];
	if (!container) return;
	const target: Element | null = document.elementFromPoint(e.clientX, e.clientY);
	if (!target || target === container || !container.contains(target)) return;
	e.preventDefault();
	e.stopPropagation();
	cardInspectedEl[key] = collectInspectData(target);
}

/**
 * Check if a card has an active color matrix simulation.
 *
 * @param key - Card key
 * @returns True if the card has a color vision deficiency simulation active
 */
function hasColorMatrixSim(key: Str): Bool {
	const sim: Str = cardSimulations[key] ?? 'none';
	return sim in COLOR_MATRICES;
}

/**
 * Collect all non-default settings for a card as label/value pairs.
 *
 * @param key - Card key
 * @returns Array of active settings (empty when all defaults)
 */
function getActiveSettings(key: Str): Array<{ label: Str; value: Str }> {
	const settings: Array<{ label: Str; value: Str }> = [];
	const sim: Str = cardSimulations[key] ?? 'none';
	if (sim !== 'none') {
		const simItem = COLOR_VISION_ITEMS.find((i) => i.id === sim) ?? VISION_ITEMS.find((i) => i.id === sim);
		settings.push({ label: 'Accessibility', value: simItem?.label ?? sim });
	}
	const zoom: Num = cardZoom[key] ?? 1;
	if (zoom !== 1) settings.push({ label: 'Zoom', value: getZoomLabel(key) });
	const grid: Str = cardGrids[key] ?? 'none';
	if (grid !== 'none') {
		const gridPreset = GRID_PRESETS.find((p) => p.id === grid);
		settings.push({ label: 'Grid', value: gridPreset?.label ?? grid });
	}
	const gridFill: Str = cardGridFills[key] ?? 'none';
	if (gridFill !== 'none') {
		const fillPreset = GRID_FILL_PRESETS.find((p) => p.id === gridFill);
		settings.push({ label: 'Grid Fill', value: fillPreset?.label ?? gridFill });
	}
	const orientation: Str = cardOrientations[key] ?? 'default';
	if (orientation !== 'default') {
		const orientPreset = ORIENTATION_PRESETS.find((p) => p.id === orientation);
		settings.push({ label: 'Orientation', value: orientPreset?.label ?? orientation });
	}
	const mode: Str = cardModes[key] ?? 'auto';
	if (mode !== 'auto') settings.push({ label: 'Mode', value: mode === 'dark' ? 'Dark' : 'Light' });
	const theme: Str = cardThemes[key] ?? '';
	if (theme) {
		const themePreset = THEME_PRESETS.find((p) => p.id === theme);
		settings.push({ label: 'Theme', value: themePreset?.label ?? theme });
	}
	const outline: Str = cardOutlines[key] ?? 'none';
	if (outline !== 'none') {
		const outlinePreset = OUTLINE_PRESETS.find((p) => p.id === outline);
		settings.push({ label: 'Outline', value: outlinePreset?.label ?? outline });
	}
	const bg: Str = cardBackgrounds[key] ?? 'default';
	if (bg !== 'default') {
		const bgPreset = BG_PRESETS.find((p) => p.id === bg);
		settings.push({ label: 'Background', value: bgPreset?.label ?? bg });
	}
	// Media query preferences
	for (const group of MEDIA_PREF_GROUPS) {
		const val: Str = getMediaPref(key, group.pref);
		if (val !== group.defaultValue) {
			const opt = group.options.find((o) => o.value === val);
			settings.push({ label: group.label, value: opt?.label ?? val });
		}
	}
	// Network simulation
	const netSim: Str = cardNetworkSim[key] ?? 'none';
	if (netSim !== 'none') {
		if (netSim === 'custom') {
			const delay: Num = cardCustomNetwork[key]?.delay ?? 200;
			settings.push({ label: 'Network', value: `${delay}ms latency` });
		} else {
			const netPreset = NETWORK_PRESETS.find((p) => p.id === netSim);
			settings.push({ label: 'Network', value: netPreset?.label ?? netSim });
		}
	}
	// Viewport
	const viewport: Str = cardViewports[key] ?? 'auto';
	if (viewport !== 'auto') {
		if (viewport === 'custom') {
			const dims = cardCustomViewports[key];
			if (dims) settings.push({ label: 'Viewport', value: `Custom (${dims.w} \u00D7 ${dims.h})` });
		} else {
			const vpPreset = VIEWPORT_PRESETS.find((p) => p.id === viewport);
			settings.push({ label: 'Viewport', value: vpPreset ? `${vpPreset.label} (${vpPreset.width} \u00D7 ${vpPreset.height})` : viewport });
		}
	}
	// Custom network
	const customNet = cardCustomNetwork[key];
	if ((cardNetworkSim[key] ?? 'none') === 'custom' && customNet) {
		// Replace preset entry with custom
		const netIdx: Num = settings.findIndex((s) => s.label === 'Network');
		if (netIdx >= 0) settings[netIdx] = { label: 'Network', value: `Custom (${customNet.delay}ms)` };
		else settings.push({ label: 'Network', value: `Custom (${customNet.delay}ms)` });
	}
	// Text direction
	const dir: Str = cardTextDir[key] ?? 'auto';
	if (dir !== 'auto') settings.push({ label: 'Direction', value: dir.toUpperCase() });
	// Font size
	const fontSize: Num = cardFontSize[key] ?? 0;
	if (fontSize > 0) settings.push({ label: 'Font Size', value: `${fontSize}px (${(fontSize / 16).toFixed(1)}x)` });
	// Dev tools
	if (cardDebugOutline[key]) settings.push({ label: 'Debug Outline', value: 'On' });
	if (cardMeasureActive[key]) settings.push({ label: 'Measure', value: 'On' });
	if (cardInspectActive[key]) settings.push({ label: 'Inspect', value: 'On' });
	if (cardConsoleOpen[key]) {
		const logCount: Num = (cardConsoleLogs[key] ?? []).length;
		settings.push({ label: 'Console', value: logCount > 0 ? `${logCount} entries` : 'Open' });
	}
	return settings;
}

/**
 * Check if a card has the tunnel vision simulation active.
 *
 * @param key - Card key
 * @returns True if tunnel vision is active
 */
function hasTunnelVision(key: Str): Bool {
	return cardSimulations[key] === 'tunnel-vision';
}

/**
 * Get a media query preference value for a card.
 *
 * @param key - Card key
 * @param pref - Media feature name (e.g. 'reduced-motion')
 * @returns Active value or the default for that preference
 */
function getMediaPref(key: Str, pref: Str): Str {
	const prefs: Record<Str, Str> | undefined = cardMediaPrefs[key];
	if (!prefs) {
		const group = MEDIA_PREF_GROUPS.find((g) => g.pref === pref);
		return group?.defaultValue ?? 'no-preference';
	}
	const group = MEDIA_PREF_GROUPS.find((g) => g.pref === pref);
	return prefs[pref] ?? group?.defaultValue ?? 'no-preference';
}

/**
 * Set a media query preference for a card.
 *
 * @param key - Card key
 * @param pref - Media feature name
 * @param value - New preference value
 */
function setMediaPref(key: Str, pref: Str, value: Str): Void {
	if (!cardMediaPrefs[key]) cardMediaPrefs[key] = {};
	cardMediaPrefs[key] = { ...cardMediaPrefs[key], [pref]: value };
}

/**
 * Build CSS class names for active media query preference emulations.
 *
 * @param key - Card key
 * @returns Space-separated class names or empty string
 */
function getMediaPrefClasses(key: Str): Str {
	const prefs: Record<Str, Str> | undefined = cardMediaPrefs[key];
	if (!prefs) return '';
	const classes: Str[] = [];
	if (prefs['reduced-motion'] === 'reduce') classes.push('lens-reduced-motion');
	if (prefs['contrast'] === 'more') classes.push('lens-contrast-more');
	if (prefs['contrast'] === 'less') classes.push('lens-contrast-less');
	if (prefs['reduced-transparency'] === 'reduce') classes.push('lens-reduced-transparency');
	if (prefs['forced-colors'] === 'active') classes.push('lens-forced-colors');
	return classes.join(' ');
}

/**
 * Check if any media query preferences are non-default for a card.
 *
 * @param key - Card key
 * @returns True if any preference is overridden
 */
function hasMediaPrefs(key: Str): Bool {
	const prefs: Record<Str, Str> | undefined = cardMediaPrefs[key];
	if (!prefs) return false;
	return MEDIA_PREF_GROUPS.some((g) => {
		const val: Str = prefs[g.pref] ?? g.defaultValue;
		return val !== g.defaultValue;
	});
}

/**
 * Set network simulation for a card. Triggers a loading overlay for the
 * preset's delay duration, then clears it. Offline is permanent.
 *
 * @param key - Card key
 * @param simId - Network preset ID ('none', 'fast-3g', 'slow-3g', 'offline')
 */
function setNetworkSim(key: Str, simId: Str): Void {
	cardNetworkSim[key] = simId;
	if (simId === 'custom') {
		const custom = cardCustomNetwork[key];
		const delay: Num = custom?.delay ?? 0;
		if (delay > 0) {
			cardNetworkLoading[key] = true;
			setTimeout((): void => {
				cardNetworkLoading[key] = false;
			}, delay);
		} else {
			cardNetworkLoading[key] = false;
		}
		return;
	}
	const preset = NETWORK_PRESETS.find((p) => p.id === simId);
	if (preset && preset.delay > 0) {
		cardNetworkLoading[key] = true;
		setTimeout((): void => {
			cardNetworkLoading[key] = false;
		}, preset.delay);
	} else if (simId === 'offline') {
		cardNetworkLoading[key] = true;
	} else {
		cardNetworkLoading[key] = false;
	}
}

/**
 * Set viewport constraint for a card.
 *
 * @param key - Card key
 * @param viewportId - Viewport preset ID or 'auto'
 */
function setViewport(key: Str, viewportId: Str): Void {
	cardViewports[key] = viewportId;
}

/**
 * Get the CSS style for the outer device frame wrapper.
 * Applies width and category-specific border-radius.
 *
 * @param key - Card key
 * @returns CSS style string or empty
 */
function getViewportFrameStyle(key: Str): Str {
	const preset = getViewportPreset(key);
	if (!preset) return '';
	return `width: ${preset.width}px; border-radius: ${getViewportRadius(preset.category)}`;
}

/**
 * Get the CSS style for the inner viewport content scroll area.
 * Applies fixed height so content scrolls within the device frame.
 *
 * @param key - Card key
 * @returns CSS style string or empty
 */
function getViewportContentStyle(key: Str): Str {
	const preset = getViewportPreset(key);
	if (!preset) return '';
	return `height: ${preset.height}px`;
}

/**
 * Check whether a card has an active (non-auto) viewport constraint.
 *
 * @param key - Card key
 * @returns True if a viewport preset is active
 */
function hasViewport(key: Str): Bool {
	return (cardViewports[key] ?? 'auto') !== 'auto';
}

/**
 * Get the active viewport preset for a card (or null if auto).
 *
 * @param key - Card key
 * @returns The active preset object or null
 */
function getViewportPreset(key: Str): { id: Str; label: Str; width: Num; height: Num; category: Str } | null {
	const id: Str = cardViewports[key] ?? 'auto';
	if (id === 'auto') return null;
	if (id === 'custom') {
		const dims = cardCustomViewports[key];
		if (!dims) return null;
		return { id: 'custom', label: 'Custom', width: dims.w, height: dims.h, category: 'Custom' };
	}
	return VIEWPORT_PRESETS.find((p) => p.id === id) ?? null;
}

/**
 * Get the border-radius CSS value appropriate for a viewport category.
 * Phones/watches get more rounded corners, desktops get subtle rounding.
 *
 * @param category - Device category string
 * @returns CSS border-radius value
 */
function getViewportRadius(category: Str): Str {
	switch (category) {
		case 'Watches': {
			return '50%';
		}
		case 'Phones':
		case 'Foldables': {
			return '2rem';
		}
		case 'Tablets':
		case 'Fire Tablets':
		case 'E-Readers':
		case 'Handhelds': {
			return '1rem';
		}
		case 'Smart Displays':
		case 'Smart Appliances': {
			return '0.75rem';
		}
		default: {
			return '0.5rem';
		}
	}
}

/**
 * Get the CSS class suffix for a viewport category's device chrome style.
 * Returns the modifier class name (e.g. 'lens-device-frame-phone') or empty.
 *
 * @param category - Device category string
 * @returns CSS class name or empty string
 */
function getViewportFrameClass(category: Str): Str {
	switch (category) {
		case 'Watches': {
			return 'lens-device-frame-watch';
		}
		case 'Phones':
		case 'Foldables': {
			return 'lens-device-frame-phone';
		}
		case 'Tablets':
		case 'Fire Tablets':
		case 'E-Readers': {
			return 'lens-device-frame-tablet';
		}
		case 'Handhelds': {
			return 'lens-device-frame-handheld';
		}
		case 'TV': {
			return 'lens-device-frame-tv';
		}
		case 'Laptop / Desktop':
		case 'Chromebooks': {
			return 'lens-device-frame-monitor';
		}
		case 'Automotive': {
			return 'lens-device-frame-auto';
		}
		default: {
			return '';
		}
	}
}

/**
 * Reset all per-card customizations back to defaults for a given card.
 * Deletes every per-card state entry so the card returns to its initial appearance.
 *
 * @param key - Card key to reset
 */
function resetCard(key: Str): Void {
	cardSimulations[key] = 'none';
	cardBackgrounds[key] = 'default';
	cardZoom[key] = 1;
	cardOutlines[key] = 'none';
	cardGrids[key] = 'none';
	cardGridSizes[key] = GRID_DEFAULT_SIZE;
	cardGridFills[key] = 'none';
	cardOrientations[key] = 'default';
	cardModes[key] = 'auto';
	cardThemes[key] = '';
	cardMediaPrefs[key] = {};
	cardNetworkSim[key] = 'none';
	cardNetworkLoading[key] = false;
	cardViewports[key] = 'auto';
	cardContentHeights[key] = 0;
	cardTextDir[key] = 'auto';
	cardFontSize[key] = 0;
	cardDebugOutline[key] = false;
	cardMeasureActive[key] = false;
	cardInspectActive[key] = false;
	cardInspectedEl[key] = null;
	cardMeasureData[key] = null;
	cardConsoleOpen[key] = false;
	cardConsoleLogs[key] = [];
	cardScreenBrowser[key] = '';
	cardScreenDevice[key] = '';
	cardScreenshots[key] = [];
	cardScreenCapturing[key] = false;
}

/* ---- Real Browser Screenshot Functions ---- */

/**
 * Fetch the Playwright device list from the screenshot API.
 * Cached after first call.
 */
async function fetchPlaywrightDevices(): Promise<void> {
	if (devicesLoaded) return;
	try {
		const res: Response = await fetch('/api/lens/screenshot/devices');
		if (res.ok) {
			const data: unknown = await res.json();
			if (Array.isArray(data)) {
				// API returns DeviceInfo[] — cast from parsed JSON
				playwrightDevices = data as PlaywrightDevice[];
			}
		}
	} catch {
		/* Device list fetch failed — UI will show empty list */
	}
	devicesLoaded = true;
}

/**
 * Infer a device category from its Playwright name.
 *
 * @param name - Playwright device name
 * @returns Category label for grouping
 */
function inferDeviceCategory(name: Str): Str {
	if (name.includes('iPhone')) return 'Phones' as Str;
	if (name.includes('iPad')) return 'Tablets' as Str;
	if (name.includes('Pixel') || name.includes('Galaxy') || name.includes('Moto'))
		return 'Phones' as Str;
	if (name.includes('Galaxy Tab')) return 'Tablets' as Str;
	if (name.includes('Kindle') || name.includes('Nook')) return 'E-Readers' as Str;
	if (name.includes('Blackberry') || name.includes('Nokia') || name.includes('LG'))
		return 'Phones' as Str;
	if (name.includes('Desktop')) return 'Desktop' as Str;
	return 'Other' as Str;
}

/** Filtered Playwright devices based on search query. */
const filteredPlaywrightDevices: PlaywrightDevice[] = $derived.by((): PlaywrightDevice[] => {
	if (!browserSearchQuery) return playwrightDevices;
	const q: Str = browserSearchQuery.toLowerCase() as Str;
	return playwrightDevices.filter(
		(d: PlaywrightDevice): boolean => d.name.toLowerCase().includes(q),
	);
});

/** Unique categories from filtered devices. */
const filteredDeviceCategories: Str[] = $derived.by((): Str[] => {
	const cats: Set<Str> = new Set();
	for (const d of filteredPlaywrightDevices) {
		cats.add(inferDeviceCategory(d.name));
	}
	return [...cats] as Str[];
});

/**
 * Capture a real browser screenshot for a card.
 *
 * @param key - Card key
 * @param variantKey - Variant prop name (for isolation URL)
 * @param option - Variant option value
 */
async function captureScreenshot(key: Str, variantKey: Str, option: Str): Promise<void> {
	if (!componentName) return;
	cardScreenCapturing[key] = true;

	const browser: Str = cardScreenBrowser[key] || ('chromium' as Str);
	const device: Str = cardScreenDevice[key] || ('' as Str);

	/* Build the screenshot API URL */
	const params: URLSearchParams = new URLSearchParams();
	params.set('component', componentName);
	params.set('browser', browser);
	if (device) params.set('device', device);

	/* Pass current card styles */
	const styles: Record<Str, Str> = collectCardStyles(key);
	if (Object.keys(styles).length > 0) {
		params.set('s', btoa(JSON.stringify(styles)));
	}
	if (variantKey) params.set('variant', variantKey);
	if (option) params.set('option', option);

	/* Media emulation from card settings */
	const mode: Str = cardModes[key] ?? 'auto';
	if (mode === 'dark' || mode === 'light') {
		params.set('colorScheme', mode);
	}

	/* Pass viewport dimensions to Playwright context */
	const vp: Str = cardViewports[key] ?? 'auto';
	if (vp !== 'auto' && !device) {
		if (vp === 'custom') {
			const dims = cardCustomViewports[key];
			if (dims) {
				params.set('width', String(dims.w));
				params.set('height', String(dims.h));
			}
		} else {
			const preset = VIEWPORT_PRESETS.find((p) => p.id === vp);
			if (preset) {
				params.set('width', String(preset.width));
				params.set('height', String(preset.height));
			}
		}
	}

	/* Pass media preferences to Playwright context */
	const prefs: Record<Str, Str> | undefined = cardMediaPrefs[key];
	if (prefs) {
		if (prefs['reduced-motion'] === 'reduce') {
			params.set('reducedMotion', 'reduce');
		}
		if (prefs['forced-colors'] === 'active') {
			params.set('forcedColors', 'active');
		}
	}

	/* Pass network throttling delay (ms) to Playwright route interceptor */
	const netSim: Str = cardNetworkSim[key] ?? 'none';
	if (netSim !== 'none') {
		if (netSim === 'custom') {
			const custom = cardCustomNetwork[key];
			if (custom) params.set('networkThrottle', String(custom.delay));
		} else {
			const preset = NETWORK_PRESETS.find((p) => p.id === netSim);
			if (preset) params.set('networkThrottle', String(preset.delay));
		}
	}

	try {
		const res: Response = await fetch(`/api/lens/screenshot?${params.toString()}`);
		if (!res.ok) {
			const errBody: unknown = await res.json().catch(() => ({}));
			const errMsg: Str = (
				typeof errBody === 'object' && errBody !== null && 'error' in errBody
					? String((errBody as Record<Str, unknown>).error)
					: 'Screenshot failed'
			) as Str;
			log.warn(`Screenshot capture failed: ${errMsg}`);
			return;
		}

		/* Parse JSON response (image + console + perf) */
		const body: Record<Str, unknown> = (await res.json()) as Record<Str, unknown>;
		const base64Image: Str = (body.image ?? '') as Str;
		if (!base64Image) {
			log.warn('Screenshot API returned no image data');
			return;
		}

		/* Decode base64 → ArrayBuffer → blob → object URL */
		const binaryStr: Str = atob(base64Image) as Str;
		const buf: ArrayBuffer = new ArrayBuffer(binaryStr.length);
		const view: Uint8Array = new Uint8Array(buf);
		for (let i: Num = 0 as Num; i < binaryStr.length; i++) {
			view[i] = binaryStr.codePointAt(i) ?? 0;
		}
		const blob: Blob = new Blob([buf], { type: 'image/png' });
		const imageUrl: Str = URL.createObjectURL(blob) as Str;

		/* Extract console logs */
		const rawLogs: unknown[] = Array.isArray(body.consoleLogs) ? body.consoleLogs : [];
		const consoleLogs: ScreenshotConsoleEntry[] = rawLogs.map(
			(entry: unknown): ScreenshotConsoleEntry => {
				const e: Record<Str, unknown> = entry as Record<Str, unknown>;
				return { level: (e.level ?? 'log') as Str, text: (e.text ?? '') as Str };
			},
		);

		/* Extract performance timing */
		const rawPerf: Record<Str, unknown> = (
			typeof body.performance === 'object' && body.performance !== null ? body.performance : {}
		) as Record<Str, unknown>;
		const perfData: Partial<ScreenshotPerfData> = {};
		for (const k of [
			'domContentLoaded',
			'load',
			'domInteractive',
			'responseEnd',
			'firstPaint',
			'firstContentfulPaint',
		]) {
			if (typeof rawPerf[k] === 'number') {
				(perfData as Record<Str, Num>)[k] = rawPerf[k] as Num;
			}
		}

		/* Look up device OS from cached device list */
		const matchedDevice: PlaywrightDevice | undefined = playwrightDevices.find(
			(d: PlaywrightDevice): boolean => d.name === device,
		);

		const capture: ScreenshotCapture = {
			source: 'playwright',
			browser,
			browserDisplayName: ((body.browserDisplayName as Str) ?? browser) as Str,
			browserVersion: ((body.browserVersion as Str) ?? '') as Str,
			device: device || ('custom' as Str),
			deviceOS: (matchedDevice?.os ?? '') as Str,
			imageUrl,
			timestamp: Date.now() as Num,
			consoleLogs,
			performance: perfData,
		};

		const existing: ScreenshotCapture[] = cardScreenshots[key] ?? [];
		cardScreenshots[key] = [...existing, capture];
	} catch (error: unknown) {
		const msg: Str = (
			error instanceof Error ? error.message : 'Screenshot request failed'
		) as Str;
		log.warn(`Screenshot capture error: ${msg}`);
	} finally {
		cardScreenCapturing[key] = false;
	}
}

/**
 * Remove a screenshot capture and revoke its object URL.
 *
 * @param key - Card key
 * @param index - Index in the captures array
 */
function removeScreenshot(key: Str, index: Num): Void {
	const captures: ScreenshotCapture[] = cardScreenshots[key] ?? [];
	const removed: ScreenshotCapture | undefined = captures[index];
	if (removed) URL.revokeObjectURL(removed.imageUrl);
	cardScreenshots[key] = captures.filter((_: ScreenshotCapture, i: Num): boolean => i !== index);
}

/**
 * Get all card keys for the current variant grid.
 *
 * @returns Array of card key strings
 */
function getAllCardKeys(): Str[] {
	const variants = meta?.variants ?? [];
	if (variants.length === 0) return ['default'];
	const keys: Str[] = [];
	for (const v of variants) {
		if (!v.key) continue;
		for (const opt of v.options) {
			keys.push(`${v.key}:${opt}`);
		}
	}
	return keys;
}

/**
 * Copy all per-card settings from a source card to every other card.
 *
 * @param sourceKey - Card key to copy settings from
 */
function applySettingsToAll(sourceKey: Str): Void {
	const keys: Str[] = getAllCardKeys();
	for (const key of keys) {
		if (key === sourceKey) continue;
		cardSimulations[key] = cardSimulations[sourceKey] ?? 'none';
		cardBackgrounds[key] = cardBackgrounds[sourceKey] ?? 'default';
		cardZoom[key] = cardZoom[sourceKey] ?? 1;
		cardOutlines[key] = cardOutlines[sourceKey] ?? 'none';
		cardGrids[key] = cardGrids[sourceKey] ?? 'none';
		cardGridSizes[key] = cardGridSizes[sourceKey] ?? GRID_DEFAULT_SIZE;
		cardGridFills[key] = cardGridFills[sourceKey] ?? 'none';
		cardOrientations[key] = cardOrientations[sourceKey] ?? 'default';
		cardModes[key] = cardModes[sourceKey] ?? 'auto';
		cardThemes[key] = cardThemes[sourceKey] ?? '';
		cardMediaPrefs[key] = { ...cardMediaPrefs[sourceKey] };
		cardNetworkSim[key] = cardNetworkSim[sourceKey] ?? 'none';
		cardNetworkLoading[key] = false;
		cardViewports[key] = cardViewports[sourceKey] ?? 'auto';
		if (cardCustomViewports[sourceKey]) {
			cardCustomViewports[key] = { ...cardCustomViewports[sourceKey] };
		}
		if (cardCustomNetwork[sourceKey]) {
			cardCustomNetwork[key] = { ...cardCustomNetwork[sourceKey] };
		}
		cardTextDir[key] = cardTextDir[sourceKey] ?? 'auto';
		cardFontSize[key] = cardFontSize[sourceKey] ?? 0;
		cardDebugOutline[key] = cardDebugOutline[sourceKey] ?? false;
		cardMeasureActive[key] = cardMeasureActive[sourceKey] ?? false;
		cardInspectActive[key] = cardInspectActive[sourceKey] ?? false;
		cardConsoleOpen[key] = cardConsoleOpen[sourceKey] ?? false;
	}
}

/**
 * Handle export action for a card preview element.
 *
 * @param key - Card identifier for DOM ref lookup
 * @param formatId - Export format identifier (png, jpeg, svg, webp, copy-image, copy-html)
 */
async function handleExport(key: Str, formatId: Str): Promise<void> {
	const el: HTMLDivElement | undefined = cardPreviewRefs[key];
	if (!el) return;
	exportInProgress = formatId;
	const filename: Str = componentName ?? tagName ?? 'component';
	if (formatId === 'png') await exportPng(el, filename);
	else if (formatId === 'jpeg') await exportJpeg(el, filename);
	else if (formatId === 'svg') await exportSvg(el, filename);
	else if (formatId === 'webp') await exportWebp(el, filename);
	else if (formatId === 'html') downloadHtml(el, filename);
	else if (formatId === 'copy-image') await copyImageToClipboard(el);
	else if (formatId === 'copy-html') await copyHtml(el);
	else if (formatId === 'copy-svelte') {
		const snippet: Str = codeText ?? codeSnippet('', '');
		if (snippet) await navigator.clipboard.writeText(snippet);
	}
	else if (formatId === 'copy-data-uri') await copyDataUri(el);
	else if (formatId === 'standalone-html' && componentName) {
		const mode: Str = (cardModes[key] ?? 'auto') as Str;
		const isDark: Bool = mode === 'dark' || (mode === 'auto' && pageIsDark);
		const activeTheme: Str = (cardThemes[key] ?? '') as Str;
		await downloadStandaloneHtml(componentName, baseProps, label, isDark, activeTheme);
	}
	exportInProgress = '';
	exportFeedback = formatId;
	setTimeout((): Void => {
		exportFeedback = '';
		cardDropdownOpen[key] = false;
	}, 1200);
}

/**
 * Generate a code snippet for a variant option or default usage.
 *
 * @param variantKey - The variant prop name (empty for default)
 * @param option - The option value (empty for default)
 * @returns A Svelte code snippet string
 */
function codeSnippet(variantKey: Str, option: Str): Str {
	if (!tagName) return '';
	if (!variantKey) return `<${tagName}>${label}</${tagName}>`;
	// Dotted key: show as nested prop syntax
	if (variantKey.includes('.')) {
		const [parent, child]: Str[] = variantKey.split('.');
		return `<${tagName} ${parent}={{ ${child}: '${option}' }}>${label}</${tagName}>`;
	}
	return `<${tagName} ${variantKey}="${option}">${label}</${tagName}>`;
}

/**
 * Generate a sensible default value for a TypeField based on its type string.
 *
 * Used to seed required sibling fields when building dotted variant props
 * so nested schemas pass safeParse validation.
 *
 * @param type - The TypeScript type string (e.g. `Str`, `Bool`, `Str[]`)
 * @param accepts - The accepts hint (e.g. `text`, `true, false`, `display, form, ...`)
 * @returns A placeholder value matching the type
 */
function defaultForType(type: Str, accepts: Str): unknown {
	if (type === 'Bool' || type === 'boolean') return false;
	if (type === 'Num' || type === 'number') return 0;
	if (type.endsWith('[]')) return ['example'];
	// Pick first accepted value if available
	if (accepts && accepts !== '—' && accepts.includes(', ')) {
		const [first]: Str[] = accepts.split(', ');
		if (first) return first;
	}
	return 'example';
}

/**
 * Build variant props object, handling dotted keys for nested object props.
 *
 * For flat keys like `variant`, returns `{ variant: option }`.
 * For dotted keys like `meta.category`, merges with the base prop:
 * `{ meta: { ...baseProps.meta, category: option } }`.
 *
 * @param variantName - The variant key (may contain `.`)
 * @param option - The option value string
 * @param coerceHint - Optional coercion hint ('array' splits comma-separated values into arrays)
 * @returns Props record to spread onto the component
 */
function buildVariantProps(variantName: Str, option: Str, coerceHint?: Str): Record<Str, unknown> {
	// Coerce option string to correct type
	let coerced: unknown = option;
	if (option === 'true' || option === 'false') {
		coerced = option === 'true';
	} else if (coerceHint === 'array') {
		// Array coercion — try JSON parse first (for complex objects from @values),
		// then fall back to comma-separated string splitting
		try {
			const parsed: unknown = JSON.parse(option);
			if (Array.isArray(parsed)) {
				coerced = parsed;
			} else {
				coerced = [parsed];
			}
		} catch {
			/* not JSON — use comma splitting */
			coerced = option.split(', ').map((s: Str): Str => s.trim());
		}
	} else if (!Number.isNaN(Number(option)) && option !== '') {
		coerced = Number(option);
	}

	// Dotted key: nested object prop
	if (variantName.includes('.')) {
		const dotIdx: Num = variantName.indexOf('.');
		const parent: Str = variantName.slice(0, dotIdx);
		const child: Str = variantName.slice(dotIdx + 1);

		// Record-value coercion: modify the child field within each Record entry
		if (coerceHint === 'record-value') {
			const existing: unknown = baseProps[parent];
			if (typeof existing === 'object' && existing !== null) {
				// Clone the Record and update the child field in every value
				const cloned: Record<Str, unknown> = {};
				for (const [k, v] of Object.entries(existing as Record<Str, unknown>)) {
					if (typeof v === 'object' && v !== null) {
						cloned[k] = { ...(v as Record<Str, unknown>), [child]: coerced };
					} else {
						cloned[k] = v;
					}
				}
				return { [parent]: cloned };
			}
			// No base Record — construct a single-entry Record with the value
			return { [parent]: { example: { [child]: coerced } } };
		}

		const existing: unknown = baseProps[parent];
		let parentObj: Record<Str, unknown>;
		if (typeof existing === 'object' && existing !== null) {
			parentObj = { ...(existing as Record<Str, unknown>) };
		} else {
			// No base value — seed required sibling fields from typeFields metadata
			// so nested schemas (e.g. LensMetaSchema) pass safeParse validation
			parentObj = {};
			const parentProp: PropMeta | undefined = propsMeta.find(
				(p: PropMeta): boolean => p.name === parent,
			);
			if (parentProp?.typeFields) {
				for (const tf of parentProp.typeFields) {
					if (tf.required && tf.field !== child) {
						parentObj[tf.field] = defaultForType(tf.type, tf.accepts);
					}
				}
			}
		}
		parentObj[child] = coerced;
		return { [parent]: parentObj };
	}

	return { [variantName]: coerced };
}

/**
 * Check if an option name suggests icon-only rendering.
 *
 * @param option - Option name
 * @returns True if the option name contains 'icon'
 */
function isIconOption(option: Str): boolean {
	return option.includes('icon');
}
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') exitFullscreen(); }} />

{#snippet toolbarButton(Icon: Component, tooltipText: Str, onclick: () => void, disabled: Bool)}
	<Tooltip.Provider>
		<Tooltip.Root delayDuration={300}>
			<Tooltip.Trigger>
				{#snippet child({ props: tipProps })}
					<button
						type="button"
						{...tipProps}
						class={cn(
							'inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors',
							disabled ? 'cursor-not-allowed opacity-30' : 'hover:bg-muted hover:text-foreground',
						)}
						onclick={disabled ? undefined : onclick}
						disabled={disabled}
						tabindex={disabled ? -1 : undefined}
					>
						<Icon class="size-3.5" aria-hidden="true" />
					</button>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content side="top" sideOffset={4}>
				{tooltipText}
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
{/snippet}

{#snippet toolbarToggle(Icon: Component, tooltipText: Str, active: Bool, onclick: () => void)}
	<Tooltip.Provider>
		<Tooltip.Root delayDuration={300}>
			<Tooltip.Trigger>
				{#snippet child({ props: tipProps })}
					<button
						type="button"
						{...tipProps}
						class={cn(
							'inline-flex size-7 items-center justify-center rounded-md transition-colors',
							active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
						)}
						onclick={onclick}
						aria-pressed={active}
					>
						<Icon class="size-3.5" aria-hidden="true" />
					</button>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content side="top" sideOffset={4}>
				{tooltipText}
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
{/snippet}

{#snippet card(cardLabel: Str, cardKey: Str, snippet: Str, extraProps: Record<Str, unknown>, useIcon: Bool, variantKey: Str, variantOption: Str)}
	{@const activeSim: Str = cardSimulations[cardKey] ?? 'none'}
	{@const activeBg: Str = cardBackgrounds[cardKey] ?? 'default'}
	{@const activeZoom: Num = cardZoom[cardKey] ?? 1}
	{@const activeOutline: Str = cardOutlines[cardKey] ?? 'none'}
	{@const activeGrid: Str = cardGrids[cardKey] ?? 'none'}
	{@const activeOrientation: Str = cardOrientations[cardKey] ?? 'default'}
	{@const activeMode: 'auto' | 'light' | 'dark' = (cardModes[cardKey] as 'auto' | 'light' | 'dark' | undefined) ?? 'auto'}
	{@const activeTheme: Str = cardThemes[cardKey] ?? ''}
	{@const activeSettings = getActiveSettings(cardKey)}
	{@const isFullscreen: Bool = Boolean(cardFullscreen[cardKey])}
	{#if isFullscreen}
		<div class="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" role="presentation" onclick={exitFullscreen}></div>
	{/if}
	<div class={cn('overflow-hidden rounded-md border bg-background', isFullscreen && 'fixed inset-4 z-50 flex flex-col')}>
		<div class="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
			<div class="flex items-center gap-2">
				<code class="text-sm text-muted-foreground">{cardLabel}</code>
				{#if activeSettings.length > 0}
					<Popover.Root>
						<Popover.Trigger>
							<button
								type="button"
								class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-muted-foreground/60 transition-colors hover:text-muted-foreground"
								aria-label="{activeSettings.length} active settings"
							>
								<Settings2 class="size-3.5" aria-hidden="true" />
								<span class="text-[10px] font-medium">{activeSettings.length}</span>
							</button>
						</Popover.Trigger>
						<Popover.Content side="bottom" align="start" class="w-64 p-0">
							<div class="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
								<h4 class="text-xs font-semibold">Active Settings</h4>
								<span class="text-[10px] text-muted-foreground">{activeSettings.length} modified</span>
							</div>
							<div class="space-y-0">
								{#each activeSettings as setting (setting.label)}
									<div class="flex items-center justify-between gap-4 border-b px-3 py-1.5 last:border-b-0">
										<span class="text-[11px] text-muted-foreground">{setting.label}</span>
										<span class="font-mono text-[11px] font-medium">{setting.value}</span>
									</div>
								{/each}
							</div>
						</Popover.Content>
					</Popover.Root>
				{/if}
			</div>
			<div class="flex items-center gap-1">
				{#if activeSettings.length > 0}
					{@render toolbarButton(RotateCcw, 'Reset to defaults', () => resetCard(cardKey), false)}
				{/if}
				{@render toolbarButton(ZoomOut, 'Zoom out', () => zoomOut(cardKey), activeZoom <= ZOOM_MIN)}
				{#if activeZoom !== 1}
					<span class="px-0.5 font-mono text-[10px] font-medium text-muted-foreground">{Math.round(activeZoom * 100)}%</span>
				{/if}
				{@render toolbarButton(ZoomIn, 'Zoom in', () => zoomIn(cardKey), activeZoom >= ZOOM_MAX)}
				{@render toolbarButton(Maximize, 'Fit (100%)', () => zoomFit(cardKey), activeZoom === 1)}
				<span class="mx-0.5 h-4 w-px bg-border" aria-hidden="true"></span>
				<Popover.Root>
					<Popover.Trigger>
						<button
							type="button"
							class={cn(
								'inline-flex size-7 items-center justify-center rounded-md transition-colors',
								(cardDebugOutline[cardKey] ?? false) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
							)}
							onclick={() => { cardDebugOutline[cardKey] = !cardDebugOutline[cardKey]; }}
							aria-pressed={cardDebugOutline[cardKey] ?? false}
							aria-label="Debug outlines"
						>
							<ScanLine class="size-3.5" aria-hidden="true" />
						</button>
					</Popover.Trigger>
					<Popover.Content side="bottom" align="start" class="w-72 p-0">
						<div class="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
							<h4 class="text-xs font-semibold">Debug Outline Legend</h4>
							<span class="text-[10px] text-muted-foreground">{(cardDebugOutline[cardKey] ?? false) ? 'Active' : 'Inactive'}</span>
						</div>
						<div class="space-y-0">
							{#each DEBUG_OUTLINE_LEGEND as entry (entry.label)}
								<div class="flex items-center gap-2.5 border-b px-3 py-1.5 last:border-b-0">
									<span class="inline-block size-2.5 shrink-0 rounded-sm" style="background:{entry.color};outline:1px solid {entry.color}"></span>
									<div class="min-w-0">
										<span class="text-[11px] font-medium">{entry.label}</span>
										<span class="ml-1 text-[10px] text-muted-foreground">{entry.elements}</span>
									</div>
								</div>
							{/each}
						</div>
					</Popover.Content>
				</Popover.Root>
				{@render toolbarToggle(Ruler, 'Measure', cardMeasureActive[cardKey] ?? false, () => { cardMeasureActive[cardKey] = !cardMeasureActive[cardKey]; if (!cardMeasureActive[cardKey]) cardMeasureData[cardKey] = null; })}
				{@render toolbarToggle(MousePointerClick, 'Inspect', cardInspectActive[cardKey] ?? false, () => { cardInspectActive[cardKey] = !cardInspectActive[cardKey]; if (!cardInspectActive[cardKey]) cardInspectedEl[cardKey] = null; })}
				<span class="mx-0.5 h-4 w-px bg-border" aria-hidden="true"></span>
				{@render toolbarButton(isFullscreen ? Minimize2 : Maximize2, isFullscreen ? 'Exit fullscreen' : 'Fullscreen', () => toggleFullscreen(cardKey), false)}
				{#if cardStats[cardKey]}
					{@const stats: LensStatsData = cardStats[cardKey]}
					<Popover.Root>
						<Popover.Trigger>
							<button
								type="button"
								class={cn(
									'inline-flex size-7 items-center justify-center rounded-md transition-colors hover:bg-muted',
									budgetColor(stats.overallHealth),
								)}
								aria-label="Performance statistics"
							>
								<Activity class="size-3.5" aria-hidden="true" />
							</button>
						</Popover.Trigger>
						<Popover.Content side="bottom" align="end" class="w-96 max-h-[28rem] overflow-y-auto p-0">
							<!-- Header -->
							<div class="flex items-start justify-between border-b bg-muted/30 px-3 py-2">
								<div>
									<h4 class="text-xs font-semibold">Performance Statistics</h4>
									<p class="text-[10px] text-muted-foreground">Measured at mount time. Hover metrics for details.</p>
								</div>
								<div class="flex items-center gap-0.5">
									<Tooltip.Provider>
										<Tooltip.Root delayDuration={300} open={statsExportCopied === 'json' ? true : undefined}>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<button
														{...tipProps}
														type="button"
														class="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
														onclick={() => copyStatsToClipboard(stats, tagName ?? componentName ?? 'Component', 'json')}
														aria-label="Copy as JSON"
													>
														{#if statsExportCopied === 'json'}
															<span in:fade={{ duration: 150 }}>
																<Check class="size-3 text-green-500" aria-hidden="true" />
															</span>
														{:else}
															<span in:fade={{ duration: 150 }}>
																<ClipboardCopy class="size-3" aria-hidden="true" />
															</span>
														{/if}
													</button>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="bottom" sideOffset={4}>
												{statsExportCopied === 'json' ? 'Copied!' : 'Copy as JSON'}
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>
									<Tooltip.Provider>
										<Tooltip.Root delayDuration={300} open={statsExportCopied === 'markdown' ? true : undefined}>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<button
														{...tipProps}
														type="button"
														class="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
														onclick={() => copyStatsToClipboard(stats, tagName ?? componentName ?? 'Component', 'markdown')}
														aria-label="Copy as Markdown"
													>
														{#if statsExportCopied === 'markdown'}
															<span in:fade={{ duration: 150 }}>
																<Check class="size-3 text-green-500" aria-hidden="true" />
															</span>
														{:else}
															<span in:fade={{ duration: 150 }}>
																<FileCode class="size-3" aria-hidden="true" />
															</span>
														{/if}
													</button>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="bottom" sideOffset={4}>
												{statsExportCopied === 'markdown' ? 'Copied!' : 'Copy as Markdown'}
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>
									<Tooltip.Provider>
										<Tooltip.Root delayDuration={300}>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<button
														{...tipProps}
														type="button"
														class="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
														onclick={() => downloadStatsJson(stats, tagName ?? componentName ?? 'Component')}
														aria-label="Download JSON"
													>
														<Download class="size-3" aria-hidden="true" />
													</button>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="bottom" sideOffset={4}>
												Download JSON
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>
								</div>
								<!-- Aria-live region for export copy feedback -->
								<span class="sr-only" role="status" aria-live="polite" aria-atomic="true">
									{#if statsExportCopied === 'json'}Copied as JSON!{:else if statsExportCopied === 'markdown'}Copied as Markdown!{/if}
								</span>
							</div>

							<!-- Report — budget metrics with tooltip explanations -->
							<div class="px-3 py-2">
								<button type="button" class="flex w-full items-center gap-1" aria-expanded={statsReportOpen} aria-controls="stats-report" onclick={() => statsReportOpen = !statsReportOpen}>
									{#if statsReportOpen}<ChevronDown class="size-3 text-muted-foreground" />{:else}<ChevronRight class="size-3 text-muted-foreground" />{/if}
									<h4 class="text-xs font-semibold">Report</h4>
								</button>
								{#if statsReportOpen}<div id="stats-report">
								<p class="mb-1 mt-0.5 text-[10px] text-muted-foreground">Performance and accessibility budget metrics. Hover for details.</p>
								<div class="space-y-0 divide-y text-xs">
									{#each stats.budgets as budget (budget.label)}
										{@const hasDetails = budget.level !== 'green' && (
											budget.label === 'Console Errors' && stats.consoleMessages.length > 0
											|| budget.label === 'Unlabeled Interactive' && stats.a11y.unlabeled.length > 0
											|| budget.label === 'Focus Order' && stats.a11y.focusOrderIssues.length > 0
											|| budget.label === 'Contrast' && stats.a11y.contrastIssues.length > 0
											|| budget.label === 'Images Alt' && stats.a11y.imagesWithoutAlt > 0
											|| budget.label === 'ARIA Usage' && stats.a11y.ariaIssues.length > 0
											|| budget.label === 'SVG Labels' && stats.a11y.svgsWithoutLabel > 0
											|| budget.label === 'Motion Safety'
											|| budget.label === 'A11y Labels' && stats.a11y.unlabeled.length > 0
											|| budget.label === 'Headings' && stats.a11y.headings.length > 0
										)}
										<div>
											<Tooltip.Provider>
												<Tooltip.Root delayDuration={200}>
													<Tooltip.Trigger>
														{#snippet child({ props: tipProps })}
															<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
															<div
																{...tipProps}
																class={cn(
																	'flex items-center justify-between px-3 py-1.5 transition-colors hover:bg-muted/50',
																	hasDetails ? 'cursor-pointer' : 'cursor-help',
																)}
																role={hasDetails ? 'button' : undefined}
																tabindex={hasDetails ? 0 : undefined}
																onclick={hasDetails ? ((): Void => { budgetExpanded[budget.label] = !budgetExpanded[budget.label]; }) : undefined}
																onkeydown={hasDetails ? ((e: KeyboardEvent): Void => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); budgetExpanded[budget.label] = !budgetExpanded[budget.label]; } }) : undefined}
															>
																<div class="flex items-center gap-2">
																	{#if hasDetails}
																		{#if budgetExpanded[budget.label]}<ChevronDown class="size-2.5 text-muted-foreground/60" />{:else}<ChevronRight class="size-2.5 text-muted-foreground/60" />{/if}
																	{/if}
																	<span class={cn('text-base leading-none', budgetColor(budget.level))}>●</span>
																	<span class="text-muted-foreground">{budget.label}</span>
																</div>
																<span class="font-mono font-medium">{budget.value}</span>
															</div>
														{/snippet}
													</Tooltip.Trigger>
													<Tooltip.Content side="left" sideOffset={8} class="max-w-[16rem] p-0">
														<div class="space-y-1 px-3 py-2">
															<p class="text-xs text-primary-foreground">{budget.description}</p>
															<p class="font-mono text-[10px] text-primary-foreground/70">{budget.thresholds}</p>
														</div>
													</Tooltip.Content>
												</Tooltip.Root>
											</Tooltip.Provider>

											<!-- Expandable detail panel -->
											{#if hasDetails && budgetExpanded[budget.label]}
												<div class="border-t border-dashed bg-muted/20 px-4 py-1.5 text-[10px]">
													{#if budget.label === 'Console Errors'}
														{#each stats.consoleMessages.slice(0, 5) as msg (msg.message)}
															<div class="flex items-start gap-1.5 truncate">
																<span class={msg.level === 'error' ? 'text-red-500' : 'text-amber-500'}>
																	{msg.level === 'error' ? '✕' : '⚠'}
																</span>
																<span class="truncate font-mono text-muted-foreground">{msg.message}</span>
															</div>
														{/each}
														{#if stats.consoleMessages.length > 5}
															<span class="text-muted-foreground/50">…and {stats.consoleMessages.length - 5} more</span>
														{/if}

													{:else if budget.label === 'Unlabeled Interactive' || budget.label === 'A11y Labels'}
														{#each stats.a11y.unlabeled.slice(0, 5) as el (el.tag + el.classes)}
															<div class="truncate font-mono text-red-400">
																&lt;{el.tag}{el.classes ? ` class="${el.classes}"` : ''}&gt;
																{#if el.parentContext}
																	<span class="text-red-400/60"> in {el.parentContext}</span>
																{/if}
															</div>
														{/each}
														{#if stats.a11y.unlabeled.length > 5}
															<span class="text-muted-foreground/50">…and {stats.a11y.unlabeled.length - 5} more</span>
														{/if}

													{:else if budget.label === 'Focus Order'}
														{#each stats.a11y.focusOrderIssues.slice(0, 5) as issue (issue.tag + issue.tabindex)}
															<div class="truncate font-mono text-red-400">
																&lt;{issue.tag} tabindex="{issue.tabindex}"&gt; {issue.text}
															</div>
														{/each}
														{#if stats.a11y.focusOrderIssues.length > 5}
															<span class="text-muted-foreground/50">…and {stats.a11y.focusOrderIssues.length - 5} more</span>
														{/if}

													{:else if budget.label === 'Contrast'}
														{#each stats.a11y.contrastIssues.slice(0, 5) as ci (ci.tag + ci.text)}
															<div class="truncate font-mono text-amber-500">
																&lt;{ci.tag}&gt; {ci.text} — {ci.ratio}:1 (need {ci.required}:1)
															</div>
														{/each}
														{#if stats.a11y.contrastIssues.length > 5}
															<span class="text-muted-foreground/50">…and {stats.a11y.contrastIssues.length - 5} more</span>
														{/if}

													{:else if budget.label === 'Images Alt'}
														<div class="text-red-400">
															{stats.a11y.imagesWithoutAlt} &lt;img&gt; element{stats.a11y.imagesWithoutAlt === 1 ? '' : 's'} missing alt attribute (WCAG 1.1.1)
														</div>

													{:else if budget.label === 'ARIA Usage'}
														{#each stats.a11y.ariaIssues.slice(0, 5) as ai (ai.tag + ai.issue)}
															<div class="truncate text-amber-500">
																<span class="font-mono">&lt;{ai.tag}&gt;</span> {ai.issue}
															</div>
														{/each}
														{#if stats.a11y.ariaIssues.length > 5}
															<span class="text-muted-foreground/50">…and {stats.a11y.ariaIssues.length - 5} more</span>
														{/if}

													{:else if budget.label === 'SVG Labels'}
														<div class="text-amber-500">
															{stats.a11y.svgsWithoutLabel} &lt;svg&gt; element{stats.a11y.svgsWithoutLabel === 1 ? '' : 's'} missing aria-label, &lt;title&gt;, or role="presentation"
														</div>

													{:else if budget.label === 'Motion Safety'}
														<div class="text-amber-500">
															{stats.a11y.animatedElementCount} animated element{stats.a11y.animatedElementCount === 1 ? '' : 's'} — no prefers-reduced-motion override detected in stylesheets
														</div>

													{:else if budget.label === 'Headings'}
														<div class="space-y-0">
															{#each stats.a11y.headings.slice(0, 6) as heading (heading.text + heading.level)}
																<div class="flex items-center gap-1" style="padding-left: {(heading.level - 1) * 8}px">
																	<span class={cn('font-mono font-medium', stats.a11y.headingSkipsLevel ? 'text-amber-500' : 'text-muted-foreground')}>
																		h{heading.level}
																	</span>
																	<span class="truncate text-muted-foreground">{heading.text}</span>
																</div>
															{/each}
															{#if stats.a11y.headings.length > 6}
																<span class="text-muted-foreground/50">…and {stats.a11y.headings.length - 6} more</span>
															{/if}
														</div>
													{/if}
												</div>
											{/if}
										</div>
									{/each}
								</div>
								</div>{/if}
							</div>

							<!-- Web Vitals section -->
							<div class="border-t px-3 py-2">
								<button type="button" class="flex w-full items-center gap-1" aria-expanded={statsVitalsOpen} aria-controls="stats-vitals" onclick={() => statsVitalsOpen = !statsVitalsOpen}>
									{#if statsVitalsOpen}<ChevronDown class="size-3 text-muted-foreground" />{:else}<ChevronRight class="size-3 text-muted-foreground" />{/if}
									<h4 class="text-xs font-semibold">Web Vitals</h4>
								</button>
								{#if statsVitalsOpen}<div id="stats-vitals">
								<p class="mb-1.5 mt-0.5 text-[10px] text-muted-foreground">
									{#if stats.vitals.supported}
										Component-scoped performance vitals via PerformanceObserver.
									{:else}
										Browser does not support required PerformanceObserver APIs.
									{/if}
								</p>
								<div class="space-y-1 text-xs">
									<!-- CLS -->
									<Tooltip.Provider>
										<Tooltip.Root delayDuration={200}>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<div {...tipProps} class="flex cursor-help items-center justify-between">
														<div class="flex items-center gap-2">
															{#if stats.vitals.supported}
																<span class={cn('text-base leading-none', stats.vitals.clsScore === 0 ? 'text-emerald-500' : stats.vitals.clsScore <= 0.1 ? 'text-amber-500' : 'text-red-500')}>●</span>
															{:else}
																<span class="text-base leading-none text-muted-foreground/40">●</span>
															{/if}
															<span class="text-muted-foreground">CLS</span>
														</div>
														<span class={cn('font-mono font-medium', !stats.vitals.supported && 'text-muted-foreground/50')}>
															{stats.vitals.supported ? stats.vitals.clsScore : 'Unsupported'}
														</span>
													</div>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="left" sideOffset={8} class="max-w-[16rem] p-0">
												<div class="space-y-1 px-3 py-2">
													<p class="text-xs text-primary-foreground">Cumulative Layout Shift — measures visual stability. Layout shifts from elements inside this component.</p>
													<p class="font-mono text-[10px] text-primary-foreground/70">🟢 0 · 🟡 ≤0.1 · 🔴 >0.1</p>
													{#if !stats.vitals.supported}
														<p class="text-[10px] text-primary-foreground/50">Requires layout-shift PerformanceObserver (Chrome/Edge).</p>
													{/if}
												</div>
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>
									{#if stats.vitals.clsSources.length > 0}
										<div class="ml-6 space-y-0.5">
											{#each stats.vitals.clsSources as src (src.selector)}
												<div class="truncate font-mono text-[10px] text-amber-500/80">{src.selector}</div>
											{/each}
										</div>
									{/if}

									<!-- Long Tasks -->
									<Tooltip.Provider>
										<Tooltip.Root delayDuration={200}>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<div {...tipProps} class="flex cursor-help items-center justify-between">
														<div class="flex items-center gap-2">
															{#if stats.vitals.supported}
																<span class={cn('text-base leading-none', stats.vitals.longTaskCount === 0 ? 'text-emerald-500' : stats.vitals.longTaskCount <= 2 ? 'text-amber-500' : 'text-red-500')}>●</span>
															{:else}
																<span class="text-base leading-none text-muted-foreground/40">●</span>
															{/if}
															<span class="text-muted-foreground">Long Tasks</span>
														</div>
														<span class={cn('font-mono font-medium', !stats.vitals.supported && 'text-muted-foreground/50')}>
															{#if !stats.vitals.supported}
																Unsupported
															{:else if stats.vitals.longTaskCount === 0}
																None
															{:else}
																{stats.vitals.longTaskCount} · {stats.vitals.worstLongTaskMs}ms peak
															{/if}
														</span>
													</div>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="left" sideOffset={8} class="max-w-[16rem] p-0">
												<div class="space-y-1 px-3 py-2">
													<p class="text-xs text-primary-foreground">Main-thread tasks exceeding 50ms during component mount. Blocks user interaction.</p>
													<p class="font-mono text-[10px] text-primary-foreground/70">🟢 0 · 🟡 ≤2 · 🔴 >2</p>
													{#if !stats.vitals.supported}
														<p class="text-[10px] text-primary-foreground/50">Requires longtask PerformanceObserver (Chrome/Edge).</p>
													{/if}
												</div>
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>

									<!-- Paint Timing -->
									<Tooltip.Provider>
										<Tooltip.Root delayDuration={200}>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<div {...tipProps} class="flex cursor-help items-center justify-between">
													<div class="flex items-center gap-2">
														{#if !stats.vitals.supported}
															<span class="text-base leading-none text-muted-foreground/40">●</span>
														{:else if stats.vitals.paintTimeMs < 0}
															<span class="text-base leading-none text-muted-foreground/40">●</span>
														{:else if stats.vitals.paintTimeMs <= 100}
															<span class="text-base leading-none text-emerald-500">●</span>
														{:else if stats.vitals.paintTimeMs <= 300}
															<span class="text-base leading-none text-amber-500">●</span>
														{:else}
															<span class="text-base leading-none text-red-500">●</span>
														{/if}
														<span class="text-muted-foreground">First Paint</span>
													</div>
													<span class={cn('font-mono font-medium', !stats.vitals.supported && 'text-muted-foreground/50')}>
														{#if !stats.vitals.supported}
															Unsupported
														{:else if stats.vitals.paintTimeMs < 0}
															Before mount
														{:else}
															{stats.vitals.paintTimeMs}ms
														{/if}
													</span>
												</div>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="left" sideOffset={8} class="max-w-[16rem] p-0">
												<div class="space-y-1 px-3 py-2">
													<p class="text-xs text-primary-foreground">First Paint — when the browser first renders any pixel. "Before mount" means the page already painted before this component mounted.</p>
												<p class="font-mono text-[10px] text-primary-foreground/70">🟢 ≤100ms · 🟡 ≤300ms · 🔴 >300ms</p>
												</div>
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>
									<Tooltip.Provider>
										<Tooltip.Root delayDuration={200}>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<div {...tipProps} class="flex cursor-help items-center justify-between">
													<div class="flex items-center gap-2">
														{#if !stats.vitals.supported}
															<span class="text-base leading-none text-muted-foreground/40">●</span>
														{:else if stats.vitals.fcpTimeMs < 0}
															<span class="text-base leading-none text-muted-foreground/40">●</span>
														{:else if stats.vitals.fcpTimeMs <= 100}
															<span class="text-base leading-none text-emerald-500">●</span>
														{:else if stats.vitals.fcpTimeMs <= 300}
															<span class="text-base leading-none text-amber-500">●</span>
														{:else}
															<span class="text-base leading-none text-red-500">●</span>
														{/if}
														<span class="text-muted-foreground">First Contentful Paint</span>
													</div>
													<span class={cn('font-mono font-medium', !stats.vitals.supported && 'text-muted-foreground/50')}>
														{#if !stats.vitals.supported}
															Unsupported
														{:else if stats.vitals.fcpTimeMs < 0}
															Before mount
														{:else}
															{stats.vitals.fcpTimeMs}ms
														{/if}
													</span>
												</div>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="left" sideOffset={8} class="max-w-[16rem] p-0">
												<div class="space-y-1 px-3 py-2">
													<p class="text-xs text-primary-foreground">First Contentful Paint — when the browser first renders text, image, or SVG content. "Before mount" means content already painted before this component mounted.</p>
												<p class="font-mono text-[10px] text-primary-foreground/70">🟢 ≤100ms · 🟡 ≤300ms · 🔴 >300ms</p>
												</div>
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>

									<!-- LCP -->
									<Tooltip.Provider>
										<Tooltip.Root delayDuration={200}>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<div {...tipProps} class="flex cursor-help items-center justify-between">
													<div class="flex items-center gap-2">
														{#if !stats.vitals.supported}
															<span class="text-base leading-none text-muted-foreground/40">●</span>
														{:else if stats.vitals.isLcpComponent && stats.vitals.lcpTimeMs <= 2500}
															<span class="text-base leading-none text-emerald-500">●</span>
														{:else if stats.vitals.isLcpComponent && stats.vitals.lcpTimeMs <= 4000}
															<span class="text-base leading-none text-amber-500">●</span>
														{:else if stats.vitals.isLcpComponent}
															<span class="text-base leading-none text-red-500">●</span>
														{:else}
															<span class="text-base leading-none text-muted-foreground/40">●</span>
														{/if}
														<span class="text-muted-foreground">Largest Contentful Paint</span>
													</div>
													<span class={cn('font-mono font-medium', !stats.vitals.supported && 'text-muted-foreground/50')}>
														{#if !stats.vitals.supported}
															Unsupported
														{:else if stats.vitals.isLcpComponent}
															{stats.vitals.lcpTimeMs}ms
														{:else}
															—
														{/if}
													</span>
												</div>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="left" sideOffset={8} class="max-w-[16rem] p-0">
												<div class="space-y-1 px-3 py-2">
													<p class="text-xs text-primary-foreground">Largest Contentful Paint — identifies whether this component contains the page's largest visible content element. "—" means another component holds the LCP element.</p>
												<p class="font-mono text-[10px] text-primary-foreground/70">🟢 ≤2500ms · 🟡 ≤4000ms · 🔴 >4000ms</p>
													{#if stats.vitals.isLcpComponent && stats.vitals.lcpElement}
														<p class="font-mono text-[10px] text-primary-foreground/70">{stats.vitals.lcpElement}</p>
													{/if}
													{#if !stats.vitals.supported}
														<p class="text-[10px] text-primary-foreground/50">Requires largest-contentful-paint PerformanceObserver.</p>
													{/if}
												</div>
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>

									<!-- FID -->
									<Tooltip.Provider>
										<Tooltip.Root delayDuration={200}>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<div {...tipProps} class="flex cursor-help items-center justify-between">
														<div class="flex items-center gap-2">
															{#if !stats.vitals.supported}
																<span class="text-base leading-none text-muted-foreground/40">●</span>
															{:else if stats.vitals.fidMs < 0}
																<span class="text-base leading-none text-muted-foreground/40">●</span>
															{:else if stats.vitals.fidMs <= 100}
																<span class="text-base leading-none text-emerald-500">●</span>
															{:else if stats.vitals.fidMs <= 300}
																<span class="text-base leading-none text-amber-500">●</span>
															{:else}
																<span class="text-base leading-none text-red-500">●</span>
															{/if}
															<span class="text-muted-foreground">First Input Delay</span>
														</div>
														<span class={cn('font-mono font-medium', !stats.vitals.supported && 'text-muted-foreground/50')}>
															{#if !stats.vitals.supported}
																Unsupported
															{:else if stats.vitals.fidMs < 0}
																Waiting
															{:else}
																{stats.vitals.fidMs}ms
															{/if}
														</span>
													</div>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="left" sideOffset={8} class="max-w-[16rem] p-0">
												<div class="space-y-1 px-3 py-2">
													<p class="text-xs text-primary-foreground">First Input Delay — time between the user's first interaction (click, tap, key press) and the browser's response. "Waiting" means no interaction has occurred yet.</p>
													<p class="font-mono text-[10px] text-primary-foreground/70">🟢 ≤100ms · 🟡 ≤300ms · 🔴 >300ms</p>
													{#if !stats.vitals.supported}
														<p class="text-[10px] text-primary-foreground/50">Requires first-input PerformanceObserver (Chrome/Edge).</p>
													{/if}
												</div>
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>

									<!-- TTFB -->
									<Tooltip.Provider>
										<Tooltip.Root delayDuration={200}>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<div {...tipProps} class="flex cursor-help items-center justify-between">
														<div class="flex items-center gap-2">
															{#if stats.vitals.ttfbMs < 0}
																<span class="text-base leading-none text-muted-foreground/40">●</span>
															{:else if stats.vitals.ttfbMs <= 800}
																<span class="text-base leading-none text-emerald-500">●</span>
															{:else if stats.vitals.ttfbMs <= 1800}
																<span class="text-base leading-none text-amber-500">●</span>
															{:else}
																<span class="text-base leading-none text-red-500">●</span>
															{/if}
															<span class="text-muted-foreground">TTFB</span>
														</div>
														<span class={cn('font-mono font-medium', stats.vitals.ttfbMs < 0 && 'text-muted-foreground/50')}>
															{#if stats.vitals.ttfbMs < 0}
																Unavailable
															{:else}
																{stats.vitals.ttfbMs}ms
															{/if}
														</span>
													</div>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="left" sideOffset={8} class="max-w-[16rem] p-0">
												<div class="space-y-1 px-3 py-2">
													<p class="text-xs text-primary-foreground">Time to First Byte — time from the page request until the first byte of the response. This is a page-level metric (same for all components).</p>
													<p class="font-mono text-[10px] text-primary-foreground/70">🟢 ≤800ms · 🟡 ≤1800ms · 🔴 >1800ms</p>
												</div>
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>
								</div>
								</div>{/if}
							</div>

							<!-- DOM section -->
							<div class="border-t px-3 py-2">
								<button type="button" class="flex w-full items-center gap-1" aria-expanded={statsDomOpen} aria-controls="stats-dom" onclick={() => statsDomOpen = !statsDomOpen}>
									{#if statsDomOpen}<ChevronDown class="size-3 text-muted-foreground" />{:else}<ChevronRight class="size-3 text-muted-foreground" />{/if}
									<h4 class="text-xs font-semibold">DOM Structure</h4>
								</button>
								{#if statsDomOpen}<div id="stats-dom">
								<p class="mb-1.5 mt-0.5 text-[10px] text-muted-foreground">Element count and nesting depth of the rendered component.</p>
								<div class="grid grid-cols-3 gap-2 text-xs">
									<Tooltip.Provider>
										<Tooltip.Root delayDuration={200}>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<div {...tipProps} class="cursor-help">
														<span class="text-muted-foreground">Nodes</span>
														<div class="font-mono font-medium">{stats.nodeCount}</div>
													</div>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="bottom" sideOffset={4}>
												Total DOM elements inside the component
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>
									<Tooltip.Provider>
										<Tooltip.Root delayDuration={200}>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<div {...tipProps} class="cursor-help">
														<span class="text-muted-foreground">Depth</span>
														<div class="font-mono font-medium">{stats.domDepth}</div>
													</div>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="bottom" sideOffset={4}>
												Maximum nesting depth of the DOM tree
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>
									<Tooltip.Provider>
										<Tooltip.Root delayDuration={200}>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<div {...tipProps} class="cursor-help">
														<span class="text-muted-foreground">Text</span>
														<div class="font-mono font-medium">{stats.textNodeCount}</div>
													</div>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="bottom" sideOffset={4}>
												Number of text nodes (visible text content)
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>
								</div>
								</div>{/if}
							</div>

							<!-- Memory (Chrome only) -->
							{#if stats.memoryDeltaBytes >= 0}
								<div class="border-t px-3 py-2">
									<Tooltip.Provider>
										<Tooltip.Root delayDuration={200}>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<button {...tipProps} type="button" class="flex w-full cursor-help items-center gap-1" aria-expanded={statsMemoryOpen} onclick={() => statsMemoryOpen = !statsMemoryOpen}>
														{#if statsMemoryOpen}<ChevronDown class="size-3 text-muted-foreground" />{:else}<ChevronRight class="size-3 text-muted-foreground" />{/if}
														<h4 class="text-xs font-semibold">Memory</h4>
														<span class="ml-auto font-mono text-xs font-medium">{(stats.memoryDeltaBytes / 1_048_576).toFixed(1)} MB</span>
													</button>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="left" sideOffset={4} class="max-w-[18rem] p-0">
												<div class="space-y-1 px-3 py-2">
													<p class="text-xs text-primary-foreground">Total JS heap size for the entire page, not scoped to this component. Browsers cannot isolate memory per component.</p>
													<p class="text-[10px] text-primary-foreground/70">Measured via <span class="font-mono">performance.memory</span> (Chrome/Edge only). Compare values across components to spot outliers.</p>
												</div>
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>
								</div>
							{/if}

							<!-- Accessibility section -->
							<div class="border-t px-3 py-2">
								<button type="button" class="flex w-full items-center gap-1" aria-expanded={statsA11yOpen} aria-controls="stats-a11y" onclick={() => statsA11yOpen = !statsA11yOpen}>
									{#if statsA11yOpen}<ChevronDown class="size-3 text-muted-foreground" />{:else}<ChevronRight class="size-3 text-muted-foreground" />{/if}
									<h4 class="text-xs font-semibold">Accessibility</h4>
								</button>
								{#if statsA11yOpen}<div id="stats-a11y">
								<p class="mb-1.5 mt-0.5 text-[10px] text-muted-foreground">Interactive elements, labels, landmarks, and focus order.</p>
								<div class="space-y-1 text-xs">
									<Tooltip.Provider>
										<Tooltip.Root delayDuration={200}>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<div {...tipProps} class="flex cursor-help items-center justify-between">
														<div class="flex items-center gap-2">
															<span class={cn('text-base leading-none', stats.a11y.focusableCount === stats.a11y.labeledCount ? 'text-emerald-500' : stats.a11y.unlabeled.length <= 2 ? 'text-amber-500' : 'text-red-500')}>●</span>
															<span class="text-muted-foreground">Labels</span>
														</div>
														<span class={cn('font-mono font-medium', stats.a11y.labeledCount < stats.a11y.focusableCount && 'text-amber-500')}>
															{stats.a11y.labeledCount}/{stats.a11y.focusableCount}
														</span>
													</div>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="left" sideOffset={4} class="max-w-[16rem] p-0">
												<div class="space-y-1 px-3 py-2">
													<p class="text-xs text-primary-foreground">Interactive elements with accessible labels (aria-label, aria-labelledby, title, or associated label) out of total focusable elements.</p>
													<p class="font-mono text-[10px] text-primary-foreground/70">🟢 All labeled · 🟡 ≤2 missing · 🔴 >2 missing</p>
												</div>
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>
									<Tooltip.Provider>
										<Tooltip.Root delayDuration={200}>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<div {...tipProps} class="flex cursor-help items-center justify-between">
														<div class="flex items-center gap-2">
															<span class={cn('text-base leading-none', stats.a11y.focusOrderIssues.length === 0 ? 'text-emerald-500' : 'text-red-500')}>●</span>
															<span class="text-muted-foreground">Focus Order</span>
														</div>
														<span class={cn('font-mono font-medium', stats.a11y.focusOrderIssues.length > 0 && 'text-red-500')}>
															{stats.a11y.focusOrderIssues.length === 0 ? 'OK' : `${stats.a11y.focusOrderIssues.length} issues`}
														</span>
													</div>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="left" sideOffset={4} class="max-w-[16rem] p-0">
												<div class="space-y-1 px-3 py-2">
													<p class="text-xs text-primary-foreground">Elements with positive tabindex disrupt natural tab order. Use tabindex="0" or "-1" instead.</p>
													<p class="font-mono text-[10px] text-primary-foreground/70">🟢 None · 🔴 Has positive tabindex</p>
												</div>
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>
									<div class="grid grid-cols-3 gap-2 pt-1">
										<Tooltip.Provider>
											<Tooltip.Root delayDuration={200}>
												<Tooltip.Trigger>
													{#snippet child({ props: tipProps })}
														<div {...tipProps} class="cursor-help">
															<span class="text-muted-foreground">Buttons</span>
															<div class="font-mono font-medium">{stats.a11y.buttonCount}</div>
														</div>
													{/snippet}
												</Tooltip.Trigger>
												<Tooltip.Content side="bottom" sideOffset={4}>
													Button elements found in the component
												</Tooltip.Content>
											</Tooltip.Root>
										</Tooltip.Provider>
										<Tooltip.Provider>
											<Tooltip.Root delayDuration={200}>
												<Tooltip.Trigger>
													{#snippet child({ props: tipProps })}
														<div {...tipProps} class="cursor-help">
															<span class="text-muted-foreground">Links</span>
															<div class="font-mono font-medium">{stats.a11y.linkCount}</div>
														</div>
													{/snippet}
												</Tooltip.Trigger>
												<Tooltip.Content side="bottom" sideOffset={4}>
													Anchor/link elements found in the component
												</Tooltip.Content>
											</Tooltip.Root>
										</Tooltip.Provider>
										<Tooltip.Provider>
											<Tooltip.Root delayDuration={200}>
												<Tooltip.Trigger>
													{#snippet child({ props: tipProps })}
														<div {...tipProps} class="cursor-help">
															<span class="text-muted-foreground">Inputs</span>
															<div class="font-mono font-medium">{stats.a11y.inputCount}</div>
														</div>
													{/snippet}
												</Tooltip.Trigger>
												<Tooltip.Content side="bottom" sideOffset={4}>
													Form input elements found in the component
												</Tooltip.Content>
											</Tooltip.Root>
										</Tooltip.Provider>
									</div>
								</div>

								<!-- Roles -->
								{#if stats.a11y.roles.length > 0}
									<Tooltip.Provider>
										<Tooltip.Root delayDuration={200}>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<div {...tipProps} class="mt-1.5 cursor-help">
														<span class="text-[10px] text-muted-foreground">ARIA Roles: </span>
														<span class="font-mono text-[10px]">{stats.a11y.roles.join(', ')}</span>
													</div>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="bottom" sideOffset={4}>
												Unique ARIA role attributes found in the component
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>
								{/if}

								<!-- Landmarks -->
								{#if stats.a11y.landmarks.length > 0}
									<Tooltip.Provider>
										<Tooltip.Root delayDuration={200}>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<div {...tipProps} class="mt-1 cursor-help">
														<span class="text-[10px] text-muted-foreground">Landmarks: </span>
														<span class="font-mono text-[10px]">{stats.a11y.landmarks.join(', ')}</span>
													</div>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="bottom" sideOffset={4}>
												Landmark regions (main, nav, header, footer, aside) for screen reader navigation
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>
								{/if}

								<!-- Headings -->
								{#if stats.a11y.headings.length > 0}
									<div class="mt-1.5">
										<Tooltip.Provider>
											<Tooltip.Root delayDuration={200}>
												<Tooltip.Trigger>
													{#snippet child({ props: tipProps })}
														<div {...tipProps} class="flex cursor-help items-center justify-between">
															<div class="flex items-center gap-2">
																<span class={cn('text-base leading-none', stats.a11y.headingSkipsLevel ? 'text-amber-500' : 'text-emerald-500')}>●</span>
																<span class="text-[10px] font-medium text-muted-foreground">Headings ({stats.a11y.headings.length})</span>
															</div>
															<span class={cn('font-mono text-[10px] font-medium', stats.a11y.headingSkipsLevel ? 'text-amber-500' : 'text-emerald-500')}>
																{stats.a11y.headingSkipsLevel ? 'Skips levels' : 'Sequential'}
															</span>
														</div>
													{/snippet}
												</Tooltip.Trigger>
												<Tooltip.Content side="bottom" sideOffset={4} class="max-w-[16rem] p-0">
													<div class="space-y-1 px-3 py-2">
														<p class="text-xs text-primary-foreground">Heading hierarchy should be sequential (h1 → h2 → h3). Skipping levels confuses screen readers.</p>
														<p class="font-mono text-[10px] text-primary-foreground/70">🟢 Sequential · 🟡 Skips levels</p>
													</div>
												</Tooltip.Content>
											</Tooltip.Root>
										</Tooltip.Provider>
										<div class="ml-6 mt-0.5 space-y-0">
											{#each stats.a11y.headings.slice(0, 5) as heading (heading.text + heading.level)}
												<div class="flex items-center gap-1 text-[10px]" style="padding-left: {(heading.level - 1) * 8}px">
													<span class={cn('font-mono font-medium', stats.a11y.headingSkipsLevel ? 'text-amber-500' : 'text-muted-foreground')}>
														h{heading.level}
													</span>
													<span class="truncate text-muted-foreground">{heading.text}</span>
												</div>
											{/each}
										</div>
									</div>
								{/if}

								<!-- Unlabeled elements -->
								{#if stats.a11y.unlabeled.length > 0}
									<div class="mt-1.5 rounded bg-red-500/10 px-2 py-1">
										<span class="text-[10px] font-medium text-red-500">
											{stats.a11y.unlabeled.length} unlabeled interactive element{stats.a11y.unlabeled.length === 1 ? '' : 's'}
										</span>
										{#each stats.a11y.unlabeled.slice(0, 3) as el (el.tag + el.classes)}
											<div class="truncate font-mono text-[10px] text-red-400">
												&lt;{el.tag}{el.classes ? ` class="${el.classes}"` : ''}&gt;
												{#if el.parentContext}
													<span class="text-red-400/60"> in {el.parentContext}</span>
												{/if}
											</div>
										{/each}
									</div>
								{/if}

								<!-- Focus order issues -->
								{#if stats.a11y.focusOrderIssues.length > 0}
									<div class="mt-1.5 rounded bg-red-500/10 px-2 py-1">
										<span class="text-[10px] font-medium text-red-500">
											{stats.a11y.focusOrderIssues.length} positive tabindex (anti-pattern)
										</span>
										{#each stats.a11y.focusOrderIssues.slice(0, 3) as issue (issue.tag + issue.tabindex)}
											<div class="truncate font-mono text-[10px] text-red-400">
												&lt;{issue.tag} tabindex="{issue.tabindex}"&gt; {issue.text}
											</div>
										{/each}
									</div>
								{/if}

								<!-- Contrast issues -->
								{#if stats.a11y.contrastIssues.length > 0}
									<div class="mt-1.5 rounded bg-amber-500/10 px-2 py-1">
										<span class="text-[10px] font-medium text-amber-600 dark:text-amber-400">
											{stats.a11y.contrastIssues.length} contrast issue{stats.a11y.contrastIssues.length === 1 ? '' : 's'} (WCAG AA)
										</span>
										{#each stats.a11y.contrastIssues.slice(0, 3) as ci (ci.tag + ci.text)}
											<div class="truncate font-mono text-[10px] text-amber-500">
												&lt;{ci.tag}&gt; {ci.text} — {ci.ratio}:1 (need {ci.required}:1)
											</div>
										{/each}
									</div>
								{/if}

								<!-- Images without alt -->
								{#if stats.a11y.imagesWithoutAlt > 0}
									<div class="mt-1.5 rounded bg-red-500/10 px-2 py-1">
										<span class="text-[10px] font-medium text-red-500">
											{stats.a11y.imagesWithoutAlt} image{stats.a11y.imagesWithoutAlt === 1 ? '' : 's'} missing alt text
										</span>
									</div>
								{/if}

								<!-- ARIA issues -->
								{#if stats.a11y.ariaIssues.length > 0}
									<div class="mt-1.5 rounded bg-amber-500/10 px-2 py-1">
										<span class="text-[10px] font-medium text-amber-600 dark:text-amber-400">
											{stats.a11y.ariaIssues.length} ARIA issue{stats.a11y.ariaIssues.length === 1 ? '' : 's'}
										</span>
										{#each stats.a11y.ariaIssues.slice(0, 3) as ai (ai.tag + ai.issue)}
											<div class="truncate text-[10px] text-amber-500">
												<span class="font-mono">&lt;{ai.tag}&gt;</span> {ai.issue}
											</div>
										{/each}
									</div>
								{/if}

								<!-- SVGs without labels -->
								{#if stats.a11y.svgsWithoutLabel > 0}
									<Tooltip.Provider>
										<Tooltip.Root delayDuration={200}>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<div {...tipProps} class="mt-1.5 flex cursor-help items-center justify-between text-[10px]">
														<div class="flex items-center gap-2">
															<span class="text-base leading-none text-amber-500">●</span>
															<span class="font-medium text-muted-foreground">SVG Labels</span>
														</div>
														<span class="font-mono font-medium text-amber-500">
															{stats.a11y.svgsWithoutLabel} missing
														</span>
													</div>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="left" sideOffset={8} class="max-w-[16rem] p-0">
												<div class="space-y-1 px-3 py-2">
													<p class="text-xs text-primary-foreground">SVGs without aria-label, &lt;title&gt;, or role="presentation". Unlabeled SVGs are invisible to screen readers.</p>
													<p class="font-mono text-[10px] text-primary-foreground/70">🟢 0 · 🟡 &gt;0</p>
												</div>
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>
								{/if}

								<!-- Animations / Motion -->
								{#if stats.a11y.animatedElementCount > 0}
									<Tooltip.Provider>
										<Tooltip.Root delayDuration={200}>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<div {...tipProps} class="mt-1.5 cursor-help">
														<div class="flex items-center justify-between text-[10px]">
															<div class="flex items-center gap-2">
																<span class={cn('text-base leading-none', stats.a11y.hasReducedMotionOverride ? 'text-emerald-500' : 'text-amber-500')}>●</span>
																<span class="font-medium text-muted-foreground">Animations</span>
															</div>
															<span class={cn('font-mono font-medium', stats.a11y.hasReducedMotionOverride ? 'text-emerald-500' : 'text-amber-500')}>
																{stats.a11y.animatedElementCount} element{stats.a11y.animatedElementCount === 1 ? '' : 's'}
															</span>
														</div>
														<div class="ml-6 text-[10px] text-muted-foreground">
															{stats.a11y.hasReducedMotionOverride ? '✓ prefers-reduced-motion override detected' : '⚠ No prefers-reduced-motion override found'}
														</div>
													</div>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="left" sideOffset={8} class="max-w-[16rem] p-0">
												<div class="space-y-1 px-3 py-2">
													<p class="text-xs text-primary-foreground">CSS animations or transitions detected. Components with motion should include a prefers-reduced-motion media query for users with vestibular disorders.</p>
													<p class="font-mono text-[10px] text-primary-foreground/70">🟢 Has override · 🟡 No override</p>
												</div>
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>
								{/if}

								<!-- Tab Order (first 10 elements) -->
								{#if stats.a11y.tabOrder.length > 0}
									<Tooltip.Provider>
										<Tooltip.Root delayDuration={200}>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<div {...tipProps} class="mt-1.5 cursor-help">
														<div class="flex items-center justify-between text-[10px]">
															<div class="flex items-center gap-2">
																<span class="text-base leading-none text-emerald-500">●</span>
																<span class="font-medium text-muted-foreground">Tab Order</span>
															</div>
															<span class="font-mono font-medium text-muted-foreground">
																{stats.a11y.tabOrder.length} element{stats.a11y.tabOrder.length === 1 ? '' : 's'}
															</span>
														</div>
													</div>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="left" sideOffset={8} class="max-w-[16rem] p-0">
												<div class="space-y-1 px-3 py-2">
													<p class="text-xs text-primary-foreground">Focusable elements in keyboard navigation order. Elements with positive tabindex (shown in red) disrupt natural focus order.</p>
													<p class="font-mono text-[10px] text-primary-foreground/70">Tab order follows DOM order + tabindex sorting</p>
												</div>
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>
									<div class="ml-6 mt-0.5 space-y-0">
										{#each stats.a11y.tabOrder.slice(0, 10) as entry, i (entry.tag + entry.text + i)}
											<div class="flex items-center gap-1.5 text-[10px]">
												<span class="font-mono text-muted-foreground/50">{i + 1}.</span>
												<span class={cn('font-mono', entry.tabindex > 0 ? 'text-red-400' : 'text-muted-foreground')}>&lt;{entry.tag}&gt;</span>
												{#if entry.text}
													<span class="truncate text-muted-foreground/60">{entry.text}</span>
												{/if}
											</div>
										{/each}
										{#if stats.a11y.tabOrder.length > 10}
											<span class="text-[10px] text-muted-foreground/50">…and {stats.a11y.tabOrder.length - 10} more</span>
										{/if}
									</div>
								{/if}
								</div>{/if}
							</div>

							<!-- Console messages -->
							{#if stats.consoleMessages.length > 0}
								<div class="border-t px-3 py-2">
									<button type="button" class="flex w-full items-center gap-1" aria-expanded={statsConsoleOpen} aria-controls="stats-console" onclick={() => statsConsoleOpen = !statsConsoleOpen}>
										{#if statsConsoleOpen}<ChevronDown class="size-3 text-muted-foreground" />{:else}<ChevronRight class="size-3 text-muted-foreground" />{/if}
										<h4 class="text-xs font-semibold">Console ({stats.consoleMessages.length})</h4>
									</button>
									{#if statsConsoleOpen}<div id="stats-console">
									<p class="mb-1 mt-0.5 text-[10px] text-muted-foreground">Warnings and errors logged during component mount.</p>
									<div class="max-h-20 space-y-0.5 overflow-auto">
										{#each stats.consoleMessages.slice(0, 5) as msg (msg.message)}
											<div class="flex items-start gap-1.5 text-[10px]">
												<span class={msg.level === 'error' ? 'text-red-500' : 'text-amber-500'}>
													{msg.level === 'error' ? '✕' : '⚠'}
												</span>
												<span class="truncate text-muted-foreground">{msg.message}</span>
											</div>
										{/each}
										{#if stats.consoleMessages.length > 5}
											<span class="text-[10px] text-muted-foreground/60">…and {stats.consoleMessages.length - 5} more</span>
										{/if}
									</div>
								</div>{/if}
								</div>
							{/if}

							<!-- Lifecycle flags -->
							{#if stats.hasAsyncContent}
								<div class="border-t px-3 py-1.5">
									<Tooltip.Provider>
										<Tooltip.Root delayDuration={200}>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<span {...tipProps} class="cursor-help text-[10px] text-muted-foreground">
														⚡ Async content detected
													</span>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="bottom" sideOffset={4}>
												The DOM changed after initial mount — the component loads content asynchronously.
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>
								</div>
							{/if}

							<!-- Re-render timings -->
							{#if stats.reRenderTimings.length > 0}
								<div class="border-t px-3 py-1.5">
									<span class="text-[10px] font-medium text-muted-foreground">Re-render timings:</span>
									<div class="mt-0.5 flex flex-wrap gap-1">
										{#each stats.reRenderTimings.slice(0, 8) as timing, i (i)}
											<span class={cn('rounded px-1 py-0.5 font-mono text-[10px]', timing > 50 ? 'bg-red-500/10 text-red-500' : timing > 16 ? 'bg-amber-500/10 text-amber-500' : 'bg-muted text-muted-foreground')}>
												{timing}ms
											</span>
										{/each}
										{#if stats.reRenderTimings.length > 8}
											<span class="text-[10px] text-muted-foreground/50">+{stats.reRenderTimings.length - 8}</span>
										{/if}
									</div>
								</div>
							{/if}

							<!-- Prop coverage -->
							<div class="border-t px-3 py-2">
								<Tooltip.Provider>
									<Tooltip.Root delayDuration={200}>
										<Tooltip.Trigger>
											{#snippet child({ props: tipProps })}
												<button {...tipProps} type="button" class="flex w-full cursor-help items-center gap-1" aria-expanded={statsPropCoverageOpen} aria-controls="stats-props" onclick={() => statsPropCoverageOpen = !statsPropCoverageOpen}>
													{#if statsPropCoverageOpen}<ChevronDown class="size-3 text-muted-foreground" />{:else}<ChevronRight class="size-3 text-muted-foreground" />{/if}
													<h4 class="text-xs font-semibold">Prop Coverage</h4>
													<span class="ml-auto font-mono text-xs text-muted-foreground">{stats.propsWithDefaults}/{stats.propsTotal}</span>
												</button>
											{/snippet}
										</Tooltip.Trigger>
										<Tooltip.Content side="left" sideOffset={4}>
											Ratio of props with default values. Higher coverage = more usable without configuration.
										</Tooltip.Content>
									</Tooltip.Root>
								</Tooltip.Provider>
								{#if statsPropCoverageOpen}<div id="stats-props">
								<div class="mt-1 flex items-center gap-2 text-xs">
									<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
										<div
											class="h-full rounded-full bg-emerald-500 transition-all"
											style="width: {stats.propsTotal > 0 ? Math.round((stats.propsWithDefaults / stats.propsTotal) * 100) : 0}%"
										></div>
									</div>
									<span class="font-mono text-muted-foreground">{stats.propsWithDefaults}/{stats.propsTotal}</span>
								</div>
								{#if propsMeta.filter((p: PropMeta): Bool => p.default === '').length > 0}
									<div class="mt-1.5 space-y-1">
										{#if propsMeta.filter((p: PropMeta): Bool => p.default === '' && !p.optional).length > 0}
											<div>
												<span class="text-[10px] font-medium text-red-500">Required — no default:</span>
												<div class="mt-0.5 flex flex-wrap gap-1">
													{#each propsMeta.filter((p: PropMeta): Bool => p.default === '' && !p.optional) as prop (prop.name)}
														<span class="rounded bg-red-500/10 px-1.5 py-0.5 font-mono text-[10px] text-red-600 dark:text-red-400">{prop.name}</span>
													{/each}
												</div>
											</div>
										{/if}
										{#if propsMeta.filter((p: PropMeta): Bool => p.default === '' && !!p.optional).length > 0}
											<div>
												<span class="text-[10px] font-medium text-amber-500">Optional — no default:</span>
												<div class="mt-0.5 flex flex-wrap gap-1">
													{#each propsMeta.filter((p: PropMeta): Bool => p.default === '' && !!p.optional) as prop (prop.name)}
														<span class="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-600 dark:text-amber-400">{prop.name}</span>
													{/each}
												</div>
											</div>
										{/if}
									</div>
								{/if}
								</div>{/if}
							</div>
						</Popover.Content>
					</Popover.Root>
				{/if}
				{#if tagName || codeText}
					<Tooltip.Provider>
						<Tooltip.Root delayDuration={300}>
							<Tooltip.Trigger>
								{#snippet child({ props: tipProps })}
									<button
										type="button"
										{...tipProps}
										class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
										onclick={() => toggleCode(cardKey)}
										aria-expanded={Boolean(openCards[cardKey])}
									>
										<Code class="size-3.5" aria-hidden="true" />
										<ChevronDown
											class={cn('size-3 transition-transform', openCards[cardKey] && 'rotate-180')}
											aria-hidden="true"
										/>
									</button>
								{/snippet}
							</Tooltip.Trigger>
							<Tooltip.Content side="top" sideOffset={4}>
								{openCards[cardKey] ? 'Collapse code' : 'Expand code'}
							</Tooltip.Content>
						</Tooltip.Root>
					</Tooltip.Provider>
					<CopyButton text={codeText ?? snippet} label="Copy code" class="size-7 [&_svg]:size-3.5" />
				{/if}
				<Tooltip.Provider>
					<Tooltip.Root delayDuration={300}>
						<Tooltip.Trigger>
							{#snippet child({ props: tipProps })}
								<button
									type="button"
									{...tipProps}
									class={cn(
										'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors',
										(cardConsoleOpen[cardKey] ?? false) ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
									)}
									onclick={() => { cardConsoleOpen[cardKey] = !cardConsoleOpen[cardKey]; }}
									aria-expanded={Boolean(cardConsoleOpen[cardKey])}
								>
									<Terminal class="size-3.5" aria-hidden="true" />
									{#if (cardConsoleLogs[cardKey] ?? []).length > 0}
										<span class={cn(
											'inline-flex h-[0.875rem] min-w-[1.25rem] items-center justify-center rounded-full px-1 font-mono text-[9px] font-bold leading-none',
											(cardConsoleLogs[cardKey] ?? []).some((l) => l.level === 'error') ? 'bg-red-500/20 text-red-500' : 'bg-muted-foreground/20 text-muted-foreground',
										)}>
											{(cardConsoleLogs[cardKey] ?? []).length > 99 ? '99+' : (cardConsoleLogs[cardKey] ?? []).length}
										</span>
									{/if}
									<ChevronDown
										class={cn('size-3 transition-transform', cardConsoleOpen[cardKey] && 'rotate-180')}
										aria-hidden="true"
									/>
								</button>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content side="top" sideOffset={4}>
							{cardConsoleOpen[cardKey] ? 'Collapse console' : 'Expand console'}
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
				<DropdownMenu.Root
					open={cardDropdownOpen[cardKey] ?? false}
					onOpenChange={(o) => {
						cardDropdownOpen[cardKey] = o;
						if (!o) {
							linkCopied = false;
							exportFeedback = '';
							exportInProgress = '';
						}
					}}
				>
					<DropdownMenu.Trigger
						class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					>
						<EllipsisVertical class="size-3.5" aria-hidden="true" />
						<span class="sr-only">Card options</span>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="w-56">
						{#if componentName}
							<DropdownMenu.Item onclick={() => openIsolation(cardKey, variantKey, variantOption)}>
								<ExternalLink class="size-4" />
								Open in new tab
							</DropdownMenu.Item>
							<DropdownMenu.Item
								onSelect={(e) => {
									e.preventDefault();
									copyIsolationUrl(cardKey, variantKey, variantOption);
								}}
							>
								{#if linkCopied}
									<Check class="size-4 text-green-500" />
									Copied!
								{:else}
									<Link class="size-4" />
									Copy link
								{/if}
							</DropdownMenu.Item>
							<DropdownMenu.Separator />
						{/if}

						<!-- Background submenu -->
						<DropdownMenu.Sub
							onOpenChange={(open) => {
								if (open) bgSearchQuery = '';
							}}
						>
							<DropdownMenu.SubTrigger>
								<Paintbrush class="size-4" />
								Background
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent class="flex max-h-80 w-52 flex-col overflow-hidden">
								<div class="shrink-0 px-2 pb-1.5 pt-1">
									<div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
										<Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
										<input
											type="text"
											placeholder="Search backgrounds..."
											class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
											bind:value={bgSearchQuery}
											onkeydown={(e) => e.stopPropagation()}
										/>
									</div>
								</div>
								<div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
									<DropdownMenu.Label class="text-xs">Background Color</DropdownMenu.Label>
									{#each filteredBgPresets as preset (preset.id)}
										<DropdownMenu.Item onclick={() => setBackground(cardKey, preset.id)}>
											<div class="flex items-center gap-2">
												<Check class={cn('size-4 shrink-0', activeBg !== preset.id && 'opacity-0')} />
												{#if preset.id !== 'default'}
													<span
														class="inline-block size-3.5 shrink-0 rounded-sm border"
														style={preset.style || 'background-color: transparent'}
													></span>
												{/if}
												{preset.label}
											</div>
										</DropdownMenu.Item>
									{:else}
										<div class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
											<SearchX class="size-5" />
											<div class="flex flex-col items-center gap-0.5">
												<p class="text-xs font-medium">No backgrounds found</p>
												<p class="text-[11px]">Try a different search term</p>
											</div>
										</div>
									{/each}
									<DropdownMenu.Separator />
									<div class="px-2 py-1.5">
										<p class="mb-1.5 text-xs font-medium text-muted-foreground">Custom</p>
										<ColorPicker
											value={activeBg.startsWith('#') ? activeBg : '#ffffff'}
											onValueChange={(v) => setBackground(cardKey, v)}
										/>
									</div>
								</div>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>

						<!-- Zoom submenu -->
						<DropdownMenu.Sub>
							<DropdownMenu.SubTrigger>
								<ZoomIn class="size-4" />
								Zoom
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent class="w-52">
								<DropdownMenu.Label class="text-xs">Zoom Actions</DropdownMenu.Label>
								<DropdownMenu.Item onclick={() => zoomIn(cardKey)} disabled={activeZoom >= ZOOM_MAX}>
									<ZoomIn class="size-4" />
									Zoom in
								</DropdownMenu.Item>
								<DropdownMenu.Item onclick={() => zoomOut(cardKey)} disabled={activeZoom <= ZOOM_MIN}>
									<ZoomOut class="size-4" />
									Zoom out
								</DropdownMenu.Item>
								<DropdownMenu.Item onclick={() => zoomFit(cardKey)} disabled={activeZoom === 1}>
									<Maximize class="size-4" />
									Fit (100%)
								</DropdownMenu.Item>
								<DropdownMenu.Separator />
								<DropdownMenu.Label class="text-xs">Zoom Level</DropdownMenu.Label>
								{#each ZOOM_PRESETS as preset (preset.value)}
									<DropdownMenu.Item onclick={() => setZoom(cardKey, preset.value)}>
										<Check class={cn('size-4', activeZoom !== preset.value && 'opacity-0')} />
										{preset.label}
									</DropdownMenu.Item>
								{/each}
								<DropdownMenu.Separator />
								<div class="px-2 py-1.5">
									<p class="mb-1.5 text-xs font-medium text-muted-foreground">Custom ({getZoomLabel(cardKey)})</p>
									<Slider
										type="single"
										value={Math.round(activeZoom * 100)}
										min={ZOOM_MIN * 100}
										max={ZOOM_MAX * 100}
										step={5}
										onValueChange={(v) => setZoom(cardKey, v / 100)}
									/>
								</div>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>

						<!-- Outline submenu -->
						<DropdownMenu.Sub
							onOpenChange={(open) => {
								if (open) outlineSearchQuery = '';
							}}
						>
							<DropdownMenu.SubTrigger>
								<SquareDashedMousePointer class="size-4" />
								Outline
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent class="flex max-h-80 w-52 flex-col overflow-hidden">
								<div class="shrink-0 px-2 pb-1.5 pt-1">
									<div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
										<Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
										<input
											type="text"
											placeholder="Search outlines..."
											class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
											bind:value={outlineSearchQuery}
											onkeydown={(e) => e.stopPropagation()}
										/>
									</div>
								</div>
								<div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
									<DropdownMenu.Label class="text-xs">Outline Color</DropdownMenu.Label>
									<DropdownMenu.Item onclick={() => setOutline(cardKey, 'none')}>
										<Check class={cn('size-4 shrink-0', activeOutline !== 'none' && 'opacity-0')} />
										None
									</DropdownMenu.Item>
									{#each filteredOutlinePresets as preset (preset.id)}
										<DropdownMenu.Item onclick={() => setOutline(cardKey, preset.id)}>
											<div class="flex items-center gap-2">
												<Check class={cn('size-4 shrink-0', activeOutline !== preset.id && 'opacity-0')} />
												<span
													class="inline-block size-3.5 shrink-0 rounded-sm border"
													style="background-color: {preset.color}"
												></span>
												{preset.label}
											</div>
										</DropdownMenu.Item>
									{:else}
										<div class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
											<SearchX class="size-5" />
											<div class="flex flex-col items-center gap-0.5">
												<p class="text-xs font-medium">No outlines found</p>
												<p class="text-[11px]">Try a different search term</p>
											</div>
										</div>
									{/each}
									<DropdownMenu.Separator />
									<div class="px-2 py-1.5">
										<p class="mb-1.5 text-xs font-medium text-muted-foreground">Custom</p>
										<ColorPicker
											value={activeOutline.startsWith('#') ? activeOutline : '#ef4444'}
											onValueChange={(v) => setOutline(cardKey, v)}
										/>
									</div>
								</div>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>

						<!-- Grid submenu -->
						<DropdownMenu.Sub
							onOpenChange={(open) => {
								if (open) gridSearchQuery = '';
							}}
						>
							<DropdownMenu.SubTrigger>
								<Grid3x3 class="size-4" />
								Grid
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent class="flex max-h-80 w-52 flex-col overflow-hidden">
								<div class="shrink-0 px-2 pb-1.5 pt-1">
									<div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
										<Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
										<input
											type="text"
											placeholder="Search grids..."
											class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
											bind:value={gridSearchQuery}
											onkeydown={(e) => e.stopPropagation()}
										/>
									</div>
								</div>
								<div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
									<DropdownMenu.Label class="text-xs">Grid Background Color</DropdownMenu.Label>
									<DropdownMenu.Item onclick={() => setGrid(cardKey, 'none')}>
										<Check class={cn('size-4 shrink-0', activeGrid !== 'none' && 'opacity-0')} />
										None
									</DropdownMenu.Item>
									{#each filteredGridPresets as preset (preset.id)}
										<DropdownMenu.Item onclick={() => setGrid(cardKey, preset.id)}>
											<div class="flex items-center gap-2">
												<Check class={cn('size-4 shrink-0', activeGrid !== preset.id && 'opacity-0')} />
												<span
													class="inline-block size-3.5 shrink-0 rounded-sm border"
													style="background-color: {preset.color}"
												></span>
												{preset.label}
											</div>
										</DropdownMenu.Item>
									{:else}
										<div class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
											<SearchX class="size-5" />
											<div class="flex flex-col items-center gap-0.5">
												<p class="text-xs font-medium">No grid styles found</p>
												<p class="text-[11px]">Try a different search term</p>
											</div>
										</div>
									{/each}
									<DropdownMenu.Separator />
									<div class="px-2 py-1.5">
										<p class="mb-1.5 text-xs font-medium text-muted-foreground">Custom Grid Background Color</p>
										<ColorPicker
											value={activeGrid.startsWith('#') ? activeGrid : '#000000'}
											onValueChange={(v) => setGrid(cardKey, v)}
										/>
									</div>
									<DropdownMenu.Separator />
									<DropdownMenu.Label class="text-xs">Grid Fill Color</DropdownMenu.Label>
									<DropdownMenu.Item onclick={() => setGridFill(cardKey, 'none')}>
										<Check class={cn('size-4 shrink-0', (cardGridFills[cardKey] ?? 'none') !== 'none' && 'opacity-0')} />
										None (transparent)
									</DropdownMenu.Item>
									{#each GRID_FILL_PRESETS as preset (preset.id)}
										<DropdownMenu.Item onclick={() => setGridFill(cardKey, preset.id)}>
											<div class="flex items-center gap-2">
												<Check class={cn('size-4 shrink-0', (cardGridFills[cardKey] ?? 'none') !== preset.id && 'opacity-0')} />
												<span
													class="inline-block size-3.5 shrink-0 rounded-sm border"
													style="background-color: {preset.color}"
												></span>
												{preset.label}
											</div>
										</DropdownMenu.Item>
									{/each}
									<DropdownMenu.Separator />
									<div class="px-2 py-1.5">
										<p class="mb-1.5 text-xs font-medium text-muted-foreground">Custom Grid Fill Color</p>
										<ColorPicker
											value={(cardGridFills[cardKey] ?? 'none').startsWith('#') ? (cardGridFills[cardKey] ?? '#ffffff') : '#ffffff'}
											onValueChange={(v) => setGridFill(cardKey, v)}
										/>
									</div>
									<DropdownMenu.Separator />
									<div class="px-2 py-1.5">
										<p class="mb-1.5 text-xs font-medium text-muted-foreground">Size ({cardGridSizes[cardKey] ?? GRID_DEFAULT_SIZE}px)</p>
										<Slider
											type="single"
											value={cardGridSizes[cardKey] ?? GRID_DEFAULT_SIZE}
											min={4}
											max={128}
											step={4}
											onValueChange={(v) => setGridSize(cardKey, v)}
										/>
									</div>
								</div>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>

						<!-- Orientation submenu -->
						<DropdownMenu.Sub
							onOpenChange={(open) => {
								if (open) orientationSearchQuery = '';
							}}
						>
							<DropdownMenu.SubTrigger>
								<Smartphone class="size-4" />
								Orientation
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent class="flex max-h-80 w-64 flex-col overflow-hidden">
								<div class="shrink-0 px-2 pb-1.5 pt-1">
									<div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
										<Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
										<input
											type="text"
											placeholder="Search orientations..."
											class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
											bind:value={orientationSearchQuery}
											onkeydown={(e) => e.stopPropagation()}
										/>
									</div>
								</div>
								<div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
									<DropdownMenu.Label class="text-xs">Orientation</DropdownMenu.Label>
									<DropdownMenu.Item onclick={() => setOrientation(cardKey, 'default')}>
										<Check class={cn('size-4 shrink-0', activeOrientation !== 'default' && 'opacity-0')} />
										Default (none)
									</DropdownMenu.Item>
									{#each filteredOrientationPresets as preset (preset.id)}
										<DropdownMenu.Item onclick={() => setOrientation(cardKey, preset.id)}>
											<div class="flex items-center gap-2">
												<Check class={cn('size-4 shrink-0', activeOrientation !== preset.id && 'opacity-0')} />
												<span
													class="relative inline-flex items-center justify-center"
													style="width: 16px; height: 16px;"
												>
													<span
														class="rounded-[2px] border border-current"
														style="width: 8px; height: 14px; transform: rotate({preset.rotation}deg);"
													>
														<span
															class="absolute rounded-full bg-current"
															style="width: 3px; height: 3px; bottom: 1px; left: 50%; transform: translateX(-50%);"
														></span>
													</span>
												</span>
												{preset.label}
											</div>
										</DropdownMenu.Item>
									{:else}
										<div class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
											<SearchX class="size-5" />
											<div class="flex flex-col items-center gap-0.5">
												<p class="text-xs font-medium">No orientations found</p>
												<p class="text-[11px]">Try a different search term</p>
											</div>
										</div>
									{/each}
								</div>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>

						<!-- Color Mode submenu -->
						<DropdownMenu.Sub
							onOpenChange={(open) => {
								if (open) modeSearchQuery = '';
							}}
						>
							<DropdownMenu.SubTrigger>
								<Sun class="size-4" />
								Color Mode
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent class="flex max-h-80 w-52 flex-col overflow-hidden">
								<div class="shrink-0 px-2 pb-1.5 pt-1">
									<div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
										<Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
										<input
											type="text"
											placeholder="Search modes..."
											class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
											bind:value={modeSearchQuery}
											onkeydown={(e) => e.stopPropagation()}
										/>
									</div>
								</div>
								<div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
									<DropdownMenu.Label class="text-xs">Color Mode</DropdownMenu.Label>
									{#each filteredModePresets as preset (preset.id)}
										<DropdownMenu.Item onclick={() => setCardMode(cardKey, preset.id)}>
											<Check class={cn('size-4 shrink-0', activeMode !== preset.id && 'opacity-0')} />
											<preset.icon class="size-4" />
											{preset.label}
										</DropdownMenu.Item>
									{:else}
										<div class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
											<SearchX class="size-5" />
											<div class="flex flex-col items-center gap-0.5">
												<p class="text-xs font-medium">No color modes found</p>
												<p class="text-[11px]">Try a different search term</p>
											</div>
										</div>
									{/each}
								</div>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>

						<!-- Theme submenu -->
						<DropdownMenu.Sub
							onOpenChange={(open) => {
								if (open) themeSearchQuery = '';
							}}
						>
							<DropdownMenu.SubTrigger>
								<Palette class="size-4" />
								Theme
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent class="flex max-h-80 w-52 flex-col overflow-hidden">
								<div class="shrink-0 px-2 pb-1.5 pt-1">
									<div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
										<Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
										<input
											type="text"
											placeholder="Search themes..."
											class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
											bind:value={themeSearchQuery}
											onkeydown={(e) => e.stopPropagation()}
										/>
									</div>
								</div>
								<div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
									<DropdownMenu.Label class="text-xs">Theme</DropdownMenu.Label>
									{#each filteredThemePresets as preset (preset.id)}
										<DropdownMenu.Item onclick={() => setCardTheme(cardKey, preset.id)}>
											<div class="flex items-center gap-2">
												<Check class={cn('size-4 shrink-0', activeTheme !== preset.id && 'opacity-0')} />
												{#if preset.dot}
													<span
														class="inline-block size-3.5 shrink-0 rounded-full shadow-sm ring-1 ring-black/10"
														style="background-color: {preset.dot}"
													></span>
												{/if}
												{preset.label}
											</div>
										</DropdownMenu.Item>
									{:else}
										<div class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
											<SearchX class="size-5" />
											<div class="flex flex-col items-center gap-0.5">
												<p class="text-xs font-medium">No themes found</p>
												<p class="text-[11px]">Try a different search term</p>
											</div>
										</div>
									{/each}
								</div>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>

						<!-- Media Query Preferences submenu -->
						<DropdownMenu.Sub
							onOpenChange={(open) => {
								if (open) mediaPrefSearchQuery = '';
							}}
						>
							<DropdownMenu.SubTrigger>
								<SlidersHorizontal class="size-4" />
								Media Preferences
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent class="flex max-h-80 w-56 flex-col overflow-hidden">
								<div class="shrink-0 px-2 pb-1.5 pt-1">
									<div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
										<Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
										<input
											type="text"
											placeholder="Search preferences..."
											class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
											bind:value={mediaPrefSearchQuery}
											onkeydown={(e) => e.stopPropagation()}
										/>
									</div>
								</div>
								<div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
									{#each filteredMediaPrefGroups as group (group.pref)}
										<DropdownMenu.Label class="text-xs">{group.label}</DropdownMenu.Label>
										{#each group.options as option (option.value)}
											<DropdownMenu.Item onclick={() => setMediaPref(cardKey, group.pref, option.value)}>
												<Check class={cn('size-4 shrink-0', getMediaPref(cardKey, group.pref) !== option.value && 'opacity-0')} />
												{option.label}
											</DropdownMenu.Item>
										{/each}
										{#if group !== filteredMediaPrefGroups[filteredMediaPrefGroups.length - 1]}
											<DropdownMenu.Separator />
										{/if}
									{:else}
										<div class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
											<SearchX class="size-5" />
											<div class="flex flex-col items-center gap-0.5">
												<p class="text-xs font-medium">No preferences found</p>
												<p class="text-[11px]">Try a different search term</p>
											</div>
										</div>
									{/each}
								</div>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>

						<!-- Network Simulation submenu -->
						<DropdownMenu.Sub
							onOpenChange={(open) => {
								if (open) networkSearchQuery = '';
							}}
						>
							<DropdownMenu.SubTrigger>
								<Wifi class="size-4" />
								Network Simulation
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent class="flex max-h-[28rem] w-72 flex-col overflow-hidden">
								<div class="shrink-0 px-2 pb-1.5 pt-1">
									<div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
										<Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
										<input
											type="text"
											placeholder="Search..."
											class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
											bind:value={networkSearchQuery}
											onkeydown={(e) => e.stopPropagation()}
										/>
									</div>
								</div>
								<div class="flex max-h-72 flex-col overflow-y-auto" use:lockHeight>
									<DropdownMenu.Label class="text-xs">Throttling</DropdownMenu.Label>
									<DropdownMenu.Item onclick={() => setNetworkSim(cardKey, 'none')}>
										<Check class={cn('size-4 shrink-0', (cardNetworkSim[cardKey] ?? 'none') !== 'none' && 'opacity-0')} />
										No throttling
									</DropdownMenu.Item>
									{#each filteredNetworkCategories as category (category)}
										<DropdownMenu.Separator />
										<DropdownMenu.Label class="text-xs">{category}</DropdownMenu.Label>
										{#each filteredNetworkPresets.filter((p) => p.category === category) as preset (preset.id)}
											<DropdownMenu.Item onclick={() => setNetworkSim(cardKey, preset.id)}>
												<div class="flex items-center gap-2">
													<Check class={cn('size-4 shrink-0', (cardNetworkSim[cardKey] ?? 'none') !== preset.id && 'opacity-0')} />
													{#if preset.id === 'offline'}
														<WifiOff class="size-3.5 text-destructive" />
													{/if}
													<div class="flex flex-col">
														<span>{preset.label}</span>
														{#if preset.description}
															<span class="text-[10px] leading-tight text-muted-foreground">{preset.description}</span>
														{/if}
													</div>
												</div>
											</DropdownMenu.Item>
										{/each}
									{/each}
									{#if filteredNetworkCategories.length === 0}
										<div class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
											<SearchX class="size-5" />
											<div class="flex flex-col items-center gap-0.5">
												<p class="text-xs font-medium">No network presets found</p>
												<p class="text-[11px]">Try a different search term</p>
											</div>
										</div>
									{/if}
								</div>
								<DropdownMenu.Separator />
								<div class="shrink-0 px-2 py-1.5">
									<p class="mb-1.5 text-xs font-medium text-muted-foreground">Custom Latency ({cardCustomNetwork[cardKey]?.delay ?? 200}ms)</p>
									<Slider
										type="single"
										value={cardCustomNetwork[cardKey]?.delay ?? 200}
										min={0}
										max={10000}
										step={50}
										onValueChange={(v: Num) => {
											cardCustomNetwork[cardKey] = { delay: v, label: cardCustomNetwork[cardKey]?.label ?? 'Custom' };
										}}
										onValueCommit={() => {
											setNetworkSim(cardKey, 'custom');
										}}
									/>
								</div>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>

						<!-- Viewport / Device Simulation submenu -->
						<DropdownMenu.Sub
							onOpenChange={(open) => {
								if (open) viewportSearchQuery = '';
							}}
						>
							<DropdownMenu.SubTrigger>
								<Tablet class="size-4" />
								Viewport
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent class="flex max-h-[28rem] w-72 flex-col overflow-hidden">
								<div class="shrink-0 px-2 pb-1.5 pt-1">
									<div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
										<Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
										<input
											type="text"
											placeholder="Search devices..."
											class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
											bind:value={viewportSearchQuery}
											onkeydown={(e) => e.stopPropagation()}
										/>
									</div>
								</div>
								<div class="flex max-h-72 flex-col overflow-y-auto" use:lockHeight>
									<DropdownMenu.Label class="text-xs">Size</DropdownMenu.Label>
									<DropdownMenu.Item onclick={() => setViewport(cardKey, 'auto')}>
										<Check class={cn('size-4 shrink-0', (cardViewports[cardKey] ?? 'auto') !== 'auto' && 'opacity-0')} />
										Auto (full width)
									</DropdownMenu.Item>
									{#each filteredViewportCategories as category (category)}
										<DropdownMenu.Separator />
										<DropdownMenu.Label class="text-xs">{category}</DropdownMenu.Label>
										{#each filteredViewportPresets.filter((p) => p.category === category) as preset (preset.id)}
											<DropdownMenu.Item onclick={() => setViewport(cardKey, preset.id)}>
												<div class="flex items-center gap-2">
													<Check class={cn('size-4 shrink-0', (cardViewports[cardKey] ?? 'auto') !== preset.id && 'opacity-0')} />
													<div class="flex flex-col">
														<span class="truncate">{preset.label}</span>
														<span class="text-[10px] leading-tight text-muted-foreground">{preset.width} &times; {preset.height}</span>
													</div>
												</div>
											</DropdownMenu.Item>
										{/each}
									{/each}
									{#if filteredViewportCategories.length === 0}
										<div class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
											<SearchX class="size-5" />
											<div class="flex flex-col items-center gap-0.5">
												<p class="text-xs font-medium">No devices found</p>
												<p class="text-[11px]">Try a different search term</p>
											</div>
										</div>
									{/if}
								</div>
								<DropdownMenu.Separator />
								<div class="shrink-0 px-2 py-1.5">
									<p class="mb-1.5 text-xs font-medium text-muted-foreground">Custom Width ({cardCustomViewports[cardKey]?.w ?? 1024}px)</p>
									<Slider
										type="single"
										value={cardCustomViewports[cardKey]?.w ?? 1024}
										min={100}
										max={3840}
										step={10}
										onValueChange={(v: Num) => {
											cardCustomViewports[cardKey] = { w: v, h: cardCustomViewports[cardKey]?.h ?? 768 };
										}}
										onValueCommit={() => {
											setViewport(cardKey, 'custom');
										}}
									/>
								</div>
								<div class="shrink-0 px-2 py-1.5">
									<p class="mb-1.5 text-xs font-medium text-muted-foreground">Custom Height ({cardCustomViewports[cardKey]?.h ?? 768}px)</p>
									<Slider
										type="single"
										value={cardCustomViewports[cardKey]?.h ?? 768}
										min={100}
										max={2160}
										step={10}
										onValueChange={(v: Num) => {
											cardCustomViewports[cardKey] = { w: cardCustomViewports[cardKey]?.w ?? 1024, h: v };
										}}
										onValueCommit={() => {
											setViewport(cardKey, 'custom');
										}}
									/>
								</div>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>

						<!-- Accessibility submenu -->
						<DropdownMenu.Sub
							onOpenChange={(open) => {
								if (open) simSearchQuery = '';
							}}
						>
							<DropdownMenu.SubTrigger>
								<Eye class="size-4" />
								Accessibility
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent class="w-56">
								<div class="px-2 pb-1.5 pt-1">
									<div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
										<Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
										<input
											type="text"
											placeholder="Search..."
											class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
											bind:value={simSearchQuery}
											onkeydown={(e) => e.stopPropagation()}
										/>
									</div>
								</div>
								<div class="flex max-h-60 flex-col overflow-y-auto" use:lockHeight>
									<DropdownMenu.Item onclick={() => toggleSimulation(cardKey, 'none')}>
										<Check class={cn('size-4 shrink-0', activeSim !== 'none' && 'opacity-0')} />
										None
									</DropdownMenu.Item>
									{#if filteredColorItems.length > 0}
										<DropdownMenu.Separator />
										<DropdownMenu.Label class="text-xs">Color Vision</DropdownMenu.Label>
										{#each filteredColorItems as item (item.id)}
											<DropdownMenu.Item onclick={() => toggleSimulation(cardKey, item.id)}>
												<Check class={cn('size-4', activeSim !== item.id && 'opacity-0')} />
												{item.label}
											</DropdownMenu.Item>
										{/each}
									{/if}
									{#if filteredVisionItems.length > 0}
										{#if filteredColorItems.length > 0}
											<DropdownMenu.Separator />
										{/if}
										<DropdownMenu.Label class="text-xs">Vision Impairments</DropdownMenu.Label>
										{#each filteredVisionItems as item (item.id)}
											<DropdownMenu.Item onclick={() => toggleSimulation(cardKey, item.id)}>
												<Check class={cn('size-4', activeSim !== item.id && 'opacity-0')} />
												{item.label}
											</DropdownMenu.Item>
										{/each}
									{/if}
									{#if filteredColorItems.length === 0 && filteredVisionItems.length === 0}
										<div class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
											<SearchX class="size-5" />
											<div class="flex flex-col items-center gap-0.5">
												<p class="text-xs font-medium">No simulations found</p>
												<p class="text-[11px]">Try a different search term</p>
											</div>
										</div>
									{/if}
								</div>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>
						<!-- Text Direction submenu -->
						{@const activeDir: Str = cardTextDir[cardKey] ?? 'auto'}
						<DropdownMenu.Sub
							onOpenChange={(open) => {
								if (open) dirSearchQuery = '';
							}}
						>
							<DropdownMenu.SubTrigger>
								<Languages class="size-4" />
								Text Direction
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent class="flex max-h-80 w-52 flex-col overflow-hidden">
								<div class="shrink-0 px-2 pb-1.5 pt-1">
									<div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
										<Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
										<input
											type="text"
											placeholder="Search..."
											class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
											bind:value={dirSearchQuery}
											onkeydown={(e) => e.stopPropagation()}
										/>
									</div>
								</div>
								<div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
									<DropdownMenu.Label class="text-xs">Direction</DropdownMenu.Label>
									{#each filteredDirPresets as item (item.id)}
										<DropdownMenu.Item onclick={() => { cardTextDir[cardKey] = item.id; }}>
											<Check class={cn('size-4', activeDir !== item.id && 'opacity-0')} />
											{item.label}
										</DropdownMenu.Item>
									{:else}
										<div class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
											<SearchX class="size-5" />
											<div class="flex flex-col items-center gap-0.5">
												<p class="text-xs font-medium">No directions found</p>
												<p class="text-[11px]">Try a different search term</p>
											</div>
										</div>
									{/each}
								</div>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>
						<!-- Font Size submenu -->
						{@const activeFontSize: Num = cardFontSize[cardKey] ?? 0}
						<DropdownMenu.Sub
							onOpenChange={(open) => {
								if (open) fontSizeSearchQuery = '';
							}}
						>
							<DropdownMenu.SubTrigger>
								<ALargeSmall class="size-4" />
								Font Size
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent class="flex max-h-80 w-52 flex-col overflow-hidden">
								<div class="shrink-0 px-2 pb-1.5 pt-1">
									<div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
										<Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
										<input
											type="text"
											placeholder="Search sizes..."
											class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
											bind:value={fontSizeSearchQuery}
											onkeydown={(e) => e.stopPropagation()}
										/>
									</div>
								</div>
								<div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
									<DropdownMenu.Label class="text-xs">Presets</DropdownMenu.Label>
									{#each filteredFontSizePresets as item (item.px)}
										<DropdownMenu.Item onclick={() => { cardFontSize[cardKey] = item.px; }}>
											<Check class={cn('size-4', activeFontSize !== item.px && 'opacity-0')} />
											{item.label}
										</DropdownMenu.Item>
									{:else}
										<div class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
											<SearchX class="size-5" />
											<div class="flex flex-col items-center gap-0.5">
												<p class="text-xs font-medium">No sizes found</p>
												<p class="text-[11px]">Try a different search term</p>
											</div>
										</div>
									{/each}
									<DropdownMenu.Separator />
									<div class="px-2 py-1.5">
										<div class="flex items-center justify-between gap-2">
											<span class="text-[11px] text-muted-foreground">Custom</span>
											<span class="font-mono text-[11px] font-medium text-muted-foreground">{activeFontSize || 16}px</span>
										</div>
										<input
											type="range"
											min="8"
											max="48"
											step="1"
											value={activeFontSize || 16}
											class="mt-1 w-full accent-primary"
											oninput={(e) => { cardFontSize[cardKey] = Number((e.target as HTMLInputElement).value); }}
											onkeydown={(e) => e.stopPropagation()}
										/>
									</div>
								</div>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>
						<!-- Real Browser submenu -->
						{#if componentName}
						<DropdownMenu.Sub
							onOpenChange={(open) => {
								if (open) {
									browserSearchQuery = '';
									fetchPlaywrightDevices();
								}
							}}
						>
							<DropdownMenu.SubTrigger>
								<Camera class="size-4" />
								Real Browser
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent class="flex max-h-96 w-64 flex-col overflow-hidden">
								<div class="shrink-0 px-2 pb-1.5 pt-1">
									<div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
										<Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
										<input
											type="text"
											placeholder="Search devices..."
											class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
											bind:value={browserSearchQuery}
											onkeydown={(e) => e.stopPropagation()}
										/>
									</div>
								</div>
								<div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
									<!-- Browser engine selector -->
									<DropdownMenu.Label class="text-xs">Engine</DropdownMenu.Label>
									{#each [
										{ id: 'chromium' as Str, label: 'Chromium' as Str },
										{ id: 'firefox' as Str, label: 'Firefox' as Str },
										{ id: 'webkit' as Str, label: 'WebKit (Safari)' as Str },
									] as eng (eng.id)}
										<DropdownMenu.Item
											onSelect={(e) => {
												e.preventDefault();
												cardScreenBrowser[cardKey] = eng.id;
											}}
										>
											<Check class={cn('size-4', (cardScreenBrowser[cardKey] || 'chromium') !== eng.id && 'opacity-0')} />
											{eng.label}
										</DropdownMenu.Item>
									{/each}
									<DropdownMenu.Separator />
									<!-- Device selector -->
									<DropdownMenu.Label class="text-xs">Device</DropdownMenu.Label>
									{#if !devicesLoaded}
										<div class="flex items-center justify-center py-4">
											<LoaderCircle class="size-4 animate-spin text-muted-foreground" />
										</div>
									{:else if filteredPlaywrightDevices.length === 0}
										<div class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
											<SearchX class="size-5" />
											<div class="flex flex-col items-center gap-0.5">
												<p class="text-xs font-medium">No devices found</p>
												<p class="text-[11px]">Try a different search term</p>
											</div>
										</div>
									{:else}
										<DropdownMenu.Item
											onSelect={(e) => {
												e.preventDefault();
												cardScreenDevice[cardKey] = '';
											}}
										>
											<Check class={cn('size-4', (cardScreenDevice[cardKey] || '') !== '' && 'opacity-0')} />
											<span class="text-muted-foreground">Default viewport</span>
										</DropdownMenu.Item>
										{#each filteredDeviceCategories as category (category)}
											<DropdownMenu.Separator />
											<DropdownMenu.Label class="text-[10px]">{category}</DropdownMenu.Label>
											{#each filteredPlaywrightDevices.filter((d) => inferDeviceCategory(d.name) === category) as device (device.name)}
												<DropdownMenu.Item
													onSelect={(e) => {
														e.preventDefault();
														cardScreenDevice[cardKey] = device.name;
													}}
												>
													<Check class={cn('size-4', (cardScreenDevice[cardKey] || '') !== device.name && 'opacity-0')} />
													<span class="flex-1 truncate">{device.name}</span>
													{#if device.os}
														<span class="text-[9px] text-muted-foreground/60">{device.os}</span>
													{/if}
													<span class="ml-auto text-[10px] text-muted-foreground">{device.width}×{device.height}</span>
												</DropdownMenu.Item>
											{/each}
										{/each}
									{/if}
									<DropdownMenu.Separator />
									<!-- Capture button -->
									<div class="sticky bottom-0 border-t bg-popover px-2 py-1.5">
										<button
											type="button"
											class="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
											disabled={cardScreenCapturing[cardKey]}
											onclick={() => captureScreenshot(cardKey, variantKey, variantOption)}
										>
											{#if cardScreenCapturing[cardKey]}
												<LoaderCircle class="size-3.5 animate-spin" />
												Capturing...
											{:else}
												<Camera class="size-3.5" />
												Capture Screenshot
											{/if}
										</button>
									</div>
								</div>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>
						{/if}
						<DropdownMenu.Separator />
						<DropdownMenu.Sub
							onOpenChange={(open) => {
								if (open) exportSearchQuery = '';
							}}
						>
							<DropdownMenu.SubTrigger>
								<Download class="size-4" />
								Export
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent class="flex max-h-80 w-52 flex-col overflow-hidden">
								<div class="shrink-0 px-2 pb-1.5 pt-1">
									<div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
										<Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
										<input
											type="text"
											placeholder="Search formats..."
											class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
											bind:value={exportSearchQuery}
											onkeydown={(e) => e.stopPropagation()}
										/>
									</div>
								</div>
								<div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
									{#each filteredExportCategories as category (category)}
										{#if filteredExportCategories.indexOf(category) > 0}
											<DropdownMenu.Separator />
										{/if}
										<DropdownMenu.Label class="text-xs">{category}</DropdownMenu.Label>
										{#each filteredExportItems.filter((i) => i.category === category) as item (item.id)}
											<DropdownMenu.Item
												onSelect={(e) => {
													e.preventDefault();
													handleExport(cardKey, item.id);
												}}
											>
												{#if exportInProgress === item.id}
													<LoaderCircle class="size-4 animate-spin text-muted-foreground" />
												{:else if exportFeedback === item.id}
													<Check class="size-4 text-green-500" />
												{:else}
													<item.icon class="size-4" />
												{/if}
												{item.label}
											</DropdownMenu.Item>
										{/each}
									{:else}
										<div class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
											<SearchX class="size-5" />
											<div class="flex flex-col items-center gap-0.5">
												<p class="text-xs font-medium">No formats found</p>
												<p class="text-[11px]">Try a different search term</p>
											</div>
										</div>
									{/each}
								</div>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>
						{#if getActiveSettings(cardKey).length > 0}
							<DropdownMenu.Separator />
							{#if getAllCardKeys().length > 1}
								<DropdownMenu.Item onclick={() => applySettingsToAll(cardKey)}>
									<CopyCheck class="size-4" />
									Apply to All Cards
								</DropdownMenu.Item>
							{/if}
							<DropdownMenu.Item onclick={() => resetCard(cardKey)}>
								<RotateCcw class="size-4" />
								Reset to Defaults
							</DropdownMenu.Item>
						{/if}
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		</div>
		<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
		<div
			bind:this={cardPreviewRefs[cardKey]}
			use:consoleCapture={cardKey}
			class={cn(
				'relative flex w-full items-center overflow-auto p-4',
				isFullscreen && 'flex-1',
			!hasViewport(cardKey) && 'justify-center',
				activeMode === 'dark' && 'dark bg-background text-foreground',
				activeMode === 'light' && 'lens-force-light bg-background text-foreground',
				activeMode === 'auto' && activeTheme && pageIsDark && 'dark',
				activeMode === 'auto' && activeTheme && !pageIsDark && 'lens-force-light',
				activeTheme && 'bg-background text-foreground',
				(cardMeasureActive[cardKey] || cardInspectActive[cardKey]) && 'cursor-crosshair',
			)}
			style={[getBackgroundStyle(cardKey), cardContentHeights[cardKey] ? `min-height: ${cardContentHeights[cardKey] + 32}px` : '', activeMode === 'light' ? 'color-scheme: light' : '', activeMode === 'dark' ? 'color-scheme: dark' : '', activeMode === 'auto' && activeTheme && !pageIsDark ? 'color-scheme: light' : '', activeMode === 'auto' && activeTheme && pageIsDark ? 'color-scheme: dark' : '', getFontSizeVars(cardKey)].filter(Boolean).join('; ')}
			data-theme={activeTheme || undefined}
			data-lens-debug={cardDebugOutline[cardKey] ? cardKey : undefined}
			dir={(cardTextDir[cardKey] ?? 'auto') !== 'auto'
				? /* Guard ensures 'ltr' | 'rtl' — Str too wide for dir attr */ (cardTextDir[cardKey] as 'ltr' | 'rtl')
				: undefined}
			onmousemove={(e) => handleMeasureMove(e, cardKey)}
			onmouseleave={() => handleMeasureLeave(cardKey)}
			onclickcapture={(e) => handleInspectClick(e, cardKey)}
			onkeydown={(e) => { if (cardInspectActive[cardKey] && e.key === 'Escape') { cardInspectActive[cardKey] = false; cardInspectedEl[cardKey] = null; } }}
		>
			{#if hasColorMatrixSim(cardKey)}
				<svg class="absolute size-0 overflow-hidden" aria-hidden="true">
					<defs>
						<filter id={filterId(cardKey)}>
							<feColorMatrix type="matrix" values={COLOR_MATRICES[cardSimulations[cardKey] ?? ''] ?? ''} />
						</filter>
					</defs>
				</svg>
			{/if}
			<div class={cn(hasViewport(cardKey) && 'flex max-w-full flex-col items-start overflow-x-auto')}>
			{#if hasViewport(cardKey)}
				{@const vpLabel = getViewportPreset(cardKey)}
				{@const vpOrientation = ORIENTATION_PRESETS.find((p) => p.id === (cardOrientations[cardKey] ?? 'default'))}
				{#if vpLabel}
					<div class="mb-3 flex items-center gap-2">
						<span class="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
							{#if vpLabel.category === 'Watches'}
								<Watch class="size-3" />
							{:else if vpLabel.category === 'Phones' || vpLabel.category === 'Foldables'}
								<Smartphone class="size-3" />
							{:else if vpLabel.category === 'Tablets' || vpLabel.category === 'Fire Tablets' || vpLabel.category === 'E-Readers'}
								<Tablet class="size-3" />
							{:else if vpLabel.category === 'Chromebooks' || vpLabel.category === 'Laptop / Desktop'}
								<Monitor class="size-3" />
							{:else if vpLabel.category === 'Handhelds' || vpLabel.category === 'Smart Displays'}
								<MonitorSmartphone class="size-3" />
							{:else if vpLabel.category === 'Automotive'}
								<Car class="size-3" />
							{:else if vpLabel.category === 'VR / AR'}
								<Glasses class="size-3" />
							{:else if vpLabel.category === 'Smart Appliances'}
								<Refrigerator class="size-3" />
							{:else if vpLabel.category === 'TV'}
								<Tv class="size-3" />
							{:else}
								<Monitor class="size-3" />
							{/if}
							<span class="truncate">{vpLabel.label}</span>
						</span>
						<span class="font-mono text-[9px] tabular-nums text-muted-foreground/40">{vpLabel.width}&times;{vpLabel.height}</span>
						{#if vpOrientation}
							<span class="flex items-center gap-1 text-muted-foreground/50">
								<span class="relative inline-flex items-center justify-center" style="width: 12px; height: 12px;">
									<span
										class="rounded-[1.5px] border border-current"
										style="width: 6px; height: 10px; transform: rotate({vpOrientation.rotation}deg);"
									></span>
								</span>
								<span class="text-[9px]">{vpOrientation.rotation}°</span>
							</span>
						{/if}
					</div>
				{/if}
			{/if}
			<div
				class={cn('relative', hasViewport(cardKey) && 'lens-device-frame flex max-h-full flex-col', hasViewport(cardKey) && getViewportFrameClass(getViewportPreset(cardKey)?.category ?? ''))}
				style={getViewportFrameStyle(cardKey)}
			>
			{#if hasViewport(cardKey)}
				{@const vpChrome = getViewportPreset(cardKey)}
				{#if vpChrome}
					{#if vpChrome.category === 'Phones' || vpChrome.category === 'Foldables'}
						<!-- Phone: Dynamic Island / notch bar -->
						<div class="lens-device-header flex items-center justify-center px-3 py-1.5">
							<div class="lens-device-notch"></div>
						</div>
					{:else if vpChrome.category === 'Tablets' || vpChrome.category === 'Fire Tablets'}
						<!-- Tablet: thin camera strip -->
						<div class="lens-device-header flex items-center justify-center py-1">
							<div class="lens-device-camera"></div>
						</div>
					{:else if vpChrome.category === 'Laptop / Desktop' || vpChrome.category === 'Chromebooks'}
						<!-- Monitor/Laptop: webcam + brand bar -->
						<div class="lens-device-header flex items-center justify-center py-1.5">
							<div class="lens-device-camera"></div>
						</div>
					{:else if vpChrome.category === 'TV'}
						<!-- TV: thin top bezel only (no camera) -->
						<div class="lens-device-header py-0.5"></div>
					{:else if vpChrome.category === 'Automotive'}
						<!-- Automotive: status bar with signal indicators -->
						<div class="lens-device-header flex items-center justify-between px-3 py-1">
							<span class="text-[8px] font-medium opacity-40">HUD</span>
							<span class="text-[8px] tabular-nums opacity-30">--:--</span>
						</div>
					{:else if vpChrome.category === 'Smart Displays'}
						<!-- Smart Display: status bar with time placeholder -->
						<div class="lens-device-header flex items-center justify-end px-3 py-1">
							<div class="lens-device-camera mr-auto"></div>
							<span class="text-[8px] tabular-nums opacity-30">12:00</span>
						</div>
					{/if}
				{/if}
			{/if}
			<div
				class={cn('relative', hasViewport(cardKey) && (getViewportPreset(cardKey)?.category === 'Watches' ? 'lens-device-content overflow-hidden' : 'lens-device-content overflow-auto'))}
				style={getViewportContentStyle(cardKey)}
			>
			<LensPortalScope mode={activeMode} theme={activeTheme} {pageIsDark}>
				<div
					use:trackContentSize={{ key: cardKey, landscape: isLandscapeOrientation(cardKey) }}
					class={cn(activeOutline !== 'none' && 'lens-outline', getMediaPrefClasses(cardKey))}
					style={[getSimulationFilter(cardKey), getZoomStyle(cardKey), getOrientationStyle(cardKey), activeOutline !== 'none' ? `--lens-outline-color: ${getOutlineColor(cardKey)}` : ''].filter(Boolean).join('; ')}
				>
					<LensStats cardKey={cardKey} onstats={handleStats} propsTotal={propsMeta.length} propsWithDefaults={propsWithDefaultsCount}>
					{#if children}
						{@render children()}
					{:else if ContextWrapper}
					<ContextWrapper>
						<Target {...baseProps} {...extraProps}>
							{#if useIcon}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<circle cx="12" cy="12" r="10"></circle>
								</svg>
							{:else}
								{label}
							{/if}
						</Target>
					</ContextWrapper>
					{:else}
						<Target {...baseProps} {...extraProps}>
							{#if useIcon}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<circle cx="12" cy="12" r="10"></circle>
								</svg>
							{:else}
								{label}
							{/if}
						</Target>
					{/if}
					</LensStats>
				</div>
			</LensPortalScope>
			{#if hasTunnelVision(cardKey)}
				<div
					class="pointer-events-none absolute inset-0"
					style="background: radial-gradient(circle at center, transparent 20%, rgba(0,0,0,0.85) 60%)"
				></div>
			{/if}
			{#if activeGrid !== 'none'}
				<div
					class="pointer-events-none absolute inset-0"
					style={getGridStyle(cardKey)}
				></div>
			{/if}
			{#if cardNetworkLoading[cardKey]}
				<div class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-sm">
					{#if (cardNetworkSim[cardKey] ?? 'none') === 'offline'}
						<WifiOff class="size-6 text-destructive" />
						<span class="text-xs font-medium text-destructive">Offline</span>
					{:else}
						<div class="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"></div>
						<span class="text-xs text-muted-foreground">
							{(cardNetworkSim[cardKey] ?? 'none') === 'custom' ? `${cardCustomNetwork[cardKey]?.delay ?? 200}ms latency` : (NETWORK_PRESETS.find((p) => p.id === (cardNetworkSim[cardKey] ?? 'none'))?.label ?? 'Loading')}...
						</span>
					{/if}
				</div>
			{/if}
			</div>
			{#if hasViewport(cardKey)}
				{@const vpBottom = getViewportPreset(cardKey)}
				{#if vpBottom}
					{#if vpBottom.category === 'Phones' || vpBottom.category === 'Foldables'}
						<!-- Phone: home indicator bar -->
						<div class="lens-device-footer flex items-center justify-center py-1.5">
							<div class="lens-device-home-indicator"></div>
						</div>
					{:else if vpBottom.category === 'Tablets' || vpBottom.category === 'Fire Tablets'}
						<!-- Tablet: thin bottom bezel -->
						<div class="lens-device-footer py-1"></div>
					{:else if vpBottom.category === 'TV'}
						<!-- TV: bottom bezel with brand area -->
						<div class="lens-device-footer flex items-center justify-center py-1.5">
							<div class="h-px w-8 rounded-full bg-current opacity-20"></div>
						</div>
					{:else if vpBottom.category === 'Laptop / Desktop' || vpBottom.category === 'Chromebooks'}
						<!-- Monitor: chin with logo area -->
						<div class="lens-device-footer flex items-center justify-center py-1">
							<div class="h-px w-6 rounded-full bg-current opacity-15"></div>
						</div>
					{/if}
				{/if}
			{/if}
			</div>
			</div>
			{#if cardDebugOutline[cardKey]}
				{@html `<style data-lens-debug-outline>${buildDebugOutlineCSS(cardKey)}</style>`}
			{/if}
			{#if cardMeasureActive[cardKey] && cardMeasureData[cardKey]}
				{@const m = cardMeasureData[cardKey]}
				{#if m}
				<!-- Margin overlay -->
				<div class="pointer-events-none absolute" style="left:{m.content.x - m.padding.left - m.border.left - m.margin.left}px;top:{m.content.y - m.padding.top - m.border.top - m.margin.top}px;width:{m.width + m.margin.left + m.margin.right}px;height:{m.height + m.margin.top + m.margin.bottom}px;background:rgba(246,178,107,0.25);"></div>
				<!-- Border overlay -->
				<div class="pointer-events-none absolute" style="left:{m.content.x - m.padding.left - m.border.left}px;top:{m.content.y - m.padding.top - m.border.top}px;width:{m.width}px;height:{m.height}px;background:rgba(255,229,153,0.3);"></div>
				<!-- Padding overlay -->
				<div class="pointer-events-none absolute" style="left:{m.content.x - m.padding.left}px;top:{m.content.y - m.padding.top}px;width:{m.content.w + m.padding.left + m.padding.right}px;height:{m.content.h + m.padding.top + m.padding.bottom}px;background:rgba(147,196,125,0.3);"></div>
				<!-- Content overlay -->
				<div class="pointer-events-none absolute" style="left:{m.content.x}px;top:{m.content.y}px;width:{m.content.w}px;height:{m.content.h}px;background:rgba(111,168,220,0.3);"></div>
				<!-- Dimension label -->
				<div class="pointer-events-none absolute rounded bg-gray-900/90 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white" style="left:{m.content.x}px;top:{m.content.y - 20}px;">
					{Math.round(m.width)} × {Math.round(m.height)}
				</div>
				<!-- Margin labels -->
				{#if m.margin.top > 0}
					<div class="pointer-events-none absolute font-mono text-[9px] font-medium text-orange-700" style="left:{m.content.x + m.content.w / 2 - 8}px;top:{m.content.y - m.padding.top - m.border.top - m.margin.top + 1}px;">{Math.round(m.margin.top)}</div>
				{/if}
				{#if m.margin.bottom > 0}
					<div class="pointer-events-none absolute font-mono text-[9px] font-medium text-orange-700" style="left:{m.content.x + m.content.w / 2 - 8}px;top:{m.content.y + m.content.h + m.padding.bottom + m.border.bottom + 1}px;">{Math.round(m.margin.bottom)}</div>
				{/if}
				<!-- Padding labels -->
				{#if m.padding.top > 0}
					<div class="pointer-events-none absolute font-mono text-[9px] font-medium text-green-700" style="left:{m.content.x + m.content.w / 2 - 8}px;top:{m.content.y - m.padding.top + 1}px;">{Math.round(m.padding.top)}</div>
				{/if}
				{#if m.padding.bottom > 0}
					<div class="pointer-events-none absolute font-mono text-[9px] font-medium text-green-700" style="left:{m.content.x + m.content.w / 2 - 8}px;top:{m.content.y + m.content.h + 1}px;">{Math.round(m.padding.bottom)}</div>
				{/if}
				{/if}
			{/if}
		</div>
		{#if cardInspectActive[cardKey] && cardInspectedEl[cardKey]}
			{@const el = cardInspectedEl[cardKey]}
			{#if el}
			<div class="border-t bg-muted/30 px-3 py-2 text-xs" transition:slide={{ duration: 200 }}>
				<div class="mb-1.5 flex items-center gap-2">
					<code class="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary">&lt;{el.tag}&gt;</code>
					{#if el.id}<code class="font-mono text-[10px] text-muted-foreground">#{el.id}</code>{/if}
					<span class="ml-auto font-mono text-[10px] text-muted-foreground">{el.rect.width} × {el.rect.height}px</span>
				</div>
				{#if el.classes}
					<div class="mb-1.5 flex flex-wrap gap-1">
						{#each el.classes.split(' ').filter(Boolean) as cls (cls)}
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground">.{cls}</code>
						{/each}
					</div>
				{/if}
				{#each Object.entries(el.styles) as [group, props] (group)}
					<div class="mb-1">
						<h5 class="mb-0.5 text-[10px] font-semibold text-muted-foreground">{group}</h5>
						<div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0">
							{#each Object.entries(props) as [prop, val] (prop)}
								<span class="font-mono text-[10px] text-muted-foreground">{prop}</span>
								<span class="truncate font-mono text-[10px]">{val}</span>
							{/each}
						</div>
					</div>
				{/each}
			</div>
			{/if}
		{/if}
		{#if (tagName || codeText) && openCards[cardKey]}
			<div class="overflow-hidden border-t bg-muted/20" transition:slide={{ duration: 200 }}>
				<div class="min-w-0 overflow-x-auto p-3 text-sm">
					<CodeBlock code={codeText ?? snippet} lang="svelte" />
				</div>
			</div>
		{/if}
		{#if cardConsoleOpen[cardKey]}
			{@const logs = cardConsoleLogs[cardKey] ?? []}
			<div class="overflow-hidden border-t bg-muted/20" transition:slide={{ duration: 200 }}>
				<div class="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
					<div class="flex items-center gap-2">
						<Terminal class="size-3 text-muted-foreground" aria-hidden="true" />
						<span class="text-[10px] font-semibold text-muted-foreground">Console</span>
						<span class="text-[10px] text-muted-foreground/60">{logs.length} entries</span>
					</div>
					{#if logs.length > 0}
						<button
							type="button"
							class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
							onclick={() => { cardConsoleLogs[cardKey] = []; }}
						>
							<Trash2 class="size-3" aria-hidden="true" />
							Clear
						</button>
					{/if}
				</div>
				<div class="max-h-64 overflow-y-auto font-mono text-[11px]">
					{#if logs.length === 0}
						<div class="px-3 py-4 text-center text-[11px] text-muted-foreground/50">
							No console output yet. Interact with the component to see events, mutations, and logs.
						</div>
					{:else}
						{#each logs as entry, i (i)}
							<div class={cn(
								'flex items-start gap-2 border-b border-border/30 px-3 py-1 last:border-b-0',
								entry.level === 'error' && 'bg-red-500/5',
								entry.level === 'warn' && 'bg-amber-500/5',
							)}>
								<span class="shrink-0 pt-px text-[9px] tabular-nums text-muted-foreground/50">+{entry.ts}ms</span>
								<span class={cn('shrink-0 pt-px text-[9px] font-bold', getConsoleColor(entry.level))}>{getConsoleLabel(entry.level)}</span>
								<div class="min-w-0 flex-1">
									<span class="break-all">{entry.message}</span>
									{#if entry.detail}
										<span class="ml-1 break-all text-muted-foreground/60">{entry.detail}</span>
									{/if}
								</div>
								{#if entry.source}
									<span class="shrink-0 text-[9px] text-muted-foreground/40">{entry.source}</span>
								{/if}
							</div>
						{/each}
					{/if}
				</div>
			</div>
		{/if}
		{#if (cardScreenshots[cardKey] ?? []).length > 0}
			<div class="overflow-hidden border-t bg-muted/20" transition:slide={{ duration: 200 }}>
				<div class="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
					<div class="flex items-center gap-2">
						<Camera class="size-3.5 text-muted-foreground" aria-hidden="true" />
						<span class="text-xs font-semibold text-muted-foreground">Screenshots</span>
						<span class="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{(cardScreenshots[cardKey] ?? []).length}</span>
					</div>
					<Tooltip.Root delayDuration={300}>
						<Tooltip.Trigger>
							{#snippet child({ props: triggerProps })}
								<button
									{...triggerProps}
									type="button"
									class="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
									onclick={() => {
										const captures: ScreenshotCapture[] = cardScreenshots[cardKey] ?? [];
										for (const c of captures) URL.revokeObjectURL(c.imageUrl);
										cardScreenshots[cardKey] = [];
									}}
								>
									<Trash2 class="size-3.5" aria-hidden="true" />
									Clear All
								</button>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content side="top" sideOffset={4}>
							Clear all screenshots
						</Tooltip.Content>
					</Tooltip.Root>
				</div>
				<div class="flex max-h-[32rem] flex-wrap gap-3 overflow-y-auto p-3">
					{#each (cardScreenshots[cardKey] ?? []) as capture, idx (capture.timestamp)}
						<div class="w-80 overflow-hidden rounded-md border bg-background shadow-sm">
							<!-- Header: browser name + version + device + delete -->
							<div class="flex items-center gap-1.5 border-b bg-muted/30 px-2 py-1.5">
								<Chrome class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
								<span class="text-[11px] font-semibold text-foreground">{capture.browserDisplayName}</span>
								{#if capture.browserVersion}
									<span class="text-[10px] text-muted-foreground/60">v{capture.browserVersion}</span>
								{/if}
								{#if capture.device !== 'custom'}
									<span class="text-[10px] text-muted-foreground/60">· {capture.device}</span>
								{/if}
								{#if capture.deviceOS}
									<span class="rounded bg-muted px-1 text-[9px] text-muted-foreground/70">{capture.deviceOS}</span>
								{/if}
								<Tooltip.Root delayDuration={300}>
									<Tooltip.Trigger>
										{#snippet child({ props: triggerProps })}
											<button
												{...triggerProps}
												type="button"
												class="ml-auto rounded p-1 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
												onclick={() => removeScreenshot(cardKey, idx as Num)}
												aria-label="Remove screenshot"
											>
												<Trash2 class="size-3.5" />
											</button>
										{/snippet}
									</Tooltip.Trigger>
									<Tooltip.Content side="top" sideOffset={4}>
										Remove this screenshot
									</Tooltip.Content>
								</Tooltip.Root>
							</div>
							<!-- Screenshot image -->
							<a href={capture.imageUrl} target="_blank" rel="noopener" class="block border-b">
								<img
									src={capture.imageUrl}
									alt="{cardKey} screenshot — {capture.browserDisplayName} {capture.device}"
									class="max-h-64 w-full object-contain"
								/>
							</a>
							<!-- Performance timing -->
							{#if Object.keys(capture.performance).length > 0}
								<div class="border-b px-2 py-1.5">
									<div class="mb-1 flex items-center gap-1.5">
										<Activity class="size-3 text-muted-foreground" aria-hidden="true" />
										<span class="text-[10px] font-semibold text-muted-foreground">Performance</span>
									</div>
									<div class="grid grid-cols-2 gap-x-3 gap-y-0.5">
										{#if capture.performance.firstContentfulPaint != null}
											<span class="text-[10px] text-muted-foreground">FCP</span>
											<span class="text-[10px] font-mono">{capture.performance.firstContentfulPaint}ms</span>
										{/if}
										{#if capture.performance.firstPaint != null}
											<span class="text-[10px] text-muted-foreground">First Paint</span>
											<span class="text-[10px] font-mono">{capture.performance.firstPaint}ms</span>
										{/if}
										{#if capture.performance.domContentLoaded != null}
											<span class="text-[10px] text-muted-foreground">DCL</span>
											<span class="text-[10px] font-mono">{capture.performance.domContentLoaded}ms</span>
										{/if}
										{#if capture.performance.load != null}
											<span class="text-[10px] text-muted-foreground">Load</span>
											<span class="text-[10px] font-mono">{capture.performance.load}ms</span>
										{/if}
										{#if capture.performance.domInteractive != null}
											<span class="text-[10px] text-muted-foreground">Interactive</span>
											<span class="text-[10px] font-mono">{capture.performance.domInteractive}ms</span>
										{/if}
										{#if capture.performance.responseEnd != null}
											<span class="text-[10px] text-muted-foreground">TTFB</span>
											<span class="text-[10px] font-mono">{capture.performance.responseEnd}ms</span>
										{/if}
									</div>
								</div>
							{/if}
							<!-- Console logs -->
							{#if capture.consoleLogs.length > 0}
								<div class="px-2 py-1.5">
									<div class="mb-1 flex items-center gap-1.5">
										<Terminal class="size-3 text-muted-foreground" aria-hidden="true" />
										<span class="text-[10px] font-semibold text-muted-foreground">Console</span>
										<span class="text-[10px] text-muted-foreground/60">{capture.consoleLogs.length}</span>
									</div>
									<div class="max-h-24 overflow-y-auto">
										{#each capture.consoleLogs as entry (entry.text + entry.level)}
											<div class="flex gap-1.5 border-t border-dashed border-muted py-0.5 first:border-0">
												<span class="shrink-0 text-[9px] font-mono {entry.level === 'error' ? 'text-red-500' : entry.level === 'warn' ? 'text-yellow-500' : 'text-muted-foreground/60'}">{entry.level}</span>
												<span class="truncate text-[10px] font-mono text-muted-foreground">{entry.text}</span>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/snippet}

{#snippet errorCard(cardLabel: Str, error: unknown)}
	<div class="overflow-hidden rounded-md border border-dashed bg-background">
		<div class="border-b bg-muted/30 px-3 py-1.5">
			<code class="text-xs text-muted-foreground">{cardLabel}</code>
		</div>
		<LensError title="Render error" description={getErrorCause(error)} class="rounded-none border-0 py-4" />
		<div class="max-h-48 overflow-auto border-t bg-muted/20 text-xs">
			<CodeBlock code={serializeError(error)} lang="json" />
		</div>
	</div>
{/snippet}

{#if hasVariants}
	<!-- Variant mode: export all stats button + per-option cards -->
	{#if Object.keys(cardStats).length > 1}
		<div class="mb-2 flex justify-end gap-2">
			<Tooltip.Provider>
				<Tooltip.Root delayDuration={300} open={statsExportCopied === 'all' ? true : undefined}>
					<Tooltip.Trigger>
						{#snippet child({ props: tipProps })}
							<button
								{...tipProps}
								type="button"
								class="inline-flex items-center gap-1.5 rounded-md border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
								onclick={async () => {
									const allStats: Record<Str, LensStatsData> = cardStats;
									const report: Str = JSON.stringify({
										component: tagName ?? componentName ?? 'Component',
										variantCount: Object.keys(allStats).length,
										variants: allStats,
									}, null, 2);
									await navigator.clipboard.writeText(report);
									statsExportCopied = 'all';
									setTimeout((): Void => { statsExportCopied = ''; }, 2000);
								}}
							>
								{#if statsExportCopied === 'all'}
									<span in:fade={{ duration: 150 }}>
										<Check class="size-3.5 text-green-500" aria-hidden="true" />
									</span>
								{:else}
									<span in:fade={{ duration: 150 }}>
										<FileJson class="size-3.5" aria-hidden="true" />
									</span>
								{/if}
								Export All Performance Statistics ({Object.keys(cardStats).length} variants)
							</button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="top" sideOffset={4}>
						{statsExportCopied === 'all' ? 'Copied!' : 'Copy all variant stats as JSON to clipboard'}
					</Tooltip.Content>
				</Tooltip.Root>
			</Tooltip.Provider>
		</div>
	{/if}
	<div class={cn('space-y-4', className)}>
		{#each (meta?.variants ?? []).filter((v) => v.key) as variantKey, vi (variantKey.key ?? `fallback-${vi}`)}
			{@const variantName: Str = variantKey.key}
			{@const options: Str[] = variantKey.options}
			<div class="grid gap-3">
				{#each options as option, oi (oi)}
					{@const variantProps: Record<Str, unknown> = buildVariantProps(variantName, option, variantKey.coerce)}
					{@const cardKey: Str = `${variantName}:${option}`}
					{@const snippet: Str = codeSnippet(variantName, option)}
					<svelte:boundary>
						{@render card(option, cardKey, snippet, variantProps, isIconOption(option), variantName, option)}
						{#snippet failed(error)}
							{@render errorCard(option, error)}
						{/snippet}
					</svelte:boundary>
				{/each}
			</div>
		{/each}
	</div>
{:else}
	<!-- Default mode: single card with base props -->
	<div class={cn('', className)}>
		<svelte:boundary>
			{@render card('default', 'default', codeSnippet('', ''), {}, false, '', '')}
			{#snippet failed(error)}
				{@render errorCard(label || componentName || 'default', error)}
			{/snippet}
		</svelte:boundary>
	</div>
{/if}

<style>
	/* ── Device viewport frame — uses theme CSS variables for dark/light/theme awareness ── */

	:global(.lens-device-frame) {
		background: color-mix(in oklch, var(--muted) 80%, black 20%);
		border: 3px solid var(--border);
		box-shadow:
			0 0 0 1px color-mix(in oklch, var(--border) 60%, black 40%),
			0 2px 4px oklch(0 0 0 / 0.2),
			0 12px 40px -8px oklch(0 0 0 / 0.3),
			inset 0 1px 0 color-mix(in oklch, var(--muted) 50%, white 50%),
			inset 0 -1px 0 color-mix(in oklch, var(--border) 70%, black 30%);
		overflow: hidden;
		padding: 6px;
	}

	:global(.lens-device-header) {
		background: color-mix(in oklch, var(--muted) 70%, black 30%);
		border-bottom: 1px solid color-mix(in oklch, var(--border) 80%, black 20%);
		border-radius: inherit;
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
	}

	/** Content area — the viewport's inner scrollable region between header and footer. */
	:global(.lens-device-content) {
		background: var(--background, #fff);
	}

	:global(.lens-device-footer) {
		background: color-mix(in oklch, var(--muted) 70%, black 30%);
		border-top: 1px solid color-mix(in oklch, var(--border) 80%, black 20%);
		color: var(--muted-foreground);
	}

	/* ── Phone / Foldable chrome ── */

	/** Phone Dynamic Island / notch pill. */
	:global(.lens-device-notch) {
		width: 80px;
		height: 6px;
		border-radius: 3px;
		background: color-mix(in oklch, var(--muted) 50%, black 50%);
		box-shadow: inset 0 1px 2px oklch(0 0 0 / 0.3);
	}

	/** Phone home indicator bar at the bottom. */
	:global(.lens-device-home-indicator) {
		width: 40%;
		max-width: 140px;
		height: 4px;
		border-radius: 2px;
		background: color-mix(in oklch, var(--muted-foreground) 40%, transparent 60%);
	}

	:global(.lens-device-frame-phone) {
		padding: 4px;
	}

	/* ── Watch chrome ── */

	:global(.lens-device-frame-watch) {
		padding: 12px;
	}

	/* ── Tablet chrome ── */

	/** Camera dot for tablets and monitors. */
	:global(.lens-device-camera) {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: color-mix(in oklch, var(--muted) 40%, black 60%);
		box-shadow: inset 0 0.5px 1px oklch(0 0 0 / 0.4);
	}

	:global(.lens-device-frame-tablet) {
		padding: 6px;
	}

	/* ── Handheld (Steam Deck, Switch) chrome ── */

	:global(.lens-device-frame-handheld) {
		padding: 8px;
	}

	/* ── TV chrome ── */

	:global(.lens-device-frame-tv) {
		padding: 3px;
		border-width: 4px;
	}

	/* ── Monitor / Laptop chrome ── */

	:global(.lens-device-frame-monitor) {
		padding: 4px;
		border-width: 2px;
	}

	/* ── Automotive chrome ── */

	:global(.lens-device-frame-auto) {
		padding: 4px;
		border-width: 2px;
	}

	:global(.lens-outline *) {
		outline: 1px solid var(--lens-outline-color, rgba(239, 68, 68, 0.25));
	}

	/* ── Media Query Preference emulation ── */

	/** Emulate prefers-reduced-motion: reduce — kill all animations and transitions. */
	:global(.lens-reduced-motion *),
	:global(.lens-reduced-motion *::before),
	:global(.lens-reduced-motion *::after) {
		animation-duration: 0.001ms !important;
		animation-iteration-count: 1 !important;
		transition-duration: 0.001ms !important;
		scroll-behavior: auto !important;
	}

	/** Emulate prefers-contrast: more — boost contrast on the card content. */
	:global(.lens-contrast-more) {
		filter: contrast(1.5);
	}

	/** Emulate prefers-contrast: less — reduce contrast on the card content. */
	:global(.lens-contrast-less) {
		filter: contrast(0.75);
	}

	/** Emulate prefers-reduced-transparency: reduce — force full opacity. */
	:global(.lens-reduced-transparency) {
		backdrop-filter: none !important;
	}

	:global(.lens-reduced-transparency *) {
		backdrop-filter: none !important;
		opacity: 1 !important;
	}

	/** Emulate forced-colors: active — high contrast black/white mode. */
	:global(.lens-forced-colors) {
		background: Canvas !important;
		color: CanvasText !important;
		forced-color-adjust: none;
	}

	:global(.lens-forced-colors *) {
		color: CanvasText !important;
		background: Canvas !important;
		border-color: CanvasText !important;
		outline-color: CanvasText !important;
		fill: CanvasText !important;
		stroke: CanvasText !important;
		forced-color-adjust: none;
	}

	:global(.lens-forced-colors a),
	:global(.lens-forced-colors a *) {
		color: LinkText !important;
	}

	:global(.lens-forced-colors button),
	:global(.lens-forced-colors [role='button']) {
		border: 2px solid ButtonText !important;
		color: ButtonText !important;
		background: ButtonFace !important;
	}

	/* Force light mode variables on a card preview, overriding .dark ancestor cascade. */
	:global(.lens-force-light) {
		--background: oklch(1 0 0);
		--foreground: oklch(0.145 0 0);
		--card: oklch(1 0 0);
		--card-foreground: oklch(0.145 0 0);
		--popover: oklch(1 0 0);
		--popover-foreground: oklch(0.145 0 0);
		--primary: oklch(0.205 0 0);
		--primary-foreground: oklch(0.985 0 0);
		--secondary: oklch(0.965 0 0);
		--secondary-foreground: oklch(0.205 0 0);
		--muted: oklch(0.965 0 0);
		--muted-foreground: oklch(0.556 0 0);
		--accent: oklch(0.965 0 0);
		--accent-foreground: oklch(0.205 0 0);
		--destructive: oklch(0.577 0.245 27.325);
		--destructive-foreground: oklch(0.577 0.245 27.325);
		--border: oklch(0.922 0 0);
		--input: oklch(0.922 0 0);
		--ring: oklch(0.556 0 0);
		--sidebar: oklch(0.985 0 0);
		--sidebar-foreground: oklch(0.145 0 0);
		--sidebar-primary: oklch(0.205 0 0);
		--sidebar-primary-foreground: oklch(0.985 0 0);
		--sidebar-accent: oklch(0.965 0 0);
		--sidebar-accent-foreground: oklch(0.205 0 0);
		--sidebar-border: oklch(0.922 0 0);
		--sidebar-ring: oklch(0.556 0 0);
	}
</style>
