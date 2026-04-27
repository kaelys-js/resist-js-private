<script lang="ts">
  /**
   * Test harness mounting HeaderUser inside TestProviders so unit tests
   * can drive the avatar-dropdown surface against a stable provider
   * tree (i18n + editor store + Sidebar.Provider).
   *
   * @module
   */
  import TestProviders from './TestProviders.svelte';
  import HeaderUser from './HeaderUser.svelte';
</script>

<TestProviders>
  <HeaderUser />
</TestProviders>
