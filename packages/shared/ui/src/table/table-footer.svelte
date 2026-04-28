<script lang="ts">
  /**
   * TableFooter Svelte component — `<tfoot>` section styled
   * with a muted background and top border for totals.
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
  }: WithElementRef<HTMLAttributes<HTMLTableSectionElement>> = $props();
</script>

<tfoot
  bind:this={ref}
  data-slot="table-footer"
  class={cn('bg-muted/50 border-t font-medium [&>tr]:last:border-b-0', className)}
  {...restProps}
>
  {@render children?.()}
</tfoot>
