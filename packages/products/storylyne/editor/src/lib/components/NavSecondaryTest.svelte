<script lang="ts">
import CircleHelp from '@lucide/svelte/icons/circle-help';
import Settings from '@lucide/svelte/icons/settings';
import TestProviders from './TestProviders.svelte';
import NavSecondary from '@/ui/nav-secondary/NavSecondary.svelte';

const items = [
	{ title: 'Settings', url: '#settings', icon: Settings },
	{ title: 'Help', url: '#help', icon: CircleHelp },
];
</script>

<TestProviders>
	<NavSecondary {items} />
</TestProviders>
