<!-- @convert-to-lens -->
<script lang="ts">
  import type { Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Bar color @values 'primary' */
    color = 'primary',
    /** Bar height (px) @values 0, 3, 6 */
    height = 3,
    /** Bar position @values 'top', 'bottom' */
    position = 'top',
    /** Stack order @values 0, 100, 200 */
    zIndex = 100,
    children,
  }: {
    /** Bar color */
    color?: Str;
    /** Bar height (px) */
    height?: Num;
    /** Bar position */
    position?: Str;
    /** Stack order */
    zIndex?: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
