<script lang="ts">
import DevToolbar from './DevToolbar.svelte';
import { initEditorStore } from '$lib/stores/editor-state.svelte';
import { initDebugStore } from '$lib/stores/debug-state.svelte';

let { debugEnabled = false }: { debugEnabled?: boolean } = $props();

initEditorStore();
const debugStore = initDebugStore();

if (debugEnabled) {
	debugStore.setEnabled(true);
}
</script>

<DevToolbar />
