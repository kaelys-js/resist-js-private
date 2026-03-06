<script lang="ts">
import Flag from '@lucide/svelte/icons/flag';
import Search from '@lucide/svelte/icons/search';
import SearchX from '@lucide/svelte/icons/search-x';
import X from '@lucide/svelte/icons/x';
import { Switch } from '$lib/components/ui/switch/index.js';
import { Label } from '$lib/components/ui/label/index.js';
import { Input } from '$lib/components/ui/input/index.js';
import { Button } from '$lib/components/ui/button/index.js';

import { discoverFeatureFlags, humanizeKey } from '$lib/debug/dev-toolbar-registry';
import { localeStore, t } from '$lib/i18n.svelte';
import { announce } from '$lib/utils/announce.svelte';
import type { Bool, Str, Void } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import type { EditorStore } from '$lib/stores/editor-state.svelte';
import * as Tooltip from '$lib/components/ui/tooltip/index.js';
import type { FeatureFlags } from '$lib/schemas/editor-state';

let { editorStore, onclose }: { editorStore: EditorStore; onclose?: () => Void } = $props();

const flags = discoverFeatureFlags();
let searchQuery: Str = $state('');

const filteredFlags = $derived(
	searchQuery.length === 0
		? flags
		: flags.filter((f) => f.key.toLowerCase().includes(searchQuery.toLowerCase())),
);

function handleToggle(key: Str, checked: Bool): Void {
	editorStore.setFeature(key, checked);
}

function enableAll(): Void {
	for (const flag of flags) {
		editorStore.setFeature(flag.key, true);
	}
}

function disableAll(): Void {
	for (const flag of flags) {
		editorStore.setFeature(flag.key, false);
	}
}

const allEnabled: Bool = $derived(
	// Dynamic key access requires keyof cast
	flags.every((f) => editorStore.features[f.key as keyof FeatureFlags]),
);
const allDisabled: Bool = $derived(
	// Dynamic key access requires keyof cast
	flags.every((f) => !editorStore.features[f.key as keyof FeatureFlags]),
);

function labelFor(key: Str): Str {
	// Locale labels object is typed as DeepReadonly; cast needed to access dynamic keys
	const entry: (() => Result<Str>) | undefined = (
		localeStore.t.devToolbar.labels as unknown as Record<string, () => Result<Str>>
	)[key];
	return entry === undefined ? humanizeKey(key) : t(entry, humanizeKey(key));
}
</script>

<div class="flex flex-1 min-h-0 flex-col overflow-hidden" data-testid="dev-toolbar-flags">
	<!-- Sticky header: title + close + search -->
	<div class="flex shrink-0 flex-col gap-3 border-b border-white/[0.06] bg-white/[0.06] px-3 py-2.5">
		<div class="flex items-center justify-between">
			<h3 class="text-sm font-semibold text-foreground inline-flex items-center gap-2"><Flag class="size-4 text-primary" />{t(localeStore.t.devToolbar.featureFlags, 'Feature Flags')}</h3>
			{#if onclose}
				<Tooltip.Root delayDuration={300}>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<button
								{...props}
								onclick={onclose}
								class="size-6 inline-flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
								aria-label={t(localeStore.t.common.close, 'Close')}
								data-testid="panel-close-flags"
							>
								<X class="size-3.5" />
							</button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="top" sideOffset={4} class="z-[100000]">
						<span class="flex items-center gap-1.5">{t(localeStore.t.common.close, 'Close')} <kbd class="inline-flex items-center rounded border border-border bg-secondary px-1.5 py-0.5 text-xs font-mono leading-none text-muted-foreground shadow-sm">Esc</kbd></span>
					</Tooltip.Content>
				</Tooltip.Root>
			{/if}
		</div>

		<div class="relative">
			<Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
			<Input
				type="text"
				placeholder={t(localeStore.t.devToolbar.searchFlags, 'Search flags…')}
				aria-label={t(localeStore.t.devToolbar.searchFlags, 'Search flags…')}
				class="h-8 pl-8 {searchQuery ? 'pr-8' : 'pr-3'} text-xs md:text-xs bg-white/[0.06] border-white/[0.08]"
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
	<div class="min-h-0 flex-1 overflow-y-auto px-3 pt-3">
		<div class="flex flex-col gap-2 pb-1">
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
	</div>

	<!-- Sticky footer: Enable/Disable All buttons -->
	<div class="flex shrink-0 gap-2 border-t border-white/[0.06] pt-2 mt-3 mx-3 mb-3">
		<Button variant="secondary" size="sm" class="h-7 text-xs flex-1 bg-white/[0.10] hover:bg-white/[0.15] border-white/[0.08]" onclick={enableAll} disabled={allEnabled}>
			{t(localeStore.t.devToolbar.enableAll, 'Enable All')}
		</Button>
		<Button variant="secondary" size="sm" class="h-7 text-xs flex-1 bg-white/[0.10] hover:bg-white/[0.15] border-white/[0.08]" onclick={disableAll} disabled={allDisabled}>
			{t(localeStore.t.devToolbar.disableAll, 'Disable All')}
		</Button>
	</div>
</div>
