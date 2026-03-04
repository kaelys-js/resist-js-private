<script lang="ts">
import Wrench from '@lucide/svelte/icons/wrench';
import Flag from '@lucide/svelte/icons/flag';
import Settings2 from '@lucide/svelte/icons/settings-2';
import Bug from '@lucide/svelte/icons/bug';
import Sun from '@lucide/svelte/icons/sun';
import Moon from '@lucide/svelte/icons/moon';
import Monitor from '@lucide/svelte/icons/monitor';
import ClipboardCopy from '@lucide/svelte/icons/clipboard-copy';
import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
import { Button } from '$lib/components/ui/button/index.js';
import * as Tooltip from '$lib/components/ui/tooltip/index.js';
import { Separator } from '$lib/components/ui/separator/index.js';
import { useEditorStore } from '$lib/stores/editor-state.svelte';
import { useDebugStore } from '$lib/stores/debug-state.svelte';
import DevToolbarFeatureFlags from './DevToolbarFeatureFlags.svelte';
import DevToolbarAppState from './DevToolbarAppState.svelte';
import DevToolbarDebug from './DevToolbarDebug.svelte';
import { discoverFeatureFlags, discoverAppPreferences } from '$lib/debug/dev-toolbar-registry';
import type { FeatureFlags } from '$lib/schemas/editor-state';

const editorStore = useEditorStore();
const debugStore = useDebugStore();

let toolbarOpen = $state(false);
let activePanel: string | null = $state(null);

// ── Badge data ────────────────────────────────────────────────────────
const flags = discoverFeatureFlags();
const enabledCount: number = $derived(
	flags.filter((f) => editorStore.features[f.key as keyof FeatureFlags]).length,
);

// ── Mode cycling ──────────────────────────────────────────────────────
const MODES = ['light', 'dark', 'system'] as const;

/**
 * Cycles through light → dark → system → light.
 */
function cycleMode(): void {
	const currentIdx: number = MODES.indexOf(editorStore.app.mode as (typeof MODES)[number]);
	const nextIdx: number = (currentIdx + 1) % MODES.length;
	editorStore.setMode(MODES[nextIdx]);
}

// ── Quick actions ─────────────────────────────────────────────────────

/**
 * Copies full state JSON to clipboard.
 */
async function copyDebugInfo(): Promise<void> {
	const state = {
		app: { ...editorStore.app },
		features: { ...editorStore.features },
		debug: { ...debugStore.debug },
	};
	await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
}

/**
 * Resets all state to defaults.
 */
function resetAll(): void {
	const prefs = discoverAppPreferences();
	for (const pref of prefs) {
		const setterName = `set${pref.key.charAt(0).toUpperCase()}${pref.key.slice(1)}`;
		const setter = (editorStore as unknown as Record<string, (v: unknown) => unknown>)[setterName];
		if (typeof setter === 'function') {
			setter(pref.default);
		}
	}
	for (const flag of flags) {
		editorStore.setFeature(flag.key, flag.default);
	}
	debugStore.setLogLevel('info');
}

// ── Panel management ──────────────────────────────────────────────────

/**
 * Toggles a panel open/closed. Only one panel open at a time.
 *
 * @param panel - Panel identifier ('flags', 'app', 'debug')
 */
function togglePanel(panel: string): void {
	activePanel = activePanel === panel ? null : panel;
}

// Popover open states — driven by activePanel
const flagsOpen: boolean = $derived(activePanel === 'flags');
const appOpen: boolean = $derived(activePanel === 'app');
const debugOpen: boolean = $derived(activePanel === 'debug');

// ── Keyboard shortcuts ────────────────────────────────────────────────
$effect(() => {
	/**
	 * Global keydown handler for toolbar shortcuts.
	 *
	 * @param e - Keyboard event
	 */
	function handleKeydown(e: KeyboardEvent): void {
		// Ctrl+Shift+D: toggle toolbar + enable debug
		if (e.ctrlKey && e.shiftKey && e.key === 'D') {
			e.preventDefault();
			if (!debugStore.debug.enabled) {
				debugStore.setEnabled(true);
			}
			toolbarOpen = !toolbarOpen;
		}

		// Escape: close active panel
		if (e.key === 'Escape' && activePanel) {
			activePanel = null;
		}
	}

	window.addEventListener('keydown', handleKeydown);
	return () => window.removeEventListener('keydown', handleKeydown);
});
</script>

