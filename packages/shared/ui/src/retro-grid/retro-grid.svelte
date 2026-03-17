<!-- @convert-to-lens -->
<script lang="ts">
  import type { Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Perspective angle @values 0, 65, 130 */
    angle = 65,
    /** Grid cell size @values 0, 60, 120 */
    cellSize = 60,
    /** Grid line opacity @values 0, 50, 100 */
    opacity = 0.5,
    /** Grid line color @values color */
    color,
    children,
  }: {
    /** Perspective angle */
    angle?: Num;
    /** Grid cell size */
    cellSize?: Num;
    /** Grid line opacity */
    opacity?: Num;
    /** Grid line color */
    color: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
