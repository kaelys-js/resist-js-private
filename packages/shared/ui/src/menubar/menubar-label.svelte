<script lang="ts">
  /**
   * Menubar.Label — non-interactive section label inside a
   * Menubar menu. @module
   */
  import type { WithElementRef } from 'bits-ui';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    /** Whether to inset the label for icon alignment. */
    inset,
    children,
    class: className,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLElement>> & {
    inset?: boolean;
  } = $props();
</script>

<div
  bind:this={ref}
  data-slot="menubar-label"
  data-inset={inset}
  class={cn('px-2 py-1.5 text-sm font-medium data-[inset]:ps-8', className)}
  {...restProps}
>
  {@render children?.()}
</div>
