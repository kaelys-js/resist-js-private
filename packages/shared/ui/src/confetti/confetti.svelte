<!-- @convert-to-lens -->
<script lang="ts">
  import type { Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Number of particles @values 0, 50, 100 */
    particleCount = 50,
    /** Spread angle @values 0, 60, 120 */
    spread = 60,
    /** Burst origin point */
    origin,
    /** Particle colors @values string[] */
    colors,
    /** Fall speed @values 0, 1, 2 */
    gravity = 1,
    /** Effect duration (ms) @values 0, 3000, 6000 */
    duration = 3000,
    /** Particle shapes @values string[] */
    shapes,
    children,
  }: {
    /** Number of particles */
    particleCount?: Num;
    /** Spread angle */
    spread?: Num;
    /** Burst origin point */
    origin?: Record<Str, unknown>;
    /** Particle colors */
    colors: Str;
    /** Fall speed */
    gravity?: Num;
    /** Effect duration (ms) */
    duration?: Num;
    /** Particle shapes */
    shapes?: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
