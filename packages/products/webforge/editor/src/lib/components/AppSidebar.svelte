<script lang="ts">
import Image from '@lucide/svelte/icons/image';
import Grid3x3 from '@lucide/svelte/icons/grid-3x3';
import Music from '@lucide/svelte/icons/music';
import Settings from '@lucide/svelte/icons/settings';
import CircleHelp from '@lucide/svelte/icons/circle-help';
import type { ComponentProps } from 'svelte';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import WebForgeLogo from './WebForgeLogo.svelte';
import NavScenes from './NavScenes.svelte';
import NavMain from './NavMain.svelte';
import NavSecondary from './NavSecondary.svelte';
import NavUser from './NavUser.svelte';
import { localeStore, t } from '$lib/i18n.svelte';
import { useEditorStore } from '$lib/stores/editor-state.svelte';

type Props = ComponentProps<typeof Sidebar.Root>;
let { ...restProps }: Props = $props();

const store = useEditorStore();

const scenes = [
	{ title: 'Overworld', url: '#overworld', isActive: true },
	{ title: 'Town Interior', url: '#town-interior' },
	{ title: 'Dungeon B1', url: '#dungeon-b1' },
];

const navAssets = $derived([
	{ title: t(localeStore.t.sidebar.tilesets, 'Tilesets'), url: '#tilesets', icon: Grid3x3 },
	{ title: t(localeStore.t.sidebar.sprites, 'Sprites'), url: '#sprites', icon: Image },
	{ title: t(localeStore.t.sidebar.audio, 'Audio'), url: '#audio', icon: Music },
]);

const navSecondary = $derived([
	...(store.features.settings
		? [{ title: t(localeStore.t.common.settings, 'Settings'), url: '#settings', icon: Settings }]
		: []),
	...(store.features.sidebarHelp
		? [{ title: t(localeStore.t.common.help, 'Help'), url: '#help', icon: CircleHelp }]
		: []),
]);

const user = {
	name: 'Project',
	avatar: '',
};
</script>

<Sidebar.Root variant="inset" collapsible="icon" {...restProps}>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton size="lg">
					{#if store.features.appIconInSidebar}
						<div
							class="flex aspect-square size-8 items-center justify-center"
						>
							<WebForgeLogo size={28} />
						</div>
					{/if}
					{#if store.features.appNameInSidebar}
						<div class="grid flex-1 text-left leading-tight">
							<span
								class="truncate text-base font-semibold tracking-tight"
								style="font-family: 'Rajdhani', sans-serif;"
								>{store.app.appName}</span
							>
							<span class="truncate text-xs text-muted-foreground">RPG Editor</span>
						</div>
					{/if}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		{#if store.features.sceneList}
			<NavScenes {scenes} />
		{/if}
		{#if store.features.assetBrowser}
			<NavMain label={t(localeStore.t.sidebar.assets, 'Assets')} items={navAssets} />
		{/if}
		<NavSecondary items={navSecondary} class="mt-auto" />
	</Sidebar.Content>
	<Sidebar.Footer>
		{#if store.features.projectDropdown}
			<NavUser {user} />
		{/if}
	</Sidebar.Footer>
</Sidebar.Root>
