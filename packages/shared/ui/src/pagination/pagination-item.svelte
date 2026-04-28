<script lang="ts">
  /**
   * Pagination.Item — `<li>` wrapper for a single
   * Pagination row. @module
   */
  import type { HTMLLiAttributes } from 'svelte/elements';
  import type { WithElementRef } from '../utils.js';

  let {
    ref = $bindable(null),
    children,
    ...restProps
  }: WithElementRef<HTMLLiAttributes> = $props();
</script>

<li bind:this={ref} data-slot="pagination-item" {...restProps}>
  {@render children?.()}
</li>
