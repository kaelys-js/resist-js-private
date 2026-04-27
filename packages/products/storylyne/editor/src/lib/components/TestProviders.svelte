<script lang="ts">
  /**
   * TestProviders — slot wrapper that initializes the editor store and
   * mounts a Sidebar.Provider with a configurable `sidebarOpen` flag.
   * The baseline harness used by every `*Test.svelte` file in this
   * directory (paired with FeatureFlagsTestProviders for flag scenarios).
   *
   * @module
   */
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
