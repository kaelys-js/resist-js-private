<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Controlled open state */
    open,
    /** Snap positions (fractions or CSS values) @values (number, string)[] */
    snapPoints,
    /** Current snap point @values number, string */
    activeSnapPoint,
    /** Snap index to start overlay fade @values 0, 50, 100 */
    fadeFromIndex,
    /** Scale background content */
    shouldScaleBackground = false,
    /** Modal mode */
    modal = true,
    /** Can be swiped away */
    dismissible = true,
    /** Drawer direction @values 'top', 'bottom', 'left', 'right' */
    direction = 'bottom',
    /** Nested drawer mode */
    nested = false,
    /** Skip body scroll lock */
    noBodyStyles = false,
    children,
  }: {
    /** Controlled open state */
    open: Bool;
    /** Snap positions (fractions or CSS values) */
    snapPoints: Str;
    /** Current snap point */
    activeSnapPoint: Str;
    /** Snap index to start overlay fade */
    fadeFromIndex: Num;
    /** Scale background content */
    shouldScaleBackground?: Bool;
    /** Modal mode */
    modal?: Bool;
    /** Can be swiped away */
    dismissible?: Bool;
    /** Drawer direction */
    direction?: Str;
    /** Nested drawer mode */
    nested?: Bool;
    /** Skip body scroll lock */
    noBodyStyles?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
