<script lang="ts">
  /**
   * Popover.Close — explicit close button for an open
   * Popover. @module
   */
  import { Popover as PopoverPrimitive } from 'bits-ui';

  let { ref = $bindable(null), ...restProps }: PopoverPrimitive.CloseProps = $props();
</script>

<PopoverPrimitive.Close bind:ref data-slot="popover-close" {...restProps} />
