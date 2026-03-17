<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Selected date(s) @values DateValue, DateValue[] */
    value,
    /** Initial date(s) @values DateValue, DateValue[] */
    defaultValue,
    /** Selection mode @values 'single', 'multiple', 'range' */
    selectionMode = 'single',
    /** Locale for formatting @values 'en-US' */
    locale = 'en-US',
    /** Minimum date @values DateValue */
    minValue,
    /** Maximum date @values DateValue */
    maxValue,
    /** Mark dates as unavailable */
    isDateUnavailable,
    /** Close after selection */
    closeOnSelect = true,
    /** Visible months @values 0, 50, 100 */
    numberOfMonths,
    /** Inline mode (no popover) */
    inline = false,
    /** Include time selection */
    showTime = false,
    /** Display week numbers */
    showWeekNumbers = false,
    /** Custom date format string @values dateFormat */
    dateFormat,
    /** Disabled state */
    disabled = false,
    /** Time precision @values granularity */
    granularity,
    /** Time format @values '12', '24' */
    hourCycle,
    /** Always show 6 weeks */
    fixedWeeks,
    /** Open on input click */
    openOnClick = false,
    children,
  }: {
    /** Selected date(s) */
    value: Str;
    /** Initial date(s) */
    defaultValue: Str;
    /** Selection mode */
    selectionMode?: Str;
    /** Locale for formatting */
    locale?: Str;
    /** Minimum date */
    minValue: Str;
    /** Maximum date */
    maxValue: Str;
    /** Mark dates as unavailable */
    isDateUnavailable: () => void;
    /** Close after selection */
    closeOnSelect?: Bool;
    /** Visible months */
    numberOfMonths: Num;
    /** Inline mode (no popover) */
    inline?: Bool;
    /** Include time selection */
    showTime?: Bool;
    /** Display week numbers */
    showWeekNumbers?: Bool;
    /** Custom date format string */
    dateFormat: Str;
    /** Disabled state */
    disabled?: Bool;
    /** Time precision */
    granularity: Str;
    /** Time format */
    hourCycle: Str;
    /** Always show 6 weeks */
    fixedWeeks: Bool;
    /** Open on input click */
    openOnClick?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
