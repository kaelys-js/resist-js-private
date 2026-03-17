<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Current text value @values value */
    value,
    /** Initial text value @values defaultValue */
    defaultValue,
    /** Placeholder text @values placeholder */
    placeholder,
    /** Disabled state */
    disabled = false,
    /** Read-only state */
    readOnly = false,
    /** Maximum input length @values 0, 50, 100 */
    maxLength,
    /** How to submit edits @values 'enter', 'blur', 'both', 'none' */
    submitMode,
    /** How to enter edit mode @values 'click', 'dblclick', 'focus', 'none' */
    activationMode,
    /** Auto-resize input to content */
    autoResize = false,
    children,
  }: {
    /** Current text value */
    value: Str;
    /** Initial text value */
    defaultValue: Str;
    /** Placeholder text */
    placeholder: Str;
    /** Disabled state */
    disabled?: Bool;
    /** Read-only state */
    readOnly?: Bool;
    /** Maximum input length */
    maxLength: Num;
    /** How to submit edits */
    submitMode: Str;
    /** How to enter edit mode */
    activationMode: Str;
    /** Auto-resize input to content */
    autoResize?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
