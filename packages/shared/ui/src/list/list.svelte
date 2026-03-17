<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** List data */
    dataSource,
    /** Item render function */
    renderItem,
    /** Show border */
    bordered = false,
    /** Component size @values 'small', 'default', 'large' */
    size = 'default',
    /** Show divider between items */
    split = true,
    /** Loading state */
    loading = false,
    /** Grid layout config */
    grid,
    /** Pagination config @values object, boolean */
    pagination,
    children,
  }: {
    /** List data */
    dataSource: Str[];
    /** Item render function */
    renderItem: () => void;
    /** Show border */
    bordered?: Bool;
    /** Component size */
    size?: Str;
    /** Show divider between items */
    split?: Bool;
    /** Loading state */
    loading?: Bool;
    /** Grid layout config */
    grid: Record<Str, unknown>;
    /** Pagination config */
    pagination: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
