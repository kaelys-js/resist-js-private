<script lang="ts">
  /**
   * RangeCalendarGridRow Svelte component — single `<tr>`
   * row for one week of dates in the calendar grid.
   *
   * @module
   */
  import { RangeCalendar as RangeCalendarPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: RangeCalendarPrimitive.GridRowProps = $props();
</script>

<RangeCalendarPrimitive.GridRow bind:ref class={cn('flex', className)} {...restProps} />
