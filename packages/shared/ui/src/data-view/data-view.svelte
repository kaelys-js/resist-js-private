<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Data items */
    value,
    /** Display layout @values 'list', 'grid' */
    layout,
    /** Enable pagination */
    paginator = false,
    /** Items per page @values 0, 50, 100 */
    rows,
    /** Sort field @values sortField */
    sortField,
    /** Sort direction @values 0, 50, 100 */
    sortOrder,
    /** Server-side mode */
    lazy = false,
    /** Custom item renderer */
    itemTemplate,
    children,
  }: {
    /** Data items */
    value: Str[];
    /** Display layout */
    layout: Str;
    /** Enable pagination */
    paginator?: Bool;
    /** Items per page */
    rows: Num;
    /** Sort field */
    sortField: Str;
    /** Sort direction */
    sortOrder: Num;
    /** Server-side mode */
    lazy?: Bool;
    /** Custom item renderer */
    itemTemplate: () => void;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
