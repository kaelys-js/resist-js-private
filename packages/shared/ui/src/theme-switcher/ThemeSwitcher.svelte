<script module lang="ts">
import * as v from 'valibot';
import { StrSchema, type Str } from '@/schemas/common';

/** Schema for a single theme option with color preview dots. */
export const ThemeOptionSchema = v.strictObject({
	/** Theme identifier (empty string for default). @values default, ocean, forest, sunset */
	id: StrSchema,
	/** Localized display label. @values Default, Ocean, Forest, Sunset */
	label: StrSchema,
	/** Color dots: [primary, accent/secondary, sidebar, sidebar-primary]. */
	dots: v.pipe(v.array(StrSchema), v.length(4)),
});
/** A single theme option. */
export type ThemeOption = v.InferOutput<typeof ThemeOptionSchema>;

/** Schema for localized UI labels in the ThemeSwitcher. */
export const ThemeSwitcherLabelsSchema = v.strictObject({
	/** Sub-menu trigger label (e.g. "Theme"). @values Theme, Color Theme, Palette */
	theme: StrSchema,
	/** Search input placeholder (e.g. "Search themes…"). @values Search themes…, Find a theme…, Filter themes */
	searchThemes: StrSchema,
	/** Clear search button aria-label (e.g. "Clear search"). @values Clear search, Reset search, Clear */
	clearSearch: StrSchema,
	/** Empty state heading (e.g. "No themes found"). @values No themes found, No results, No matching themes */
	noThemesFound: StrSchema,
	/** Empty state hint (e.g. "Try a different search term"). @values Try a different search term, Adjust your search, Clear the filter */
	noResultsHint: StrSchema,
});
/** Localized UI labels for the ThemeSwitcher. */
export type ThemeSwitcherLabels = v.InferOutput<typeof ThemeSwitcherLabelsSchema>;

/** Schema for the ThemeSwitcher component props. */
export const ThemeSwitcherPropsSchema = v.strictObject({
	/** Current active theme id. @values default, ocean, forest, sunset */
	theme: StrSchema,
	/** Callback to change the theme. */
	setTheme: v.custom<(id: Str) => void>((val: unknown): boolean => typeof val === 'function'),
	/** Available theme options with pre-resolved locale labels. */
	themes: v.array(ThemeOptionSchema),
	/** Localized UI labels. */
	labels: ThemeSwitcherLabelsSchema,
});
/** Props for the ThemeSwitcher component. */
export type ThemeSwitcherProps = v.InferOutput<typeof ThemeSwitcherPropsSchema>;
</script>

<script lang="ts">
/**
 * Theme color palette switcher rendered as a searchable dropdown sub-menu.
 *
 * Displays available themes with color preview dots and a checkmark on the active theme.
 */
import type { Bool, Num, Void } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';
import { stripSvelteProps } from '../lens/lens-utils.js';
import Search from '@lucide/svelte/icons/search';
import SearchX from '@lucide/svelte/icons/search-x';
import X from '@lucide/svelte/icons/x';
import Palette from '@lucide/svelte/icons/palette';
import Check from '@lucide/svelte/icons/check';
import * as DropdownMenu from '../dropdown-menu/index.js';

const allProps: ThemeSwitcherProps = $props();
const validated: ThemeSwitcherProps = $derived.by(() => {
	const rawProps: ThemeSwitcherProps = stripSvelteProps(allProps);
	const result = safeParse(ThemeSwitcherPropsSchema, rawProps);
	if (!result.ok) throw result.error;
	// DeepReadonly from safeParse is safe to cast — props are read-only in templates
	return result.data as ThemeSwitcherProps;
});

let searchQuery: Str = $state('');

// Inferred type — validated.themes is deeply readonly from safeParse
const filteredThemes = $derived(
	searchQuery.length === 0
		? validated.themes
		: validated.themes.filter((th) => th.label.toLowerCase().includes(searchQuery.toLowerCase())),
);

function handleSubOpenChange(open: Bool): Void {
	if (!open) searchQuery = '';
}

/**
 * Svelte action that locks an element's height to its initial rendered value.
 * Prevents SubContent from shrinking when filtering, avoiding GraceArea close.
 *
 * @param node - The scrollable container element
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
</script>

<DropdownMenu.Sub onOpenChange={handleSubOpenChange}>
	<DropdownMenu.SubTrigger>
		<Palette aria-hidden="true" class="mr-2 size-4" />
		{validated.labels.theme}
	</DropdownMenu.SubTrigger>
	<DropdownMenu.SubContent class="max-h-80 flex flex-col overflow-hidden bg-white/[0.08] dark:bg-white/[0.06] backdrop-blur-2xl backdrop-saturate-150 border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_1px_rgba(255,255,255,0.1)_inset]">
		<!-- Search input (fixed above scrollable list) -->
		<div class="shrink-0 px-2 pt-1.5 pb-2 border-b border-border/50">
			<div class="relative">
				<Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
				<input
					type="text"
					placeholder={validated.labels.searchThemes}
					class="h-8 w-full rounded-md bg-background/50 pl-8 {searchQuery ? 'pr-8' : 'pr-3'} text-xs outline-none border border-border/50 focus:border-ring transition-colors"
					value={searchQuery}
					oninput={(e: Event) => { searchQuery = (e.target as HTMLInputElement).value; }}
					onkeydown={(e: KeyboardEvent) => { e.stopPropagation(); }}
				/>
				{#if searchQuery}
					<button
						type="button"
						class="absolute right-1.5 top-1/2 -translate-y-1/2 size-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
						onclick={() => { searchQuery = ''; }}
						aria-label={validated.labels.clearSearch}
					>
						<X class="size-3.5" />
					</button>
				{/if}
			</div>
		</div>

		<!-- Scrollable item list -->
		<div class="flex min-h-0 flex-1 flex-col overflow-y-auto" use:lockHeight>
			{#each filteredThemes as th (th.id)}
				<DropdownMenu.Item onclick={() => validated.setTheme(th.id)} aria-current={validated.theme === th.id ? 'true' : undefined} textValue={th.label}>
					{#if validated.theme === th.id}
						<Check aria-hidden="true" class="mr-2 size-4 shrink-0" />
					{:else}
						<span class="mr-2 size-4 inline-block shrink-0"></span>
					{/if}
					<span
						aria-hidden="true"
						class="mr-2 size-4 shrink-0 rounded-full shadow-sm ring-1 ring-white/10"
						style="background-color: {th.dots[0]}"
					></span>
					{th.label}
				</DropdownMenu.Item>
			{:else}
				<div class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
					<SearchX class="size-6" />
					<div class="flex flex-col items-center gap-0.5">
						<p class="text-xs font-medium">{validated.labels.noThemesFound}</p>
						<p class="text-[11px]">{validated.labels.noResultsHint}</p>
					</div>
				</div>
			{/each}
		</div>
	</DropdownMenu.SubContent>
</DropdownMenu.Sub>
