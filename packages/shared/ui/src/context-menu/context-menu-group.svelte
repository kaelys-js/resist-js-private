<script lang="ts">
  /**
   * ContextMenu group — semantic grouping wrapper for related
   * menu items. Wraps Bits UI's `ContextMenu.Group`.
   *
   * @module
   */

  import { ContextMenu as ContextMenuPrimitive } from 'bits-ui';

  let { ref = $bindable(null), ...restProps }: ContextMenuPrimitive.GroupProps = $props();
</script>

<ContextMenuPrimitive.Group bind:ref data-slot="context-menu-group" {...restProps} />
