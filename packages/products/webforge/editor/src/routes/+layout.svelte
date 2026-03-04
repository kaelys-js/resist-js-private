<script lang="ts">
import '../app.css';
import { untrack } from 'svelte';
import { browser } from '$app/environment';
import { page } from '$app/state';
import { ModeWatcher, setMode, setTheme } from 'mode-watcher';
import * as Resizable from '$lib/components/ui/resizable/index.js';
import type { PaneAPI, PaneGroupStorage } from 'paneforge';
import AppSidebar from '$lib/components/AppSidebar.svelte';
import SiteHeader from '$lib/components/SiteHeader.svelte';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import { IsMobile } from '$lib/hooks/is-mobile.svelte.js';
import { localeStore, t } from '$lib/i18n.svelte';
import { OG_LOCALES } from '$lib/og-locales';
import { initEditorStore } from '$lib/stores/editor-state.svelte';
import { initDebugStore } from '$lib/stores/debug-state.svelte';
import { applyUrlOverrides } from '$lib/utils/url-params';
import { syncDebugServices, type DebugServicesHandle } from '$lib/debug/init.svelte';
import DevToolbar from '$lib/components/DevToolbar.svelte';

const { children, data } = $props();

// Extract server locale immediately — intentionally capturing initial value only.
const serverLocale: string = data.locale ?? 'en';

const store = initEditorStore();

// Hydrate locale from server-detected value (cookie → Accept-Language → 'en').
// Both stores must be set synchronously BEFORE rendering so SSR outputs
// correct locale strings. $effect is client-only, so localeStore would
// stay at 'en' during SSR without this direct call.
if (serverLocale !== store.app.locale) {
	store.setLocale(serverLocale);
}
if (serverLocale !== localeStore.locale) {
	localeStore.setLocale(serverLocale);
}

// ── Debug store + URL overrides (client-only) ───────────────────────
const debugStore = browser ? initDebugStore(page.url) : undefined;
if (browser && debugStore) {
	applyUrlOverrides(store, debugStore, debugStore.urlOverrides);
}

// Reactive debug service lifecycle — watches debugStore.debug.enabled
let debugHandle: DebugServicesHandle | null = $state(null);
$effect(() => {
	if (!debugStore) return;
	debugHandle = syncDebugServices(store, debugStore, debugHandle);
});

// ── Resizable sidebar ─────────────────────────────────────────────────
// Default sidebar width: calc(var(--spacing) * 72) = 0.25rem * 72 = 18rem = 288px
const SIDEBAR_DEFAULT_PX = 288;
const SIDEBAR_PX_KEY = 'webforge:sidebar-px';

// Compute initial sidebar percentage from saved pixel width to prevent flash on load.
function getInitialSidebarPercent(): number {
	if (typeof window === 'undefined') return 20;
	// Clean stale PaneForge internal storage that bypasses our adapter.
	localStorage.removeItem('paneforge:webforge:sidebar-width');
	const saved: string | null = localStorage.getItem(SIDEBAR_PX_KEY);
	const px: number = saved ? Number(saved) : SIDEBAR_DEFAULT_PX;
	return (px / window.innerWidth) * 100;
}
const initialSidebarPercent: number = getInitialSidebarPercent();

const isMobile = new IsMobile();
const useResizable: boolean = $derived(
	browser && store.features.resizableSidebar && !isMobile.current,
);

let sidebarPane: PaneAPI | undefined = $state();
let providerEl: HTMLDivElement | null = $state(null);

// Track current pixel width so ResizeObserver can maintain it on viewport changes.
let currentSidebarPx: number = SIDEBAR_DEFAULT_PX;

