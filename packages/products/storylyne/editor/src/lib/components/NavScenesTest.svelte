<script lang="ts">
  /**
   * Test harness for NavScenes with a configurable `collapsed` prop
   * and a fixed three-scene fixture (Overworld / Dungeon B1 / Town
   * Interior). Lets unit tests assert both the expanded and collapsed
   * (icon-mode) renderings.
   *
   * @module
   */
  import type { Bool } from '@/schemas/common';
  import TestProviders from './TestProviders.svelte';
  import NavScenes from './NavScenes.svelte';

  let { collapsed = false }: { collapsed?: Bool } = $props();

  const scenes = [
    { id: 'scene-1', title: 'Overworld', url: '#overworld', isActive: true, order: 0 },
    { id: 'scene-2', title: 'Dungeon B1', url: '#dungeon-b1', isActive: false, order: 1 },
  ];
</script>

<TestProviders sidebarOpen={!collapsed}>
  <NavScenes {scenes} />
</TestProviders>
