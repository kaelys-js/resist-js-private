<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** HTML content @values value */
    value,
    /** Placeholder text @values placeholder */
    placeholder,
    /** Read-only mode */
    readOnly = false,
    /** Editor modules/extensions */
    modules,
    /** Editor theme @values theme */
    theme,
    children,
  }: {
    /** HTML content */
    value: Str;
    /** Placeholder text */
    placeholder: Str;
    /** Read-only mode */
    readOnly?: Bool;
    /** Editor modules/extensions */
    modules: Record<Str, unknown>;
    /** Editor theme */
    theme: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
