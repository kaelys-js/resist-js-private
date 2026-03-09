<script lang="ts">
import Search from '@lucide/svelte/icons/search';
import SearchX from '@lucide/svelte/icons/search-x';
import X from '@lucide/svelte/icons/x';
import Palette from '@lucide/svelte/icons/palette';
import Check from '@lucide/svelte/icons/check';
import * as DropdownMenu from '../dropdown-menu/index.js';
import type { Bool, Str, Void } from '@/schemas/common';

/**
 * A single theme option with its color preview dots.
 */
type ThemeOption = {
	/** Theme identifier (empty string for default). */
	id: Str;
	/** Localized display label. */
	label: Str;
	/** Color dots: [primary, accent/secondary, sidebar, sidebar-primary]. */
	dots: readonly [Str, Str, Str, Str];
};

/**
 * Props for the shared ThemeSwitcher component.
 *
 * Each product editor resolves locale strings and provides store state/setter.
 */
type ThemeSwitcherProps = {
	/** Current active theme id. */
	theme: Str;
	/** Callback to change the theme. */
	setTheme: (id: Str) => void;
	/** Available theme options with pre-resolved locale labels. */
	themes: readonly ThemeOption[];
	/** Localized UI labels. */
	labels: {
		/** Sub-menu trigger label (e.g. "Theme"). */
		theme: Str;
		/** Search input placeholder (e.g. "Search themes…"). */
		searchThemes: Str;
		/** Clear search button aria-label (e.g. "Clear search"). */
		clearSearch: Str;
		/** Empty state heading (e.g. "No themes found"). */
		noThemesFound: Str;
		/** Empty state hint (e.g. "Try a different search term"). */
		noResultsHint: Str;
	};
};

let { theme, setTheme, themes, labels }: ThemeSwitcherProps = $props();

let searchQuery: Str = $state('');

const filteredThemes: readonly ThemeOption[] = $derived(
	searchQuery.length === 0
		? themes
		: themes.filter((th) => th.label.toLowerCase().includes(searchQuery.toLowerCase())),
);

function handleSubOpenChange(open: Bool): Void {
	if (!open) searchQuery = '';
}
</script>

<DropdownMenu.Sub onOpenChange={handleSubOpenChange}>
	<DropdownMenu.SubTrigger>
		<Palette aria-hidden="true" class="mr-2 size-4" />
		{labels.theme}
	</DropdownMenu.SubTrigger>
	<DropdownMenu.SubContent class="max-h-80 flex flex-col overflow-hidden bg-white/[0.08] dark:bg-white/[0.06] backdrop-blur-2xl backdrop-saturate-150 border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_1px_rgba(255,255,255,0.1)_inset]">
		<!-- Search input (fixed above scrollable list) -->
		<div class="shrink-0 px-2 pt-1.5 pb-2 border-b border-border/50">
			<div class="relative">
				<Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
				<input
					type="text"
					placeholder={labels.searchThemes}
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
						aria-label={labels.clearSearch}
					>
						<X class="size-3.5" />
					</button>
				{/if}
			</div>
		</div>

		<!-- Scrollable item list -->
		<div class="min-h-0 flex-1 overflow-y-auto">
			{#each filteredThemes as th (th.id)}
				<DropdownMenu.Item onclick={() => setTheme(th.id)} aria-current={theme === th.id ? 'true' : undefined} textValue={th.label}>
					{#if theme === th.id}
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
				<div class="flex flex-col items-center gap-2 py-6 text-muted-foreground">
					<SearchX class="size-6" />
					<div class="flex flex-col items-center gap-0.5">
						<p class="text-xs font-medium">{labels.noThemesFound}</p>
						<p class="text-[11px]">{labels.noResultsHint}</p>
					</div>
				</div>
			{/each}
		</div>
	</DropdownMenu.SubContent>
</DropdownMenu.Sub>
