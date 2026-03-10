<script module lang="ts">
import * as v from 'valibot';
import { StrSchema } from '@/schemas/common';
import { PropMetaSchema, VariantMetaSchema } from '../lens/types.js';
import type { Component, Snippet } from 'svelte';

/** Schema for the LensComponentRenderer component props. */
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
import type { PropMeta, VariantMeta } from '../lens/types.js';
import { buildBaseProps } from '../lens/extract-props.js';
import LensError from '../lens-error/LensError.svelte';
import CopyButton from '../copy-button/CopyButton.svelte';
import CodeBlock from '../code-block/CodeBlock.svelte';
import ColorPicker from '../color-picker/ColorPicker.svelte';
import { Slider } from '../slider/index.js';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import Code from '@lucide/svelte/icons/code';
import Check from '@lucide/svelte/icons/check';
import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
import ExternalLink from '@lucide/svelte/icons/external-link';
import Eye from '@lucide/svelte/icons/eye';
import Grid3x3 from '@lucide/svelte/icons/grid-3x3';
import Maximize from '@lucide/svelte/icons/maximize';
import Monitor from '@lucide/svelte/icons/monitor';
import Moon from '@lucide/svelte/icons/moon';
import Paintbrush from '@lucide/svelte/icons/paintbrush';
import Palette from '@lucide/svelte/icons/palette';
import Search from '@lucide/svelte/icons/search';
import Settings2 from '@lucide/svelte/icons/settings-2';
import Smartphone from '@lucide/svelte/icons/smartphone';
import Sun from '@lucide/svelte/icons/sun';
import SquareDashedMousePointer from '@lucide/svelte/icons/square-dashed-mouse-pointer';
import ZoomIn from '@lucide/svelte/icons/zoom-in';
import ZoomOut from '@lucide/svelte/icons/zoom-out';
import * as DropdownMenu from '../dropdown-menu/index.js';
import * as Tooltip from '../tooltip/index.js';
import { slide } from 'svelte/transition';
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

/** Per-card orientation keyed by card identifier ('default' = no rotation). */
let cardOrientations: Record<Str, Str> = $state({});

/** Per-card color mode keyed by card identifier ('auto' = inherit from page). */
let cardModes: Record<Str, Str> = $state({});

/** Per-card theme keyed by card identifier ('' = inherit from page). */
let cardThemes: Record<Str, Str> = $state({});

/** Per-card measured visual height of the inner content (accounts for zoom + rotation transforms). */
let cardContentHeights: Record<Str, Num> = $state({});

/**
 * Extract a human-readable message from a caught error.
 * Handles Error instances, AppError objects (with .message + .validation), and unknown values.
 *
 * @param error - The caught error value
 * @returns A formatted error message string
 */
