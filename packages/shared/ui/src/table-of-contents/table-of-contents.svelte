<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Heading selector @values 'h2, h3' */
    selector = 'h2, h3',
    /** Scroll detection offset @values 0, 0, 10 */
    offset = 0,
    /** Smooth scroll on click */
    smooth = true,
    /** Active item CSS class @values activeClass */
    activeClass,
    children,
  }: {
    /** Heading selector */
    selector?: Str;
    /** Scroll detection offset */
    offset?: Num;
    /** Smooth scroll on click */
    smooth?: Bool;
    /** Active item CSS class */
    activeClass: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
