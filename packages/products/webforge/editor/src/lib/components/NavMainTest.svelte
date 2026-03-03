<script lang="ts">
import Grid3x3 from '@lucide/svelte/icons/grid-3x3';
import Image from '@lucide/svelte/icons/image';
import TestProviders from './TestProviders.svelte';
import NavMain from './NavMain.svelte';

const items = [
	{ title: 'Tilesets', url: '#tilesets', icon: Grid3x3 },
	{ title: 'Sprites', url: '#sprites', icon: Image },
];
</script>

<TestProviders>
	<NavMain label="Assets" {items} />
</TestProviders>
