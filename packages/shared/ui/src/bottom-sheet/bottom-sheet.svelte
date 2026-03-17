<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Whether the sheet is open */
    open = false,
    /** Initial open state */
    defaultOpen,
    /** Snap positions @values number[] */
    snapPoints,
    /** Modal behavior */
    modal = true,
    children,
  }: {
    /** Whether the sheet is open */
    open?: Bool;
    /** Initial open state */
    defaultOpen: Bool;
    /** Snap positions */
    snapPoints: Str;
    /** Modal behavior */
    modal?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
