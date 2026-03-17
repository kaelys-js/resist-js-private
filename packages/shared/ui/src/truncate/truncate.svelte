<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Number of visible lines @values 0, 1, 2 */
    lines = 1,
    /** Show expand/collapse toggle */
    expandable = false,
    /** Truncation symbol @values string, element */
    symbol = '...',
    /** Max width for inline truncation @values string, number */
    width,
    children,
  }: {
    /** Number of visible lines */
    lines?: Num;
    /** Show expand/collapse toggle */
    expandable?: Bool;
    /** Truncation symbol */
    symbol?: Str;
    /** Max width for inline truncation */
    width: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
