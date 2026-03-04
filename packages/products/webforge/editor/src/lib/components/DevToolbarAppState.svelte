<script lang="ts">
import { Switch } from '$lib/components/ui/switch/index.js';
import { Label } from '$lib/components/ui/label/index.js';
import { Input } from '$lib/components/ui/input/index.js';
import { Button } from '$lib/components/ui/button/index.js';
import * as Select from '$lib/components/ui/select/index.js';
import { discoverAppPreferences, humanizeKey } from '$lib/debug/dev-toolbar-registry';
import type { EditorStore } from '$lib/stores/editor-state.svelte';
import type { AppPreferences } from '$lib/schemas/editor-state';

let { editorStore }: { editorStore: EditorStore } = $props();

const preferences = discoverAppPreferences();

/**
 * Auto-maps a preference key to its setter method name.
 * e.g., 'theme' → 'setTheme', 'sidebarOpen' → 'setSidebarOpen'
 *
 * @param key - The preference key
 * @param value - The value to set
 */
function callSetter(key: string, value: unknown): void {
	const setterName = `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;
	const setter = (editorStore as unknown as Record<string, (v: unknown) => unknown>)[setterName];
	if (typeof setter === 'function') {
		setter(value);
	}
}

function resetDefaults(): void {
	for (const pref of preferences) {
		callSetter(pref.key, pref.default);
	}
}
</script>

<div class="flex flex-col gap-3 p-3" data-testid="dev-toolbar-app-state">
	<h3 class="text-sm font-semibold text-zinc-100">App Preferences</h3>

	<div class="flex flex-col gap-3">
		{#each preferences as pref (pref.key)}
			{@const currentValue = editorStore.app[pref.key as keyof AppPreferences]}
			<div class="flex flex-col gap-1">
				<Label class="text-xs text-zinc-400" for="pref-{pref.key}">
					{humanizeKey(pref.key)}
				</Label>

				{#if pref.type === 'picklist' && pref.options}
					<Select.Root
						type="single"
						value={String(currentValue)}
						onValueChange={(value) => callSetter(pref.key, value)}
					>
						<Select.Trigger
							id="pref-{pref.key}"
							class="h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-100"
						>
							{String(currentValue) || '(default)'}
						</Select.Trigger>
						<Select.Content class="bg-zinc-800 border-zinc-700 z-[100000]">
							{#each pref.options as option (option)}
								<Select.Item
									value={String(option)}
									class="text-xs text-zinc-100 focus:bg-zinc-700 focus:text-zinc-100"
								>
									{String(option) || '(default)'}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				{:else if pref.type === 'boolean'}
					<Switch
						id="pref-{pref.key}"
						checked={Boolean(currentValue)}
						onCheckedChange={(value) => callSetter(pref.key, value)}
						class="scale-75"
					/>
				{:else}
					<Input
						id="pref-{pref.key}"
						value={String(currentValue)}
						class="h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-100"
						oninput={(e: Event) => callSetter(pref.key, (e.target as HTMLInputElement).value)}
					/>
				{/if}
			</div>
		{/each}
	</div>

	<div class="border-t border-zinc-700 pt-2">
		<Button
			variant="outline"
			size="sm"
			class="h-6 text-xs w-full bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
			onclick={resetDefaults}
		>
			Reset to Defaults
		</Button>
	</div>
</div>
