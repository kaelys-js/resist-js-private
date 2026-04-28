<script lang="ts">
  /**
   * Item.Title — primary heading line for an `Item` row.
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
  data-slot="item-title"
  class={cn('flex w-fit items-center gap-2 text-sm leading-snug font-medium', className)}
  {...restProps}
>
  {@render children?.()}
</div>
