<script lang="ts">
  /**
   * Test harness mounting ModeToggle inside TestProviders for unit
   * tests of the light/dark switcher.
   *
   * @module
   */
  import TestProviders from './TestProviders.svelte';
  import ModeToggle from './ModeToggle.svelte';
</script>

<TestProviders>
  <ModeToggle />
</TestProviders>
