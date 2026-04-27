<script lang="ts">
  /**
   * AlertDialog header — flex column container for the title +
   * description at the top of the alert dialog content.
   * Center-aligned on mobile and start-aligned on `sm` and up.
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
  data-slot="alert-dialog-header"
  class={cn('flex flex-col gap-2 text-center sm:text-start', className)}
  {...restProps}
>
  {@render children?.()}
</div>
