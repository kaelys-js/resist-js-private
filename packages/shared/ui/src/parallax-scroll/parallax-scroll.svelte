<!-- @convert-to-lens -->
<script lang="ts">
  import type { Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Parallax speed factor @values 0, 50, 100 */
    speed = 0.5,
    /** Movement direction @values 'up', 'down' */
    direction = 'up',
    /** Starting offset @values 0, 0, 10 */
    offset = 0,
    /** Additional CSS classes @values className */
    className,
    children,
  }: {
    /** Parallax speed factor */
    speed?: Num;
    /** Movement direction */
    direction?: Str;
    /** Starting offset */
    offset?: Num;
    /** Additional CSS classes */
    className: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
