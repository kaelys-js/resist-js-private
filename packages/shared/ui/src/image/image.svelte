<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Image source URL @values src */
    src,
    /** Alt text @values alt */
    alt,
    /** Image width @values number, string */
    width,
    /** Image height @values number, string */
    height,
    /** Fallback image URL @values fallbackSrc */
    fallbackSrc,
    /** Loading strategy @values 'eager', 'lazy' */
    loading,
    /** Object-fit mode @values 'none', 'contain', 'cover', 'fill' */
    fit,
    /** Border radius @values radius */
    radius,
    /** Shadow level @values shadow */
    shadow,
    /** Blur effect (HeroUI) */
    isBlurred = false,
    /** Zoom on hover (HeroUI) */
    isZoomed = false,
    /** Preview/lightbox mode (PrimeReact/PrimeVue) */
    preview = false,
    /** Show border (Fluent UI) */
    bordered = false,
    /** Image shape (Fluent UI) @values 'circular', 'rounded', 'square' */
    shape,
    children,
  }: {
    /** Image source URL */
    src: Str;
    /** Alt text */
    alt: Str;
    /** Image width */
    width: Str;
    /** Image height */
    height: Str;
    /** Fallback image URL */
    fallbackSrc: Str;
    /** Loading strategy */
    loading: Str;
    /** Object-fit mode */
    fit: Str;
    /** Border radius */
    radius: Str;
    /** Shadow level */
    shadow: Str;
    /** Blur effect (HeroUI) */
    isBlurred?: Bool;
    /** Zoom on hover (HeroUI) */
    isZoomed?: Bool;
    /** Preview/lightbox mode (PrimeReact/PrimeVue) */
    preview?: Bool;
    /** Show border (Fluent UI) */
    bordered?: Bool;
    /** Image shape (Fluent UI) */
    shape: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
