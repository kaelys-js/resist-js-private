<script lang="ts">
import Search from '@lucide/svelte/icons/search';
import SearchX from '@lucide/svelte/icons/search-x';
import X from '@lucide/svelte/icons/x';
import Palette from '@lucide/svelte/icons/palette';
import Check from '@lucide/svelte/icons/check';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
import { localeStore, t } from '$lib/i18n.svelte';
import { useEditorStore } from '$lib/stores/editor-state.svelte';

const store = useEditorStore();

let searchQuery: string = $state('');

/* Dots: [primary, accent/secondary, sidebar, sidebar-primary] */
const themes = [
	{
		id: '',
		label: () => t(localeStore.t.settings.themeDefault, 'Default'),
		dots: ['oklch(0.55 0 0)', 'oklch(0.55 0 0)', 'oklch(0.97 0 0)', 'oklch(0.55 0 0)'],
	},
	{
		id: 'midnight',
		label: () => t(localeStore.t.settings.themeMidnight, 'Midnight'),
		dots: [
			'oklch(0.55 0.22 260)',
			'oklch(0.22 0.06 260)',
			'oklch(0.96 0.02 260)',
			'oklch(0.50 0.20 260)',
		],
	},
	{
		id: 'warm',
		label: () => t(localeStore.t.settings.themeWarm, 'Warm'),
		dots: [
			'oklch(0.50 0.16 50)',
			'oklch(0.23 0.04 50)',
			'oklch(0.97 0.01 70)',
			'oklch(0.50 0.16 50)',
		],
	},
	{
		id: 'forest',
		label: () => t(localeStore.t.settings.themeForest, 'Forest'),
		dots: [
			'oklch(0.50 0.16 155)',
			'oklch(0.22 0.04 155)',
			'oklch(0.97 0.01 150)',
			'oklch(0.50 0.16 155)',
		],
	},
	{
		id: 'ocean',
		label: () => t(localeStore.t.settings.themeOcean, 'Ocean'),
		dots: [
			'oklch(0.52 0.15 200)',
			'oklch(0.22 0.05 200)',
			'oklch(0.96 0.02 200)',
			'oklch(0.50 0.14 200)',
		],
	},
	{
		id: 'rose',
		label: () => t(localeStore.t.settings.themeRose, 'Rose'),
		dots: [
			'oklch(0.55 0.18 350)',
			'oklch(0.22 0.05 350)',
			'oklch(0.97 0.01 350)',
			'oklch(0.55 0.16 350)',
		],
	},
	{
		id: 'lavender',
		label: () => t(localeStore.t.settings.themeLavender, 'Lavender'),
		dots: [
			'oklch(0.52 0.20 290)',
			'oklch(0.22 0.06 290)',
			'oklch(0.96 0.02 290)',
			'oklch(0.52 0.18 290)',
		],
	},
	{
		id: 'sunset',
		label: () => t(localeStore.t.settings.themeSunset, 'Sunset'),
		dots: [
			'oklch(0.55 0.20 30)',
			'oklch(0.23 0.05 30)',
			'oklch(0.97 0.01 30)',
			'oklch(0.55 0.18 30)',
		],
	},
	{
		id: 'slate',
		label: () => t(localeStore.t.settings.themeSlate, 'Slate'),
		dots: [
			'oklch(0.48 0.08 240)',
			'oklch(0.23 0.02 240)',
			'oklch(0.96 0.01 240)',
			'oklch(0.48 0.06 240)',
		],
	},
	{
		id: 'copper',
		label: () => t(localeStore.t.settings.themeCopper, 'Copper'),
		dots: [
			'oklch(0.52 0.16 60)',
			'oklch(0.23 0.04 60)',
			'oklch(0.97 0.01 60)',
			'oklch(0.52 0.14 60)',
		],
	},
	{
		id: 'aurora',
		label: () => t(localeStore.t.settings.themeAurora, 'Aurora'),
		dots: [
			'oklch(0.52 0.15 170)',
			'oklch(0.22 0.04 170)',
			'oklch(0.96 0.02 170)',
			'oklch(0.52 0.14 170)',
		],
	},
	{
		id: 'amethyst',
		label: () => t(localeStore.t.settings.themeAmethyst, 'Amethyst'),
		dots: [
			'oklch(0.52 0.22 310)',
			'oklch(0.22 0.06 310)',
			'oklch(0.96 0.02 310)',
			'oklch(0.52 0.20 310)',
		],
	},
] as const;

const filteredThemes = $derived(
	searchQuery.length === 0
		? themes
		: themes.filter((th) => th.label().toLowerCase().includes(searchQuery.toLowerCase())),
);

function handleSubOpenChange(open: boolean): void {
	if (!open) searchQuery = '';
}
</script>

<DropdownMenu.Sub onOpenChange={handleSubOpenChange}>
	<DropdownMenu.SubTrigger>
		<Palette aria-hidden="true" class="mr-2 size-4" />
		{t(localeStore.t.settings.theme, 'Theme')}
	</DropdownMenu.SubTrigger>
	<DropdownMenu.SubContent class="max-h-80 flex flex-col overflow-hidden bg-white/[0.08] dark:bg-white/[0.06] backdrop-blur-2xl backdrop-saturate-150 border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_1px_rgba(255,255,255,0.1)_inset]">
		<!-- Search input (fixed above scrollable list) -->
		<div class="shrink-0 px-2 pt-1.5 pb-2 border-b border-border/50">
			<div class="relative">
				<Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
				<input
					type="text"
					placeholder={t(localeStore.t.settings.searchThemes, 'Search themes…')}
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
						aria-label={t(localeStore.t.devToolbar.clearSearch, 'Clear search')}
					>
						<X class="size-3.5" />
					</button>
				{/if}
			</div>
		</div>

		<!-- Scrollable item list -->
		<div class="min-h-0 flex-1 overflow-y-auto">
			{#each filteredThemes as th (th.id)}
				<DropdownMenu.Item onclick={() => store.setTheme(th.id)} aria-current={store.app.theme === th.id ? 'true' : undefined} textValue={th.label()}>
					{#if store.app.theme === th.id}
						<Check aria-hidden="true" class="mr-2 size-4 shrink-0" />
					{:else}
						<span class="mr-2 size-4 inline-block shrink-0"></span>
					{/if}
					<span
						aria-hidden="true"
						class="mr-2 size-4 shrink-0 rounded-full shadow-sm ring-1 ring-white/10"
						style="background-color: {th.dots[0]}"
					></span>
					{th.label()}
				</DropdownMenu.Item>
			{:else}
				<div class="flex flex-col items-center gap-2 py-6 text-muted-foreground">
					<SearchX class="size-6" />
					<div class="flex flex-col items-center gap-0.5">
						<p class="text-xs font-medium">{t(localeStore.t.settings.noThemesFound, 'No themes found')}</p>
						<p class="text-[11px]">{t(localeStore.t.devToolbar.noResultsHint, 'Try a different search term')}</p>
					</div>
				</div>
			{/each}
		</div>
	</DropdownMenu.SubContent>
</DropdownMenu.Sub>
