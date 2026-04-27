<script lang="ts">
  /**
   * Calendar head cell — single weekday header cell (e.g.,
   * "Mo" / "Tu") rendered above the grid body. Wraps Bits UI's
   * `Calendar.HeadCell` with muted text styling.
   *
   * @module
   */

  import { Calendar as CalendarPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: CalendarPrimitive.HeadCellProps = $props();
</script>

<CalendarPrimitive.HeadCell
  bind:ref
  class={cn(
    'text-muted-foreground w-(--cell-size) rounded-md text-[0.8rem] font-normal',
    className,
  )}
  {...restProps}
/>
