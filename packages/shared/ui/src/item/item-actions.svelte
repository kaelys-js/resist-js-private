<script lang="ts">
  /**
   * Item.Actions — trailing action slot for an `Item` row,
   * typically wrapping buttons / menu triggers.
   *
   * @module
   */
  import { cn, type WithElementRef } from '../utils.js';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
  bind:this={ref}
  data-slot="item-actions"
  class={cn('flex items-center gap-2', className)}
  {...restProps}
>
  {@render children?.()}
</div>
