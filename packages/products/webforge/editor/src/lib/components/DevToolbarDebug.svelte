<script lang="ts">
import CheckIcon from '@lucide/svelte/icons/check';
import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
import { tick } from 'svelte';
import { Switch } from '$lib/components/ui/switch/index.js';
import { Label } from '$lib/components/ui/label/index.js';
import { Button } from '$lib/components/ui/button/index.js';
import * as Command from '$lib/components/ui/command/index.js';
import * as Popover from '$lib/components/ui/popover/index.js';
import { cn } from '$lib/utils.js';
import CopyIcon from '@lucide/svelte/icons/copy';
import LinkIcon from '@lucide/svelte/icons/link';
import TerminalIcon from '@lucide/svelte/icons/terminal';
import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
import XIcon from '@lucide/svelte/icons/x';
import {
	discoverDebugFields,
	generateDebugUrl,
	humanizeKey,
	humanizeOption,
} from '$lib/debug/dev-toolbar-registry';
import { getBuildInfo } from '$lib/config/build-info';
import { localeStore, t } from '$lib/i18n.svelte';
import { announce } from '$lib/utils/announce.svelte';
import type { Str } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import type { EditorStore } from '$lib/stores/editor-state.svelte';
import type { DebugStore } from '$lib/stores/debug-state.svelte';
import type { DebugState } from '$lib/schemas/debug-state';
import type { EditorDevtools } from '$lib/debug/devtools-api.svelte';

let { editorStore, debugStore }: { editorStore: EditorStore; debugStore: DebugStore } = $props();

const debugFields = discoverDebugFields();

const urlOverrideEntries = $derived(Object.entries(debugStore.urlOverrides));
const hasOverrides: boolean = $derived(urlOverrideEntries.length > 0);

const picklistKeys = debugFields.filter((f) => f.type === 'picklist').map((f) => f.key);
let openPicklists: Record<string, boolean> = $state(
	Object.fromEntries(picklistKeys.map((k) => [k, false])),
);
let triggerRefs: Record<string, HTMLButtonElement | null> = $state(
	Object.fromEntries(picklistKeys.map((k) => [k, null])),
);

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

async function selectOption(key: string, value: string): Promise<void> {
	callSetter(key, value);
	openPicklists[key] = false;
	await tick();
	triggerRefs[key]?.focus();
}

/** Feedback state type: idle → success/failed → idle (after timeout). */
type FeedbackState = 'idle' | 'success' | 'failed';

let logStateState: FeedbackState = $state('idle');
let logFeaturesState: FeedbackState = $state('idle');
let debugUrlCopyState: FeedbackState = $state('idle');
let buildInfoCopyState: FeedbackState = $state('idle');

let logStateTimeout: ReturnType<typeof setTimeout> | undefined = $state(undefined);
let logFeaturesTimeout: ReturnType<typeof setTimeout> | undefined = $state(undefined);
let debugUrlCopyTimeout: ReturnType<typeof setTimeout> | undefined = $state(undefined);
let buildInfoCopyTimeout: ReturnType<typeof setTimeout> | undefined = $state(undefined);

function logState(): void {
	const devtools = (window as unknown as Record<string, EditorDevtools | undefined>)[
		'__EDITOR_DEVTOOLS__'
	];
	devtools?.logState();
	logStateState = 'success';
	clearTimeout(logStateTimeout);
	logStateTimeout = setTimeout(() => {
		logStateState = 'idle';
	}, 2000);
}

function logFeatures(): void {
	const devtools = (window as unknown as Record<string, EditorDevtools | undefined>)[
		'__EDITOR_DEVTOOLS__'
	];
	devtools?.logFeatures();
	logFeaturesState = 'success';
	clearTimeout(logFeaturesTimeout);
	logFeaturesTimeout = setTimeout(() => {
		logFeaturesState = 'idle';
	}, 2000);
}

async function copyDebugUrl(): Promise<void> {
	try {
		const url: string = generateDebugUrl(editorStore, debugStore);
		await navigator.clipboard.writeText(url);
		debugUrlCopyState = 'success';
		announce(t(localeStore.t.errors.copied, 'Copied!'));
	} catch {
		debugUrlCopyState = 'failed';
		announce(t(localeStore.t.errors.copyFailed, 'Copy failed'));
	}
	clearTimeout(debugUrlCopyTimeout);
	debugUrlCopyTimeout = setTimeout(() => {
		debugUrlCopyState = 'idle';
	}, 2000);
}

const buildInfoResult = getBuildInfo();
const buildInfo = buildInfoResult.ok ? buildInfoResult.data : null;

