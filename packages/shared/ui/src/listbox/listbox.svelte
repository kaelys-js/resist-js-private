<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** List items */
    items,
    /** Selected value(s) @values string, string[] */
    value,
    /** Initial selection @values string, string[] */
    defaultValue,
    /** Item collection (Ark UI) @values ListCollection<T> */
    collection,
    /** Selection behavior @values 'none', 'single', 'multiple', 'extended' */
    selectionMode,
    /** Allow multiple selections */
    multiple = false,
    /** Show filter input */
    filter = false,
    /** Disabled state */
    disabled = false,
    /** Loop keyboard navigation */
    loopFocus = false,
    /** Virtual scrolling (HeroUI) */
    isVirtualized = false,
    /** Layout orientation @values 'horizontal', 'vertical' */
    orientation = 'vertical',
    /** Type-to-find (Skeleton) */
    typeahead = true,
    children,
  }: {
    /** List items */
    items: Str[];
    /** Selected value(s) */
    value: Str;
    /** Initial selection */
    defaultValue: Str;
    /** Item collection (Ark UI) */
    collection: Str;
    /** Selection behavior */
    selectionMode: Str;
    /** Allow multiple selections */
    multiple?: Bool;
    /** Show filter input */
    filter?: Bool;
    /** Disabled state */
    disabled?: Bool;
    /** Loop keyboard navigation */
    loopFocus?: Bool;
    /** Virtual scrolling (HeroUI) */
    isVirtualized?: Bool;
    /** Layout orientation */
    orientation?: Str;
    /** Type-to-find (Skeleton) */
    typeahead?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
