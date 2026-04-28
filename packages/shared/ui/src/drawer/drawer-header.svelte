<script lang="ts">
  /**
   * Drawer header — flex-column container for the drawer title
   * and description at the top of the drawer content.
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
  data-slot="drawer-header"
  class={cn('flex flex-col gap-1.5 p-4', className)}
  {...restProps}
>
  {@render children?.()}
</div>
