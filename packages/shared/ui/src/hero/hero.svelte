<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Main headline @values string, element */
    title,
    /** Supporting text @values description */
    description,
    /** Hero image URL @values image */
    image,
    /** Image overlay */
    overlay = false,
    /** Center-aligned content */
    centered = false,
    /** Full viewport height */
    fullHeight = false,
    /** Layout variant @values 'default' */
    variant = 'default',
    children,
  }: {
    /** Main headline */
    title: Str;
    /** Supporting text */
    description: Str;
    /** Hero image URL */
    image: Str;
    /** Image overlay */
    overlay?: Bool;
    /** Center-aligned content */
    centered?: Bool;
    /** Full viewport height */
    fullHeight?: Bool;
    /** Layout variant */
    variant?: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
