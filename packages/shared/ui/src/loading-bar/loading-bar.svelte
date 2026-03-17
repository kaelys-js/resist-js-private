<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Show/hide bar */
    loading,
    /** Manual progress (0–100) @values 0, 50, 100 */
    progress,
    /** Bar color @values 'primary' */
    color = 'primary',
    /** Bar height (px) @values 0, 3, 6 */
    height = 3,
    /** Auto-increment interval @values 0, 800, 1600 */
    incrementDuration = 800,
    children,
  }: {
    /** Show/hide bar */
    loading: Bool;
    /** Manual progress (0–100) */
    progress: Num;
    /** Bar color */
    color?: Str;
    /** Bar height (px) */
    height?: Num;
    /** Auto-increment interval */
    incrementDuration?: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
