<script lang="ts">
  /**
   * Command shortcut — keyboard-shortcut hint text rendered to
   * the right of a command item. Uses muted-foreground / tracking
   * styling and the `data-slot="command-shortcut"` selector.
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
  data-slot="command-shortcut"
  class={cn('text-muted-foreground ms-auto text-xs tracking-widest', className)}
  {...restProps}
>
  {@render children?.()}
</span>
