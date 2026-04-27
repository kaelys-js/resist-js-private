<script lang="ts">
  /**
   * Header area of a dialog containing the title and optional description.
   *
   * Centers text on mobile and aligns to the start on larger screens.
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
  data-slot="dialog-header"
  class={cn('flex flex-col gap-2 text-center sm:text-start', className)}
  {...restProps}
>
  {@render children?.()}
</div>
