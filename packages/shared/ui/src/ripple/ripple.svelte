<!-- @convert-to-lens -->
<script lang="ts">
  import type { Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Ripple color @values 'currentColor' */
    color = 'currentColor',
    /** Number of rings @values 0, 3, 6 */
    count = 3,
    /** Animation duration (seconds) @values 0, 2, 4 */
    duration = 2,
    /** Maximum ring size @values 0, 50, 100 */
    size,
    children,
  }: {
    /** Ripple color */
    color?: Str;
    /** Number of rings */
    count?: Num;
    /** Animation duration (seconds) */
    duration?: Num;
    /** Maximum ring size */
    size: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
