<script lang="ts">
  /**
   * Test harness for NavProject under feature-flag scenarios. Mounts
   * NavProject inside FeatureFlagsTestProviders with a configurable
   * `disabledFlags` array and a fixed mock project so unit tests can
   * verify which footer surfaces (Theme/Language submenus, settings
   * action, etc.) appear under each flag combination.
   *
   * @module
   */
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
