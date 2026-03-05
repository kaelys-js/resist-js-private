<script lang="ts">
import FeatureFlagsTestProviders from './FeatureFlagsTestProviders.svelte';
import NavUser from './NavUser.svelte';

let { disabledFlags = [] }: { disabledFlags?: string[] } = $props();

const project = {
	id: 'test-1',
	name: 'Test Project',
	subtitle: 'Test Subtitle',
	ownerId: 'user-1',
};
</script>

<FeatureFlagsTestProviders {disabledFlags}>
	<NavUser {project} />
</FeatureFlagsTestProviders>
