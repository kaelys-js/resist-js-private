<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Current tags @values string[] */
    value,
    /** Initial tags @values string[] */
    defaultValue,
    /** Parse pasted text into tags */
    addOnPaste = false,
    /** Tag separator @values string, RegExp */
    delimiter = ',',
    /** Maximum tags @values 0, 50, 100 */
    max,
    /** Allow duplicate values */
    allowDuplicates = false,
    /** Edit existing tags inline */
    editable = false,
    /** Validation before adding */
    validate,
    /** Disabled state */
    disabled = false,
    /** Input placeholder @values placeholder */
    placeholder,
    /** Behavior on blur @values 'clear', 'add' */
    blurBehavior = 'clear',
    children,
  }: {
    /** Current tags */
    value: Str;
    /** Initial tags */
    defaultValue?: Str;
    /** Parse pasted text into tags */
    addOnPaste?: Bool;
    /** Tag separator */
    delimiter?: Str;
    /** Maximum tags */
    max?: Num;
    /** Allow duplicate values */
    allowDuplicates?: Bool;
    /** Edit existing tags inline */
    editable?: Bool;
    /** Validation before adding */
    validate: () => void;
    /** Disabled state */
    disabled?: Bool;
    /** Input placeholder */
    placeholder: Str;
    /** Behavior on blur */
    blurBehavior?: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
