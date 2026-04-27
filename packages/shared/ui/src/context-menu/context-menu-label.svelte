<script lang="ts">
  /**
   * ContextMenu label — non-interactive label rendered inside
   * the context menu (e.g., a section title). Supports the
   * `inset` flag for icon-column alignment.
   *
   * @module
   */

  import { cn, type WithElementRef } from '../utils.js';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    ref = $bindable(null),
    class: className,
    /** Whether to inset the label for icon alignment. */
    inset,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
    inset?: boolean;
  } = $props();
</script>

<div
  bind:this={ref}
  data-slot="context-menu-label"
  data-inset={inset}
  class={cn('text-foreground px-2 py-1.5 text-sm font-medium data-[inset]:ps-8', className)}
  {...restProps}
>
  {@render children?.()}
</div>
