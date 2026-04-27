<script lang="ts">
  /**
   * Test harness for DevToolbar with a controllable `debugEnabled`
   * prop so unit tests can assert behavior in both debug-on and
   * debug-off states without rerouting through URL params.
   *
   * @module
   */
  import type { Bool } from '@/schemas/common';
  import DevToolbar from './DevToolbar.svelte';
  import { initEditorStore } from '$lib/stores/editor-state.svelte';
  import { initDebugStore } from '$lib/stores/debug-state.svelte';

  let { debugEnabled = false }: { debugEnabled?: Bool } = $props();

  initEditorStore();
  const debugStore = initDebugStore();

  if (debugEnabled) {
    debugStore.setEnabled(true);
  }
</script>

<DevToolbar />
