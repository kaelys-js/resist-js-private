<!-- @convert-to-lens -->
<script lang="ts">
  import type { Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Device style @values 'iphone', 'android', 'generic' */
    variant = 'iphone',
    /** Device color @values 'black' */
    color = 'black',
    /** Frame width @values number, string */
    width = '300px',
    /** Screen content image @values imageSrc */
    imageSrc,
    children,
  }: {
    /** Device style */
    variant?: Str;
    /** Device color */
    color?: Str;
    /** Frame width */
    width?: Str;
    /** Screen content image */
    imageSrc: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
