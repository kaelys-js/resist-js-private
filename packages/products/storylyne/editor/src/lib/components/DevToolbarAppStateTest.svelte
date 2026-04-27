<script lang="ts">
  /**
   * Test harness for DevToolbarAppState — instantiates a fresh editor
   * store and renders the panel against it so unit tests can drive
   * state mutations without the rest of the toolbar mounted.
   *
   * @module
   */
  import DevToolbarAppState from './DevToolbarAppState.svelte';
  import { initEditorStore } from '$lib/stores/editor-state.svelte';

  const editorStore = initEditorStore();
</script>

<DevToolbarAppState {editorStore} />
