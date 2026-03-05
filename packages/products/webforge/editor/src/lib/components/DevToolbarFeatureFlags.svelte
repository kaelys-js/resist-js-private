<script lang="ts">
import Search from '@lucide/svelte/icons/search';
import SearchX from '@lucide/svelte/icons/search-x';
import X from '@lucide/svelte/icons/x';
import { Switch } from '$lib/components/ui/switch/index.js';
import { Label } from '$lib/components/ui/label/index.js';
import { Input } from '$lib/components/ui/input/index.js';
import { Button } from '$lib/components/ui/button/index.js';
import * as ScrollArea from '$lib/components/ui/scroll-area/index.js';
import { discoverFeatureFlags, humanizeKey } from '$lib/debug/dev-toolbar-registry';
import { localeStore, t } from '$lib/i18n.svelte';
import { announce } from '$lib/utils/announce.svelte';
import type { Str } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import type { EditorStore } from '$lib/stores/editor-state.svelte';
import type { FeatureFlags } from '$lib/schemas/editor-state';

let { editorStore }: { editorStore: EditorStore } = $props();

const flags = discoverFeatureFlags();
let searchQuery: string = $state('');

const filteredFlags = $derived(
	searchQuery.length === 0
		? flags
		: flags.filter((f) => f.key.toLowerCase().includes(searchQuery.toLowerCase())),
);

function handleToggle(key: string, checked: boolean): void {
	editorStore.setFeature(key, checked);
}

function enableAll(): void {
	for (const flag of flags) {
		editorStore.setFeature(flag.key, true);
	}
}

function disableAll(): void {
	for (const flag of flags) {
		editorStore.setFeature(flag.key, false);
	}
}

const allEnabled: boolean = $derived(
	flags.every((f) => editorStore.features[f.key as keyof FeatureFlags]),
);
const allDisabled: boolean = $derived(
	flags.every((f) => !editorStore.features[f.key as keyof FeatureFlags]),
);

function labelFor(key: string): string {
	const entry = (localeStore.t.devToolbar.labels as unknown as Record<string, () => Result<Str>>)[
		key
	];
	return entry === undefined ? humanizeKey(key) : t(entry, humanizeKey(key));
}
</script>

<div class="flex max-h-[60vh] flex-col p-3" data-testid="dev-toolbar-flags">
	<!-- Sticky header: title + search -->
	<div class="flex shrink-0 flex-col gap-3 pb-3">
		<h3 class="text-sm font-semibold text-foreground">{t(localeStore.t.devToolbar.featureFlags, 'Feature Flags')}</h3>

		<div class="relative">
			<Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
			<Input
				type="text"
				placeholder={t(localeStore.t.devToolbar.searchFlags, 'Search flags…')}
				aria-label={t(localeStore.t.devToolbar.searchFlags, 'Search flags…')}
				class="h-8 pl-8 {searchQuery ? 'pr-8' : 'pr-3'} text-xs"
				value={searchQuery}
				oninput={(e: Event) => {
					searchQuery = (e.target as HTMLInputElement).value;
					announce(`${filteredFlags.length} / ${flags.length}`);
				}}
			/>
			{#if searchQuery}
				<button
					type="button"
					class="absolute right-1.5 top-1/2 -translate-y-1/2 size-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
					onclick={() => { searchQuery = ''; }}
					aria-label={t(localeStore.t.devToolbar.clearSearch, 'Clear search')}
				>
					<X class="size-3.5" />
				</button>
			{/if}
		</div>
	</div>

	<!-- Scrollable flag list -->
	<ScrollArea.Root class="min-h-0 flex-1">
		<div class="flex flex-col gap-2">
			{#each filteredFlags as flag (flag.key)}
				{@const checked = editorStore.features[flag.key as keyof FeatureFlags]}
				<div class="flex items-center justify-between gap-2 py-0.5">
					<Label class="text-xs cursor-pointer" for="flag-{flag.key}">
						{labelFor(flag.key)}
					</Label>
					<Switch
						id="flag-{flag.key}"
						checked={checked}
						onCheckedChange={(value) => handleToggle(flag.key, value)}
					/>
				</div>
			{:else}
				<div class="flex flex-col items-center gap-3 py-8 text-muted-foreground">
					<SearchX class="size-8" />
					<div class="flex flex-col items-center gap-1">
						<p class="text-sm font-medium">{t(localeStore.t.devToolbar.noResultsFound, 'No results found')}</p>
						<p class="text-xs">{t(localeStore.t.devToolbar.noResultsHint, 'Try a different search term')}</p>
					</div>
				</div>
			{/each}
		</div>
	</ScrollArea.Root>

	<!-- Sticky footer: Enable/Disable All buttons -->
	<div class="flex shrink-0 gap-2 border-t border-border pt-2 mt-3">
		<Button variant="secondary" size="sm" class="h-7 text-xs flex-1" onclick={enableAll} disabled={allEnabled}>
			{t(localeStore.t.devToolbar.enableAll, 'Enable All')}
		</Button>
		<Button variant="secondary" size="sm" class="h-7 text-xs flex-1" onclick={disableAll} disabled={allDisabled}>
			{t(localeStore.t.devToolbar.disableAll, 'Disable All')}
		</Button>
	</div>
</div>
