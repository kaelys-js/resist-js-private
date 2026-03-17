<!-- @convert-to-lens -->
<script lang="ts">
  import type { Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Custom particle image URL @values particle */
    particle,
    /** Particles per click @values 0, 30, 60 */
    particleCount = 30,
    /** Fall speed @values 0, 5, 10 */
    speedDown = 5,
    /** Particle size @values 0, 25, 50 */
    size = 25,
    children,
  }: {
    /** Custom particle image URL */
    particle: Str;
    /** Particles per click */
    particleCount?: Num;
    /** Fall speed */
    speedDown?: Num;
    /** Particle size */
    size?: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
