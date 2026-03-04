<script lang="ts">
import Code from '@lucide/svelte/icons/code';
import Flag from '@lucide/svelte/icons/flag';
import Settings2 from '@lucide/svelte/icons/settings-2';
import Bug from '@lucide/svelte/icons/bug';
import Sun from '@lucide/svelte/icons/sun';
import Moon from '@lucide/svelte/icons/moon';
import Monitor from '@lucide/svelte/icons/monitor';
import ClipboardCopy from '@lucide/svelte/icons/clipboard-copy';
import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
import Check from '@lucide/svelte/icons/check';
import { Button } from '$lib/components/ui/button/index.js';
import * as Tooltip from '$lib/components/ui/tooltip/index.js';
import { Separator } from '$lib/components/ui/separator/index.js';
import { useEditorStore } from '$lib/stores/editor-state.svelte';
import { useDebugStore } from '$lib/stores/debug-state.svelte';
import { localeStore, t } from '$lib/i18n.svelte';
import type { Str } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import DevToolbarFeatureFlags from './DevToolbarFeatureFlags.svelte';
import DevToolbarAppState from './DevToolbarAppState.svelte';
import DevToolbarDebug from './DevToolbarDebug.svelte';
import { discoverFeatureFlags, discoverAppPreferences } from '$lib/debug/dev-toolbar-registry';
import { storageKey } from '$lib/config/app-meta';
import { scale, fly } from 'svelte/transition';

const editorStore = useEditorStore();
const debugStore = useDebugStore();

const isMac: boolean =
	typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
const shortcutHint: string = isMac ? '⌃ Shift D' : 'Ctrl+Shift+D';

let toolbarOpen = $state(false);
let activePanel: string | null = $state(null);
let copySuccess = $state(false);
let resetSuccess = $state(false);

// ── Draggable position (persisted to localStorage) ───────────────────
const POS_KEY: string = storageKey('dev-toolbar-pos');

function loadPos(): { x: number; b: number } {
	if (typeof window === 'undefined') return { x: 0, b: 16 };
	try {
		const raw: string | null = localStorage.getItem(POS_KEY);
		if (raw) {
			const p = JSON.parse(raw);
			if (typeof p.x === 'number' && typeof p.b === 'number') {
				return { x: p.x, b: p.b };
			}
		}
	} catch (_) {
		/* noop */
	}
	return { x: window.innerWidth / 2, b: 16 };
}

const initPos = loadPos();
let posX: number = $state(initPos.x);
let posBottom: number = $state(initPos.b);

let dragging = $state(false);
let dragStartClientX = 0;
let dragStartClientY = 0;
let dragOriginX = 0;
let dragOriginBottom = 0;
let didDrag = false;

function savePos(): void {
	try {
		localStorage.setItem(POS_KEY, JSON.stringify({ x: posX, b: posBottom }));
	} catch (_) {
		/* noop */
	}
}

