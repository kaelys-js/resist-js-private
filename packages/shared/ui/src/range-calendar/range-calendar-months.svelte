<script lang="ts">
  /**
   * RangeCalendarMonths Svelte component — flex container
   * that horizontally arranges one or more `RangeCalendarMonth`
   * children.
   *
   * @module
   */
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn, type WithElementRef } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
  bind:this={ref}
  class={cn('relative flex flex-col gap-4 md:flex-row', className)}
  {...restProps}
>
  {@render children?.()}
</div>
