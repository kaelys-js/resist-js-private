<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Pull strength in pixels @values 0, 50, 100 */
    strength = 50,
    /** Effect radius @values 0, 200, 400 */
    radius = 200,
    /** Animation duration @values 0, 50, 100 */
    duration = 0.3,
    /** Spring-back effect */
    haptic = false,
    children,
  }: {
    /** Pull strength in pixels */
    strength?: Num;
    /** Effect radius */
    radius?: Num;
    /** Animation duration */
    duration?: Num;
    /** Spring-back effect */
    haptic?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
