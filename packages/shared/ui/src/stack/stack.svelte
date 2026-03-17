<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Stack direction @values 'row', 'column' */
    direction = 'column',
    /** Gap between children @values number, string */
    spacing = 'md',
    /** Cross-axis alignment @values 'stretch' */
    align = 'stretch',
    /** Main-axis alignment @values 'flex-start' */
    justify = 'flex-start',
    /** Allow wrapping */
    wrap = false,
    children,
  }: {
    /** Stack direction */
    direction?: Str;
    /** Gap between children */
    spacing?: Str;
    /** Cross-axis alignment */
    align?: Str;
    /** Main-axis alignment */
    justify?: Str;
    /** Allow wrapping */
    wrap?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
