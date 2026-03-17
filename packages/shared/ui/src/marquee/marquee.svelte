<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Scroll speed @values 0, 50, 100 */
    speed,
    /** Scroll direction @values 'left', 'right', 'up', 'down' */
    direction = 'left',
    /** Pause animation on hover */
    pauseOnHover = false,
    /** Reverse scroll direction */
    reverse = false,
    /** Vertical scrolling */
    vertical = false,
    /** Content repetitions @values 0, 50, 100 */
    repeat,
    /** Auto-fill to cover container */
    autoFill = false,
    /** Gap between repeated items @values 0, 50, 100 */
    gap,
    children,
  }: {
    /** Scroll speed */
    speed: Num;
    /** Scroll direction */
    direction?: Str;
    /** Pause animation on hover */
    pauseOnHover?: Bool;
    /** Reverse scroll direction */
    reverse?: Bool;
    /** Vertical scrolling */
    vertical?: Bool;
    /** Content repetitions */
    repeat: Num;
    /** Auto-fill to cover container */
    autoFill?: Bool;
    /** Gap between repeated items */
    gap: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
