<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Rendered element @values 'span' */
    as = 'span',
    /** Visible on focus */
    focusable = false,
    children,
  }: {
    /** Rendered element */
    as?: Str;
    /** Visible on focus */
    focusable?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
