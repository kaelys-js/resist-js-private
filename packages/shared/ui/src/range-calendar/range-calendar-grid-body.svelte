<script lang="ts">
  /**
   * RangeCalendarGridBody Svelte component — `<tbody>`
   * container for the month's week rows.
   *
   * @module
   */
  import { RangeCalendar as RangeCalendarPrimitive } from 'bits-ui';

  let { ref = $bindable(null), ...restProps }: RangeCalendarPrimitive.GridBodyProps = $props();
</script>

<RangeCalendarPrimitive.GridBody bind:ref {...restProps} />
