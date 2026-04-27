<!-- @convert-to-lens -->
<script lang="ts">
  /**
   * ContextMenu root — right-click / long-press menu surface.
   * Wraps Bits UI's `ContextMenu.Root` with a bindable `open`
   * prop. Use together with the `context-menu-trigger` /
   * `-content` / `-item` and submenu sub-components.
   *
   * @module
   */

  import { ContextMenu as ContextMenuPrimitive } from 'bits-ui';

  let {
    /** Whether the context menu is open. */
    open = $bindable(false),
    ...restProps
  }: ContextMenuPrimitive.RootProps = $props();
</script>

<ContextMenuPrimitive.Root bind:open {...restProps} />
