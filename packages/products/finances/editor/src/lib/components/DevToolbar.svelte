<script lang="ts">
import Code from '@lucide/svelte/icons/code';
import Flag from '@lucide/svelte/icons/flag';
import Settings2 from '@lucide/svelte/icons/settings-2';
import Bug from '@lucide/svelte/icons/bug';
import Activity from '@lucide/svelte/icons/activity';
import Sun from '@lucide/svelte/icons/sun';
import Moon from '@lucide/svelte/icons/moon';
import Monitor from '@lucide/svelte/icons/monitor';
import ClipboardCopy from '@lucide/svelte/icons/clipboard-copy';
import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
import Check from '@lucide/svelte/icons/check';
import { Button } from '@/ui/button/index.js';
import * as Tooltip from '@/ui/tooltip/index.js';
import TooltipLabel from '@/ui/tooltip-label/TooltipLabel.svelte';
import { Separator } from '@/ui/separator/index.js';
import { useEditorStore, type EditorStore } from '$lib/stores/editor-state.svelte';
import { useDebugStore, type DebugStore } from '$lib/stores/debug-state.svelte';
import { localeStore, t } from '$lib/i18n.svelte';
import { log } from '@/utils/core/logger';
import type { Str, Num, Bool, Void } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import DevToolbarFeatureFlags from './DevToolbarFeatureFlags.svelte';
import DevToolbarAppState from './DevToolbarAppState.svelte';
import DevToolbarDebug from './DevToolbarDebug.svelte';
import DevToolbarPerf from './DevToolbarPerf.svelte';
import { discoverFeatureFlags, discoverAppPreferences } from '$lib/debug/dev-toolbar-registry';
import { storageKey } from '$lib/config/app-meta';
import { shortcutStore } from '$lib/stores/keyboard-shortcuts-store.svelte';
import { scale, fly, fade } from 'svelte/transition';

const editorStore: EditorStore = useEditorStore();
const debugStore: DebugStore = useDebugStore();

let toolbarOpen: Bool = $state(false);
let activePanel: Str | null = $state(null);
let copySuccess: Bool = $state(false);
let resetSuccess: Bool = $state(false);

// Delayed flag so the {#if} block always transitions from false→true on mount.
// Without this, transition:fade doesn't play when debug is already enabled on load.
let showToolbar: Bool = $state(false);
$effect(() => {
	showToolbar = debugStore.debug.enabled;
});

// ── Draggable position (persisted to localStorage) ───────────────────
const POS_KEY: Str = storageKey('dev-toolbar-pos');

function loadPos(): { x: Num; b: Num } {
	if (typeof window === 'undefined') return { x: 0, b: 16 };
	try {
		const raw: Str | null = localStorage.getItem(POS_KEY);
		if (raw) {
			const p = JSON.parse(raw);
			if (typeof p.x === 'number' && typeof p.b === 'number') {
				return { x: p.x, b: p.b };
			}
		}
	} catch (_) {
		/* localStorage unavailable (SSR/incognito) — toolbar position is non-critical */
	}
	return { x: window.innerWidth / 2, b: 16 };
}

const initPos: { x: Num; b: Num } = loadPos();
let posX: Num = $state(initPos.x);
let posBottom: Num = $state(initPos.b);

let dragging: Bool = $state(false);
let dragStartClientX: Num = 0;
let dragStartClientY: Num = 0;
let dragOriginX: Num = 0;
let dragOriginBottom: Num = 0;
let didDrag: Bool = false;

function savePos(): Void {
	try {
		localStorage.setItem(POS_KEY, JSON.stringify({ x: posX, b: posBottom }));
	} catch (_) {
		/* localStorage unavailable (SSR/incognito) — toolbar position is non-critical */
	}
}

function onDragStart(e: PointerEvent): Void {
	dragging = true;
	didDrag = false;
	dragStartClientX = e.clientX;
	dragStartClientY = e.clientY;
	dragOriginX = posX;
	dragOriginBottom = posBottom;
	if (e.currentTarget instanceof HTMLElement) {
		e.currentTarget.setPointerCapture(e.pointerId);
	}
}

