<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Selected value @values any */
    value,
    /** Hierarchical options */
    options,
    /** Property for display text @values optionLabel */
    optionLabel,
    /** Property for value @values optionValue */
    optionValue,
    /** Property for group label @values optionGroupLabel */
    optionGroupLabel,
    /** Property for child options @values string[] */
    optionGroupChildren,
    /** Placeholder text @values placeholder */
    placeholder,
    /** Disabled state */
    disabled = false,
    children,
  }: {
    /** Selected value */
    value: Str;
    /** Hierarchical options */
    options: Str[];
    /** Property for display text */
    optionLabel: Str;
    /** Property for value */
    optionValue: Str;
    /** Property for group label */
    optionGroupLabel: Str;
    /** Property for child options */
    optionGroupChildren: Str;
    /** Placeholder text */
    placeholder: Str;
    /** Disabled state */
    disabled?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
