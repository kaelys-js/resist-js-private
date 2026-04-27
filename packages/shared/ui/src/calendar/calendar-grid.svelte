<script lang="ts">
  /**
   * Calendar grid — top-level calendar grid container that holds
   * the head + body sub-components. Wraps Bits UI's
   * `Calendar.Grid` with column-flex layout.
   *
   * @module
   */

  import { Calendar as CalendarPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: CalendarPrimitive.GridProps = $props();
</script>

<CalendarPrimitive.Grid
  bind:ref
  class={cn('mt-4 flex w-full border-collapse flex-col gap-1', className)}
  {...restProps}
/>
