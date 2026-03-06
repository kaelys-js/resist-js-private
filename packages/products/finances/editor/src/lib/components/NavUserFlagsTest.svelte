<script lang="ts">
import type { Str } from '@/schemas/common';
import FeatureFlagsTestProviders from './FeatureFlagsTestProviders.svelte';
import NavUser from './NavUser.svelte';

let { disabledFlags = [] }: { disabledFlags?: Str[] } = $props();
</script>

<FeatureFlagsTestProviders {disabledFlags}>
	<NavUser />
</FeatureFlagsTestProviders>
