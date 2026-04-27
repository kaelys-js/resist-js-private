<script lang="ts">
  /**
   * Calendar cell — single date cell inside a calendar week row.
   * Wraps Bits UI's `Calendar.Cell` with our cell-size styling and
   * the rounded edge handling for selected ranges.
   *
   * @module
   */

  import { Calendar as CalendarPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: CalendarPrimitive.CellProps = $props();
</script>

<CalendarPrimitive.Cell
  bind:ref
  class={cn(
    'relative size-(--cell-size) p-0 text-center text-sm focus-within:z-20 [&:first-child[data-selected]_[data-bits-day]]:rounded-s-md [&:last-child[data-selected]_[data-bits-day]]:rounded-e-md',
    className,
  )}
  {...restProps}
/>
