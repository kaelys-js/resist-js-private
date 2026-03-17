<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Selected time @values Date, string */
    value,
    /** Initial time @values Date, string */
    defaultValue,
    /** 12 or 24 hour format @values 12, 24 */
    hourCycle = 24,
    /** Time precision @values 'hour', 'minute', 'second' */
    granularity = 'minute',
    /** Minimum time @values Date, string */
    minValue,
    /** Maximum time @values Date, string */
    maxValue,
    /** Minute step increment @values 0, 1, 2 */
    stepMinute = 1,
    /** Disabled state */
    disabled = false,
    /** Show seconds field */
    showSeconds = false,
    children,
  }: {
    /** Selected time */
    value: Str;
    /** Initial time */
    defaultValue: Str;
    /** 12 or 24 hour format */
    hourCycle?: Num;
    /** Time precision */
    granularity?: Str;
    /** Minimum time */
    minValue: Str;
    /** Maximum time */
    maxValue: Str;
    /** Minute step increment */
    stepMinute?: Num;
    /** Disabled state */
    disabled?: Bool;
    /** Show seconds field */
    showSeconds?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
