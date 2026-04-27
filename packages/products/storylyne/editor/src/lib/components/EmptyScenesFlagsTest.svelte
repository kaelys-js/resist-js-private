<script lang="ts">
  /**
   * Test harness for the empty-scenes placeholder under feature-flag
   * scenarios. Mounts NavScenes inside FeatureFlagsTestProviders with
   * a configurable `disabledFlags` array and an empty/non-empty
   * `scenes` prop so tests can verify the empty-state CTA appears or
   * is suppressed correctly.
   *
   * @module
   */
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
