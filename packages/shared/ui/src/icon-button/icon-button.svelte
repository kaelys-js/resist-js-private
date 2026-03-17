<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Accessible label (required) @values ariaLabel */
    ariaLabel,
    /** Visual variant @values variant */
    variant,
    /** Button size @values 'md' */
    size = 'md',
    /** Circular shape */
    isRound = false,
    /** Disabled state */
    disabled = false,
    /** Theme color @values color */
    color,
    children,
  }: {
    /** Accessible label (required) */
    ariaLabel: Str;
    /** Visual variant */
    variant: Str;
    /** Button size */
    size?: Str;
    /** Circular shape */
    isRound?: Bool;
    /** Disabled state */
    disabled?: Bool;
    /** Theme color */
    color: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
