<script lang="ts">
import SiteHeader from '@/ui/site-header/SiteHeader.svelte';
import * as Breadcrumb from '@/ui/breadcrumb/index.js';
import HeaderUser from './HeaderUser.svelte';
import ModeToggle from './ModeToggle.svelte';
import { page } from '$app/state';
import { localeStore, t } from '$lib/i18n.svelte';
import { useEditorStore } from '$lib/stores/editor-state.svelte';
import { shortcutStore } from '$lib/stores/keyboard-shortcuts-store.svelte';
import type { ServerUser } from '$lib/server/data/types';
import type { Bool, Str } from '@/schemas/common';

let { isError = false, user = null }: { isError?: Bool; user?: ServerUser | null } = $props();

const store: ReturnType<typeof useEditorStore> = useEditorStore();

const homeHref: Str = $derived(page.url.search ? `/${page.url.search}` : '/');

/** Map route path to a display label for breadcrumbs. */
const routeLabels: Record<Str, Str> = $derived({
	'/': t(localeStore.t.sidebar.overview, 'Overview'),
	'/income': t(localeStore.t.sidebar.income, 'Income'),
	'/debt': t(localeStore.t.sidebar.debt, 'Debt'),
	'/monthly': t(localeStore.t.sidebar.monthly, 'Monthly'),
	'/purchases': t(localeStore.t.sidebar.purchases, 'Purchases'),
	'/travel': t(localeStore.t.sidebar.travel, 'Travel'),
	'/lifetime': t(localeStore.t.sidebar.lifetime, 'Lifetime'),
	'/settings': t(localeStore.t.common.settings, 'Settings'),
});

/** Current page label from the route. */
const currentLabel: Str = $derived(
	routeLabels[page.url.pathname] ?? t(localeStore.t.header.home, 'Home'),
);

/** Whether we're on a sub-page (not the root). */
const isSubPage: Bool = $derived(!isError && page.url.pathname !== '/');

const toggleSidebarLabel: Str = $derived(t(localeStore.t.header.toggleSidebar, 'Toggle Sidebar'));
</script>

<SiteHeader
	showSidebarToggle={store.features.sidebarToggle}
	sidebarToggleLabel={toggleSidebarLabel}
	sidebarToggleShortcut={shortcutStore.format('TOGGLE_SIDEBAR')}
	showBreadcrumb={store.features.breadcrumb}
>
	{#snippet breadcrumbs()}
		{#if isError}
			<!-- Error: Home > Error -->
			<Breadcrumb.Item class="hidden md:block">
				<Breadcrumb.Link href={homeHref}>{t(localeStore.t.header.home, 'Home')}</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator class="hidden md:block" />
			<Breadcrumb.Item>
				<Breadcrumb.Page>{t(localeStore.t.header.error, 'Error')}</Breadcrumb.Page>
			</Breadcrumb.Item>
		{:else if isSubPage}
			<!-- Sub-page: Home > Page Name -->
			<Breadcrumb.Item class="hidden md:block">
				<Breadcrumb.Link href={homeHref}>{t(localeStore.t.header.home, 'Home')}</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator class="hidden md:block" />
			<Breadcrumb.Item>
				<Breadcrumb.Page>{currentLabel}</Breadcrumb.Page>
			</Breadcrumb.Item>
		{:else}
			<!-- Home (overview): just Home -->
			<Breadcrumb.Item>
				<Breadcrumb.Page>{t(localeStore.t.header.home, 'Home')}</Breadcrumb.Page>
			</Breadcrumb.Item>
		{/if}
	{/snippet}
	{#snippet actions()}
		{#if store.features.headerUserDropdown && (!store.features.authGatedUi || user)}
			<HeaderUser />
		{/if}
		{#if store.features.modeToggle}
			<ModeToggle />
		{/if}
	{/snippet}
</SiteHeader>
