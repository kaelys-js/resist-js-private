<!-- @convert-to-lens -->
<script lang="ts">
  import type { Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** CSS position @values 'fixed' */
    position = 'fixed',
    /** Navigation style @values 'default', 'border', 'application', 'pagination', 'group', 'card' */
    navType = 'default',
    /** Currently active URL @values activeUrl */
    activeUrl,
    children,
  }: {
    /** CSS position */
    position?: Str;
    /** Navigation style */
    navType?: Str;
    /** Currently active URL */
    activeUrl: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
