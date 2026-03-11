<script lang="ts">
/**
 * Design Token Viewer page for the Lens documentation system.
 *
 * Displays all CSS custom properties extracted from app.css,
 * grouped by category with live color swatches and theme comparison.
 */
import type { Bool, Num, Str } from '@/schemas/common';
import { extractTokens, groupTokens, getThemeNames, type ThemeTokenSet, type TokenGroup } from '@/ui/lens/extract-tokens.js';
import Badge from '@/ui/badge/badge.svelte';
import CodeBlock from '@/ui/code-block/CodeBlock.svelte';
import CopyButton from '@/ui/copy-button/CopyButton.svelte';
import * as Popover from '@/ui/popover/index.js';
import * as Tooltip from '@/ui/tooltip/index.js';
import { cn } from '@/ui/utils.js';
import { slide } from 'svelte/transition';
import Palette from '@lucide/svelte/icons/palette';
import Check from '@lucide/svelte/icons/check';
import Search from '@lucide/svelte/icons/search';
import SearchX from '@lucide/svelte/icons/search-x';
import ChevronRight from '@lucide/svelte/icons/chevron-right';
import ChevronDown from '@lucide/svelte/icons/chevron-down';

/* ------------------------------------------------------------------ */
/*  Load app.css raw source and extract tokens                        */
/* ------------------------------------------------------------------ */

const cssRaw: Str = import.meta.glob(
	'/src/app.css',
	{ query: '?raw', import: 'default', eager: true },
) as unknown as Str;

/**
 * Get the raw CSS string from the glob result.
 * Glob returns Record<path, content> — extract the first (only) value.
 *
 * @returns Raw CSS source string
 */
function getCssSource(): Str {
	if (typeof cssRaw === 'string') return cssRaw;
	const entries: Array<[Str, unknown]> = Object.entries(cssRaw as Record<Str, unknown>);
	const [first]: Array<[Str, unknown]> = entries;
	return (first ? String(first[1]) : '') as Str;
}

const cssSource: Str = getCssSource();
const allSets: ThemeTokenSet[] = extractTokens(cssSource);
const themeNames: Str[] = getThemeNames(allSets);

/* ------------------------------------------------------------------ */
/*  Theme preset data                                                  */
/* ------------------------------------------------------------------ */

/** Theme preset option with a color dot for visual identification. */
type ThemePreset = { value: Str; label: Str; dot: Str; group: Str };

/** All theme presets grouped by section. */
const THEME_PRESETS: ThemePreset[] = $derived.by((): ThemePreset[] => {
	const presets: ThemePreset[] = [
		{ value: ':root', label: 'Light', dot: 'oklch(0.97 0 0)', group: 'Defaults' },
		{ value: '.dark', label: 'Dark', dot: 'oklch(0.15 0 0)', group: 'Defaults' },
	];
	for (const name of themeNames) {
		const displayName: Str = `${name.charAt(0).toUpperCase()}${name.slice(1)}` as Str;
		// Find the primary color from the theme's token set to use as the dot
		const themeSet: ThemeTokenSet | undefined = allSets.find((s: ThemeTokenSet): boolean => s.selector === name);
		const primaryToken = themeSet?.tokens.find((t) => t.name === 'primary');
		const dot: Str = primaryToken?.value ?? 'oklch(0.5 0.15 260)';
		presets.push(
			{ value: name, label: `${displayName} (Light)`, dot, group: displayName },
			{ value: `${name}.dark`, label: `${displayName} (Dark)`, dot, group: displayName },
		);
	}
	return presets;
});

/** Unique group names for section headers. */
const themeGroups: Str[] = $derived(
	[...new Set(THEME_PRESETS.map((p: ThemePreset): Str => p.group))],
);

/* ------------------------------------------------------------------ */
/*  State                                                             */
/* ------------------------------------------------------------------ */

/** Currently selected theme context for viewing. */
let selectedTheme: Str = $state(':root');

/** Theme search query. */
let themeSearchQuery: Str = $state('');

/** Whether the theme popover is open. */
let themePopoverOpen: Bool = $state(false);

