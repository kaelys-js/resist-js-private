<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Selected value @values value */
    value,
    /** Initial selection @values defaultValue */
    defaultValue,
    /** Disabled state */
    disabled = false,
    /** Layout direction @values 'horizontal', 'vertical' */
    orientation = 'horizontal',
    /** Form field name @values name */
    name,
    children,
  }: {
    /** Selected value */
    value: Str;
    /** Initial selection */
    defaultValue: Str;
    /** Disabled state */
    disabled?: Bool;
    /** Layout direction */
    orientation?: Str;
    /** Form field name */
    name: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
