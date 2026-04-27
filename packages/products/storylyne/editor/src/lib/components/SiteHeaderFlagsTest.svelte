<script lang="ts">
  /**
   * Test harness for SiteHeader under feature-flag scenarios — mounts
   * SiteHeader inside FeatureFlagsTestProviders with a fixed mock user
   * so unit tests can verify which header surfaces (mode toggle,
   * breadcrumb, search) appear under each flag combination.
   *
   * @module
   */
  import type { Str } from '@/schemas/common';
  import FeatureFlagsTestProviders from './FeatureFlagsTestProviders.svelte';
  import SiteHeader from './SiteHeader.svelte';
  import type { ServerUser } from '$lib/server/data/types';

  const defaultUser: ServerUser = {
    id: 'user-1',
    displayName: 'Test User',
    email: 'test@example.com',
    avatarUrl: '',
  };

  let {
    disabledFlags = [],
    user = defaultUser,
  }: { disabledFlags?: Str[]; user?: ServerUser | null } = $props();
</script>

<FeatureFlagsTestProviders {disabledFlags}>
  <SiteHeader {user} />
</FeatureFlagsTestProviders>
