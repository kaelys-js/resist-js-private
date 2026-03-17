<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Selected value(s) @values string, string[] */
    value,
    /** Initial selected value(s) @values string, string[] */
    defaultValue,
    /** Current search text @values inputValue */
    inputValue,
    /** Item collection (Ark UI) @values ListCollection<T> */
    collection,
    /** Allow multiple selections */
    multiple = false,
    /** Allow typing custom values */
    allowCustomValue = false,
    /** Open dropdown on input click */
    openOnClick = false,
    /** Open dropdown on input change */
    openOnChange = true,
    /** Auto-completion mode @values 'none', 'autohighlight', 'autocomplete' */
    inputBehavior = 'none',
    /** Input behavior after selection @values 'clear', 'replace', 'preserve' */
    selectionBehavior = 'replace',
    /** Close after selecting */
    closeOnSelect,
    /** Loop keyboard navigation */
    loopFocus = true,
    /** Disabled state */
    disabled = false,
    /** Placeholder text @values placeholder */
    placeholder,
    /** Custom filter function (Melt UI) */
    filterFunction,
    children,
  }: {
    /** Selected value(s) */
    value: Str;
    /** Initial selected value(s) */
    defaultValue: Str;
    /** Current search text */
    inputValue: Str;
    /** Item collection (Ark UI) */
    collection: Str;
    /** Allow multiple selections */
    multiple?: Bool;
    /** Allow typing custom values */
    allowCustomValue?: Bool;
    /** Open dropdown on input click */
    openOnClick?: Bool;
    /** Open dropdown on input change */
    openOnChange?: Bool;
    /** Auto-completion mode */
    inputBehavior?: Str;
    /** Input behavior after selection */
    selectionBehavior?: Str;
    /** Close after selecting */
    closeOnSelect: Bool;
    /** Loop keyboard navigation */
    loopFocus?: Bool;
    /** Disabled state */
    disabled?: Bool;
    /** Placeholder text */
    placeholder: Str;
    /** Custom filter function (Melt UI) */
    filterFunction: () => void;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
