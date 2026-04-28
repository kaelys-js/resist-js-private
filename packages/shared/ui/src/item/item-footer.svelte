<script lang="ts">
  /**
   * Item.Footer — bottom-of-row slot for an `Item`, used for
   * tertiary actions or metadata.
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
  data-slot="item-footer"
  class={cn('flex basis-full items-center justify-between gap-2', className)}
  {...restProps}
>
  {@render children?.()}
</div>
