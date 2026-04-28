<script lang="ts">
  /**
   * SidebarMenuItem Svelte component — `<li>` wrapper inside
   * a SidebarMenu providing group/peer context for the
   * menu button and its action/badge children.
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
  }: WithElementRef<HTMLAttributes<HTMLLIElement>, HTMLLIElement> = $props();
</script>

<li
  bind:this={ref}
  data-slot="sidebar-menu-item"
  data-sidebar="menu-item"
  class={cn(
    'group/menu-item relative group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center',
    className,
  )}
  {...restProps}
>
  {@render children?.()}
</li>
