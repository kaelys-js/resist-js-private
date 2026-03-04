<script lang="ts">
import { Switch } from '$lib/components/ui/switch/index.js';
import { Label } from '$lib/components/ui/label/index.js';
import { Input } from '$lib/components/ui/input/index.js';
import { Button } from '$lib/components/ui/button/index.js';
import * as ScrollArea from '$lib/components/ui/scroll-area/index.js';
import { discoverFeatureFlags, humanizeKey } from '$lib/debug/dev-toolbar-registry';
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

const enabledCount: number = $derived(
	flags.filter((f) => editorStore.features[f.key as keyof FeatureFlags]).length,
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
</script>

<div class="flex flex-col gap-3 p-3" data-testid="dev-toolbar-flags">
	<div class="flex items-center justify-between">
		<h3 class="text-sm font-semibold text-zinc-100">Feature Flags</h3>
		<span class="text-xs text-zinc-400" data-testid="flags-badge">{enabledCount}/{flags.length}</span>
	</div>

	<Input
		placeholder="Filter flags..."
		class="h-7 bg-zinc-800 border-zinc-700 text-zinc-100 text-xs placeholder:text-zinc-500"
		value={searchQuery}
		oninput={(e: Event) => {
			searchQuery = (e.target as HTMLInputElement).value;
		}}
	/>

	<ScrollArea.Root class="max-h-[40vh]">
		<div class="flex flex-col gap-2">
			{#each filteredFlags as flag (flag.key)}
				{@const checked = editorStore.features[flag.key as keyof FeatureFlags]}
				<div class="flex items-center justify-between gap-2 py-0.5">
					<Label class="text-xs text-zinc-300 cursor-pointer" for="flag-{flag.key}">
						{humanizeKey(flag.key)}
					</Label>
					<Switch
						id="flag-{flag.key}"
						checked={checked}
						onCheckedChange={(value) => handleToggle(flag.key, value)}
						class="scale-75"
					/>
				</div>
			{/each}
		</div>
	</ScrollArea.Root>

	<div class="flex gap-2 border-t border-zinc-700 pt-2">
		<Button
			variant="outline"
			size="sm"
			class="h-6 text-xs flex-1 bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
			onclick={enableAll}
		>
			Enable All
		</Button>
		<Button
			variant="outline"
			size="sm"
			class="h-6 text-xs flex-1 bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
			onclick={disableAll}
		>
			Disable All
		</Button>
	</div>
</div>
