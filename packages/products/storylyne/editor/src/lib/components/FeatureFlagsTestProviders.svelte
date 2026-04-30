<script lang="ts">
  /**
   * FeatureFlagsTestProviders — slot wrapper that mounts an editor
   * store with arbitrary feature flags forced off, then renders its
   * children inside a Sidebar.Provider. Used by `*FlagsTest.svelte`
   * harness files to verify rendering with selected flags disabled.
   *
   * @module
   */
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
