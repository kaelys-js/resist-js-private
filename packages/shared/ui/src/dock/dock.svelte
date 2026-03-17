<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Navigation items with title, icon, href */
    items,
    /** Default icon size @values 0, 40, 80 */
    iconSize = 40,
    /** Magnified icon size on hover @values 0, 60, 120 */
    iconMagnification = 60,
    /** Magnification trigger distance @values 0, 140, 280 */
    iconDistance = 140,
    /** Icon alignment @values 'top', 'middle', 'bottom' */
    direction = 'middle',
    /** Dock position @values 'top', 'bottom', 'left', 'right' */
    position = 'bottom',
    /** Enable magnification (PrimeReact/PrimeVue) */
    magnification = true,
    children,
  }: {
    /** Navigation items with title, icon, href */
    items: Str[];
    /** Default icon size */
    iconSize?: Num;
    /** Magnified icon size on hover */
    iconMagnification?: Num;
    /** Magnification trigger distance */
    iconDistance?: Num;
    /** Icon alignment */
    direction?: Str;
    /** Dock position */
    position?: Str;
    /** Enable magnification (PrimeReact/PrimeVue) */
    magnification?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
