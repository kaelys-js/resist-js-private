<script lang="ts">
  /**
   * ContextMenu separator — horizontal divider between groups
   * inside a context menu. Wraps Bits UI's
   * `ContextMenu.Separator`.
   *
   * @module
   */

  import { ContextMenu as ContextMenuPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: ContextMenuPrimitive.SeparatorProps = $props();
</script>

<ContextMenuPrimitive.Separator
  bind:ref
  data-slot="context-menu-separator"
  class={cn('bg-border -mx-1 my-1 h-px', className)}
  {...restProps}
/>
