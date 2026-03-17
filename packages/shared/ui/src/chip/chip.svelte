<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Chip text @values label */
    label,
    /** Visual style @values 'solid', 'bordered', 'light', 'flat', 'faded', 'shadow', 'dot' */
    variant,
    /** Theme color @values color */
    color,
    /** Chip size @values 'sm', 'md', 'lg' */
    size = 'md',
    /** Can be removed/closed */
    removable = false,
    /** Icon @values string, ReactNode */
    icon,
    /** Image source @values image */
    image,
    children,
  }: {
    /** Chip text */
    label: Str;
    /** Visual style */
    variant: Str;
    /** Theme color */
    color: Str;
    /** Chip size */
    size?: Str;
    /** Can be removed/closed */
    removable?: Bool;
    /** Icon */
    icon: Str;
    /** Image source */
    image: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
