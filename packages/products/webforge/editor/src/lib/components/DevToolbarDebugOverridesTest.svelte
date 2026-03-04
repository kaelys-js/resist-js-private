<script lang="ts">
import DevToolbarDebug from './DevToolbarDebug.svelte';
import { initEditorStore } from '$lib/stores/editor-state.svelte';
import { initDebugStore } from '$lib/stores/debug-state.svelte';

const editorStore = initEditorStore();
const debugStore = initDebugStore(new URL('http://localhost?wf.debug=true&wf.theme=midnight'));
</script>

<DevToolbarDebug {editorStore} {debugStore} />
