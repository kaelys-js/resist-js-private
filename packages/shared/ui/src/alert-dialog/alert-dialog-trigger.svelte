<script lang="ts">
  /**
   * AlertDialog trigger — element that opens the alert dialog.
   * Wraps Bits UI's `AlertDialog.Trigger` with our `data-slot`
   * convention.
   *
   * @module
   */

  import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';

  let { ref = $bindable(null), ...restProps }: AlertDialogPrimitive.TriggerProps = $props();
</script>

<AlertDialogPrimitive.Trigger bind:ref data-slot="alert-dialog-trigger" {...restProps} />
