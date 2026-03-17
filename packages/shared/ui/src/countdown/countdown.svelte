<!-- @convert-to-lens -->
<script lang="ts">
  import type { Num } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Current countdown value (0-999) @values 0, 50, 100 */
    value,
    /** Minimum digits to display @values 0, 50, 100 */
    digits,
    children,
  }: {
    /** Current countdown value (0-999) */
    value: Num;
    /** Minimum digits to display */
    digits: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
