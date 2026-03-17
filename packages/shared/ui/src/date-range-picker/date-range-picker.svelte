<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Selected range @values { start: DateValue, end: DateValue } */
    value,
    /** Initial range @values { start: DateValue, end: DateValue } */
    defaultValue,
    /** Minimum range length @values 0, 50, 100 */
    minDays,
    /** Maximum range length @values 0, 50, 100 */
    maxDays,
    /** Auto-close after selection */
    closeOnRangeSelect = true,
    /** Visible months @values 0, 2, 4 */
    numberOfMonths = 2,
    /** Localization @values locale */
    locale,
    /** Unavailable date filter */
    isDateUnavailable,
    /** Disabled date filter */
    isDateDisabled,
    children,
  }: {
    /** Selected range */
    value: Str;
    /** Initial range */
    defaultValue: Str;
    /** Minimum range length */
    minDays: Num;
    /** Maximum range length */
    maxDays: Num;
    /** Auto-close after selection */
    closeOnRangeSelect?: Bool;
    /** Visible months */
    numberOfMonths?: Num;
    /** Localization */
    locale: Str;
    /** Unavailable date filter */
    isDateUnavailable: () => void;
    /** Disabled date filter */
    isDateDisabled: () => void;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
