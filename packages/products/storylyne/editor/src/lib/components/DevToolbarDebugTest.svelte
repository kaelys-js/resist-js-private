<script lang="ts">
import DevToolbarDebug from './DevToolbarDebug.svelte';
import { initEditorStore } from '$lib/stores/editor-state.svelte';
import { initDebugStore } from '$lib/stores/debug-state.svelte';

const editorStore = initEditorStore();
const debugStore = initDebugStore();
</script>

<DevToolbarDebug {editorStore} {debugStore} />
