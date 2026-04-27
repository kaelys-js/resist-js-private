<script lang="ts">
  /**
   * Calendar grid body — `<tbody>`-style container for calendar
   * week rows. Wraps Bits UI's `Calendar.GridBody`.
   *
   * @module
   */

  import { Calendar as CalendarPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: CalendarPrimitive.GridBodyProps = $props();
</script>

<CalendarPrimitive.GridBody bind:ref class={cn(className)} {...restProps} />
