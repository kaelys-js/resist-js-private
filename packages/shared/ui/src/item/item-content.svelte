<script lang="ts">
  /**
   * Item.Content — primary content column for an `Item` row,
   * stacks `Title` and `Description` between `Media` and
   * `Actions`.
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
  data-slot="item-content"
  class={cn('flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none', className)}
  {...restProps}
>
  {@render children?.()}
</div>
