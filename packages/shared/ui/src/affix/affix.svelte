<!-- @convert-to-lens -->
<script lang="ts">
  import type { Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Fixed position coordinates */
    position,
    /** Scroll container @values element, string */
    target,
    /** Offset from top to trigger @values 0, 50, 100 */
    offsetTop,
    /** Offset from bottom to trigger @values 0, 50, 100 */
    offsetBottom,
    /** Stack order @values 0, 50, 100 */
    zIndex,
    children,
  }: {
    /** Fixed position coordinates */
    position?: Record<Str, unknown>;
    /** Scroll container */
    target?: Str;
    /** Offset from top to trigger */
    offsetTop: Num;
    /** Offset from bottom to trigger */
    offsetBottom: Num;
    /** Stack order */
    zIndex: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
