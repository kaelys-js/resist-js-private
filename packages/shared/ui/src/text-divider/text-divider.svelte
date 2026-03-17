<!-- @convert-to-lens -->
<script lang="ts">
  import type { Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Center content @values string, element */
    label,
    /** Label position @values 'left', 'center', 'right' */
    position = 'center',
    /** Divider direction @values 'horizontal', 'vertical' */
    orientation = 'horizontal',
    /** Line style @values 'solid', 'dashed', 'dotted' */
    variant = 'solid',
    /** Line color @values color */
    color,
    children,
  }: {
    /** Center content */
    label: Str;
    /** Label position */
    position?: Str;
    /** Divider direction */
    orientation?: Str;
    /** Line style */
    variant?: Str;
    /** Line color */
    color: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
