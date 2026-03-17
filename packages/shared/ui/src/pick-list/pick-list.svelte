<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Source list items */
    source,
    /** Target list items */
    target,
    /** Source list header @values sourceHeader */
    sourceHeader,
    /** Target list header @values targetHeader */
    targetHeader,
    /** Show filter inputs */
    filter = false,
    /** Enable drag and drop */
    dragdrop = false,
    /** Show source reorder controls */
    showSourceControls = true,
    /** Show target reorder controls */
    showTargetControls = true,
    children,
  }: {
    /** Source list items */
    source: Str[];
    /** Target list items */
    target: Str[];
    /** Source list header */
    sourceHeader: Str;
    /** Target list header */
    targetHeader: Str;
    /** Show filter inputs */
    filter?: Bool;
    /** Enable drag and drop */
    dragdrop?: Bool;
    /** Show source reorder controls */
    showSourceControls?: Bool;
    /** Show target reorder controls */
    showTargetControls?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
