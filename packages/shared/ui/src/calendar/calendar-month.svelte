<script lang="ts">
  /**
   * Calendar month — column container for a single month inside
   * the multi-month calendar layout. Wraps a flex-column `<div>`.
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
