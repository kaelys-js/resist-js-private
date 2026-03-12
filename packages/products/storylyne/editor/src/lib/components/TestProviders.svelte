<script lang="ts">
  import type { Bool } from '@/schemas/common';
  import type { Snippet } from 'svelte';
  import * as Sidebar from '@/ui/sidebar/index.js';
  import { initEditorStore } from '$lib/stores/editor-state.svelte';

  let { children, sidebarOpen = true }: { children: Snippet; sidebarOpen?: Bool } = $props();

  initEditorStore();
</script>

<Sidebar.Provider open={sidebarOpen}>
  {@render children()}
</Sidebar.Provider>
