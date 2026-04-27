<script lang="ts">
  /**
   * Baseline test harness for NavProject — mounts inside TestProviders
   * with a fixed mock project for snapshot tests against the default
   * (no flag overrides) state.
   *
   * @module
   */
  import TestProviders from './TestProviders.svelte';
  import NavProject from './NavProject.svelte';

  const project = { id: 'test-1', name: 'Test User', subtitle: '', ownerId: 'user-1' };
</script>

<TestProviders>
  <NavProject {project} />
</TestProviders>
