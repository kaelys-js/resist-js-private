<!-- @convert-to-lens -->
<script lang="ts">
  import type { Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Shimmer highlight color @values 'white' */
    shimmerColor = 'white',
    /** Shimmer particle size @values '0.05em' */
    shimmerSize = '0.05em',
    /** Animation cycle duration @values '3s' */
    shimmerDuration = '3s',
    /** Button background @values background */
    background,
    /** Corner radius @values '100px' */
    borderRadius = '100px',
    children,
  }: {
    /** Shimmer highlight color */
    shimmerColor?: Str;
    /** Shimmer particle size */
    shimmerSize?: Str;
    /** Animation cycle duration */
    shimmerDuration?: Str;
    /** Button background */
    background: Str;
    /** Corner radius */
    borderRadius?: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
