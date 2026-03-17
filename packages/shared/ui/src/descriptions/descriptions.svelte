<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Description items (label, content) */
    items,
    /** Columns per row @values 0, 3, 6 */
    column = 3,
    /** Label position @values 'horizontal', 'vertical' */
    layout = 'horizontal',
    /** Show borders */
    bordered = false,
    /** Component size @values 'small', 'middle', 'default' */
    size = 'default',
    /** Group title @values title */
    title,
    /** Show colon after label */
    colon = true,
    children,
  }: {
    /** Description items (label, content) */
    items: Str[];
    /** Columns per row */
    column?: Num;
    /** Label position */
    layout?: Str;
    /** Show borders */
    bordered?: Bool;
    /** Component size */
    size?: Str;
    /** Group title */
    title: Str;
    /** Show colon after label */
    colon?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
