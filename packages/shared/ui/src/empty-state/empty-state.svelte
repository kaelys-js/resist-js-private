<!-- @convert-to-lens -->
<script lang="ts">
  import type { Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Title text @values title */
    title,
    /** Description text @values description */
    description,
    children,
  }: {
    /** Title text */
    title: Str;
    /** Description text */
    description: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
