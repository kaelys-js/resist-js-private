<script lang="ts">
  /**
   * Empty.Content — column wrapper that stacks a `Title`,
   * `Description`, and any action elements within an Empty
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
  data-slot="empty-content"
  class={cn(
    'flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance',
    className,
  )}
  {...restProps}
>
  {@render children?.()}
</div>
