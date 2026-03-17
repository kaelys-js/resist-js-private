<!-- @convert-to-lens -->
<script lang="ts">
  import type { Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Stagger delay between items (seconds) @values 0, 50, 100 */
    delay = 0.1,
    /** Entrance direction @values 'up', 'down', 'left', 'right' */
    direction = 'up',
    /** Animation duration @values 0, 50, 100 */
    duration = 0.5,
    /** Initial delay before first item @values 0, 0, 10 */
    initialDelay = 0,
    children,
  }: {
    /** Stagger delay between items (seconds) */
    delay?: Num;
    /** Entrance direction */
    direction?: Str;
    /** Animation duration */
    duration?: Num;
    /** Initial delay before first item */
    initialDelay?: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
