<script lang="ts">
  /**
   * Dialog portal — re-export of Bits UI's `Dialog.Portal` so
   * dialog content can be teleported to the document body,
   * escaping any clipped / stacking-context ancestors.
   *
   * @module
   */

  import { Dialog as DialogPrimitive } from 'bits-ui';

  let { ...restProps }: DialogPrimitive.PortalProps = $props();
</script>

<DialogPrimitive.Portal {...restProps} />
