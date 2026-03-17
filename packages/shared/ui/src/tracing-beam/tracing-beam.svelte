<!-- @convert-to-lens -->
<script lang="ts">
  import type { Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Beam color @values color */
    color,
    /** Line width @values 0, 2, 4 */
    strokeWidth = 2,
    /** Additional CSS classes @values className */
    className,
    children,
  }: {
    /** Beam color */
    color: Str;
    /** Line width */
    strokeWidth?: Num;
    /** Additional CSS classes */
    className: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
