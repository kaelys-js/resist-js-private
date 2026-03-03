<script lang="ts">
import FeatureFlagsTestProviders from './FeatureFlagsTestProviders.svelte';
import NavUser from './NavUser.svelte';

let { disabledFlags = [] }: { disabledFlags?: string[] } = $props();

const user = { name: 'Test User', avatar: '' };
</script>

<FeatureFlagsTestProviders {disabledFlags}>
	<NavUser {user} />
</FeatureFlagsTestProviders>
