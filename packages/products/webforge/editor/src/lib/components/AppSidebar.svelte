<script lang="ts">
import Camera from '@lucide/svelte/icons/camera';
import Layers from '@lucide/svelte/icons/layers';
import Grid3x3 from '@lucide/svelte/icons/grid-3x3';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Settings from '@lucide/svelte/icons/settings';
import CircleHelp from '@lucide/svelte/icons/circle-help';
import type { ComponentProps } from 'svelte';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import NavMain from './NavMain.svelte';
import NavSecondary from './NavSecondary.svelte';
import NavUser from './NavUser.svelte';

type Props = ComponentProps<typeof Sidebar.Root>;
let { ...restProps }: Props = $props();

const navMain = [
	{
		title: 'Scene',
		icon: Camera,
		isActive: true,
		items: [
			{ title: 'Camera', url: '#camera' },
			{ title: 'Lighting', url: '#lighting' },
			{ title: 'Fog', url: '#fog' },
			{ title: 'Sky', url: '#sky' },
		],
	},
	{
		title: 'Rendering',
		icon: Layers,
		items: [
			{ title: 'Post-FX', url: '#postfx' },
			{ title: 'Glow', url: '#glow' },
			{ title: 'Shadows', url: '#shadows' },
		],
	},
	{
		title: 'Tilemap',
		icon: Grid3x3,
		items: [
			{ title: 'Layers', url: '#layers' },
			{ title: 'Tile Picker', url: '#tilepicker' },
			{ title: 'Inspector', url: '#inspector' },
		],
	},
	{
		title: 'Effects',
		icon: Sparkles,
		items: [
			{ title: 'Screen Effects', url: '#screeneffects' },
			{ title: 'Screen Shake', url: '#screenshake' },
		],
	},
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
						class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg text-xs font-bold"
					>
						WF
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
		<NavMain items={navMain} />
		<NavSecondary items={navSecondary} class="mt-auto" />
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser {user} />
	</Sidebar.Footer>
</Sidebar.Root>