async function copyBuildInfo(): Promise<void> {
	if (!buildInfo) return;
	try {
		const dirtyLabel: string = t(
			buildInfo.dirty
				? localeStore.t.devToolbar.labels.dirtyYes
				: localeStore.t.devToolbar.labels.dirtyNo,
			buildInfo.dirty ? 'Yes' : 'No',
		);
		const text = [
			`Version: ${buildInfo.version}`,
			`Commit: ${buildInfo.commit}`,
			`Branch: ${buildInfo.branch}`,
			`Dirty: ${dirtyLabel}`,
			`Built: ${buildInfo.buildTimestamp}`,
		].join('\n');
		await navigator.clipboard.writeText(text);
		buildInfoCopyState = 'success';
		announce(t(localeStore.t.errors.copied, 'Copied!'));
	} catch {
		buildInfoCopyState = 'failed';
		announce(t(localeStore.t.errors.copyFailed, 'Copy failed'));
	}
	clearTimeout(buildInfoCopyTimeout);
	buildInfoCopyTimeout = setTimeout(() => {
		buildInfoCopyState = 'idle';
	}, 2000);
}

function labelFor(key: string): string {
	const entry = (localeStore.t.devToolbar.labels as unknown as Record<string, () => Result<Str>>)[
		key
	];
	return entry === undefined ? humanizeKey(key) : t(entry, humanizeKey(key));
}

function optionLabel(key: string, value: string): string {
	if (key === 'logLevel') {
		const logLevelKey = `logLevel${value.charAt(0).toUpperCase()}${value.slice(1)}`;
		const entry = (localeStore.t.devToolbar as unknown as Record<string, () => Result<Str>>)[
			logLevelKey
		];
		return entry === undefined ? humanizeOption(key, value) : t(entry, humanizeOption(key, value));
	}
	return humanizeOption(key, value);
}
</script>

