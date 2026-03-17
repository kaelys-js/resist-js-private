<!-- @convert-to-lens -->
<script lang="ts">
  import type { Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Full data array */
    items,
    /** Item height (fixed or dynamic) @values number, function */
    itemSize,
    /** Extra items rendered beyond viewport @values 0, 5, 10 */
    overscan = 5,
    /** Scroll direction @values 'vertical', 'horizontal' */
    orientation = 'vertical',
    /** Programmatic scroll target @values 0, 50, 100 */
    scrollToIndex,
    /** Size estimator for dynamic items */
    estimateSize,
    /** Custom scroll container */
    getScrollElement,
    /** Dynamic measurement callback */
    measureElement,
    children,
  }: {
    /** Full data array */
    items: Str[];
    /** Item height (fixed or dynamic) */
    itemSize: Str;
    /** Extra items rendered beyond viewport */
    overscan?: Num;
    /** Scroll direction */
    orientation?: Str;
    /** Programmatic scroll target */
    scrollToIndex: Num;
    /** Size estimator for dynamic items */
    estimateSize: () => void;
    /** Custom scroll container */
    getScrollElement: () => void;
    /** Dynamic measurement callback */
    measureElement: () => void;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
