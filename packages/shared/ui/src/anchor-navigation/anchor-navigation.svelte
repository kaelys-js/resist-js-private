<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Section links (href, title) */
    items,
    /** Scroll offset @values 0, 0, 10 */
    offsetTop = 0,
    /** Active detection bounds @values 0, 5, 10 */
    bounds = 5,
    /** Target scroll offset @values 0, 50, 100 */
    targetOffset,
    /** Fixed positioning */
    affix = true,
    /** Layout direction @values 'vertical', 'horizontal' */
    direction = 'vertical',
    children,
  }: {
    /** Section links (href, title) */
    items: Str[];
    /** Scroll offset */
    offsetTop?: Num;
    /** Active detection bounds */
    bounds?: Num;
    /** Target scroll offset */
    targetOffset: Num;
    /** Fixed positioning */
    affix?: Bool;
    /** Layout direction */
    direction?: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