{#if debugStore.debug.enabled}
	<Tooltip.Provider delayDuration={300}>
		<div
			class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[99999] flex flex-col items-center gap-2"
			data-testid="dev-toolbar"
		>
		<!-- Active panel popover content (rendered above toolbar) -->
		{#if toolbarOpen && activePanel}
			<div class="w-80 max-h-[60vh] overflow-auto rounded-lg bg-zinc-900 border border-zinc-700 shadow-xl">
				{#if activePanel === 'flags'}
					<DevToolbarFeatureFlags {editorStore} />
				{:else if activePanel === 'app'}
					<DevToolbarAppState {editorStore} />
				{:else if activePanel === 'debug'}
					<DevToolbarDebug {editorStore} {debugStore} />
				{/if}
			</div>
		{/if}

		<!-- Toolbar bar -->
		{#if toolbarOpen}
			<div
				role="toolbar"
				aria-label="Developer toolbar"
				aria-orientation="horizontal"
				class="flex items-center gap-1 px-2 py-1.5 rounded-full bg-zinc-900 border border-zinc-700 shadow-xl"
				data-testid="dev-toolbar-bar"
			>
				<!-- Panel buttons -->
				<Tooltip.Root delayDuration={300}>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								size="icon"
								class="size-8 {flagsOpen
									? 'bg-zinc-700 text-cyan-400'
									: 'text-zinc-400 hover:text-zinc-100'}"
								onclick={() => togglePanel('flags')}
								aria-label="Feature flags"
								aria-pressed={flagsOpen}
								data-testid="toolbar-btn-flags"
							>
								<Flag class="size-4" />
							</Button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="top" sideOffset={8}>
						Feature Flags ({enabledCount}/{flags.length})
					</Tooltip.Content>
				</Tooltip.Root>

				<Tooltip.Root delayDuration={300}>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								size="icon"
								class="size-8 {appOpen
									? 'bg-zinc-700 text-cyan-400'
									: 'text-zinc-400 hover:text-zinc-100'}"
								onclick={() => togglePanel('app')}
								aria-label="App state"
								aria-pressed={appOpen}
								data-testid="toolbar-btn-app"
							>
								<Settings2 class="size-4" />
							</Button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="top" sideOffset={8}>
						App State
					</Tooltip.Content>
				</Tooltip.Root>

				<Tooltip.Root delayDuration={300}>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								size="icon"
								class="size-8 {debugOpen
									? 'bg-zinc-700 text-cyan-400'
									: 'text-zinc-400 hover:text-zinc-100'}"
								onclick={() => togglePanel('debug')}
								aria-label="Debug"
								aria-pressed={debugOpen}
								data-testid="toolbar-btn-debug"
							>
								<Bug class="size-4" />
							</Button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="top" sideOffset={8}>
						Debug
					</Tooltip.Content>
				</Tooltip.Root>

				<Separator orientation="vertical" class="mx-1 h-5 bg-zinc-700" />

				<!-- Quick action: cycle mode -->
				<Tooltip.Root delayDuration={300}>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								size="icon"
								class="size-8 text-zinc-400 hover:text-zinc-100"
								onclick={cycleMode}
								aria-label="Toggle mode"
								data-testid="toolbar-btn-mode"
							>
								{#if editorStore.app.mode === 'light'}
									<Sun class="size-4" />
								{:else if editorStore.app.mode === 'dark'}
									<Moon class="size-4" />
								{:else}
									<Monitor class="size-4" />
								{/if}
							</Button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="top" sideOffset={8}>
						Mode: {editorStore.app.mode}
					</Tooltip.Content>
				</Tooltip.Root>

				<!-- Quick action: copy debug info -->
				<Tooltip.Root delayDuration={300}>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								size="icon"
								class="size-8 text-zinc-400 hover:text-zinc-100"
								onclick={copyDebugInfo}
								aria-label="Copy debug info"
								data-testid="toolbar-btn-copy"
							>
								<ClipboardCopy class="size-4" />
							</Button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="top" sideOffset={8}>
						Copy Debug Info
					</Tooltip.Content>
				</Tooltip.Root>

				<!-- Quick action: reset all -->
				<Tooltip.Root delayDuration={300}>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								size="icon"
								class="size-8 text-zinc-400 hover:text-zinc-100"
								onclick={resetAll}
								aria-label="Reset all state"
								data-testid="toolbar-btn-reset"
							>
								<RotateCcw class="size-4" />
							</Button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="top" sideOffset={8}>
						Reset All
					</Tooltip.Content>
				</Tooltip.Root>
			</div>
		{/if}

		<!-- Trigger pill -->
		<button
			class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-700 shadow-xl text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
			onclick={() => {
				toolbarOpen = !toolbarOpen;
				if (!toolbarOpen) activePanel = null;
			}}
			aria-label={toolbarOpen ? 'Collapse developer toolbar' : 'Expand developer toolbar'}
			aria-expanded={toolbarOpen}
			data-testid="dev-toolbar-trigger"
		>
			<Wrench class="size-3.5 text-cyan-400" />
			<span class="text-xs font-bold tracking-wider">DEV</span>
		</button>
		</div>
	</Tooltip.Provider>
{/if}
