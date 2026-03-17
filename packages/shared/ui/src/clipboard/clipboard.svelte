<!-- @convert-to-lens -->
<script lang="ts">
  import type { Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Text to copy @values value */
    value,
    /** Reset delay after copy (ms) @values 0, 2000, 4000 */
    timeout = 2000,
    children,
  }: {
    /** Text to copy */
    value: Str;
    /** Reset delay after copy (ms) */
    timeout?: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