function onDragStart(e: PointerEvent): void {
	dragging = true;
	didDrag = false;
	dragStartClientX = e.clientX;
	dragStartClientY = e.clientY;
	dragOriginX = posX;
	dragOriginBottom = posBottom;
	(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}

function onDragMove(e: PointerEvent): void {
	if (!dragging) return;
	const dx: number = e.clientX - dragStartClientX;
	const dy: number = e.clientY - dragStartClientY;
	if (!didDrag && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
	didDrag = true;
	posX = Math.max(24, Math.min(window.innerWidth - 24, dragOriginX + dx));
	posBottom = Math.max(8, Math.min(window.innerHeight - 48, dragOriginBottom - dy));
}

function onDragEnd(): void {
	dragging = false;
	if (didDrag) savePos();
}

// ── Clamp position on viewport resize ─────────────────────────────────
$effect(() => {
	/**
	 * Clamps toolbar position to visible bounds when viewport resizes.
	 */
	function onResize(): void {
		const maxX: number = window.innerWidth - 24;
		const maxB: number = window.innerHeight - 48;
		let changed = false;
		if (posX > maxX) {
			posX = Math.max(24, maxX);
			changed = true;
		}
		if (posBottom > maxB) {
			posBottom = Math.max(8, maxB);
			changed = true;
		}
		if (changed) savePos();
	}
	window.addEventListener('resize', onResize);
	return () => window.removeEventListener('resize', onResize);
});

// ── Badge data ────────────────────────────────────────────────────────
const flags = discoverFeatureFlags();
type LocaleFn = (params: Record<string, never>) => Result<Str>;
const MODE_FALLBACKS: Record<string, string> = { light: 'Light', dark: 'Dark', system: 'System' };
const modeDisplayName: string = $derived(
	(() => {
		const { mode } = editorStore.app;
		const lookup: Record<string, LocaleFn> = {
			light: localeStore.t.settings.light as LocaleFn,
			dark: localeStore.t.settings.dark as LocaleFn,
			system: localeStore.t.settings.system as LocaleFn,
		};
		const fn: LocaleFn | undefined = lookup[mode];
		if (!fn) return mode;
		return t(fn, MODE_FALLBACKS[mode] ?? mode);
	})(),
);
const cycleThemeLabel: string = $derived(
	(() => {
		const result: Result<Str> = (
			localeStore.t.devToolbar.cycleTheme as (p: { mode: string }) => Result<Str>
		)({ mode: modeDisplayName });
		return result.ok ? result.data : `Cycle Theme (${modeDisplayName})`;
	})(),
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
	copySuccess = true;
	setTimeout(() => {
		copySuccess = false;
	}, 1000);
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

	// Reset toolbar position to center-bottom
	try {
		localStorage.removeItem(POS_KEY);
		localStorage.removeItem(storageKey('sidebar-px'));
	} catch (_) {
		/* noop */
	}
	posX = window.innerWidth / 2;
	posBottom = 16;

	resetSuccess = true;
	setTimeout(() => {
		resetSuccess = false;
	}, 1000);
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

// ── Roving tabindex ──────────────────────────────────────────────────
const TOOLBAR_BUTTON_IDS: readonly string[] = [
	'toolbar-btn-flags',
	'toolbar-btn-app',
	'toolbar-btn-debug',
	'toolbar-btn-mode',
	'toolbar-btn-copy',
	'toolbar-btn-reset',
];

let focusedIndex: number = $state(0);

/**
 * WAI-ARIA toolbar keyboard navigation — roving tabindex pattern.
 *
 * @param e - Keyboard event from the toolbar container
 */
function handleToolbarKeydown(e: KeyboardEvent): void {
	const count: number = TOOLBAR_BUTTON_IDS.length;
	let nextIndex: number | null = null;

	switch (e.key) {
		case 'ArrowRight': {
			nextIndex = (focusedIndex + 1) % count;
			break;
		}
		case 'ArrowLeft': {
			nextIndex = (focusedIndex - 1 + count) % count;
			break;
		}
		case 'Home': {
			nextIndex = 0;
			break;
		}
		case 'End': {
			nextIndex = count - 1;
			break;
		}
		case 'Escape': {
			if (!activePanel) {
				toolbarOpen = false;
			}
			return;
		}
		default: {
			return;
		}
	}

	e.preventDefault();
	focusedIndex = nextIndex;
	const btn: HTMLElement | null = document.querySelector(
		`[data-testid="${TOOLBAR_BUTTON_IDS[nextIndex]}"]`,
	);
	btn?.focus();
}

// Move focus into panel content when a panel opens.
$effect(() => {
	if (!activePanel) return;
	requestAnimationFrame(() => {
		const panelEl: HTMLElement | null = document.querySelector(
			'[data-testid="dev-toolbar"] [data-testid^="dev-toolbar-panel"]',
		);
		if (!panelEl) return;
		const focusable: HTMLElement | null = panelEl.querySelector(
			'button, [tabindex="0"], input, select, textarea, a[href]',
		);
		focusable?.focus();
	});
});

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

		// Escape: close active panel, or close toolbar if no panel active
		if (e.key === 'Escape') {
			if (activePanel) {
				activePanel = null;
			} else if (toolbarOpen) {
				toolbarOpen = false;
			}
		}
	}

	window.addEventListener('keydown', handleKeydown);
	return () => window.removeEventListener('keydown', handleKeydown);
});
</script>

