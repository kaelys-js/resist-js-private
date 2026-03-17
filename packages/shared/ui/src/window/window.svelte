<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Window title @values title */
    title,
    /** Enable dragging */
    draggable = true,
    /** Enable resizing */
    resizable = true,
    /** Show minimize button */
    minimizable = true,
    /** Show maximize button */
    maximizable = true,
    /** Show close button */
    closable = true,
    /** Initial position (x, y) */
    position,
    /** Initial size (width, height) */
    size,
    /** Minimum width @values 0, 50, 100 */
    minWidth,
    /** Minimum height @values 0, 50, 100 */
    minHeight,
    children,
  }: {
    /** Window title */
    title: Str;
    /** Enable dragging */
    draggable?: Bool;
    /** Enable resizing */
    resizable?: Bool;
    /** Show minimize button */
    minimizable?: Bool;
    /** Show maximize button */
    maximizable?: Bool;
    /** Show close button */
    closable?: Bool;
    /** Initial position (x, y) */
    position: Record<Str, unknown>;
    /** Initial size (width, height) */
    size: Record<Str, unknown>;
    /** Minimum width */
    minWidth: Num;
    /** Minimum height */
    minHeight: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
