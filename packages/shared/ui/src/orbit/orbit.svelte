<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Orbit radius @values 0, 160, 320 */
    radius = 160,
    /** Full orbit duration (seconds) @values 0, 20, 40 */
    duration = 20,
    /** Reverse rotation direction */
    reverse = false,
    /** Animation delay @values 0, 0, 10 */
    delay = 0,
    /** Show orbit path ring */
    path = true,
    children,
  }: {
    /** Orbit radius */
    radius?: Num;
    /** Full orbit duration (seconds) */
    duration?: Num;
    /** Reverse rotation direction */
    reverse?: Bool;
    /** Animation delay */
    delay?: Num;
    /** Show orbit path ring */
    path?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