// Custom storage: persists sidebar width in pixels and converts to/from
// PaneForge percentages based on current viewport width. This ensures the
// sidebar maintains a consistent pixel width across different screen sizes.
const paneStorage: PaneGroupStorage = {
	getItem(_name: string): string | null {
		if (typeof window === 'undefined') return null;
		const savedPx: string | null = localStorage.getItem(SIDEBAR_PX_KEY);
		const sidebarPx: number = savedPx ? Number(savedPx) : SIDEBAR_DEFAULT_PX;
		currentSidebarPx = sidebarPx;
		const viewportWidth: number = window.innerWidth;
		const sidebarPercent: number = (sidebarPx / viewportWidth) * 100;
		return JSON.stringify([sidebarPercent, 100 - sidebarPercent]);
	},
	setItem(_name: string, value: string): void {
		if (typeof window === 'undefined') return;
		try {
			const layout: number[] = JSON.parse(value);
			const viewportWidth: number = window.innerWidth;
			const sidebarPx: number = Math.round((layout[0] / 100) * viewportWidth);
			currentSidebarPx = sidebarPx;
			localStorage.setItem(SIDEBAR_PX_KEY, String(sidebarPx));
		} catch {
			/* ignore malformed data */
		}
	},
};

function handleSidebarResize(size: number): void {
	if (!providerEl) return;
	const groupEl: Element | null = providerEl.querySelector('[data-pane-group]');
	if (!groupEl) return;
	const widthPx: number = Math.round(groupEl.clientWidth * (size / 100));
	currentSidebarPx = widthPx;
	providerEl.style.setProperty('--sidebar-width', `${widthPx}px`);
	// Persist pixel width directly — PaneForge's internal storage bypasses our adapter.
	localStorage.setItem(SIDEBAR_PX_KEY, String(widthPx));
}

function handleCollapse(): void {
	if (store.app.sidebarOpen) store.setSidebarOpen(false);
}

function handleExpand(): void {
	if (!store.app.sidebarOpen) store.setSidebarOpen(true);
}

function handleSidebarOpenChange(open: boolean): void {
	if (open) {
		sidebarPane?.expand();
	} else {
		sidebarPane?.collapse();
	}
}

// PaneForge breaks Tailwind peer-data selectors between sidebar and inset
// because they're in separate Pane wrappers. Apply inset variant styles directly.
const insetClass: string = $derived.by(() => {
	if (!useResizable) return '';
	return store.app.sidebarOpen
		? 'md:m-2 md:ms-0 md:rounded-xl md:shadow-sm'
		: 'md:m-2 md:rounded-xl md:shadow-sm';
});

function handleDoubleClickResize(): void {
	const groupEl: Element | null | undefined = providerEl?.querySelector('[data-pane-group]');
	if (!groupEl) return;
	const defaultPercent: number = (SIDEBAR_DEFAULT_PX / groupEl.clientWidth) * 100;
	sidebarPane?.resize(defaultPercent);
}

// Maintain fixed pixel sidebar width when the viewport resizes.
// PaneForge stores sizes as percentages — without this, the sidebar width
// would change proportionally when the browser window is resized.
let resizeRafId = 0;
$effect(() => {
	if (!useResizable || !providerEl) return;
	const groupEl: Element | null = providerEl.querySelector('[data-pane-group]');
	if (!groupEl) return;

	const observer: ResizeObserver = new ResizeObserver(() => {
		cancelAnimationFrame(resizeRafId);
		resizeRafId = requestAnimationFrame(() => {
			const groupWidth: number = (groupEl as HTMLElement).clientWidth;
			if (groupWidth === 0) return;
			// Resize PaneForge pane to maintain the saved pixel width.
			const targetPercent: number = (currentSidebarPx / groupWidth) * 100;
			const currentSize: number | undefined = sidebarPane?.getSize();
			if (currentSize !== undefined && Math.abs(currentSize - targetPercent) > 0.5) {
				sidebarPane?.resize(targetPercent);
			}
			providerEl?.style.setProperty('--sidebar-width', `${currentSidebarPx}px`);
		});
	});
	observer.observe(groupEl);
	return () => {
		observer.disconnect();
		cancelAnimationFrame(resizeRafId);
	};
});

// ── Store → mode-watcher sync ─────────────────────────────────────────
// untrack() prevents reactive cycle: setMode/setTheme read mode-watcher's
// internal $state, which would re-trigger this effect and loop infinitely.
$effect(() => {
	const { mode, theme, locale } = store.app;
	untrack(() => {
		setMode(mode);
		setTheme(theme);
		if (locale !== localeStore.locale) {
			localeStore.setLocale(locale);
		}
	});
});

