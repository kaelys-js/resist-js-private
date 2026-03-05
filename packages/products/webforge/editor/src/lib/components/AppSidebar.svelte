<script lang="ts">
import House from '@lucide/svelte/icons/house';
import Settings from '@lucide/svelte/icons/settings';
import CircleHelp from '@lucide/svelte/icons/circle-help';
import type { ComponentProps } from 'svelte';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import AppLogo from './AppLogo.svelte';
import NavScenes from './NavScenes.svelte';
import NavSecondary from './NavSecondary.svelte';
import NavUser from './NavUser.svelte';
import { localeStore, t } from '$lib/i18n.svelte';
import { APP_TAGLINE } from '$lib/config/app-meta';
import { useEditorStore } from '$lib/stores/editor-state.svelte';
import type { ServerUser, ServerProject, ServerScene } from '$lib/server/data/types';

type Props = ComponentProps<typeof Sidebar.Root> & {
	user?: ServerUser | null;
	project?: ServerProject | null;
	scenes?: readonly ServerScene[];
};
let { user = null, project = null, scenes = [], ...restProps }: Props = $props();

const store = useEditorStore();

const navSecondary = $derived([
	...(store.features.settings && (!store.features.authGatedUi || user)
		? [{ title: t(localeStore.t.common.settings, 'Settings'), url: '#settings', icon: Settings }]
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
		<Sidebar.Group>
			<Sidebar.Menu>
				<Sidebar.MenuItem>
					<Sidebar.MenuButton
						tooltipContent={t(localeStore.t.sidebar.home, 'Home')}
						isActive={true}
						aria-current="page"
						data-testid="sidebar-home"
					>
						<House aria-hidden="true" />
						<span>{t(localeStore.t.sidebar.home, 'Home')}</span>
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
		</Sidebar.Group>
		{#if store.features.sceneList && (!store.features.authGatedUi || user)}
			<NavScenes {scenes} />
		{/if}
		<NavSecondary items={navSecondary} class="mt-auto" />
	</Sidebar.Content>
	<Sidebar.Footer>
		{#if store.features.projectDropdown && (!store.features.authGatedUi || user)}
			<NavUser {project} />
		{/if}
	</Sidebar.Footer>
</Sidebar.Root>