function onDragMove(e: PointerEvent): Void {
	if (!dragging) return;
	const dx: Num = e.clientX - dragStartClientX;
	const dy: Num = e.clientY - dragStartClientY;
	if (!didDrag && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
	didDrag = true;
	posX = Math.max(24, Math.min(window.innerWidth - 24, dragOriginX + dx));
	posBottom = Math.max(8, Math.min(window.innerHeight - 48, dragOriginBottom - dy));
}

function onDragEnd(): Void {
	dragging = false;
	if (didDrag) savePos();
}

// ── Clamp position on viewport resize ─────────────────────────────────
$effect(() => {
	/**
	 * Clamps toolbar position to visible bounds when viewport resizes.
	 */
	function onResize(): Void {
		const maxX: Num = window.innerWidth - 24;
		const maxB: Num = window.innerHeight - 48;
		let changed: Bool = false;
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
const flags: ReturnType<typeof discoverFeatureFlags> = discoverFeatureFlags();
/** Locale function type — workaround for DeepReadonly type mangling. */
type LocaleFn = (params: Record<Str, never>) => Result<Str>;
const MODE_FALLBACKS: Record<Str, Str> = { light: 'Light', dark: 'Dark', system: 'System' };
const modeDisplayName: Str = $derived(
	(() => {
		const { mode } = editorStore.app;
		const lookup: Record<Str, LocaleFn> = {
			light: localeStore.t.settings.light as LocaleFn,
			dark: localeStore.t.settings.dark as LocaleFn,
			system: localeStore.t.settings.system as LocaleFn,
		};
		const fn: LocaleFn | undefined = lookup[mode];
		if (!fn) return mode;
		return t(fn, MODE_FALLBACKS[mode] ?? mode);
	})(),
);
const cycleThemeLabel: Str = $derived(
	(() => {
		// Locale DeepReadonly workaround — parametric locale function needs cast
		const result: Result<Str> = (
			localeStore.t.devToolbar.cycleTheme as (p: { mode: Str }) => Result<Str>
		)({ mode: modeDisplayName });
		if (!result.ok) {
			log.warn(`Locale devToolbar.cycleTheme error: ${result.error.code}`);
		}
		// UI boundary — locale error logged, fallback used
		return result.ok ? result.data : `Cycle Theme (${modeDisplayName})`;
	})(),
);

// ── Mode cycling ──────────────────────────────────────────────────────
const MODES = ['light', 'dark', 'system'] as const;

/**
 * Cycles through light → dark → system → light.
 */
function cycleMode(): Void {
	// Mode narrowing — editorStore.app.mode is Str but MODES.indexOf needs literal union
	const currentIdx: Num = MODES.indexOf(editorStore.app.mode as (typeof MODES)[number]);
	const nextIdx: Num = (currentIdx + 1) % MODES.length;
	editorStore.setMode(MODES[nextIdx]);
}

// ── Quick actions ─────────────────────────────────────────────────────

/**
 * Copies full state JSON to clipboard.
 */
async function copyDebugInfo(): Promise<Void> {
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
function resetAll(): Void {
	const prefs: ReturnType<typeof discoverAppPreferences> = discoverAppPreferences();
	for (const pref of prefs) {
		const setterName: Str = `set${pref.key.charAt(0).toUpperCase()}${pref.key.slice(1)}`;
		// Dynamic setter access — store type doesn't expose string-indexed setters
		const setter = (editorStore as unknown as Record<Str, (v: unknown) => unknown>)[setterName];
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
		/* localStorage unavailable (SSR/incognito) — toolbar position is non-critical */
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
function togglePanel(panel: Str): Void {
	activePanel = activePanel === panel ? null : panel;
}

// Popover open states — driven by activePanel
const flagsOpen: Bool = $derived(activePanel === 'flags');
const appOpen: Bool = $derived(activePanel === 'app');
const debugOpen: Bool = $derived(activePanel === 'debug');
const perfOpen: Bool = $derived(activePanel === 'perf');

// ── Roving tabindex ──────────────────────────────────────────────────
const TOOLBAR_BUTTON_IDS: readonly Str[] = [
	'toolbar-btn-flags',
	'toolbar-btn-app',
	'toolbar-btn-debug',
	'toolbar-btn-perf',
	'toolbar-btn-mode',
	'toolbar-btn-copy',
	'toolbar-btn-reset',
];

let focusedIndex: Num = $state(0);

/**
 * WAI-ARIA toolbar keyboard navigation — roving tabindex pattern.
 *
 * @param e - Keyboard event from the toolbar container
 */
function handleToolbarKeydown(e: KeyboardEvent): Void {
	const count: Num = TOOLBAR_BUTTON_IDS.length;
	let nextIndex: Num | null = null;

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

// ── Keyboard shortcuts (via central registry) ────────────────────────
$effect(() => {
	/**
	 * Global keydown handler for toolbar shortcuts.
	 * Uses the central shortcut registry for matching.
	 *
	 * @param e - Keyboard event
	 */
	function handleKeydown(e: KeyboardEvent): Void {
		// Ctrl+Shift+D: toggle toolbar + enable debug
		if (shortcutStore.matches(e, 'TOGGLE_DEV_TOOLBAR')) {
			e.preventDefault();
			if (!debugStore.debug.enabled) {
				debugStore.setEnabled(true);
			}
			toolbarOpen = !toolbarOpen;
			return;
		}

		// Escape: close active panel, or close toolbar if no panel active
		if (shortcutStore.matches(e, 'CLOSE_PANEL')) {
			if (activePanel) {
				activePanel = null;
			} else if (toolbarOpen) {
				toolbarOpen = false;
			}
			return;
		}

		// Panel/action shortcuts: only active when toolbar is open
		if (!toolbarOpen) return;

		if (shortcutStore.matches(e, 'DEV_FLAGS_PANEL')) {
			e.preventDefault();
			togglePanel('flags');
		} else if (shortcutStore.matches(e, 'DEV_APP_PANEL')) {
			e.preventDefault();
			togglePanel('app');
		} else if (shortcutStore.matches(e, 'DEV_DEBUG_PANEL')) {
			e.preventDefault();
			togglePanel('debug');
		} else if (shortcutStore.matches(e, 'DEV_PERF_PANEL')) {
			e.preventDefault();
			togglePanel('perf');
		} else if (shortcutStore.matches(e, 'DEV_CYCLE_MODE')) {
			e.preventDefault();
			cycleMode();
		} else if (shortcutStore.matches(e, 'DEV_COPY_STATE')) {
			e.preventDefault();
			copyDebugInfo();
		} else if (shortcutStore.matches(e, 'DEV_RESET_ALL')) {
			e.preventDefault();
			resetAll();
		}
	}

	window.addEventListener('keydown', handleKeydown);
	return () => window.removeEventListener('keydown', handleKeydown);
});
</script>

{#if showToolbar}
	<Tooltip.Provider delayDuration={300}>
		<div
			transition:fade={{ duration: 200 }}
			class="fixed z-[99999] flex flex-col items-center gap-2"
			style="left: {posX}px; bottom: {posBottom}px; transform: translateX(-50%); pointer-events: auto;"
			data-testid="dev-toolbar"
		>
		<!-- Active panel popover content (rendered above toolbar) -->
		{#if toolbarOpen && activePanel}
			<div
				transition:fly={{ y: 8, duration: 150 }}
				class="w-80 max-h-[60vh] flex flex-col overflow-hidden rounded-lg bg-white/[0.08] dark:bg-white/[0.06] backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_1px_rgba(255,255,255,0.1)_inset]"
				data-testid="dev-toolbar-panel"
			>
				<!-- Drag handle -->
				<div
					class="flex items-center justify-center py-1.5 shrink-0 touch-none {dragging ? 'cursor-grabbing' : 'cursor-grab'}"
					onpointerdown={onDragStart}
					onpointermove={onDragMove}
					onpointerup={onDragEnd}
					aria-hidden="true"
				>
					<div class="w-8 h-1 rounded-full bg-white/[0.15]"></div>
				</div>
				{#if activePanel === 'flags'}
					<DevToolbarFeatureFlags {editorStore} onclose={() => { activePanel = null; }} />
				{:else if activePanel === 'app'}
					<DevToolbarAppState {editorStore} onclose={() => { activePanel = null; }} />
				{:else if activePanel === 'debug'}
					<DevToolbarDebug {editorStore} {debugStore} onclose={() => { activePanel = null; }} />
				{:else if activePanel === 'perf'}
					<DevToolbarPerf onclose={() => { activePanel = null; }} />
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
				class="flex items-center gap-1 px-2 py-1.5 rounded-full bg-white/[0.08] dark:bg-white/[0.06] backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_1px_rgba(255,255,255,0.1)_inset] origin-bottom"
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
						<TooltipLabel label={t(localeStore.t.devToolbar.featureFlags, 'Feature Flags')} shortcutLabel={shortcutStore.format('DEV_FLAGS_PANEL')} />
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
						<TooltipLabel label={t(localeStore.t.devToolbar.appPreferences, 'App Preferences')} shortcutLabel={shortcutStore.format('DEV_APP_PANEL')} />
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
						<TooltipLabel label={t(localeStore.t.devToolbar.debugSettings, 'Debug Settings')} shortcutLabel={shortcutStore.format('DEV_DEBUG_PANEL')} />
					</Tooltip.Content>
				</Tooltip.Root>

				<Tooltip.Root delayDuration={300}>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								size="icon"
								tabindex={focusedIndex === 3 ? 0 : -1}
								class="size-8 hover:bg-transparent! transition-colors duration-200 {perfOpen
									? 'text-primary'
									: 'text-muted-foreground hover:text-primary'}"
								onclick={() => togglePanel('perf')}
								aria-label={t(localeStore.t.devToolbar.performance, 'Performance')}
								aria-pressed={perfOpen}
								data-testid="toolbar-btn-perf"
							>
								<Activity class="size-4" />
							</Button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="top" sideOffset={8} class="z-[100000]">
						<TooltipLabel label={t(localeStore.t.devToolbar.performance, 'Performance')} shortcutLabel={shortcutStore.format('DEV_PERF_PANEL')} />
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
								tabindex={focusedIndex === 4 ? 0 : -1}
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
						<TooltipLabel label={cycleThemeLabel} shortcutLabel={shortcutStore.format('DEV_CYCLE_MODE')} />
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
								tabindex={focusedIndex === 5 ? 0 : -1}
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
						<TooltipLabel label={t(localeStore.t.devToolbar.copyStateJson, 'Copy State as JSON')} shortcutLabel={shortcutStore.format('DEV_COPY_STATE')} />
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
								tabindex={focusedIndex === 6 ? 0 : -1}
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
						<TooltipLabel label={t(localeStore.t.devToolbar.resetAllDefaults, 'Reset All to Defaults')} shortcutLabel={shortcutStore.format('DEV_RESET_ALL')} />
					</Tooltip.Content>
				</Tooltip.Root>
			</div>
		{/if}

		<!-- Trigger pill -->
		<Tooltip.Root delayDuration={1500}>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						class="flex items-center justify-center size-9 rounded-full bg-white/[0.08] dark:bg-white/[0.06] backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_1px_rgba(255,255,255,0.1)_inset] text-popover-foreground hover:bg-accent transition-colors touch-none {dragging ? 'cursor-grabbing' : 'cursor-grab'}"
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
			{#if !toolbarOpen}
				<Tooltip.Content side="top" sideOffset={8} class="z-[100000]">
					<TooltipLabel label={t(localeStore.t.devToolbar.title, 'Developer Toolbar')} shortcutLabel={shortcutStore.format('TOGGLE_DEV_TOOLBAR')} />
				</Tooltip.Content>
			{/if}
		</Tooltip.Root>
		</div>
	</Tooltip.Provider>
{/if}
