<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Panel header content @values string, ReactNode */
    header,
    /** Can be collapsed */
    toggleable = false,
    /** Collapsed state */
    collapsed = false,
    children,
  }: {
    /** Panel header content */
    header: Str;
    /** Can be collapsed */
    toggleable?: Bool;
    /** Collapsed state */
    collapsed?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
