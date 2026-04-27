<!-- @convert-to-lens -->
<script lang="ts">
  /**
   * AlertDialog root — wraps Bits UI's `AlertDialog.Root` and
   * exposes a bindable `open` prop. Use together with the
   * `alert-dialog-trigger`, `alert-dialog-portal`,
   * `alert-dialog-overlay`, `alert-dialog-content`, and
   * `alert-dialog-{action,cancel,header,footer,title,description}`
   * sub-components.
   *
   * @module
   */

  import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';

  let {
    /** Whether the alert dialog is open. */
    open = $bindable(false),
    ...restProps
  }: AlertDialogPrimitive.RootProps = $props();
</script>

<AlertDialogPrimitive.Root bind:open {...restProps} />
