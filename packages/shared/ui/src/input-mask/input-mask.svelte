<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Input value @values value */
    value,
    /** Format mask pattern @values mask */
    mask,
    /** Placeholder character @values '_' */
    slotChar = '_',
    /** Clear incomplete values on blur */
    autoClear = true,
    /** Return unmasked value */
    unmask = false,
    /** Disabled state */
    disabled = false,
    /** Placeholder text @values placeholder */
    placeholder,
    children,
  }: {
    /** Input value */
    value: Str;
    /** Format mask pattern */
    mask: Str;
    /** Placeholder character */
    slotChar?: Str;
    /** Clear incomplete values on blur */
    autoClear?: Bool;
    /** Return unmasked value */
    unmask?: Bool;
    /** Disabled state */
    disabled?: Bool;
    /** Placeholder text */
    placeholder: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
