<script lang="ts">
  /**
   * Calendar header — month-level header that contains the
   * caption (label or dropdowns) above the calendar grid. Wraps
   * Bits UI's `Calendar.Header`.
   *
   * @module
   */

  import { Calendar as CalendarPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: CalendarPrimitive.HeaderProps = $props();
</script>

<CalendarPrimitive.Header
  bind:ref
  class={cn(
    'flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium',
    className,
  )}
  {...restProps}
/>