/** Section open states. */
let sectionOpen: Record<Str, Bool> = $state({
	color: true,
	'sidebar-color': true,
	radius: true,
	typography: true,
	animation: true,
});

/* ------------------------------------------------------------------ */
/*  Derived                                                           */
/* ------------------------------------------------------------------ */

/** Token set for the currently selected theme. */
const currentSet: ThemeTokenSet | undefined = $derived(
	allSets.find((s: ThemeTokenSet): boolean => s.selector === selectedTheme),
);

/** Grouped tokens for the current theme. */
const groups: TokenGroup[] = $derived(
	currentSet ? groupTokens(currentSet.tokens) : [],
);

/** Total token count. */
const tokenCount: Num = $derived(currentSet?.tokens.length ?? 0);

/** Label for the currently selected theme. */
const selectedLabel: Str = $derived(
	THEME_PRESETS.find((p: ThemePreset): boolean => p.value === selectedTheme)?.label ?? 'Light',
);

/** Theme presets filtered by search query. */
const filteredPresets: ThemePreset[] = $derived(
	themeSearchQuery.length === 0
		? THEME_PRESETS
		: THEME_PRESETS.filter((p: ThemePreset): boolean => p.label.toLowerCase().includes(themeSearchQuery.toLowerCase())),
);

/** Filtered group names (only groups that have matching presets). */
const filteredGroups: Str[] = $derived(
	themeGroups.filter((g: Str): boolean => filteredPresets.some((p: ThemePreset): boolean => p.group === g)),
);

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/**
 * Select a theme and close the popover.
 *
 * @param value - Theme selector value
 */
function selectTheme(value: Str): void {
	selectedTheme = value;
	themePopoverOpen = false;
}

/**
 * Check if a token value is a color (oklch or other color format).
 *
 * @param value - The CSS value string
 * @returns Whether the value represents a color
 */
function isColorValue(value: Str): boolean {
	return value.startsWith('oklch(') || value.startsWith('rgb') || value.startsWith('hsl') || value.startsWith('#');
}

/**
 * Toggle a section open/closed.
 *
 * @param id - Section identifier key
 */
function toggleSection(id: Str): void {
	sectionOpen[id] = !sectionOpen[id];
}
</script>

