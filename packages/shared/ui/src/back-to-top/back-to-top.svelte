<!-- @convert-to-lens -->
<script lang="ts">
  import type { Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Scroll distance to show button @values 0, 400, 800 */
    visibilityHeight = 400,
    /** Scroll container @values element, string */
    target,
    /** Scroll animation duration (ms) @values 0, 450, 900 */
    duration = 450,
    children,
  }: {
    /** Scroll distance to show button */
    visibilityHeight?: Num;
    /** Scroll container */
    target?: Str;
    /** Scroll animation duration (ms) */
    duration?: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
