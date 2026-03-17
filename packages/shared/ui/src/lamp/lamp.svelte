<!-- @convert-to-lens -->
<script lang="ts">
  import type { Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Light color @values 'cyan' */
    color = 'cyan',
    /** Light cone width @values '50%' */
    width = '50%',
    /** Animation delay @values 0, 50, 100 */
    delay = 0.5,
    children,
  }: {
    /** Light color */
    color?: Str;
    /** Light cone width */
    width?: Str;
    /** Animation delay */
    delay?: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
