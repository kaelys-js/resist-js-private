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

function labelFor(key: string): string {
	const entry = (localeStore.t.devToolbar.labels as unknown as Record<string, () => Result<Str>>)[
		key
	];
	return entry === undefined ? humanizeKey(key) : t(entry, humanizeKey(key));
}
</script>

<div class="flex flex-col gap-3 p-3" data-testid="dev-toolbar-flags">
	<h3 class="text-sm font-semibold text-foreground">{t(localeStore.t.devToolbar.featureFlags, 'Feature Flags')}</h3>

	<div class="relative">
		<Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
		<Input
			type="text"
			placeholder={t(localeStore.t.devToolbar.searchFlags, 'Search flags…')}
			class="h-8 pl-8 {searchQuery ? 'pr-8' : 'pr-3'} text-xs"
			value={searchQuery}
			oninput={(e: Event) => {
				searchQuery = (e.target as HTMLInputElement).value;
			}}
		/>
		{#if searchQuery}
			<button
				type="button"
				class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
				onclick={() => { searchQuery = ''; }}
				aria-label={t(localeStore.t.devToolbar.clearSearch, 'Clear search')}
			>
				<X class="size-3.5" />
			</button>
		{/if}
	</div>

	<ScrollArea.Root class="max-h-[40vh]">
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
						class="scale-75"
					/>
				</div>
			{:else}
				<div class="flex flex-col items-center gap-3 py-8 text-muted-foreground">
					<SearchX class="size-8 opacity-40" />
					<div class="flex flex-col items-center gap-1">
						<p class="text-sm font-medium">{t(localeStore.t.devToolbar.noResultsFound, 'No results found')}</p>
						<p class="text-xs opacity-70">{t(localeStore.t.devToolbar.noResultsHint, 'Try a different search term')}</p>
					</div>
				</div>
			{/each}
		</div>
	</ScrollArea.Root>

	<div class="flex gap-2 border-t border-border pt-2">
		<Button variant="secondary" size="sm" class="h-7 text-xs flex-1" onclick={enableAll}>
			{t(localeStore.t.devToolbar.enableAll, 'Enable All')}
		</Button>
		<Button variant="secondary" size="sm" class="h-7 text-xs flex-1" onclick={disableAll}>
			{t(localeStore.t.devToolbar.disableAll, 'Disable All')}
		</Button>
	</div>
</div>
