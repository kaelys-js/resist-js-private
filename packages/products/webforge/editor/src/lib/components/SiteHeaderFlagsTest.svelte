<script lang="ts">
import FeatureFlagsTestProviders from './FeatureFlagsTestProviders.svelte';
import SiteHeader from './SiteHeader.svelte';

let { disabledFlags = [] }: { disabledFlags?: string[] } = $props();
</script>

<FeatureFlagsTestProviders {disabledFlags}>
	<SiteHeader />
</FeatureFlagsTestProviders>