// ── Store → PaneForge sidebar sync ────────────────────────────────────
// When the sidebar open state changes externally (e.g., DevToolbar toggle),
// sync the PaneForge pane to match.
$effect(() => {
	const wantOpen: boolean = store.app.sidebarOpen;
	if (!useResizable) return;
	if (wantOpen) {
		sidebarPane?.expand();
	} else {
		sidebarPane?.collapse();
	}
});

const metaDescription = $derived(
	t(localeStore.t.meta.description, 'WebForge RPG — HD-2D game creation suite'),
);
const metaAppName = $derived(t(localeStore.t.meta.applicationName, 'WebForge'));
const ogLocale = $derived(OG_LOCALES[store.app.locale] ?? 'en_US');

// Error title map — must live in layout so title reactively clears on navigation.
// Svelte's <svelte:head> sets document.title directly; when +error.svelte unmounts,
// the title doesn't revert. Keeping it here ensures page.error → null updates the title.
const errorTitleMap: Record<number, () => string> = {
	400: () => t(localeStore.t.errors.badRequest, 'Bad request'),
	403: () => t(localeStore.t.errors.forbidden, 'Access denied'),
	404: () => t(localeStore.t.errors.notFound, 'Page not found'),
	500: () => t(localeStore.t.errors.serverError, 'Something went wrong'),
};

const pageTitle: string = $derived.by(() => {
	if (page.error) {
		const titleFn =
			errorTitleMap[page.status] ?? (() => t(localeStore.t.errors.genericTitle, 'Error'));
		return `${titleFn()} | ${store.app.appName}`;
	}
	return store.app.appName;
});
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={metaDescription} />
	<meta name="application-name" content={metaAppName} />
	<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
	<meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
	<meta property="og:title" content={store.app.appName} />
	<meta property="og:description" content={metaDescription} />
	<meta property="og:type" content="website" />
	<meta property="og:locale" content={ogLocale} />
</svelte:head>

<ModeWatcher defaultMode="system" disableTransitions={false} />
<Sidebar.Provider
	bind:ref={providerEl}
	open={store.app.sidebarOpen}
	onOpenChange={useResizable ? handleSidebarOpenChange : undefined}
	class="min-w-[450px]"
	style="--sidebar-width: {SIDEBAR_DEFAULT_PX}px; --header-height: calc(var(--spacing) * 12);"
>
	{#if useResizable}
		<Resizable.PaneGroup
			direction="horizontal"
			autoSaveId="webforge:sidebar-width"
			storage={paneStorage}
			class="min-h-svh"
		>
			<Resizable.Pane
				bind:this={sidebarPane}
				defaultSize={initialSidebarPercent}
				minSize={5}
				maxSize={40}
				collapsible={true}
				collapsedSize={2}
				onResize={handleSidebarResize}
				onCollapse={handleCollapse}
				onExpand={handleExpand}
				class="!overflow-visible"
			>
				<AppSidebar />
			</Resizable.Pane>
			<Resizable.Handle
				class="w-1.5 bg-transparent hover:bg-border data-[active]:bg-ring transition-colors"
				ondblclick={handleDoubleClickResize}
			/>
			<Resizable.Pane defaultSize={100 - initialSidebarPercent} class="flex flex-col !overflow-y-auto !overflow-x-hidden">
				<Sidebar.Inset class={insetClass}>
					<SiteHeader isError={Boolean(page.error)} />
					<div class="flex flex-1 flex-col">
						{@render children()}
					</div>
				</Sidebar.Inset>
			</Resizable.Pane>
		</Resizable.PaneGroup>
	{:else}
		<AppSidebar />
		<Sidebar.Inset>
			<SiteHeader isError={Boolean(page.error)} />
			<div class="flex flex-1 flex-col">
				{@render children()}
			</div>
		</Sidebar.Inset>
	{/if}
</Sidebar.Provider>

{#if browser && debugStore}
	<DevToolbar />
{/if}
