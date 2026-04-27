<script lang="ts">
  /**
   * ContextMenu group heading — non-interactive label rendered
   * above a `ContextMenu.Group` to label its contents. Wraps
   * Bits UI's `ContextMenu.GroupHeading`.
   *
   * @module
   */

  import { ContextMenu as ContextMenuPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    /** Whether to inset the heading for icon alignment. */
    inset,
    ...restProps
  }: ContextMenuPrimitive.GroupHeadingProps & {
    inset?: boolean;
  } = $props();
</script>

<ContextMenuPrimitive.GroupHeading
  bind:ref
  data-slot="context-menu-group-heading"
  data-inset={inset}
  class={cn('text-foreground px-2 py-1.5 text-sm font-medium data-[inset]:ps-8', className)}
  {...restProps}
/>
