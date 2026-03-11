<script lang="ts">
import type { Bool } from '@/schemas/common';
import TestProviders from './TestProviders.svelte';
import NavScenes from './NavScenes.svelte';

let { collapsed = false }: { collapsed?: Bool } = $props();

const scenes = [
	{ id: 'scene-1', title: 'Overworld', url: '#overworld', isActive: true, order: 0 },
	{ id: 'scene-2', title: 'Dungeon B1', url: '#dungeon-b1', isActive: false, order: 1 },
];
</script>

<TestProviders sidebarOpen={!collapsed}>
	<NavScenes {scenes} />
</TestProviders>
