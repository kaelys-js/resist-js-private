<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Target URL @values href */
    href,
    /** Link color @values color */
    color,
    /** Underline behavior (HeroUI) @values 'none', 'hover', 'always', 'active', 'focus' */
    underline,
    /** Open in new tab (HeroUI) */
    isExternal = false,
    /** Show external link icon (HeroUI) */
    showAnchorIcon = false,
    /** Block-level link (HeroUI) */
    isBlock = false,
    /** Disabled state */
    disabled = false,
    /** Visual style (Fluent UI) @values 'default', 'subtle' */
    appearance,
    /** Inline vs standalone (Fluent UI) */
    inline,
    children,
  }: {
    /** Target URL */
    href: Str;
    /** Link color */
    color: Str;
    /** Underline behavior (HeroUI) */
    underline: Str;
    /** Open in new tab (HeroUI) */
    isExternal?: Bool;
    /** Show external link icon (HeroUI) */
    showAnchorIcon?: Bool;
    /** Block-level link (HeroUI) */
    isBlock?: Bool;
    /** Disabled state */
    disabled?: Bool;
    /** Visual style (Fluent UI) */
    appearance: Str;
    /** Inline vs standalone (Fluent UI) */
    inline: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
