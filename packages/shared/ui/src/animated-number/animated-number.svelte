<!-- @convert-to-lens -->
<script lang="ts">
  import type { Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Target number @values 0, 50, 100 */
    value,
    /** Animation duration (ms) @values 0, 1000, 2000 */
    duration = 1000,
    /** Number formatter */
    format,
    /** Decimal places @values 0, 0, 10 */
    decimals = 0,
    /** Easing function @values 'easeOut' */
    easing = 'easeOut',
    /** Text before number @values prefix */
    prefix,
    /** Text after number @values suffix */
    suffix,
    /** Number locale @values locale */
    locale,
    children,
  }: {
    /** Target number */
    value: Num;
    /** Animation duration (ms) */
    duration?: Num;
    /** Number formatter */
    format: () => void;
    /** Decimal places */
    decimals?: Num;
    /** Easing function */
    easing?: Str;
    /** Text before number */
    prefix: Str;
    /** Text after number */
    suffix: Str;
    /** Number locale */
    locale: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
