<script lang="ts">
  /**
   * Calendar months — outer flex container that holds one or more
   * `CalendarMonth` columns. Stacks column on mobile and row on
   * `md` and up.
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
  class={cn('relative flex flex-col gap-4 md:flex-row', className)}
  {...restProps}
>
  {@render children?.()}
</div>
