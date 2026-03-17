<!-- @convert-to-lens -->
<script lang="ts">
  import type { Num } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Current value @values 0, 0, 10 */
    value = 0,
    /** Minimum value @values 0, 0, 10 */
    min = 0,
    /** Maximum value @values 0, 100, 200 */
    max = 100,
    /** Low threshold @values 0, 50, 100 */
    low,
    /** High threshold @values 0, 50, 100 */
    high,
    /** Optimal value @values 0, 50, 100 */
    optimum,
    children,
  }: {
    /** Current value */
    value?: Num;
    /** Minimum value */
    min?: Num;
    /** Maximum value */
    max?: Num;
    /** Low threshold */
    low: Num;
    /** High threshold */
    high: Num;
    /** Optimal value */
    optimum: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
