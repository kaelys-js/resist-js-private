<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Position @values 'top', 'bottom' */
    type = 'top',
    /** Visibility */
    open = true,
    /** Can be dismissed */
    dismissable = true,
    children,
  }: {
    /** Position */
    type?: Str;
    /** Visibility */
    open?: Bool;
    /** Can be dismissed */
    dismissable?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
