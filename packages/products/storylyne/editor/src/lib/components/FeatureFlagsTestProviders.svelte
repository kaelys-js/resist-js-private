<script lang="ts">
  import type { Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';
  import * as Sidebar from '@/ui/sidebar/index.js';
  import { initEditorStore } from '$lib/stores/editor-state.svelte';

  let { children, disabledFlags = [] }: { children: Snippet; disabledFlags?: Str[] } = $props();

  const store = initEditorStore();
  for (const flag of disabledFlags) {
    store.setFeature(flag, false);
  }
</script>

<Sidebar.Provider>
  {@render children()}
</Sidebar.Provider>
