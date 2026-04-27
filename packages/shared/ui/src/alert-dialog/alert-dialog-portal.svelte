<script lang="ts">
  /**
   * AlertDialog portal — re-export of Bits UI's
   * `AlertDialog.Portal` so the dialog content can be teleported
   * to the document body, escaping any clipped / stacking-context
   * ancestors.
   *
   * @module
   */

  import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';

  let { ...restProps }: AlertDialogPrimitive.PortalProps = $props();
</script>

<AlertDialogPrimitive.Portal {...restProps} />
