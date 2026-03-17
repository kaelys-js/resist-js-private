<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Selected values */
    value,
    /** Available options */
    options,
    /** Property for display text @values optionLabel */
    optionLabel,
    /** Property for value @values optionValue */
    optionValue,
    /** How selected values are shown @values 'comma', 'chip' */
    display,
    /** Placeholder text @values placeholder */
    placeholder,
    /** Show filter input */
    filter = false,
    /** Max labels before summary @values 0, 3, 6 */
    maxSelectedLabels = 3,
    /** Summary label @values '{0} items selected' */
    selectedItemsLabel = '{0} items selected',
    /** Maximum selections @values 0, 50, 100 */
    selectionLimit,
    /** Show select all checkbox */
    showSelectAll = true,
    /** Disabled state */
    disabled = false,
    children,
  }: {
    /** Selected values */
    value: Str[];
    /** Available options */
    options: Str[];
    /** Property for display text */
    optionLabel: Str;
    /** Property for value */
    optionValue: Str;
    /** How selected values are shown */
    display: Str;
    /** Placeholder text */
    placeholder: Str;
    /** Show filter input */
    filter?: Bool;
    /** Max labels before summary */
    maxSelectedLabels?: Num;
    /** Summary label */
    selectedItemsLabel?: Str;
    /** Maximum selections */
    selectionLimit: Num;
    /** Show select all checkbox */
    showSelectAll?: Bool;
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
