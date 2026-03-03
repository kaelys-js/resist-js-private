<script lang="ts">
import '../app.css';
import { untrack } from 'svelte';
import { page } from '$app/state';
import { ModeWatcher, setMode, setTheme } from 'mode-watcher';
import AppSidebar from '$lib/components/AppSidebar.svelte';
import SiteHeader from '$lib/components/SiteHeader.svelte';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import { localeStore, t } from '$lib/i18n.svelte';
import { OG_LOCALES } from '$lib/og-locales';
import { initEditorStore } from '$lib/stores/editor-state.svelte';

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

// Sync store → mode-watcher.
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

<ModeWatcher defaultMode="system" />
<Sidebar.Provider
	open={store.app.sidebarOpen}
	style="--sidebar-width: calc(var(--spacing) * 72); --header-height: calc(var(--spacing) * 12);"
>
	<AppSidebar />
	<Sidebar.Inset>
		<SiteHeader isError={Boolean(page.error)} />
		<div class="flex flex-1 flex-col">
			{@render children()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
