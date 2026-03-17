<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Primary button label @values label */
    label,
    /** Dropdown menu items */
    model,
    /** Button color variant @values severity */
    severity,
    /** Disabled state */
    disabled = false,
    children,
  }: {
    /** Primary button label */
    label: Str;
    /** Dropdown menu items */
    model: Str[];
    /** Button color variant */
    severity: Str;
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
