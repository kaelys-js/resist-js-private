<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Scroll direction @values 'left', 'right', 'up', 'down' */
    direction = 'left',
    /** Scroll speed @values 'slow', 'normal', 'fast' */
    speed = 'normal',
    /** Pause on mouse hover */
    pauseOnHover = true,
    /** Gap between items @values '1rem' */
    gap = '1rem',
    /** Reverse direction */
    reverse = false,
    children,
  }: {
    /** Scroll direction */
    direction?: Str;
    /** Scroll speed */
    speed?: Str;
    /** Pause on mouse hover */
    pauseOnHover?: Bool;
    /** Gap between items */
    gap?: Str;
    /** Reverse direction */
    reverse?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
