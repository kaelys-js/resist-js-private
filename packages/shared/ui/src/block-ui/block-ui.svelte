<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Whether interaction is blocked */
    blocked = false,
    /** Block entire page */
    fullScreen = false,
    children,
  }: {
    /** Whether interaction is blocked */
    blocked?: Bool;
    /** Block entire page */
    fullScreen?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
