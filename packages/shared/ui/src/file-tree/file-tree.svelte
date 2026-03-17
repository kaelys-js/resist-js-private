<!-- @convert-to-lens -->
<script lang="ts">
  import type { Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** File/folder tree data */
    data,
    /** Selected file ID @values selectedId */
    selectedId,
    /** Initially expanded folders @values string[] */
    defaultExpanded,
    children,
  }: {
    /** File/folder tree data */
    data: Str[];
    /** Selected file ID */
    selectedId: Str;
    /** Initially expanded folders */
    defaultExpanded: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
