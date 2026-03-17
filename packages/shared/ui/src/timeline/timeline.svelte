<!-- @convert-to-lens -->
<script lang="ts">
  import type { Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Timeline events */
    value,
    /** Orientation @values 'vertical', 'horizontal' */
    layout = 'vertical',
    /** Content alignment @values 'left', 'right', 'alternate' */
    align = 'left',
    children,
  }: {
    /** Timeline events */
    value: Str[];
    /** Orientation */
    layout?: Str;
    /** Content alignment */
    align?: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
