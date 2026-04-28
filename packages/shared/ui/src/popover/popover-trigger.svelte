<script lang="ts">
  /**
   * Popover.Trigger — element that toggles the Popover.
   * @module
   */
  import { cn } from '../utils.js';
  import { Popover as PopoverPrimitive } from 'bits-ui';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: PopoverPrimitive.TriggerProps = $props();
</script>

<PopoverPrimitive.Trigger
  bind:ref
  data-slot="popover-trigger"
  class={cn('', className)}
  {...restProps}
/>
