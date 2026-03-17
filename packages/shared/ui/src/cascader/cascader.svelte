<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Hierarchical options data */
    options,
    /** Selected path @values string[] */
    value,
    /** Placeholder text @values placeholder */
    placeholder,
    /** Multiple selection */
    multiple = false,
    /** Enable search filtering */
    showSearch = false,
    /** Async child loading */
    loadData,
    /** Allow partial path selection */
    changeOnSelect = false,
    /** Expand trigger @values 'click', 'hover' */
    expandTrigger = 'click',
    children,
  }: {
    /** Hierarchical options data */
    options: Str[];
    /** Selected path */
    value: Str;
    /** Placeholder text */
    placeholder: Str;
    /** Multiple selection */
    multiple?: Bool;
    /** Enable search filtering */
    showSearch?: Bool;
    /** Async child loading */
    loadData: () => void;
    /** Allow partial path selection */
    changeOnSelect?: Bool;
    /** Expand trigger */
    expandTrigger?: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
