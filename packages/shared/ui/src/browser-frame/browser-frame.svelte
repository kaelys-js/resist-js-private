<!-- @convert-to-lens -->
<script lang="ts">
  import type { Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Displayed URL @values 'https://example.com' */
    url = 'https://example.com',
    /** Browser style @values 'safari', 'chrome', 'firefox', 'arc' */
    variant = 'safari',
    /** Frame width @values number, string */
    width = '100%',
    /** Frame height @values number, string */
    height = 'auto',
    /** Screenshot content @values imageSrc */
    imageSrc,
    children,
  }: {
    /** Displayed URL */
    url?: Str;
    /** Browser style */
    variant?: Str;
    /** Frame width */
    width?: Str;
    /** Frame height */
    height?: Str;
    /** Screenshot content */
    imageSrc: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
