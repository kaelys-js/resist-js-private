<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Horizontal spacing @values 0, 50, 100 */
    x,
    /** Vertical spacing @values 0, 50, 100 */
    y,
    /** Use flex grow */
    flex = true,
    children,
  }: {
    /** Horizontal spacing */
    x: Num;
    /** Vertical spacing */
    y: Num;
    /** Use flex grow */
    flex?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
