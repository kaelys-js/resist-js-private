<script lang="ts">
import TestProviders from './TestProviders.svelte';
import NavScenes from './NavScenes.svelte';

const scenes = [
	{ title: 'Overworld', url: '#overworld', isActive: true },
	{ title: 'Dungeon B1', url: '#dungeon-b1' },
];
</script>

<TestProviders>
	<NavScenes {scenes} />
</TestProviders>
