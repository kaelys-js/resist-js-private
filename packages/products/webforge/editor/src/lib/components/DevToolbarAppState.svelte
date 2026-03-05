<script lang="ts">
import CheckIcon from '@lucide/svelte/icons/check';
import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
import { tick } from 'svelte';
import { Switch } from '$lib/components/ui/switch/index.js';
import { Label } from '$lib/components/ui/label/index.js';
import { Input } from '$lib/components/ui/input/index.js';
import { Button } from '$lib/components/ui/button/index.js';
import * as Command from '$lib/components/ui/command/index.js';
import * as Popover from '$lib/components/ui/popover/index.js';
import { cn } from '$lib/utils.js';
import {
	discoverAppPreferences,
	humanizeKey,
	humanizeOption,
} from '$lib/debug/dev-toolbar-registry';
import { localeStore, t } from '$lib/i18n.svelte';
import type { Str } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import type { EditorStore } from '$lib/stores/editor-state.svelte';
import type { AppPreferences } from '$lib/schemas/editor-state';

let { editorStore }: { editorStore: EditorStore } = $props();

const preferences = discoverAppPreferences();

// Track open state per picklist — initialize all keys to avoid bind:open={undefined}
const picklistKeys = preferences.filter((p) => p.type === 'picklist').map((p) => p.key);
let openPicklists: Record<string, boolean> = $state(
	Object.fromEntries(picklistKeys.map((k) => [k, false])),
);
let triggerRefs: Record<string, HTMLButtonElement | null> = $state(
	Object.fromEntries(picklistKeys.map((k) => [k, null])),
);

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

async function selectOption(key: string, value: string): Promise<void> {
	callSetter(key, value);
	openPicklists[key] = false;
	await tick();
	triggerRefs[key]?.focus();
}

let resetState: 'idle' | 'success' = $state('idle');
let resetTimeout: ReturnType<typeof setTimeout> | undefined = $state(undefined);

function resetDefaults(): void {
	for (const pref of preferences) {
		callSetter(pref.key, pref.default);
	}
	resetState = 'success';
	clearTimeout(resetTimeout);
	resetTimeout = setTimeout(() => {
		resetState = 'idle';
	}, 2000);
}

function labelFor(key: string): string {
	const entry = (localeStore.t.devToolbar.labels as unknown as Record<string, () => Result<Str>>)[
		key
	];
	return entry === undefined ? humanizeKey(key) : t(entry, humanizeKey(key));
}

function optionLabel(key: string, value: string): string {
	if (key === 'theme') {
		const themeKey =
			value === '' ? 'themeDefault' : `theme${value.charAt(0).toUpperCase()}${value.slice(1)}`;
		const entry = (localeStore.t.settings as unknown as Record<string, () => Result<Str>>)[
			themeKey
		];
		return entry === undefined ? humanizeOption(key, value) : t(entry, humanizeOption(key, value));
	}
	if (key === 'mode') {
		const entry = (localeStore.t.settings as unknown as Record<string, () => Result<Str>>)[value];
		return entry === undefined ? humanizeOption(key, value) : t(entry, humanizeOption(key, value));
	}
	if (key === 'locale') {
		const display = new Intl.DisplayNames([value], { type: 'language' });
		const endonym: string | undefined = display.of(value);
		return endonym ?? humanizeOption(key, value);
	}
	return humanizeOption(key, value);
}
</script>

<div class="flex flex-col gap-3 p-3" data-testid="dev-toolbar-app-state">
	<h3 class="text-sm font-semibold text-foreground">{t(localeStore.t.devToolbar.appPreferences, 'App Preferences')}</h3>

	<div class="flex flex-col gap-3">
		{#each preferences as pref (pref.key)}
			{@const currentValue = editorStore.app[pref.key as keyof AppPreferences]}

			{#if pref.type === 'boolean'}
				<div class="flex items-center justify-between gap-2">
					<Label class="text-xs" for="pref-{pref.key}">
						{labelFor(pref.key)}
					</Label>
					<Switch
						id="pref-{pref.key}"
						checked={Boolean(currentValue)}
						onCheckedChange={(value) => callSetter(pref.key, value)}
					/>
				</div>
			{:else if pref.type === 'picklist' && pref.options}
				<div class="flex items-center justify-between gap-3">
					<Label class="text-xs shrink-0">
						{labelFor(pref.key)}
					</Label>
					<Popover.Root bind:open={openPicklists[pref.key]}>
						<Popover.Trigger bind:ref={triggerRefs[pref.key]}>
							{#snippet child({ props })}
								<Button
									{...props}
									variant="outline"
									size="sm"
									class="h-8 w-36 justify-between text-xs"
									role="combobox"
									aria-expanded={openPicklists[pref.key]}
								>
									<span class="truncate">{optionLabel(pref.key, String(currentValue))}</span>
									<ChevronsUpDown class="size-3.5 shrink-0 opacity-50" />
								</Button>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content class="z-[100000] w-36 p-0 animation-duration-150 data-[state=closed]:animation-duration-150" side="bottom" align="end" sideOffset={4}>
							<Command.Root>
								<Command.Input placeholder={t(localeStore.t.devToolbar.search, 'Search…')} class="h-8 text-xs" />
								<Command.List>
									<Command.Empty class="py-3 text-center text-xs">{t(localeStore.t.devToolbar.noMatch, 'No match')}</Command.Empty>
									<Command.Group>
										{#each pref.options as option (option)}
											<Command.Item
												value={optionLabel(pref.key, String(option))}
												onSelect={() => selectOption(pref.key, String(option))}
												class="text-xs"
											>
												<CheckIcon class={cn('size-3.5 shrink-0', String(currentValue) !== String(option) && 'text-transparent')} />
												{optionLabel(pref.key, String(option))}
											</Command.Item>
										{/each}
									</Command.Group>
								</Command.List>
							</Command.Root>
						</Popover.Content>
					</Popover.Root>
				</div>
			{:else}
				<div class="flex items-center justify-between gap-3">
					<Label class="text-xs shrink-0" for="pref-{pref.key}">
						{labelFor(pref.key)}
					</Label>
					<Input
						id="pref-{pref.key}"
						value={String(currentValue)}
						class="h-8 text-xs w-36"
						oninput={(e: Event) => callSetter(pref.key, (e.target as HTMLInputElement).value)}
					/>
				</div>
			{/if}
		{/each}
	</div>

	<div class="border-t border-border pt-2">
		<Button
			variant="secondary"
			size="sm"
			class="h-7 text-xs w-full {resetState === 'success' ? 'text-green-500' : ''}"
			onclick={resetDefaults}
			data-testid="reset-defaults-btn"
		>
			{#if resetState === 'success'}
				<CheckIcon class="size-3 mr-1" />
				{t(localeStore.t.devToolbar.resetDone, 'Reset!')}
			{:else}
				<RotateCcwIcon class="size-3 mr-1" />
				{t(localeStore.t.devToolbar.resetToDefaults, 'Reset to Defaults')}
			{/if}
		</Button>
	</div>
</div>
