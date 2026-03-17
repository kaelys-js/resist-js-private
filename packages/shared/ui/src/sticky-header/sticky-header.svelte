<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Enable sticky behavior */
    sticky = true,
    /** Auto-hide direction @values 'up', 'down', 'both', 'none' */
    hideOnScroll = 'none',
    /** Scroll offset threshold @values 0, 0, 10 */
    offset = 0,
    /** Show shadow when stuck */
    shadow = true,
    /** Backdrop blur when stuck */
    blur = false,
    /** Stack order @values 0, 50, 100 */
    zIndex = 50,
    children,
  }: {
    /** Enable sticky behavior */
    sticky?: Bool;
    /** Auto-hide direction */
    hideOnScroll?: Str;
    /** Scroll offset threshold */
    offset?: Num;
    /** Show shadow when stuck */
    shadow?: Bool;
    /** Backdrop blur when stuck */
    blur?: Bool;
    /** Stack order */
    zIndex?: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
