<script lang="ts">
  import DevToolbarAppState from './DevToolbarAppState.svelte';
  import { initEditorStore } from '$lib/stores/editor-state.svelte';

  const editorStore = initEditorStore();
</script>

<DevToolbarAppState {editorStore} />
