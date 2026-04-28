<script lang="ts">
  /**
   * RangeCalendarMonth Svelte component — column wrapper for
   * a single month inside the calendar (multi-month layouts
   * stack several of these horizontally).
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
  }: WithElementRef<HTMLAttributes<HTMLElement>> = $props();
</script>

<div {...restProps} bind:this={ref} class={cn('flex flex-col', className)}>
  {@render children?.()}
</div>
