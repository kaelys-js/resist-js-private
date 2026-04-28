<!-- @convert-to-lens -->
<script lang="ts">
  /**
   * Table root Svelte component — `<table>` element wrapped
   * in a horizontally-scrollable overflow container.
   *
   * @module
   */
  import type { HTMLTableAttributes } from 'svelte/elements';
  import { cn, type WithElementRef } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLTableAttributes> = $props();
</script>

<div data-slot="table-container" class="relative w-full overflow-x-auto">
  <table
    bind:this={ref}
    data-slot="table"
    class={cn('w-full caption-bottom text-sm', className)}
    {...restProps}
  >
    {@render children?.()}
  </table>
</div>
