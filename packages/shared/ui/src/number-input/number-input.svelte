<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Current value @values 0, 50, 100 */
    value,
    /** Initial value @values 0, 50, 100 */
    defaultValue,
    /** Minimum value @values 0, 50, 100 */
    min,
    /** Maximum value @values 0, 50, 100 */
    max,
    /** Step increment @values 0, 1, 2 */
    step = 1,
    /** Decimal precision @values 0, 50, 100 */
    precision,
    /** Number formatting @values Intl.NumberFormatOptions */
    formatOptions,
    /** Locale for formatting @values locale */
    locale,
    /** Disabled state */
    disabled = false,
    /** Read-only state */
    readOnly = false,
    /** Clamp to min/max on blur */
    clampValueOnBlur = true,
    /** Allow values outside min/max */
    allowOverflow = false,
    /** Spin on long press */
    spinOnPress = true,
    /** Format mode (PrimeReact) @values 'decimal', 'currency' */
    mode = 'decimal',
    /** Currency code (PrimeReact) @values currency */
    currency,
    /** Show thousands separator */
    useGrouping = true,
    /** Show stepper buttons (PrimeReact) */
    showButtons = false,
    /** Button layout (PrimeReact) @values 'stacked', 'horizontal', 'vertical' */
    buttonLayout,
    children,
  }: {
    /** Current value */
    value: Num;
    /** Initial value */
    defaultValue: Num;
    /** Minimum value */
    min: Num;
    /** Maximum value */
    max: Num;
    /** Step increment */
    step?: Num;
    /** Decimal precision */
    precision: Num;
    /** Number formatting */
    formatOptions: Str;
    /** Locale for formatting */
    locale: Str;
    /** Disabled state */
    disabled?: Bool;
    /** Read-only state */
    readOnly?: Bool;
    /** Clamp to min/max on blur */
    clampValueOnBlur?: Bool;
    /** Allow values outside min/max */
    allowOverflow?: Bool;
    /** Spin on long press */
    spinOnPress?: Bool;
    /** Format mode (PrimeReact) */
    mode?: Str;
    /** Currency code (PrimeReact) */
    currency: Str;
    /** Show thousands separator */
    useGrouping?: Bool;
    /** Show stepper buttons (PrimeReact) */
    showButtons?: Bool;
    /** Button layout (PrimeReact) */
    buttonLayout: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
