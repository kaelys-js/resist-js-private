<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** All available items */
    dataSource,
    /** Keys in target list @values string[] */
    targetKeys,
    /** Column titles @values string[] */
    titles,
    /** Item render function */
    render,
    /** Enable search */
    showSearch = false,
    /** One-direction only */
    oneWay = false,
    /** Pagination config @values boolean, object */
    pagination,
    children,
  }: {
    /** All available items */
    dataSource: Str[];
    /** Keys in target list */
    targetKeys: Str;
    /** Column titles */
    titles: Str;
    /** Item render function */
    render: () => void;
    /** Enable search */
    showSearch?: Bool;
    /** One-direction only */
    oneWay?: Bool;
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
