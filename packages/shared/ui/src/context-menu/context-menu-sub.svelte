<script lang="ts">
  /**
   * ContextMenu sub — wrapper for a nested submenu (`Sub`)
   * inside a context menu. Wraps Bits UI's `ContextMenu.Sub`
   * with a bindable `open` prop.
   *
   * @module
   */

  import { ContextMenu as ContextMenuPrimitive } from 'bits-ui';

  let {
    /** Whether the submenu is open. */
    open = $bindable(false),
    ...restProps
  }: ContextMenuPrimitive.SubProps = $props();
</script>

<ContextMenuPrimitive.Sub bind:open {...restProps} />