function formatBoundaryError(error: unknown): Str {
	if (error instanceof Error) return error.message;
	if (typeof error === 'object' && error !== null) {
		// Cast once for property access — error is an unknown object from svelte:boundary
		const obj: Record<Str, unknown> = error as Record<Str, unknown>;
		const code: Str = typeof obj.code === 'string' ? obj.code : '';

		// AppError with validation details — extract field-level messages
		if (typeof obj.validation === 'object' && obj.validation !== null) {
			const val: Record<Str, unknown> = obj.validation as Record<Str, unknown>;
			if (typeof val.flattened === 'object' && val.flattened !== null) {
				const flat: Record<Str, unknown> = val.flattened as Record<Str, unknown>;
				const nested: Record<Str, unknown> = (flat.nested ?? {}) as Record<Str, unknown>;
				const fields: Str[] = [];
				for (const [key, msgs] of Object.entries(nested)) {
					if (Array.isArray(msgs) && msgs.length > 0) {
						fields.push(`${key}: ${String(msgs[0])}`);
					}
				}
				if (fields.length > 0) {
					const header: Str = code ? `[${code}]` : 'Validation failed';
					return `${header}\n${fields.map((f: Str): Str => `  • ${f}`).join('\n')}`;
				}
			}
		}

		const msg: Str = typeof obj.message === 'string' ? obj.message : '';
		if (msg) return code ? `[${code}] ${msg}` : msg;
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
 * Get the CSS background-image style for a grid overlay.
 *
 * @param key - Card key
 * @returns CSS style string or empty
 */
function getGridStyle(key: Str): Str {
	const color: Str = getGridColor(key);
	if (!color) return '';
	const size: Num = cardGridSizes[key] ?? GRID_DEFAULT_SIZE;
	return `background-image: linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px); background-size: ${size}px ${size}px`;
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
 * Open component in isolation in a new tab.
 *
 * @param variantKey - Optional variant prop name
 * @param option - Optional variant option value
 */
function openIsolation(variantKey: Str, option: Str): Void {
	if (!componentName) return;
	let url: Str = `/isolate/${componentName}`;
	const params: Str[] = [];
	if (variantKey) params.push(`variant=${encodeURIComponent(variantKey)}`);
	if (option) params.push(`option=${encodeURIComponent(option)}`);
	if (params.length > 0) url += `?${params.join('&')}`;
	window.open(url, '_blank');
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
		// Array coercion — split comma-separated option into array items
		coerced = option.split(', ').map((s: Str): Str => s.trim());
	} else if (!Number.isNaN(Number(option)) && option !== '') {
		coerced = Number(option);
	}

	// Dotted key: nested object prop
	if (variantName.includes('.')) {
		const dotIdx: Num = variantName.indexOf('.');
		const parent: Str = variantName.slice(0, dotIdx);
		const child: Str = variantName.slice(dotIdx + 1);
		const existing: unknown = baseProps[parent];
		const parentObj: Record<Str, unknown> =
			typeof existing === 'object' && existing !== null
				? { ...(existing as Record<Str, unknown>) }
				: {};
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

{#snippet toolbarButton(Icon: Component, tooltipText: Str, onclick: () => void, disabled: Bool)}
	<Tooltip.Provider>
		<Tooltip.Root delayDuration={300}>
			<Tooltip.Trigger>
				{#snippet child({ props: tipProps })}
					<button
						type="button"
						{...tipProps}
						class={cn(
							'inline-flex size-5 items-center justify-center rounded-md text-muted-foreground transition-colors',
							disabled ? 'cursor-not-allowed opacity-30' : 'hover:bg-muted hover:text-foreground',
						)}
						onclick={disabled ? undefined : onclick}
						aria-disabled={disabled}
					>
						<Icon class="size-3" aria-hidden="true" />
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
	{@const activeMode: Str = cardModes[cardKey] ?? 'auto'}
	{@const activeTheme: Str = cardThemes[cardKey] ?? ''}
	{@const activeSettings = getActiveSettings(cardKey)}
	<div class="overflow-hidden rounded-md border bg-background">
		<div class="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
			<div class="flex items-center gap-1.5">
				<code class="text-xs text-muted-foreground">{cardLabel}</code>
				{#if activeSettings.length > 0}
					<Tooltip.Provider>
						<Tooltip.Root delayDuration={200}>
							<Tooltip.Trigger>
								{#snippet child({ props: tipProps })}
									<button
										type="button"
										{...tipProps}
										class="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-muted-foreground/60 transition-colors hover:text-muted-foreground"
									>
										<Settings2 class="size-3" aria-hidden="true" />
										<span class="text-[9px] font-medium">{activeSettings.length}</span>
										<span class="sr-only">{activeSettings.length} active settings</span>
									</button>
								{/snippet}
							</Tooltip.Trigger>
							<Tooltip.Content side="bottom" sideOffset={4} class="max-w-[20rem] p-0">
								<div class="space-y-0">
									{#each activeSettings as setting (setting.label)}
										<div class="flex items-center justify-between gap-4 border-b border-primary-foreground/10 px-3 py-1 last:border-b-0">
											<span class="text-[10px] text-primary-foreground/60">{setting.label}</span>
											<span class="font-mono text-[10px] font-medium text-primary-foreground">{setting.value}</span>
										</div>
									{/each}
								</div>
							</Tooltip.Content>
						</Tooltip.Root>
					</Tooltip.Provider>
				{/if}
			</div>
			<div class="flex items-center gap-0.5">
				{@render toolbarButton(ZoomOut, 'Zoom out', () => zoomOut(cardKey), activeZoom <= ZOOM_MIN)}
				{@render toolbarButton(ZoomIn, 'Zoom in', () => zoomIn(cardKey), activeZoom >= ZOOM_MAX)}
				{@render toolbarButton(Maximize, 'Fit (100%)', () => zoomFit(cardKey), activeZoom === 1)}
				{#if tagName || codeText}
					<Tooltip.Provider>
						<Tooltip.Root delayDuration={300}>
							<Tooltip.Trigger>
								{#snippet child({ props: tipProps })}
									<button
										type="button"
										{...tipProps}
										class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
										onclick={() => toggleCode(cardKey)}
										aria-expanded={Boolean(openCards[cardKey])}
									>
										<Code class="size-3" aria-hidden="true" />
										<ChevronDown
											class={cn('size-2.5 transition-transform', openCards[cardKey] && 'rotate-180')}
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
					<CopyButton text={codeText ?? snippet} label="Copy code" class="size-5 [&_svg]:size-2.5" />
				{/if}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger
						class="inline-flex size-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					>
						<EllipsisVertical class="size-3" aria-hidden="true" />
						<span class="sr-only">Card options</span>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="w-56">
						{#if componentName}
							<DropdownMenu.Item onclick={() => openIsolation(variantKey, variantOption)}>
								<ExternalLink class="size-4" />
								Open in new tab
							</DropdownMenu.Item>
							<DropdownMenu.Separator />
						{/if}

						<!-- Background submenu -->
						<DropdownMenu.Sub>
							<DropdownMenu.SubTrigger>
								<Paintbrush class="size-4" />
								Background
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent class="w-52">
								{#each BG_PRESETS as preset (preset.id)}
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
								{/each}
								<DropdownMenu.Separator />
								<div class="px-2 py-1.5">
									<p class="mb-1.5 text-xs font-medium text-muted-foreground">Custom</p>
									<ColorPicker
										value={activeBg.startsWith('#') ? activeBg : '#ffffff'}
										onValueChange={(v) => setBackground(cardKey, v)}
									/>
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
						<DropdownMenu.Sub>
							<DropdownMenu.SubTrigger>
								<SquareDashedMousePointer class="size-4" />
								Outline
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent class="w-52">
								<DropdownMenu.Item onclick={() => setOutline(cardKey, 'none')}>
									<Check class={cn('size-4 shrink-0', activeOutline !== 'none' && 'opacity-0')} />
									None
								</DropdownMenu.Item>
								<DropdownMenu.Separator />
								{#each OUTLINE_PRESETS as preset (preset.id)}
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
								{/each}
								<DropdownMenu.Separator />
								<div class="px-2 py-1.5">
									<p class="mb-1.5 text-xs font-medium text-muted-foreground">Custom</p>
									<ColorPicker
										value={activeOutline.startsWith('#') ? activeOutline : '#ef4444'}
										onValueChange={(v) => setOutline(cardKey, v)}
									/>
								</div>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>

						<!-- Grid submenu -->
						<DropdownMenu.Sub>
							<DropdownMenu.SubTrigger>
								<Grid3x3 class="size-4" />
								Grid
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent class="w-52">
								<DropdownMenu.Item onclick={() => setGrid(cardKey, 'none')}>
									<Check class={cn('size-4 shrink-0', activeGrid !== 'none' && 'opacity-0')} />
									None
								</DropdownMenu.Item>
								<DropdownMenu.Separator />
								{#each GRID_PRESETS as preset (preset.id)}
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
								{/each}
								<DropdownMenu.Separator />
								<div class="px-2 py-1.5">
									<p class="mb-1.5 text-xs font-medium text-muted-foreground">Custom</p>
									<ColorPicker
										value={activeGrid.startsWith('#') ? activeGrid : '#000000'}
										onValueChange={(v) => setGrid(cardKey, v)}
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
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>

						<!-- Orientation submenu -->
						<DropdownMenu.Sub>
							<DropdownMenu.SubTrigger>
								<Smartphone class="size-4" />
								Orientation
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent class="w-64">
								<DropdownMenu.Item onclick={() => setOrientation(cardKey, 'default')}>
									<Check class={cn('size-4 shrink-0', activeOrientation !== 'default' && 'opacity-0')} />
									Default (none)
								</DropdownMenu.Item>
								<DropdownMenu.Separator />
								{#each ORIENTATION_PRESETS as preset (preset.id)}
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
								{/each}
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>

						<!-- Color Mode submenu -->
						<DropdownMenu.Sub>
							<DropdownMenu.SubTrigger>
								<Sun class="size-4" />
								Color Mode
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent class="w-52">
								{#each MODE_PRESETS as preset (preset.id)}
									<DropdownMenu.Item onclick={() => setCardMode(cardKey, preset.id)}>
										<Check class={cn('size-4 shrink-0', activeMode !== preset.id && 'opacity-0')} />
										<preset.icon class="size-4" />
										{preset.label}
									</DropdownMenu.Item>
								{/each}
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>

						<!-- Theme submenu -->
						<DropdownMenu.Sub>
							<DropdownMenu.SubTrigger>
								<Palette class="size-4" />
								Theme
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent class="w-52">
								{#each THEME_PRESETS as preset (preset.id)}
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
								{/each}
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>

						<DropdownMenu.Separator />

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
								<div class="max-h-60 overflow-y-auto">
									{#if filteredColorItems.length > 0}
										<DropdownMenu.Label>Color Vision</DropdownMenu.Label>
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
										<DropdownMenu.Label>Vision Impairments</DropdownMenu.Label>
										{#each filteredVisionItems as item (item.id)}
											<DropdownMenu.Item onclick={() => toggleSimulation(cardKey, item.id)}>
												<Check class={cn('size-4', activeSim !== item.id && 'opacity-0')} />
												{item.label}
											</DropdownMenu.Item>
										{/each}
									{/if}
									{#if filteredColorItems.length === 0 && filteredVisionItems.length === 0}
										<div class="px-2 py-4 text-center text-xs text-muted-foreground">No results</div>
									{/if}
								</div>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		</div>
		<div
			class={cn(
				'relative flex w-full items-center justify-center overflow-auto p-4',
				activeMode === 'dark' && 'dark bg-background text-foreground',
				activeMode === 'light' && 'lens-force-light bg-background text-foreground',
				activeMode === 'auto' && activeTheme && pageIsDark && 'dark',
				activeMode === 'auto' && activeTheme && !pageIsDark && 'lens-force-light',
				activeTheme && 'bg-background text-foreground',
			)}
			style={[getBackgroundStyle(cardKey), cardContentHeights[cardKey] ? `min-height: ${cardContentHeights[cardKey] + 32}px` : '', activeMode === 'light' ? 'color-scheme: light' : '', activeMode === 'dark' ? 'color-scheme: dark' : '', activeMode === 'auto' && activeTheme && !pageIsDark ? 'color-scheme: light' : '', activeMode === 'auto' && activeTheme && pageIsDark ? 'color-scheme: dark' : ''].filter(Boolean).join('; ')}
			data-theme={activeTheme || undefined}
		>
			{#if hasColorMatrixSim(cardKey)}
				<svg class="absolute size-0 overflow-hidden" aria-hidden="true">
					<defs>
						<filter id={filterId(cardKey)}>
							<feColorMatrix type="matrix" values={COLOR_MATRICES[cardSimulations[cardKey]]} />
						</filter>
					</defs>
				</svg>
			{/if}
			<LensPortalScope mode={activeMode} theme={activeTheme} {pageIsDark}>
				<div
					use:trackContentSize={{ key: cardKey, landscape: isLandscapeOrientation(cardKey) }}
					class={cn(activeOutline !== 'none' && 'lens-outline')}
					style={[getSimulationFilter(cardKey), getZoomStyle(cardKey), getOrientationStyle(cardKey), activeOutline !== 'none' ? `--lens-outline-color: ${getOutlineColor(cardKey)}` : ''].filter(Boolean).join('; ')}
				>
					{#if children}
						{@render children()}
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
		</div>
		{#if (tagName || codeText) && openCards[cardKey]}
			<div class="overflow-hidden border-t bg-muted/20" transition:slide={{ duration: 200 }}>
				<div class="min-w-0 overflow-x-auto p-3 text-sm">
					<CodeBlock code={codeText ?? snippet} lang="svelte" />
				</div>
			</div>
		{/if}
	</div>
{/snippet}

{#if hasVariants}
	<!-- Variant mode: render per-option cards -->
	<div class={cn('space-y-4', className)}>
		{#each meta?.variants ?? [] as variantKey (variantKey.key)}
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
							<div class="overflow-hidden rounded-md border border-dashed bg-background">
								<div class="border-b bg-muted/30 px-3 py-1.5">
									<code class="text-xs text-muted-foreground">{option}</code>
								</div>
								<LensError title="Preview unavailable" description={formatBoundaryError(error)} class="rounded-none border-0 py-4" />
							</div>
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
				<LensError
					title="Preview unavailable"
					description={formatBoundaryError(error)}
					class="w-full rounded-none border-0 py-4"
				/>
			{/snippet}
		</svelte:boundary>
	</div>
{/if}

<style>
	:global(.lens-outline *) {
		outline: 1px solid var(--lens-outline-color, rgba(239, 68, 68, 0.25));
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