{#if debugStore.debug.enabled}
	<Tooltip.Provider delayDuration={300}>
		<div
			class="fixed z-[99999] flex flex-col items-center gap-2"
			style="left: {posX}px; bottom: {posBottom}px; transform: translateX(-50%)"
			data-testid="dev-toolbar"
		>
		<!-- Active panel popover content (rendered above toolbar) -->
		{#if toolbarOpen && activePanel}
			<div
				transition:fly={{ y: 8, duration: 150 }}
				class="w-80 max-h-[60vh] overflow-auto rounded-lg bg-popover/80 backdrop-blur-xl border border-border shadow-2xl shadow-black/20"
				data-testid="dev-toolbar-panel"
			>
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
				tabindex={-1}
				aria-label={t(localeStore.t.devToolbar.title, 'Developer Toolbar')}
				aria-orientation="horizontal"
				onkeydown={handleToolbarKeydown}
				transition:scale={{ start: 0.6, duration: 150 }}
				class="flex items-center gap-1 px-2 py-1.5 rounded-full bg-popover/80 backdrop-blur-xl border border-border shadow-2xl shadow-black/20 origin-bottom"
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
								tabindex={focusedIndex === 0 ? 0 : -1}
								class="size-8 hover:bg-transparent! transition-colors duration-200 {flagsOpen
									? 'text-primary'
									: 'text-muted-foreground hover:text-primary'}"
								onclick={() => togglePanel('flags')}
								aria-label={t(localeStore.t.devToolbar.featureFlags, 'Feature Flags')}
								aria-pressed={flagsOpen}
								data-testid="toolbar-btn-flags"
							>
								<Flag class="size-4" />
							</Button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="top" sideOffset={8} class="z-[100000]">
						<span class="flex items-center gap-1.5">{t(localeStore.t.devToolbar.featureFlags, 'Feature Flags')} <kbd class="inline-flex items-center rounded border border-border bg-secondary px-1.5 py-0.5 text-xs font-mono leading-none text-muted-foreground shadow-sm">Esc</kbd></span>
					</Tooltip.Content>
				</Tooltip.Root>

				<Tooltip.Root delayDuration={300}>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								size="icon"
								tabindex={focusedIndex === 1 ? 0 : -1}
								class="size-8 hover:bg-transparent! transition-colors duration-200 {appOpen
									? 'text-primary'
									: 'text-muted-foreground hover:text-primary'}"
								onclick={() => togglePanel('app')}
								aria-label={t(localeStore.t.devToolbar.appPreferences, 'App Preferences')}
								aria-pressed={appOpen}
								data-testid="toolbar-btn-app"
							>
								<Settings2 class="size-4" />
							</Button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="top" sideOffset={8} class="z-[100000]">
						<span class="flex items-center gap-1.5">{t(localeStore.t.devToolbar.appPreferences, 'App Preferences')} <kbd class="inline-flex items-center rounded border border-border bg-secondary px-1.5 py-0.5 text-xs font-mono leading-none text-muted-foreground shadow-sm">Esc</kbd></span>
					</Tooltip.Content>
				</Tooltip.Root>

				<Tooltip.Root delayDuration={300}>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								size="icon"
								tabindex={focusedIndex === 2 ? 0 : -1}
								class="size-8 hover:bg-transparent! transition-colors duration-200 {debugOpen
									? 'text-primary'
									: 'text-muted-foreground hover:text-primary'}"
								onclick={() => togglePanel('debug')}
								aria-label={t(localeStore.t.devToolbar.debugSettings, 'Debug Settings')}
								aria-pressed={debugOpen}
								data-testid="toolbar-btn-debug"
							>
								<Bug class="size-4" />
							</Button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="top" sideOffset={8} class="z-[100000]">
						<span class="flex items-center gap-1.5">{t(localeStore.t.devToolbar.debugSettings, 'Debug Settings')} <kbd class="inline-flex items-center rounded border border-border bg-secondary px-1.5 py-0.5 text-xs font-mono leading-none text-muted-foreground shadow-sm">Esc</kbd></span>
					</Tooltip.Content>
				</Tooltip.Root>

				<Separator orientation="vertical" class="mx-1 h-5 bg-border" />

				<!-- Quick action: cycle mode -->
				<Tooltip.Root delayDuration={300}>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								size="icon"
								tabindex={focusedIndex === 3 ? 0 : -1}
								class="size-8 hover:bg-transparent! transition-colors duration-200 text-muted-foreground hover:text-primary"
								onclick={cycleMode}
								aria-label={cycleThemeLabel}
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
					<Tooltip.Content side="top" sideOffset={8} class="z-[100000]">
						{cycleThemeLabel}
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
								tabindex={focusedIndex === 4 ? 0 : -1}
								class="size-8 hover:bg-transparent! transition-colors duration-200 {copySuccess
								? 'text-green-500'
								: 'text-muted-foreground hover:text-primary'}"
								onclick={copyDebugInfo}
								aria-label={t(localeStore.t.devToolbar.copyStateJson, 'Copy State as JSON')}
								data-testid="toolbar-btn-copy"
							>
								<span class="grid place-items-center size-4">
									{#key copySuccess}
										<span class="col-start-1 row-start-1" in:scale={{ start: 0, duration: 150 }} out:scale={{ start: 0, duration: 150 }}>
											{#if copySuccess}
												<Check class="size-4" />
											{:else}
												<ClipboardCopy class="size-4" />
											{/if}
										</span>
									{/key}
								</span>
							</Button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="top" sideOffset={8} class="z-[100000]">
						{t(localeStore.t.devToolbar.copyStateJson, 'Copy State as JSON')}
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
								tabindex={focusedIndex === 5 ? 0 : -1}
								class="size-8 hover:bg-transparent! transition-colors duration-200 {resetSuccess
								? 'text-green-500'
								: 'text-muted-foreground hover:text-primary'}"
								onclick={resetAll}
								aria-label={t(localeStore.t.devToolbar.resetAllDefaults, 'Reset All to Defaults')}
								data-testid="toolbar-btn-reset"
							>
								<span class="grid place-items-center size-4">
									{#key resetSuccess}
										<span class="col-start-1 row-start-1" in:scale={{ start: 0, duration: 150 }} out:scale={{ start: 0, duration: 150 }}>
											{#if resetSuccess}
												<Check class="size-4" />
											{:else}
												<RotateCcw class="size-4" />
											{/if}
										</span>
									{/key}
								</span>
							</Button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="top" sideOffset={8} class="z-[100000]">
						{t(localeStore.t.devToolbar.resetAllDefaults, 'Reset All to Defaults')}
					</Tooltip.Content>
				</Tooltip.Root>
			</div>
		{/if}

		<!-- Trigger pill -->
		<Tooltip.Root delayDuration={300}>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						class="flex items-center justify-center size-9 rounded-full bg-popover/80 backdrop-blur-xl border border-border shadow-2xl shadow-black/20 text-popover-foreground hover:bg-accent transition-colors touch-none {dragging ? 'cursor-grabbing' : 'cursor-grab'}"
						onclick={() => {
							if (didDrag) return;
							toolbarOpen = !toolbarOpen;
							if (!toolbarOpen) activePanel = null;
						}}
						onpointerdown={onDragStart}
						onpointermove={onDragMove}
						onpointerup={onDragEnd}
						aria-label={toolbarOpen ? t(localeStore.t.devToolbar.collapseToolbar, 'Collapse developer toolbar') : t(localeStore.t.devToolbar.expandToolbar, 'Expand developer toolbar')}
						aria-expanded={toolbarOpen}
						data-testid="dev-toolbar-trigger"
					>
						<Code class="size-5 text-primary" />
					</button>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content side="top" sideOffset={8} class="z-[100000]">
				<span class="flex items-center gap-1.5">{t(localeStore.t.devToolbar.title, 'Developer Toolbar')} <kbd class="inline-flex items-center rounded border border-border bg-secondary px-1.5 py-0.5 text-xs font-mono leading-none text-muted-foreground shadow-sm">{shortcutHint}</kbd></span>
			</Tooltip.Content>
		</Tooltip.Root>
		</div>
	</Tooltip.Provider>
{/if}
