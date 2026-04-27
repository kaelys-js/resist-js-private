<script lang="ts">
  /**
   * Calendar heading — text label inside the calendar header
   * showing the current month / year. Wraps Bits UI's
   * `Calendar.Heading`.
   *
   * @module
   */

  import { Calendar as CalendarPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: CalendarPrimitive.HeadingProps = $props();
</script>

<CalendarPrimitive.Heading
  bind:ref
  class={cn('px-(--cell-size) text-sm font-medium', className)}
  {...restProps}
/>
