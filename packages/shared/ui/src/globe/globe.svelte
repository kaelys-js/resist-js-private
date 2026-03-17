<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Arc definitions (start/end lat/lng, color) */
    arcs,
    /** Point markers (lat, lng, label) */
    markers,
    /** Auto-rotation */
    autoRotate = true,
    /** Rotation speed @values 0, 50, 100 */
    rotateSpeed = 0.5,
    /** Globe surface color @values '#1d072e' */
    globeColor = '#1d072e',
    /** Arc color @values string, function */
    arcColor,
    /** Glow atmosphere */
    atmosphere = true,
    /** Canvas width @values 0, 600, 1200 */
    width = 600,
    /** Canvas height @values 0, 600, 1200 */
    height = 600,
    children,
  }: {
    /** Arc definitions (start/end lat/lng, color) */
    arcs: Str[];
    /** Point markers (lat, lng, label) */
    markers: Str[];
    /** Auto-rotation */
    autoRotate?: Bool;
    /** Rotation speed */
    rotateSpeed?: Num;
    /** Globe surface color */
    globeColor?: Str;
    /** Arc color */
    arcColor: Str;
    /** Glow atmosphere */
    atmosphere?: Bool;
    /** Canvas width */
    width?: Num;
    /** Canvas height */
    height?: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
