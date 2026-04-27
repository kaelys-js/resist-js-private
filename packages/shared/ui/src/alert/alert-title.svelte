<script lang="ts">
  /**
   * Alert title — heading at the top of the alert content.
   * Renders a `<div>` with line-clamp-1 / medium-weight styling
   * and the `data-slot="alert-title"` selector.
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
  data-slot="alert-title"
  class={cn('col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight', className)}
  {...restProps}
>
  {@render children?.()}
</div>
