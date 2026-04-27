<script lang="ts">
  /**
   * AlertDialog cancel — dismiss-action button inside the alert
   * dialog footer. Wraps Bits UI's `AlertDialog.Cancel` with the
   * outline button variant for visual de-emphasis.
   *
   * @module
   */

  import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
  import { buttonVariants } from '../button/index.js';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: AlertDialogPrimitive.CancelProps = $props();
</script>

<AlertDialogPrimitive.Cancel
  bind:ref
  data-slot="alert-dialog-cancel"
  class={cn(buttonVariants({ variant: 'outline' }), className)}
  {...restProps}
/>
