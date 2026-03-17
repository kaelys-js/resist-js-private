<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Watermark text @values string, string[] */
    content,
    /** Watermark image URL @values image */
    image,
    /** Single mark width @values 0, 120, 240 */
    width = 120,
    /** Single mark height @values 0, 64, 128 */
    height = 64,
    /** Rotation angle @values 0, 50, 100 */
    rotate,
    /** Spacing between marks @values [number, number] */
    gap,
    /** Position offset @values [number, number] */
    offset,
    /** Font style (color, size, weight, family) */
    font,
    /** Stack order @values 0, 9, 18 */
    zIndex = 9,
    /** Inherit parent font */
    inherit = false,
    children,
  }: {
    /** Watermark text */
    content: Str;
    /** Watermark image URL */
    image: Str;
    /** Single mark width */
    width?: Num;
    /** Single mark height */
    height?: Num;
    /** Rotation angle */
    rotate?: Num;
    /** Spacing between marks */
    gap?: Str;
    /** Position offset */
    offset: Str;
    /** Font style (color, size, weight, family) */
    font: Record<Str, unknown>;
    /** Stack order */
    zIndex?: Num;
    /** Inherit parent font */
    inherit?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
