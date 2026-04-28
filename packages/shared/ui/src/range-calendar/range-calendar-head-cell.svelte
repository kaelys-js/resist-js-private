<script lang="ts">
  /**
   * RangeCalendarHeadCell Svelte component — single `<th>`
   * cell rendering one weekday name in the calendar header
   * row.
   *
   * @module
   */
  import { RangeCalendar as RangeCalendarPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: RangeCalendarPrimitive.HeadCellProps = $props();
</script>

<RangeCalendarPrimitive.HeadCell
  bind:ref
  class={cn(
    'text-muted-foreground w-(--cell-size) rounded-md text-[0.8rem] font-normal',
    className,
  )}
  {...restProps}
/>
