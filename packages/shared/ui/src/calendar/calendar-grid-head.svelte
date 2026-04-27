<script lang="ts">
  /**
   * Calendar grid head — `<thead>`-style container for the
   * weekday-header row. Wraps Bits UI's `Calendar.GridHead`.
   *
   * @module
   */

  import { Calendar as CalendarPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: CalendarPrimitive.GridHeadProps = $props();
</script>

<CalendarPrimitive.GridHead bind:ref class={cn(className)} {...restProps} />
