<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Input value @values value */
    value,
    /** Current input text @values inputValue */
    inputValue,
    /** Suggestion items */
    items,
    /** Selected item key @values selectedKey */
    selectedKey,
    /** Initial selected item @values defaultSelectedKey */
    defaultSelectedKey,
    /** Suggestion list (PrimeReact/PrimeVue) */
    suggestions,
    /** Object property to display @values field */
    field,
    /** Allow multiple selections */
    multiple = false,
    /** Show dropdown trigger button */
    dropdown = false,
    /** Require selection from suggestions */
    forceSelection = false,
    /** Minimum input length to trigger suggestions @values 0, 1, 2 */
    minLength = 1,
    /** Debounce delay in ms @values 0, 300, 600 */
    delay = 300,
    /** Search/filter function */
    completeMethod,
    /** When to show suggestions (HeroUI) @values 'focus', 'input', 'manual' */
    menuTrigger,
    /** Allow values not in the list */
    allowsCustomValue = false,
    /** Show clear button */
    isClearable = true,
    /** Visual style (HeroUI) @values 'flat', 'bordered', 'faded', 'underlined' */
    variant,
    /** Virtual scrolling config */
    virtualScrollerOptions,
    children,
  }: {
    /** Input value */
    value: Str;
    /** Current input text */
    inputValue: Str;
    /** Suggestion items */
    items: Str[];
    /** Selected item key */
    selectedKey: Str;
    /** Initial selected item */
    defaultSelectedKey: Str;
    /** Suggestion list (PrimeReact/PrimeVue) */
    suggestions: Str[];
    /** Object property to display */
    field: Str;
    /** Allow multiple selections */
    multiple?: Bool;
    /** Show dropdown trigger button */
    dropdown?: Bool;
    /** Require selection from suggestions */
    forceSelection?: Bool;
    /** Minimum input length to trigger suggestions */
    minLength?: Num;
    /** Debounce delay in ms */
    delay?: Num;
    /** Search/filter function */
    completeMethod: () => void;
    /** When to show suggestions (HeroUI) */
    menuTrigger: Str;
    /** Allow values not in the list */
    allowsCustomValue?: Bool;
    /** Show clear button */
    isClearable?: Bool;
    /** Visual style (HeroUI) */
    variant: Str;
    /** Virtual scrolling config */
    virtualScrollerOptions: Record<Str, unknown>;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
