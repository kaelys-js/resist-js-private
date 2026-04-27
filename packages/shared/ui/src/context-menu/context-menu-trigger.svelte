<script lang="ts">
  /**
   * ContextMenu trigger — element that opens the context menu on
   * right-click / long-press. Wraps Bits UI's
   * `ContextMenu.Trigger`.
   *
   * @module
   */

  import { ContextMenu as ContextMenuPrimitive } from 'bits-ui';

  let { ref = $bindable(null), ...restProps }: ContextMenuPrimitive.TriggerProps = $props();
</script>

<ContextMenuPrimitive.Trigger bind:ref data-slot="context-menu-trigger" {...restProps} />
