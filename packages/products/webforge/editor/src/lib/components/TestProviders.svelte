<script lang="ts">
import type { Snippet } from 'svelte';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import { initEditorStore } from '$lib/stores/editor-state.svelte';

let { children, sidebarOpen = true }: { children: Snippet; sidebarOpen?: boolean } = $props();

initEditorStore();
</script>

<Sidebar.Provider open={sidebarOpen}>
	{@render children()}
</Sidebar.Provider>
