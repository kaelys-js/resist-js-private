<script lang="ts">
  /**
   * Test harness for SiteHeader with toggleable `isError` and
   * `activeSceneName` props. Lets unit tests cover both the normal
   * header (with breadcrumb) and the error-page header (suppressed
   * breadcrumb / search) against a stable provider tree.
   *
   * @module
   */
  import type { Bool, Str } from '@/schemas/common';
  import TestProviders from './TestProviders.svelte';
  import SiteHeader from './SiteHeader.svelte';

  let { isError = false, activeSceneName = '' }: { isError?: Bool; activeSceneName?: Str } =
    $props();

  const user = {
    id: 'user-1',
    displayName: 'Test User',
    email: 'test@example.com',
    avatarUrl: '',
  };
</script>

<TestProviders>
  <SiteHeader {isError} {user} {activeSceneName} />
</TestProviders>
