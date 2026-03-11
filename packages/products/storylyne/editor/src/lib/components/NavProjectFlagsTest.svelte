<script lang="ts">
import type { Str } from '@/schemas/common';
import FeatureFlagsTestProviders from './FeatureFlagsTestProviders.svelte';
import NavProject from './NavProject.svelte';

let { disabledFlags = [] }: { disabledFlags?: Str[] } = $props();

const project = {
	id: 'test-1',
	name: 'Test Project',
	subtitle: 'Test Subtitle',
	ownerId: 'user-1',
};
</script>

<FeatureFlagsTestProviders {disabledFlags}>
	<NavProject {project} />
</FeatureFlagsTestProviders>
