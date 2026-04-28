<script lang="ts">
  /**
   * RangeCalendarGridHead Svelte component — `<thead>`
   * container for the weekday-name header row.
   *
   * @module
   */
  import { RangeCalendar as RangeCalendarPrimitive } from 'bits-ui';

  let { ref = $bindable(null), ...restProps }: RangeCalendarPrimitive.GridHeadProps = $props();
</script>

<RangeCalendarPrimitive.GridHead bind:ref {...restProps} />
