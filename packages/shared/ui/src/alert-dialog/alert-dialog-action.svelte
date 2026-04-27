<script lang="ts">
  /**
   * AlertDialog action — confirm-action button inside the alert
   * dialog footer. Wraps Bits UI's `AlertDialog.Action` with our
   * `data-slot` convention and the default `buttonVariants`
   * styling.
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
  }: AlertDialogPrimitive.ActionProps = $props();
</script>

<AlertDialogPrimitive.Action
  bind:ref
  data-slot="alert-dialog-action"
  class={cn(buttonVariants(), className)}
  {...restProps}
/>
