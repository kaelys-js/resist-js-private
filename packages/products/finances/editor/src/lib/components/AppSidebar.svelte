<script lang="ts">
import Settings from '@lucide/svelte/icons/settings';
import CircleHelp from '@lucide/svelte/icons/circle-help';
import SharedAppSidebar from '@/ui/app-sidebar/AppSidebar.svelte';
import NavFinance from './NavFinance.svelte';
import NavUser from './NavUser.svelte';
import { localeStore, t } from '$lib/i18n.svelte';
import { APP_TAGLINE } from '$lib/config/app-meta';
import { useEditorStore } from '$lib/stores/editor-state.svelte';
import type { ServerUser } from '$lib/server/data/types';
import type { Str } from '@/schemas/common';

type AppSidebarProps = {
	/** Authenticated user, or null when logged out. */
	user?: ServerUser | null;
};
let { user = null }: AppSidebarProps = $props();

const store: ReturnType<typeof useEditorStore> = useEditorStore();

const navSecondary: Array<{ title: Str; url: Str; icon: typeof Settings }> = $derived([
	...(store.features.settings
		? [{ title: t(localeStore.t.common.settings, 'Settings'), url: '/settings', icon: Settings }]
		: []),
	...(store.features.sidebarHelp
		? [{ title: t(localeStore.t.common.help, 'Help'), url: '#help', icon: CircleHelp }]
		: []),
]);
</script>

<SharedAppSidebar
	appName={store.app.appName}
	tagline={t(localeStore.t.meta.tagline, APP_TAGLINE)}
	sidebarLabel={t(localeStore.t.common.sidebarLabel, 'Application sidebar')}
	showIcon={store.features.appIconInSidebar}
	showName={store.features.appNameInSidebar}
	navItems={navSecondary}
>
	{#snippet content()}
		<NavFinance />
	{/snippet}
	{#snippet footer()}
		{#if store.features.headerUserDropdown}
			<NavUser />
		{/if}
	{/snippet}
</SharedAppSidebar>
