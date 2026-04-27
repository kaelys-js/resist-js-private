<script lang="ts">
  /**
   * ContextMenu shortcut — keyboard-shortcut hint text rendered
   * to the right of a context-menu item.
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
  }: WithElementRef<HTMLAttributes<HTMLSpanElement>> = $props();
</script>

<span
  bind:this={ref}
  data-slot="context-menu-shortcut"
  class={cn('text-muted-foreground ms-auto text-xs tracking-widest', className)}
  {...restProps}
>
  {@render children?.()}
</span>
