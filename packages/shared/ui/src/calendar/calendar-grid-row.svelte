<script lang="ts">
  /**
   * Calendar grid row — single week row in the calendar grid.
   * Wraps Bits UI's `Calendar.GridRow` with flex layout.
   *
   * @module
   */

  import { Calendar as CalendarPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: CalendarPrimitive.GridRowProps = $props();
</script>

<CalendarPrimitive.GridRow bind:ref class={cn('flex', className)} {...restProps} />
