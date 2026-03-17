<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Line direction @values 'horizontal', 'vertical' */
    orientation = 'horizontal',
    /** If true, purely visual (no ARIA separator role) */
    decorative = false,
    /** Line style (PrimeReact/PrimeVue) @values 'solid', 'dashed', 'dotted' */
    type = 'solid',
    /** Label alignment (PrimeReact/PrimeVue) @values 'left', 'center', 'right' */
    align = 'center',
    /** Inset from edges (Fluent UI) */
    inset = false,
    children,
  }: {
    /** Line direction */
    orientation?: Str;
    /** If true, purely visual (no ARIA separator role) */
    decorative?: Bool;
    /** Line style (PrimeReact/PrimeVue) */
    type?: Str;
    /** Label alignment (PrimeReact/PrimeVue) */
    align?: Str;
    /** Inset from edges (Fluent UI) */
    inset?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
