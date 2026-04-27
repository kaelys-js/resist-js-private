<script lang="ts">
  /**
   * ContextMenu portal — re-export of Bits UI's
   * `ContextMenu.Portal` so the menu content can be teleported
   * to the document body, escaping clipped / stacking-context
   * ancestors.
   *
   * @module
   */

  import { ContextMenu as ContextMenuPrimitive } from 'bits-ui';

  let { ...restProps }: ContextMenuPrimitive.PortalProps = $props();
</script>

<ContextMenuPrimitive.Portal {...restProps} />
