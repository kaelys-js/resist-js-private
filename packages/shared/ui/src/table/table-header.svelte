<script lang="ts">
  /**
   * TableHeader Svelte component — `<thead>` row group
   * styled with bottom-bordered rows.
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

<thead
  bind:this={ref}
  data-slot="table-header"
  class={cn('[&_tr]:border-b', className)}
  {...restProps}
>
  {@render children?.()}
</thead>
