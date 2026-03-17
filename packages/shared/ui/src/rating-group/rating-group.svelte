<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Current rating @values 0, 0, 10 */
    value = 0,
    /** Initial rating @values 0, 50, 100 */
    defaultValue,
    /** Maximum rating @values 0, 5, 10 */
    max = 5,
    /** Number of stars/icons @values 0, 5, 10 */
    count = 5,
    /** Half-star precision */
    allowHalf = false,
    /** Disabled state */
    disabled = false,
    /** Read-only display */
    readOnly = false,
    /** Required field */
    required = false,
    /** Form field name @values name */
    name,
    /** Preview on hover (Bits UI) */
    hoverPreview = false,
    /** Layout direction @values 'horizontal', 'vertical' */
    orientation = 'horizontal',
    /** Allow clearing (PrimeReact) */
    cancel = true,
    /** Step size (0.5 for half, Fluent UI) @values 0, 1, 2 */
    step = 1,
    children,
  }: {
    /** Current rating */
    value?: Num;
    /** Initial rating */
    defaultValue: Num;
    /** Maximum rating */
    max?: Num;
    /** Number of stars/icons */
    count?: Num;
    /** Half-star precision */
    allowHalf?: Bool;
    /** Disabled state */
    disabled?: Bool;
    /** Read-only display */
    readOnly?: Bool;
    /** Required field */
    required?: Bool;
    /** Form field name */
    name: Str;
    /** Preview on hover (Bits UI) */
    hoverPreview?: Bool;
    /** Layout direction */
    orientation?: Str;
    /** Allow clearing (PrimeReact) */
    cancel?: Bool;
    /** Step size (0.5 for half, Fluent UI) */
    step?: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
