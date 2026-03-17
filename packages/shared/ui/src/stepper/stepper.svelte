<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Current active step @values 0, 0, 10 */
    activeStep = 0,
    /** Layout direction @values 'horizontal', 'vertical' */
    orientation = 'horizontal',
    /** Enforce sequential completion */
    linear = false,
    /** Step definitions */
    model,
    /** Non-interactive display */
    readonly = false,
    children,
  }: {
    /** Current active step */
    activeStep?: Num;
    /** Layout direction */
    orientation?: Str;
    /** Enforce sequential completion */
    linear?: Bool;
    /** Step definitions */
    model: Str[];
    /** Non-interactive display */
    readonly?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
