<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Full-width container (Flowbite) */
    fluid = false,
    /** Responsive collapse breakpoint @values 'md' */
    breakpoint = 'md',
    /** Position behavior @values 'static', 'sticky', 'fixed' */
    position,
    /** Show bottom border (HeroUI) */
    isBordered = false,
    /** Backdrop blur (HeroUI) */
    isBlurred = true,
    /** Auto-hide on scroll (HeroUI) */
    shouldHideOnScroll = false,
    children,
  }: {
    /** Full-width container (Flowbite) */
    fluid?: Bool;
    /** Responsive collapse breakpoint */
    breakpoint?: Str;
    /** Position behavior */
    position: Str;
    /** Show bottom border (HeroUI) */
    isBordered?: Bool;
    /** Backdrop blur (HeroUI) */
    isBlurred?: Bool;
    /** Auto-hide on scroll (HeroUI) */
    shouldHideOnScroll?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
