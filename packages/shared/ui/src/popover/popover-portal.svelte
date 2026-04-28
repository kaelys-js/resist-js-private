<script lang="ts">
  /**
   * Popover.Portal — portal mount target for Popover floating
   * content. @module
   */
  import { Popover as PopoverPrimitive } from 'bits-ui';

  let { ...restProps }: PopoverPrimitive.PortalProps = $props();
</script>

<PopoverPrimitive.Portal {...restProps} />
