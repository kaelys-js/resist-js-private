<script lang="ts">
import FeatureFlagsTestProviders from './FeatureFlagsTestProviders.svelte';
import AppSidebar from './AppSidebar.svelte';

let { disabledFlags = [] }: { disabledFlags?: string[] } = $props();
</script>

<FeatureFlagsTestProviders {disabledFlags}>
	<AppSidebar />
</FeatureFlagsTestProviders>
