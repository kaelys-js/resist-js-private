<script lang="ts">
  import DevToolbarFeatureFlags from './DevToolbarFeatureFlags.svelte';
  import { initEditorStore } from '$lib/stores/editor-state.svelte';

  const editorStore = initEditorStore();
</script>

<DevToolbarFeatureFlags {editorStore} />