<div class="flex flex-col gap-3 p-3" data-testid="dev-toolbar-debug">
	<h3 class="text-sm font-semibold text-foreground">{t(localeStore.t.devToolbar.debugSettings, 'Debug Settings')}</h3>

	<div class="flex flex-col gap-3">
		{#each debugFields as field (field.key)}
			{@const currentValue = debugStore.debug[field.key as keyof DebugState]}

			{#if field.type === 'boolean'}
				<div class="flex items-center justify-between gap-2">
					<Label class="text-xs" for="debug-{field.key}">
						{labelFor(field.key)}
					</Label>
					<Switch
						id="debug-{field.key}"
						checked={Boolean(currentValue)}
						onCheckedChange={(value) => callSetter(field.key, value)}
					/>
				</div>
			{:else if field.type === 'picklist' && field.options}
				<div class="flex items-center justify-between gap-3">
					<Label class="text-xs shrink-0">
						{labelFor(field.key)}
					</Label>
					<Popover.Root bind:open={openPicklists[field.key]}>
						<Popover.Trigger bind:ref={triggerRefs[field.key]}>
							{#snippet child({ props })}
								<Button
									{...props}
									variant="outline"
									size="sm"
									class="h-8 w-36 justify-between text-xs"
									role="combobox"
									aria-expanded={openPicklists[field.key]}
								>
									<span class="truncate">{optionLabel(field.key, String(currentValue))}</span>
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
										{#each field.options as option (option)}
											<Command.Item
												value={optionLabel(field.key, String(option))}
												onSelect={() => selectOption(field.key, String(option))}
												class="text-xs"
											>
												<CheckIcon class={cn('size-3.5 shrink-0', String(currentValue) !== String(option) && 'text-transparent')} />
												{optionLabel(field.key, String(option))}
											</Command.Item>
										{/each}
									</Command.Group>
								</Command.List>
							</Command.Root>
						</Popover.Content>
					</Popover.Root>
				</div>
			{/if}
		{/each}
	</div>

	<div class="flex flex-col gap-2 border-t border-border pt-2">
		<h4 class="text-xs font-medium text-muted-foreground">{t(localeStore.t.devToolbar.quickActions, 'Quick Actions')}</h4>
		<div class="flex gap-2">
			<Button
				variant="secondary"
				size="sm"
				class="h-7 text-xs flex-1 {logStateState === 'success' ? 'text-green-500' : ''}"
				onclick={logState}
				data-testid="log-state-btn"
			>
				{#if logStateState === 'success'}
					<CheckIcon class="size-3 mr-1" />
					{t(localeStore.t.devToolbar.logged, 'Logged!')}
				{:else}
					<TerminalIcon class="size-3 mr-1" />
					{t(localeStore.t.devToolbar.logState, 'Log State')}
				{/if}
			</Button>
			<Button
				variant="secondary"
				size="sm"
				class="h-7 text-xs flex-1 {logFeaturesState === 'success' ? 'text-green-500' : ''}"
				onclick={logFeatures}
				data-testid="log-features-btn"
			>
				{#if logFeaturesState === 'success'}
					<CheckIcon class="size-3 mr-1" />
					{t(localeStore.t.devToolbar.logged, 'Logged!')}
				{:else}
					<TerminalIcon class="size-3 mr-1" />
					{t(localeStore.t.devToolbar.logFeatures, 'Log Features')}
				{/if}
			</Button>
		</div>
		<Button
			variant="secondary"
			size="sm"
			class="h-7 text-xs w-full {debugUrlCopyState === 'success' ? 'text-green-500' : ''}{debugUrlCopyState === 'failed' ? 'text-red-500' : ''}"
			onclick={copyDebugUrl}
			data-testid="copy-debug-url"
		>
			{#if debugUrlCopyState === 'success'}
				<CheckIcon class="size-3 mr-1" />
				{t(localeStore.t.errors.copied, 'Copied!')}
			{:else if debugUrlCopyState === 'failed'}
				<XIcon class="size-3 mr-1" />
				{t(localeStore.t.errors.copyFailed, 'Copy failed')}
			{:else}
				<LinkIcon class="size-3 mr-1" />
				{t(localeStore.t.devToolbar.copyDebugUrl, 'Copy Debug URL')}
			{/if}
		</Button>
	</div>

	{#if hasOverrides}
		<div class="flex flex-col gap-1 border-t border-border pt-2" data-testid="url-overrides">
			<h4 class="text-xs font-medium text-muted-foreground">{t(localeStore.t.devToolbar.urlOverrides, 'URL Overrides')}</h4>
			<div class="flex flex-col gap-0.5">
				{#each urlOverrideEntries as [key, value] (key)}
					<div class="text-xs font-mono text-muted-foreground">
						<span class="text-primary">wf.{key}</span> = {value}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if buildInfo}
		<div class="flex flex-col gap-1.5 border-t border-border pt-2" data-testid="build-info">
			<h4 class="text-xs font-medium text-muted-foreground">{t(localeStore.t.devToolbar.buildInfo, 'Build Info')}</h4>
			<div class="flex flex-col gap-0.5 text-xs">
				<div class="flex justify-between">
					<span class="text-muted-foreground">{t(localeStore.t.devToolbar.labels.version, 'Version')}</span>
					<span class="font-mono">{buildInfo.version}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-muted-foreground">{t(localeStore.t.devToolbar.labels.commit, 'Commit')}</span>
					<span class="font-mono">{buildInfo.commit}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-muted-foreground">{t(localeStore.t.devToolbar.labels.branch, 'Branch')}</span>
					<span class="font-mono">{buildInfo.branch}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-muted-foreground">{t(localeStore.t.devToolbar.labels.dirty, 'Dirty')}</span>
					<span class="flex items-center gap-1 font-mono">
						{#if buildInfo.dirty}
							<TriangleAlertIcon class="size-4 text-yellow-500" />
						{/if}
						{t(
							buildInfo.dirty ? localeStore.t.devToolbar.labels.dirtyYes : localeStore.t.devToolbar.labels.dirtyNo,
							buildInfo.dirty ? 'Yes' : 'No',
						)}
					</span>
				</div>
				<div class="flex justify-between">
					<span class="text-muted-foreground">{t(localeStore.t.devToolbar.labels.built, 'Built')}</span>
					<span class="font-mono text-[10px]">{buildInfo.buildTimestamp}</span>
				</div>
			</div>
			<Button
				variant="secondary"
				size="sm"
				class="h-7 text-xs w-full mt-1 {buildInfoCopyState === 'success' ? 'text-green-500' : ''}{buildInfoCopyState === 'failed' ? 'text-red-500' : ''}"
				onclick={copyBuildInfo}
				data-testid="copy-build-info"
			>
				{#if buildInfoCopyState === 'success'}
					<CheckIcon class="size-3 mr-1" />
					{t(localeStore.t.errors.copied, 'Copied!')}
				{:else if buildInfoCopyState === 'failed'}
					<XIcon class="size-3 mr-1" />
					{t(localeStore.t.errors.copyFailed, 'Copy failed')}
				{:else}
					<CopyIcon class="size-3 mr-1" />
					{t(localeStore.t.devToolbar.copyBuildInfo, 'Copy Build Info')}
				{/if}
			</Button>
		</div>
	{/if}
</div>
