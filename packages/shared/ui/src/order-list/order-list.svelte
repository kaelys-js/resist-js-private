<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** List items */
    value,
    /** Selected items */
    selection,
    /** Enable drag and drop */
    dragdrop = false,
    /** Enable filtering */
    filter = false,
    /** Property to filter on @values filterBy */
    filterBy,
    /** Custom item renderer */
    itemTemplate,
    children,
  }: {
    /** List items */
    value: Str[];
    /** Selected items */
    selection: Str[];
    /** Enable drag and drop */
    dragdrop?: Bool;
    /** Enable filtering */
    filter?: Bool;
    /** Property to filter on */
    filterBy: Str;
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
