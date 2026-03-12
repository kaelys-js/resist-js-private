<script lang="ts">
  import DevToolbarDebug from './DevToolbarDebug.svelte';
  import { URL_PARAM_PREFIX } from '$lib/config/app-meta';
  import { initEditorStore } from '$lib/stores/editor-state.svelte';
  import { initDebugStore } from '$lib/stores/debug-state.svelte';

  const editorStore = initEditorStore();
  const debugStore = initDebugStore(
    new URL(`http://localhost?${URL_PARAM_PREFIX}debug=true&${URL_PARAM_PREFIX}theme=midnight`),
  );
</script>

<DevToolbarDebug {editorStore} {debugStore} />
