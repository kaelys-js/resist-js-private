<script lang="ts">
  /**
   * RangeCalendarHeading Svelte component — text label
   * (e.g. month/year) shown in the RangeCalendar header.
   *
   * @module
   */
  import { RangeCalendar as RangeCalendarPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: RangeCalendarPrimitive.HeadingProps = $props();
</script>

<RangeCalendarPrimitive.Heading
  bind:ref
  class={cn('px-(--cell-size) text-sm font-medium', className)}
  {...restProps}
/>
