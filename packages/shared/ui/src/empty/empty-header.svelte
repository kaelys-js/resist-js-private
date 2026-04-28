<script lang="ts">
  /**
   * Empty.Header — top-aligned header slot for an Empty
   * placeholder, typically wrapping `Empty.Media` and
   * `Empty.Title`.
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
  data-slot="empty-header"
  class={cn('flex max-w-sm flex-col items-center gap-2 text-center', className)}
  {...restProps}
>
  {@render children?.()}
</div>
