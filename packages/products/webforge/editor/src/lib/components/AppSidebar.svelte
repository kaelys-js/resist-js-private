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

type Props = ComponentProps<typeof Sidebar.Root>;
let { ...restProps }: Props = $props();

const scenes = [
	{ title: 'Overworld', url: '#overworld', isActive: true },
	{ title: 'Town Interior', url: '#town-interior' },
	{ title: 'Dungeon B1', url: '#dungeon-b1' },
];

const navAssets = [
	{ title: 'Tilesets', url: '#tilesets', icon: Grid3x3 },
	{ title: 'Sprites', url: '#sprites', icon: Image },
	{ title: 'Audio', url: '#audio', icon: Music },
];

const navSecondary = [
	{ title: 'Settings', url: '#settings', icon: Settings },
	{ title: 'Help', url: '#help', icon: CircleHelp },
];

const user = {
	name: 'WebForge Project',
	avatar: '',
};
</script>

<Sidebar.Root variant="inset" collapsible="icon" {...restProps}>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton size="lg">
					<div
						class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"
					>
						<WebForgeLogo size={20} />
					</div>
					<div class="grid flex-1 text-left text-sm leading-tight">
						<span class="truncate font-medium">WebForge</span>
						<span class="truncate text-xs text-muted-foreground">RPG Editor</span>
					</div>
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		<NavScenes {scenes} />
		<NavMain label="Assets" items={navAssets} />
		<NavSecondary items={navSecondary} class="mt-auto" />
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser {user} />
	</Sidebar.Footer>
</Sidebar.Root>
