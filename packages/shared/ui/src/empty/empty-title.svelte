<script lang="ts">
  /**
   * Empty.Title — primary heading line for an Empty
   * placeholder.
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
  data-slot="empty-title"
  class={cn('text-lg font-medium tracking-tight', className)}
  {...restProps}
>
  {@render children?.()}
</div>
