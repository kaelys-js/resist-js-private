<script lang="ts">
  /**
   * AlertDialog description — supporting body copy beneath the
   * alert dialog title. Wraps Bits UI's `AlertDialog.Description`
   * with muted-foreground / small-text styling.
   *
   * @module
   */

  import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: AlertDialogPrimitive.DescriptionProps = $props();
</script>

<AlertDialogPrimitive.Description
  bind:ref
  data-slot="alert-dialog-description"
  class={cn('text-muted-foreground text-sm', className)}
  {...restProps}
/>
