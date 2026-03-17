<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Color value (hex, rgb, hsl) @values color */
    color,
    /** Swatch size @values string, number */
    size = '2rem',
    /** Corner radius @values 'sm' */
    radius = 'sm',
    /** Shadow for light colors */
    withShadow = true,
    children,
  }: {
    /** Color value (hex, rgb, hsl) */
    color: Str;
    /** Swatch size */
    size?: Str;
    /** Corner radius */
    radius?: Str;
    /** Shadow for light colors */
    withShadow?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
