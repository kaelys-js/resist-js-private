<script lang="ts">
import CheckIcon from '@lucide/svelte/icons/check';
import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
import LogInIcon from '@lucide/svelte/icons/log-in';
import LogOutIcon from '@lucide/svelte/icons/log-out';
import { tick } from 'svelte';
import { page } from '$app/state';
import { goto } from '$app/navigation';
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
	type FieldDescriptor,
} from '$lib/debug/dev-toolbar-registry';
import { localeStore, t } from '$lib/i18n.svelte';
import type { Str } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import type { EditorStore } from '$lib/stores/editor-state.svelte';
import type { AppPreferences } from '$lib/schemas/editor-state';

let { editorStore }: { editorStore: EditorStore } = $props();

const preferences = discoverAppPreferences();

/** Keys that belong to the User section. */
const USER_KEYS = new Set(['userName', 'userEmail', 'userAvatar']);

/** App-level preferences (theme, mode, locale, etc.). */
const appPrefs: FieldDescriptor[] = preferences.filter((p) => !USER_KEYS.has(p.key));

/** User-level preferences (name, email, avatar). */
const userPrefs: FieldDescriptor[] = preferences.filter((p) => USER_KEYS.has(p.key));

// Track open state per picklist — initialize all keys to avoid bind:open={undefined}
const picklistKeys = preferences.filter((p) => p.type === 'picklist').map((p) => p.key);
let openPicklists: Record<string, boolean> = $state(
	Object.fromEntries(picklistKeys.map((k) => [k, false])),
);
let triggerRefs: Record<string, HTMLButtonElement | null> = $state(
	Object.fromEntries(picklistKeys.map((k) => [k, null])),
);

// Auth & scene simulation state from URL params
const isLoggedOut: boolean = $derived(page.url.searchParams.get('wf.auth') === 'false');
const isEmptyScenes: boolean = $derived(page.url.searchParams.get('wf.scenes') === 'empty');

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

/** Navigate to current page with `?wf.auth` removed to simulate login. */
function handleLogin(): void {
	const url = new URL(page.url);
	url.searchParams.delete('wf.auth');
	goto(url.toString(), { invalidateAll: true });
}

/** Navigate to current page with `?wf.auth=false` to simulate logout. */
function handleLogout(): void {
	const url = new URL(page.url);
	url.searchParams.set('wf.auth', 'false');
	goto(url.toString(), { invalidateAll: true });
}

/** Toggle `?wf.scenes=empty` to simulate an empty scene list. */
function toggleEmptyScenes(): void {
	const url = new URL(page.url);
	if (isEmptyScenes) {
		url.searchParams.delete('wf.scenes');
	} else {
		url.searchParams.set('wf.scenes', 'empty');
	}
	goto(url.toString(), { invalidateAll: true });
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

	<!-- App Section -->
	<div class="flex flex-col gap-1">
		<h4 class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t(localeStore.t.devToolbar.sectionApp, 'App')}</h4>
		<div class="flex flex-col gap-3">
			{#each appPrefs as pref (pref.key)}
				{@render prefControl(pref)}
			{/each}
		</div>
	</div>

	<!-- User Section -->
	<div class="flex flex-col gap-1 border-t border-border pt-2">
		<h4 class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t(localeStore.t.devToolbar.sectionUser, 'User')}</h4>
		<div class="flex flex-col gap-3">
			{#each userPrefs as pref (pref.key)}
				{@render prefControl(pref)}
			{/each}
			<div class="flex gap-2">
				{#if isLoggedOut}
					<Button variant="secondary" size="sm" class="h-7 text-xs flex-1" onclick={handleLogin}>
						<LogInIcon class="size-3 mr-1" />
						{t(localeStore.t.devToolbar.logIn, 'Log In')}
					</Button>
				{:else}
					<Button variant="outline" size="sm" class="h-7 text-xs flex-1" onclick={handleLogout}>
						<LogOutIcon class="size-3 mr-1" />
						{t(localeStore.t.devToolbar.logOut, 'Log Out')}
					</Button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Scenes Section -->
	<div class="flex flex-col gap-1 border-t border-border pt-2">
		<h4 class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t(localeStore.t.devToolbar.sectionScenes, 'Scenes')}</h4>
		<div class="flex items-center justify-between gap-2 py-0.5">
			<Label class="text-xs" for="pref-simulate-empty-scenes">
				{t(localeStore.t.devToolbar.simulateEmptyScenes, 'Simulate Empty Scenes')}
			</Label>
			<Switch
				id="pref-simulate-empty-scenes"
				checked={isEmptyScenes}
				onCheckedChange={() => toggleEmptyScenes()}
			/>
		</div>
	</div>

	<!-- Reset to Defaults -->
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

{#snippet prefControl(pref: FieldDescriptor)}
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
	{:else if pref.type === 'number'}
		<div class="flex items-center justify-between gap-3">
			<Label class="text-xs shrink-0" for="pref-{pref.key}">
				{labelFor(pref.key)}
			</Label>
			<Input
				id="pref-{pref.key}"
				type="number"
				value={String(currentValue)}
				placeholder="0"
				class="h-8 text-xs md:text-xs w-36"
				oninput={(e: Event) => callSetter(pref.key, Number((e.target as HTMLInputElement).value) || 0)}
			/>
		</div>
	{:else}
		<div class="flex items-center justify-between gap-3">
			<Label class="text-xs shrink-0" for="pref-{pref.key}">
				{labelFor(pref.key)}
			</Label>
			<Input
				id="pref-{pref.key}"
				value={String(currentValue)}
				placeholder={pref.key === 'userAvatar' ? 'https://...' : ''}
				class="h-8 text-xs md:text-xs w-36"
				oninput={(e: Event) => callSetter(pref.key, (e.target as HTMLInputElement).value)}
			/>
		</div>
	{/if}
{/snippet}
