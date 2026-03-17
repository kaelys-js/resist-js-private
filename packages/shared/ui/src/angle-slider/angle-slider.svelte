<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Current angle value @values 0, 50, 100 */
    value,
    /** Initial angle value @values 0, 50, 100 */
    defaultValue,
    /** Minimum angle @values 0, 0, 10 */
    min = 0,
    /** Maximum angle @values 0, 360, 720 */
    max = 360,
    /** Step increment @values 0, 1, 2 */
    step = 1,
    /** Disabled state */
    disabled = false,
    children,
  }: {
    /** Current angle value */
    value: Num;
    /** Initial angle value */
    defaultValue: Num;
    /** Minimum angle */
    min?: Num;
    /** Maximum angle */
    max?: Num;
    /** Step increment */
    step?: Num;
    /** Disabled state */
    disabled?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
