<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Button options (label, value, icon) */
    options,
    /** Selected value @values value */
    value,
    /** Stretch to fill container */
    fullWidth = false,
    /** Button size @values 'sm', 'md', 'lg' */
    size = 'md',
    children,
  }: {
    /** Button options (label, value, icon) */
    options: Str[];
    /** Selected value */
    value: Str;
    /** Stretch to fill container */
    fullWidth?: Bool;
    /** Button size */
    size?: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
