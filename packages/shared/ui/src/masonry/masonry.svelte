<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Number of columns (or responsive) @values number, object */
    columns = 3,
    /** Gap between items @values number, string */
    gap = '1rem',
    /** Fill columns left-to-right */
    sequential = false,
    children,
  }: {
    /** Number of columns (or responsive) */
    columns?: Num;
    /** Gap between items */
    gap?: Str;
    /** Fill columns left-to-right */
    sequential?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
