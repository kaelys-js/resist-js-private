<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Panel visibility */
    open,
    /** Initial open state */
    defaultOpen = false,
    /** Panel position @values { x: number, y: number } */
    position,
    /** Initial position @values { x: number, y: number } */
    defaultPosition,
    /** Panel size @values { width: number, height: number } */
    size,
    /** Initial size @values { width: number, height: number } */
    defaultSize,
    /** Minimum width @values 0, 50, 100 */
    minWidth,
    /** Minimum height @values 0, 50, 100 */
    minHeight,
    /** Maximum width @values 0, 50, 100 */
    maxWidth,
    /** Maximum height @values 0, 50, 100 */
    maxHeight,
    /** Allow dragging */
    draggable = true,
    /** Allow resizing */
    resizable = true,
    /** Lock width/height ratio */
    lockAspectRatio = false,
    /** Persist position/size */
    persistRect = false,
    /** Snap grid size @values 0, 1, 2 */
    gridSize = 1,
    children,
  }: {
    /** Panel visibility */
    open: Bool;
    /** Initial open state */
    defaultOpen?: Bool;
    /** Panel position */
    position: Str;
    /** Initial position */
    defaultPosition: Str;
    /** Panel size */
    size: Str;
    /** Initial size */
    defaultSize: Str;
    /** Minimum width */
    minWidth: Num;
    /** Minimum height */
    minHeight: Num;
    /** Maximum width */
    maxWidth: Num;
    /** Maximum height */
    maxHeight: Num;
    /** Allow dragging */
    draggable?: Bool;
    /** Allow resizing */
    resizable?: Bool;
    /** Lock width/height ratio */
    lockAspectRatio?: Bool;
    /** Persist position/size */
    persistRect?: Bool;
    /** Snap grid size */
    gridSize?: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
