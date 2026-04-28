<script lang="ts">
  /**
   * SheetFooter Svelte component — footer region pinned to
   * the bottom of the sheet panel for action buttons.
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
  data-slot="sheet-footer"
  class={cn('mt-auto flex flex-col gap-2 p-4', className)}
  {...restProps}
>
  {@render children?.()}
</div>
