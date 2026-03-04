<script lang="ts">
import { Switch } from '$lib/components/ui/switch/index.js';
import { Label } from '$lib/components/ui/label/index.js';
import { Button } from '$lib/components/ui/button/index.js';
import * as Select from '$lib/components/ui/select/index.js';
import {
	discoverDebugFields,
	generateDebugUrl,
	humanizeKey,
} from '$lib/debug/dev-toolbar-registry';
import type { EditorStore } from '$lib/stores/editor-state.svelte';
import type { DebugStore } from '$lib/stores/debug-state.svelte';
import type { DebugState } from '$lib/schemas/debug-state';
import type { EditorDevtools } from '$lib/debug/devtools-api.svelte';

let { editorStore, debugStore }: { editorStore: EditorStore; debugStore: DebugStore } = $props();

const debugFields = discoverDebugFields();

const urlOverrideEntries = $derived(Object.entries(debugStore.urlOverrides));
const hasOverrides: boolean = $derived(urlOverrideEntries.length > 0);

/**
 * Auto-maps a debug field key to its setter method name on DebugStore.
 * e.g., 'enabled' → 'setEnabled', 'logLevel' → 'setLogLevel'
 *
 * @param key - The debug field key
 * @param value - The value to set
 */
function callSetter(key: string, value: unknown): void {
	const setterName = `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;
	const setter = (debugStore as unknown as Record<string, (v: unknown) => unknown>)[setterName];
	if (typeof setter === 'function') {
		setter(value);
	}
}

function logState(): void {
	const devtools = (window as unknown as Record<string, EditorDevtools | undefined>)[
		'__EDITOR_DEVTOOLS__'
	];
	devtools?.logState();
}

function logFeatures(): void {
	const devtools = (window as unknown as Record<string, EditorDevtools | undefined>)[
		'__EDITOR_DEVTOOLS__'
	];
	devtools?.logFeatures();
}

async function copyDebugUrl(): Promise<void> {
	const url: string = generateDebugUrl(editorStore, debugStore);
	await navigator.clipboard.writeText(url);
}
</script>

<div class="flex flex-col gap-3 p-3" data-testid="dev-toolbar-debug">
	<h3 class="text-sm font-semibold text-zinc-100">Debug</h3>

	<div class="flex flex-col gap-3">
		{#each debugFields as field (field.key)}
			{@const currentValue = debugStore.debug[field.key as keyof DebugState]}
			<div class="flex flex-col gap-1">
				<Label class="text-xs text-zinc-400" for="debug-{field.key}">
					{humanizeKey(field.key)}
				</Label>

				{#if field.type === 'picklist' && field.options}
					<Select.Root
						type="single"
						value={String(currentValue)}
						onValueChange={(value) => callSetter(field.key, value)}
					>
						<Select.Trigger
							id="debug-{field.key}"
							class="h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-100"
						>
							{String(currentValue) || '(default)'}
						</Select.Trigger>
						<Select.Content class="bg-zinc-800 border-zinc-700 z-[100000]">
							{#each field.options as option (option)}
								<Select.Item
									value={String(option)}
									class="text-xs text-zinc-100 focus:bg-zinc-700 focus:text-zinc-100"
								>
									{String(option)}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				{:else if field.type === 'boolean'}
					<Switch
						id="debug-{field.key}"
						checked={Boolean(currentValue)}
						onCheckedChange={(value) => callSetter(field.key, value)}
						class="scale-75"
					/>
				{/if}
			</div>
		{/each}
	</div>

	<div class="flex flex-col gap-2 border-t border-zinc-700 pt-2">
		<h4 class="text-xs font-medium text-zinc-400">Quick Actions</h4>
		<div class="flex gap-2">
			<Button
				variant="outline"
				size="sm"
				class="h-6 text-xs flex-1 bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
				onclick={logState}
			>
				Log State
			</Button>
			<Button
				variant="outline"
				size="sm"
				class="h-6 text-xs flex-1 bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
				onclick={logFeatures}
			>
				Log Features
			</Button>
		</div>
		<Button
			variant="outline"
			size="sm"
			class="h-6 text-xs w-full bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
			onclick={copyDebugUrl}
		>
			Copy Debug URL
		</Button>
	</div>

	{#if hasOverrides}
		<div class="flex flex-col gap-1 border-t border-zinc-700 pt-2" data-testid="url-overrides">
			<h4 class="text-xs font-medium text-zinc-400">URL Overrides</h4>
			<div class="flex flex-col gap-0.5">
				{#each urlOverrideEntries as [key, value] (key)}
					<div class="text-xs text-zinc-300 font-mono">
						<span class="text-cyan-400">wf.{key}</span> = {value}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
