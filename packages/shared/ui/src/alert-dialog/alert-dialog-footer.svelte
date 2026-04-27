<script lang="ts">
  /**
   * AlertDialog footer — flex container for the action / cancel
   * buttons at the bottom of the alert dialog content. Stacks
   * column-reverse on mobile and row-justify-end on `sm` and up.
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
  data-slot="alert-dialog-footer"
  class={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
  {...restProps}
>
  {@render children?.()}
</div>
