<!-- @convert-to-lens -->
<script lang="ts">
  import type { Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Left or right alignment @values 'start', 'end' */
    alignment,
    /** Bubble color @values color */
    color,
    children,
  }: {
    /** Left or right alignment */
    alignment: Str;
    /** Bubble color */
    color: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
