<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Effect type (aurora, grid, dots, particles, beams, waves, globe, vortex) @values variant */
    variant,
    /** Effect colors @values string, string[] */
    color,
    /** Animation speed @values 0, 1, 2 */
    speed = 1,
    /** Particle/element count @values 0, 50, 100 */
    density,
    /** Respond to mouse movement */
    interactive = false,
    /** Additional CSS classes @values className */
    className,
    children,
  }: {
    /** Effect type (aurora, grid, dots, particles, beams, waves, globe, vortex) */
    variant: Str;
    /** Effect colors */
    color: Str;
    /** Animation speed */
    speed?: Num;
    /** Particle/element count */
    density: Num;
    /** Respond to mouse movement */
    interactive?: Bool;
    /** Additional CSS classes */
    className: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
