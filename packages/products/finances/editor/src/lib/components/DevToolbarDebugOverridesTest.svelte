<script lang="ts">
import DevToolbarDebug from './DevToolbarDebug.svelte';
import { initEditorStore } from '$lib/stores/editor-state.svelte';
import { initDebugStore } from '$lib/stores/debug-state.svelte';

const editorStore = initEditorStore();
const debugStore = initDebugStore(new URL('http://localhost?fin.debug=true&fin.theme=midnight'));
</script>

<DevToolbarDebug {editorStore} {debugStore} />
