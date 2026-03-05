<script lang="ts">
import FeatureFlagsTestProviders from './FeatureFlagsTestProviders.svelte';
import NavScenes from './NavScenes.svelte';
import type { ServerScene } from '$lib/server/data/types';

let {
	disabledFlags = [],
	scenes = [],
}: { disabledFlags?: string[]; scenes?: readonly ServerScene[] } = $props();
</script>

<FeatureFlagsTestProviders {disabledFlags}>
	<NavScenes {scenes} />
</FeatureFlagsTestProviders>
