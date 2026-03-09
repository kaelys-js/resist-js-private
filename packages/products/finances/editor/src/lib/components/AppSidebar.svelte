<script lang="ts">
import Settings from '@lucide/svelte/icons/settings';
import CircleHelp from '@lucide/svelte/icons/circle-help';
import type { ComponentProps } from 'svelte';
import * as Sidebar from '@/ui/sidebar/index.js';
import AppLogo from './AppLogo.svelte';
import NavFinance from './NavFinance.svelte';
import NavSecondary from './NavSecondary.svelte';
import NavUser from './NavUser.svelte';
import { localeStore, t } from '$lib/i18n.svelte';
import { APP_TAGLINE } from '$lib/config/app-meta';
import { useEditorStore } from '$lib/stores/editor-state.svelte';
import type { ServerUser } from '$lib/server/data/types';
import type { Str } from '@/schemas/common';

type Props = ComponentProps<typeof Sidebar.Root> & {
	/** Authenticated user, or null when logged out. */
	user?: ServerUser | null;
};
let { user = null, ...restProps }: Props = $props();

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

<Sidebar.Root variant="inset" collapsible="icon" aria-label={t(localeStore.t.common.sidebarLabel, 'Application sidebar')} {...restProps}>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton size="lg">
					{#if store.features.appIconInSidebar}
						<div
							class="flex aspect-square size-8 items-center justify-center"
						>
							<AppLogo size={28} />
						</div>
					{/if}
					{#if store.features.appNameInSidebar}
						<div class="grid flex-1 text-left leading-tight">
							<span
								class="truncate text-base font-semibold tracking-tight"
								style="font-family: 'Rajdhani', sans-serif;"
								>{store.app.appName}</span
							>
							<span class="truncate text-xs text-muted-foreground">{t(localeStore.t.meta.tagline, APP_TAGLINE)}</span>
						</div>
					{/if}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		<NavFinance />
		<NavSecondary items={navSecondary} class="mt-auto" />
	</Sidebar.Content>
	<Sidebar.Footer>
		{#if store.features.headerUserDropdown}
			<NavUser />
		{/if}
	</Sidebar.Footer>
</Sidebar.Root>
