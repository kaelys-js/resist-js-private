<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Scroll direction @values 'horizontal', 'vertical' */
    orientation,
    /** Shadow size in pixels @values 0, 40, 80 */
    size = 40,
    /** Shadow offset @values 0, 0, 10 */
    offset = 0,
    /** Shadow visibility @values 'auto', 'always', 'never' */
    visibility = 'auto',
    /** Hide native scrollbar */
    hideScrollBar = false,
    children,
  }: {
    /** Scroll direction */
    orientation: Str;
    /** Shadow size in pixels */
    size?: Num;
    /** Shadow offset */
    offset?: Num;
    /** Shadow visibility */
    visibility?: Str;
    /** Hide native scrollbar */
    hideScrollBar?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
