<script lang="ts">
import type { Snippet } from 'svelte';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import { initEditorStore } from '$lib/stores/editor-state.svelte';

let { children, disabledFlags = [] }: { children: Snippet; disabledFlags?: string[] } = $props();

const store = initEditorStore();
for (const flag of disabledFlags) {
	store.setFeature(flag, false);
}
</script>

<Sidebar.Provider>
	{@render children()}
</Sidebar.Provider>
