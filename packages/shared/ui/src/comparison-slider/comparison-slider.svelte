<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Before image URL @values firstImage */
    firstImage,
    /** After image URL @values secondImage */
    secondImage,
    /** Initial slider position (%) @values 0, 50, 100 */
    initialPosition = 50,
    /** Slider direction @values 'horizontal', 'vertical' */
    orientation = 'horizontal',
    /** Show before/after labels */
    showLabels = true,
    children,
  }: {
    /** Before image URL */
    firstImage: Str;
    /** After image URL */
    secondImage: Str;
    /** Initial slider position (%) */
    initialPosition?: Num;
    /** Slider direction */
    orientation?: Str;
    /** Show before/after labels */
    showLabels?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
