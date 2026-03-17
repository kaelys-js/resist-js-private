<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Selected value(s) @values string, string[] */
    value,
    /** Tree option data */
    options,
    /** Selection mode @values 'single', 'multiple', 'checkbox' */
    selectionMode = 'single',
    /** Enable search */
    filter = false,
    /** Placeholder text @values placeholder */
    placeholder,
    /** Disabled state */
    disabled = false,
    /** Expanded node keys */
    expandedKeys,
    /** Require meta key for multi-select */
    metaKeySelection = false,
    children,
  }: {
    /** Selected value(s) */
    value: Str;
    /** Tree option data */
    options: Str[];
    /** Selection mode */
    selectionMode?: Str;
    /** Enable search */
    filter?: Bool;
    /** Placeholder text */
    placeholder: Str;
    /** Disabled state */
    disabled?: Bool;
    /** Expanded node keys */
    expandedKeys: Record<Str, unknown>;
    /** Require meta key for multi-select */
    metaKeySelection?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
