<script lang="ts">
  /**
   * Test harness for DevToolbarFeatureFlags with a fresh editor store
   * — provides a stable mount target for unit tests verifying flag
   * discovery and toggle behavior.
   *
   * @module
   */
  import DevToolbarFeatureFlags from './DevToolbarFeatureFlags.svelte';
  import { initEditorStore } from '$lib/stores/editor-state.svelte';

  const editorStore = initEditorStore();
</script>

<DevToolbarFeatureFlags {editorStore} />
