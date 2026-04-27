<script lang="ts">
  /**
   * Test harness for DevToolbarDebug with default (non-URL-overridden)
   * editor and debug stores. Pairs with DevToolbarDebugOverridesTest
   * to cover both seeded states.
   *
   * @module
   */
  import DevToolbarDebug from './DevToolbarDebug.svelte';
  import { initEditorStore } from '$lib/stores/editor-state.svelte';
  import { initDebugStore } from '$lib/stores/debug-state.svelte';

  const editorStore = initEditorStore();
  const debugStore = initDebugStore();
</script>

<DevToolbarDebug {editorStore} {debugStore} />
