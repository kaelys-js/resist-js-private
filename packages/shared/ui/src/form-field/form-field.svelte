<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Field label @values label */
    label,
    /** Associated input ID @values htmlFor */
    htmlFor,
    /** Help text @values description */
    description,
    /** Error message @values error */
    error,
    /** Show required indicator */
    required = false,
    /** Disabled state */
    disabled = false,
    /** Label position @values 'horizontal', 'vertical' */
    orientation = 'vertical',
    children,
  }: {
    /** Field label */
    label: Str;
    /** Associated input ID */
    htmlFor: Str;
    /** Help text */
    description: Str;
    /** Error message */
    error: Str;
    /** Show required indicator */
    required?: Bool;
    /** Disabled state */
    disabled?: Bool;
    /** Label position */
    orientation?: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