<div class="w-full">
	<!-- Header -->
	<div class="sticky top-(--header-height) z-10 border-b bg-background px-8 pb-4 pt-10">
		<div class="flex items-start gap-4">
			<div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
				<Palette class="size-6 text-primary" />
			</div>
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-4">
					<h1 class="text-3xl font-bold tracking-tight">Design Tokens</h1>
					<Badge variant="secondary" class="text-xs">{tokenCount} tokens</Badge>
				</div>
				<p class="mt-1 text-sm text-muted-foreground">CSS custom properties powering the design system. All colors use OKLCh color space.</p>

				<!-- Theme selector -->
				<div class="mt-3 flex items-center gap-2">
					<span class="text-xs font-medium text-muted-foreground">Theme:</span>
					<Popover.Root bind:open={themePopoverOpen} onOpenChange={(open) => { if (open) themeSearchQuery = ''; }}>
						<Popover.Trigger class="inline-flex h-8 items-center gap-2 rounded-md border bg-transparent px-3 text-sm shadow-xs transition-colors hover:bg-accent">
							{selectedLabel}
							<ChevronDown class="size-3.5 opacity-50" />
						</Popover.Trigger>
						<Popover.Content side="bottom" align="start" class="w-56 p-0">
							<div class="shrink-0 px-2 pb-1.5 pt-2">
								<div class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm">
									<Search class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
									<input
										type="text"
										placeholder="Search themes..."
										class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
										bind:value={themeSearchQuery}
									/>
								</div>
							</div>
							<div class="max-h-64 overflow-y-auto px-1 pb-1">
								{#each filteredGroups as group (group)}
									<div class="px-2 py-1.5 text-xs font-medium text-muted-foreground">{group}</div>
									{#each filteredPresets.filter((p) => p.group === group) as preset (preset.value)}
										<button
											type="button"
											class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent"
											onclick={() => selectTheme(preset.value)}
										>
											<Check class={cn('size-4 shrink-0', selectedTheme !== preset.value && 'opacity-0')} />
											{#if preset.dot}
												<span
													class="inline-block size-3.5 shrink-0 rounded-full shadow-sm ring-1 ring-black/10"
													style="background-color: {preset.dot}"
												></span>
											{/if}
											{preset.label}
										</button>
									{/each}
								{:else}
									<div class="flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
										<SearchX class="size-5" />
										<div class="flex flex-col items-center gap-0.5">
											<p class="text-xs font-medium">No themes found</p>
											<p class="text-[11px]">Try a different search term</p>
										</div>
									</div>
								{/each}
							</div>
						</Popover.Content>
					</Popover.Root>
				</div>
			</div>
		</div>
	</div>

	<!-- Token groups -->
	<div class="space-y-10 px-8 py-8">
		{#each groups as group (group.category)}
			<section id={group.category} class="scroll-mt-60">
				<button
					type="button"
					onclick={() => toggleSection(group.category)}
					class="mb-3 flex w-full items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80"
				>
					<ChevronRight class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen[group.category] ? 'rotate-90' : ''}" />
					<Palette class="size-5" />
					{group.label}
					<Badge variant="outline" class="ml-1 text-xs">{group.tokens.length}</Badge>
				</button>

				{#if sectionOpen[group.category]}
					<div transition:slide={{ duration: 200 }}>
						<div class="rounded-lg border bg-card">
							<table class="w-full table-fixed text-sm">
								<thead>
									<tr class="border-b text-left text-xs text-muted-foreground">
										{#if group.category === 'color' || group.category === 'sidebar-color'}
											<th class="w-12 px-4 py-2"></th>
										{/if}
										<th class="px-4 py-2">Variable</th>
										<th class="px-4 py-2">Value</th>
										<th class="px-4 py-2">Tailwind</th>
										<th class="w-12 px-4 py-2"></th>
									</tr>
								</thead>
								<tbody>
									{#each group.tokens as token (token.name)}
										<tr class="border-b last:border-b-0 transition-colors hover:bg-muted/50">
											{#if group.category === 'color' || group.category === 'sidebar-color'}
												<td class="px-4 py-2.5">
													{#if isColorValue(token.value)}
														<Tooltip.Root delayDuration={200}>
															<Tooltip.Trigger>
																{#snippet child({ props })}
																	<div
																		class="size-6 rounded-md border shadow-sm"
																		style="background-color: {token.value};"
																		{...props}
																	></div>
																{/snippet}
															</Tooltip.Trigger>
															<Tooltip.Content>
																<span class="font-mono text-xs">{token.value}</span>
															</Tooltip.Content>
														</Tooltip.Root>
													{/if}
												</td>
											{/if}
											<td class="px-4 py-2.5">
												<code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{token.variable}</code>
											</td>
											<td class="px-4 py-2.5">
												<span class="font-mono text-xs text-muted-foreground">{token.value}</span>
											</td>
											<td class="px-4 py-2.5">
												{#if token.tailwindClass}
													<code class="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary">{token.tailwindClass}</code>
												{:else}
													<span class="text-xs text-muted-foreground/40">—</span>
												{/if}
											</td>
											<td class="px-4 py-2.5">
												<CopyButton text={`var(${token.variable})`} label={`Copy var(${token.variable})`} />
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}
			</section>
		{/each}

		<!-- Raw CSS source -->
		<section id="source" class="scroll-mt-60">
			<button
				type="button"
				onclick={() => toggleSection('source')}
				class="mb-3 flex w-full items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80"
			>
				<ChevronRight class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {sectionOpen.source ? 'rotate-90' : ''}" />
				Source (app.css)
			</button>
			{#if sectionOpen.source}
				<div transition:slide={{ duration: 200 }}>
					<div class="rounded-lg border bg-card p-4">
						<CodeBlock code={cssSource} lang="css" />
					</div>
				</div>
			{/if}
		</section>
	</div>
</div>
