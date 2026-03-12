<script lang="ts">
  import type { Str } from '@/schemas/common';
  import FeatureFlagsTestProviders from './FeatureFlagsTestProviders.svelte';
  import NavScenes from './NavScenes.svelte';
  import type { ServerScene } from '$lib/server/data/types';

  let {
    disabledFlags = [],
    scenes = [],
  }: { disabledFlags?: Str[]; scenes?: readonly ServerScene[] } = $props();
</script>

<FeatureFlagsTestProviders {disabledFlags}>
  <NavScenes {scenes} />
</FeatureFlagsTestProviders>
