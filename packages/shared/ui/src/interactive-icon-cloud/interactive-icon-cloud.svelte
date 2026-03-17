<!-- @convert-to-lens -->
<script lang="ts">
  import type { Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Icon slugs (Simple Icons) @values string[] */
    icons,
    /** Custom image URLs @values string[] */
    images,
    /** Cloud diameter @values 0, 600, 1200 */
    size = 600,
    /** Rotation speed @values 0, 1, 2 */
    speed = 1,
    /** 3D depth factor @values 0, 1, 2 */
    depth = 1,
    children,
  }: {
    /** Icon slugs (Simple Icons) */
    icons: Str;
    /** Custom image URLs */
    images: Str;
    /** Cloud diameter */
    size?: Num;
    /** Rotation speed */
    speed?: Num;
    /** 3D depth factor */
    depth?: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
