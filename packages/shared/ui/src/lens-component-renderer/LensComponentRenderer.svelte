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
import type { Component } from 'svelte';
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
import Maximize from '@lucide/svelte/icons/maximize';
import Paintbrush from '@lucide/svelte/icons/paintbrush';
import Search from '@lucide/svelte/icons/search';
import SquareDashedMousePointer from '@lucide/svelte/icons/square-dashed-mouse-pointer';
import ZoomIn from '@lucide/svelte/icons/zoom-in';
import ZoomOut from '@lucide/svelte/icons/zoom-out';
import * as DropdownMenu from '../dropdown-menu/index.js';
import * as Tooltip from '../tooltip/index.js';
import { slide } from 'svelte/transition';
import { cn } from '../utils.js';

type LensComponentRendererProps = {
	/** The Svelte component to render. */
	component: Component;
	/** Variant metadata — when provided, renders per-option cards. When absent, renders a single default card. */
	meta?: VariantMeta;
	/** Full prop metadata for building base props from defaults/mock values. */
	props?: PropMeta[];
	/** PascalCase tag name for generating code snippets. @values Button, Input, Badge */
	tagName?: Str;
	/** Component directory name for building isolation URLs. @values button, badge, input */
	componentName?: Str;
	/** Default slot content text for each rendered component. @values Example, Click me, Label */
	label?: Str;
	/** Additional CSS classes for the root element. */
	class?: Str;
};

const {
	component: Target,
	meta,
	props: propsMeta = [],
	tagName,
	componentName,
	label = 'Example',
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
	return `transform: scale(${zoom}); transform-origin: center`;
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
	return `<${tagName} ${variantKey}="${option}">${label}</${tagName}>`;
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
	<div class="overflow-hidden rounded-md border bg-background">
		<div class="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
			<div class="flex items-center gap-1.5">
				<code class="text-xs text-muted-foreground">{cardLabel}</code>
				{#if activeSim !== 'none'}
					<span class="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
						{activeSim}
					</span>
				{/if}
				{#if activeZoom !== 1}
					<span class="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-medium text-blue-600 dark:text-blue-400">
						{getZoomLabel(cardKey)}
					</span>
				{/if}
			</div>
			<div class="flex items-center gap-0.5">
				{@render toolbarButton(ZoomOut, 'Zoom out', () => zoomOut(cardKey), activeZoom <= ZOOM_MIN)}
				{@render toolbarButton(ZoomIn, 'Zoom in', () => zoomIn(cardKey), activeZoom >= ZOOM_MAX)}
				{@render toolbarButton(Maximize, 'Fit (100%)', () => zoomFit(cardKey), activeZoom === 1)}
				{#if tagName}
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
					<CopyButton text={snippet} label="Copy code" class="size-5 [&_svg]:size-2.5" />
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
			class="relative flex w-full items-center justify-center overflow-auto p-4"
			style={getBackgroundStyle(cardKey)}
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
			<div
				class={cn(activeOutline !== 'none' && 'lens-outline')}
				style={[getSimulationFilter(cardKey), getZoomStyle(cardKey), activeOutline !== 'none' ? `--lens-outline-color: ${getOutlineColor(cardKey)}` : ''].filter(Boolean).join('; ')}
			>
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
			</div>
			{#if hasTunnelVision(cardKey)}
				<div
					class="pointer-events-none absolute inset-0"
					style="background: radial-gradient(circle at center, transparent 20%, rgba(0,0,0,0.85) 60%)"
				></div>
			{/if}
		</div>
		{#if tagName && openCards[cardKey]}
			<div class="overflow-hidden border-t bg-muted/20" transition:slide={{ duration: 200 }}>
				<div class="min-w-0 overflow-x-auto p-3 text-sm">
					<CodeBlock code={snippet} lang="svelte" />
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
				{#each options as option (option)}
					{@const variantProps: Record<Str, Str | boolean | number> =
						option === 'true' || option === 'false'
							? { [variantName]: option === 'true' }
							: !Number.isNaN(Number(option)) && option !== ''
								? { [variantName]: Number(option) }
								: { [variantName]: option }}
					{@const cardKey: Str = `${variantName}:${option}`}
					{@const snippet: Str = codeSnippet(variantName, option)}
					<svelte:boundary>
						{@render card(option, cardKey, snippet, variantProps, isIconOption(option), variantName, option)}
						{#snippet failed()}
							<div class="overflow-hidden rounded-md border border-dashed bg-background">
								<div class="border-b bg-muted/30 px-3 py-1.5">
									<code class="text-xs text-muted-foreground">{option}</code>
								</div>
								<LensError title="Preview unavailable" description="Could not render this variant option." class="rounded-none border-0 py-4" />
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
			{#snippet failed()}
				<LensError
					title="Preview unavailable"
					description="This component could not be rendered with default props."
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
</style>
