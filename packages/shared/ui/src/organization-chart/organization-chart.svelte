<!-- @convert-to-lens -->
<script lang="ts">
  import type { Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Org chart data @values TreeNode[] */
    value,
    /** Node selection mode @values 'single', 'multiple' */
    selectionMode,
    /** Selected node(s) @values any */
    selection,
    /** Custom node renderer */
    nodeTemplate,
    children,
  }: {
    /** Org chart data */
    value: Str;
    /** Node selection mode */
    selectionMode: Str;
    /** Selected node(s) */
    selection: Str;
    /** Custom node renderer */
    nodeTemplate: () => void;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
