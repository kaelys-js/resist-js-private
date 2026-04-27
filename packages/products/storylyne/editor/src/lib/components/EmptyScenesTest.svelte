<script lang="ts">
  /**
   * Test harness for EmptyScenes mounted inside TestProviders for the
   * baseline (no flag overrides) snapshot.
   *
   * @module
   */
  import TestProviders from './TestProviders.svelte';
  import EmptyScenes from './EmptyScenes.svelte';
</script>

<TestProviders>
  <EmptyScenes />
</TestProviders>
