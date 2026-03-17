<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Tree node data */
    data,
    /** Expanded node keys @values string[] */
    expandedKeys,
    /** Selected node keys @values string[] */
    selectedKeys,
    /** Selection behavior @values 'single', 'multiple', 'checkbox' */
    selectionMode = 'single',
    /** Enable search filtering */
    filter = false,
    /** Enable drag and drop */
    dragDrop = false,
    /** Loading state */
    loading = false,
    /** Virtualized rendering */
    virtualScroll = false,
    children,
  }: {
    /** Tree node data */
    data: Str[];
    /** Expanded node keys */
    expandedKeys: Str;
    /** Selected node keys */
    selectedKeys: Str;
    /** Selection behavior */
    selectionMode?: Str;
    /** Enable search filtering */
    filter?: Bool;
    /** Enable drag and drop */
    dragDrop?: Bool;
    /** Loading state */
    loading?: Bool;
    /** Virtualized rendering */
    virtualScroll?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
