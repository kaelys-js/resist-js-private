<script lang="ts">
import type { Snippet } from 'svelte';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import { initEditorStore } from '$lib/stores/editor-state.svelte';

let { children }: { children: Snippet } = $props();

initEditorStore();
</script>

<Sidebar.Provider>
	{@render children()}
</Sidebar.Provider>
