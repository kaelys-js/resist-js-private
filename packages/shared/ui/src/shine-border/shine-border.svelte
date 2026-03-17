<!-- @convert-to-lens -->
<script lang="ts">
  import type { Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Shine color(s) @values string, string[] */
    color = 'white',
    /** Animation duration (seconds) @values 0, 14, 28 */
    duration = 14,
    /** Border width @values 0, 1, 2 */
    borderWidth = 1,
    /** Corner radius @values 0, 8, 16 */
    borderRadius = 8,
    children,
  }: {
    /** Shine color(s) */
    color?: Str;
    /** Animation duration (seconds) */
    duration?: Num;
    /** Border width */
    borderWidth?: Num;
    /** Corner radius */
    borderRadius?: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
