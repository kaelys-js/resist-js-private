<script lang="ts">
  /**
   * Item.Header — top-of-row slot for an `Item`, typically
   * containing a `Title` and supporting metadata.
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
  data-slot="item-header"
  class={cn('flex basis-full items-center justify-between gap-2', className)}
  {...restProps}
>
  {@render children?.()}
</div>
