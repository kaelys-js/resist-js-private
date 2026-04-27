<script lang="ts">
  /**
   * AlertDialog title — heading at the top of the alert dialog
   * content. Wraps Bits UI's `AlertDialog.Title` with the default
   * `text-lg font-semibold` styling.
   *
   * @module
   */

  import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: AlertDialogPrimitive.TitleProps = $props();
</script>

<AlertDialogPrimitive.Title
  bind:ref
  data-slot="alert-dialog-title"
  class={cn('text-lg font-semibold', className)}
  {...restProps}
/>
