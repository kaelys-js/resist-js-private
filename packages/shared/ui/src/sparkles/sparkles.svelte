<!-- @convert-to-lens -->
<script lang="ts">
  import type { Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Sparkle color @values '#FFC700' */
    color = '#FFC700',
    /** Number of sparkles @values 0, 10, 20 */
    count = 10,
    /** Minimum sparkle size @values 0, 10, 20 */
    minSize = 10,
    /** Maximum sparkle size @values 0, 20, 40 */
    maxSize = 20,
    /** Animation speed @values 0, 1, 2 */
    speed = 1,
    children,
  }: {
    /** Sparkle color */
    color?: Str;
    /** Number of sparkles */
    count?: Num;
    /** Minimum sparkle size */
    minSize?: Num;
    /** Maximum sparkle size */
    maxSize?: Num;
    /** Animation speed */
    speed?: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
