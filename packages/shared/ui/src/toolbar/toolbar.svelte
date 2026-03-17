<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Layout direction @values 'horizontal', 'vertical' */
    orientation = 'horizontal',
    /** Loop keyboard navigation */
    loop = true,
    children,
  }: {
    /** Layout direction */
    orientation?: Str;
    /** Loop keyboard navigation */
    loop?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
