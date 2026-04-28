<script lang="ts">
  /**
   * SidebarInset Svelte component — main-content wrapper that
   * sits next to the Sidebar and adapts its layout when the
   * sidebar collapses or hides on mobile.
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
  }: WithElementRef<HTMLAttributes<HTMLElement>> = $props();
</script>

<main
  bind:this={ref}
  data-slot="sidebar-inset"
  class={cn(
    'bg-background relative flex min-w-0 w-full flex-1 flex-col',
    'md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ms-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ms-2',
    className,
  )}
  {...restProps}
>
  {@render children?.()}
</main>
