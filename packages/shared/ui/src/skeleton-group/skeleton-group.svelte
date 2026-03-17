<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Layout preset @values 'card', 'list', 'article', 'profile', 'table' */
    variant = 'card',
    /** Number of skeleton groups @values 0, 1, 2 */
    count = 1,
    /** Animation enabled */
    animated = true,
    /** Include avatar circle */
    avatar = false,
    /** Number of text rows @values 0, 3, 6 */
    rows = 3,
    /** Include title bar */
    title = true,
    /** Paragraph config (rows, widths) */
    paragraph,
    children,
  }: {
    /** Layout preset */
    variant?: Str;
    /** Number of skeleton groups */
    count?: Num;
    /** Animation enabled */
    animated?: Bool;
    /** Include avatar circle */
    avatar?: Bool;
    /** Number of text rows */
    rows?: Num;
    /** Include title bar */
    title?: Bool;
    /** Paragraph config (rows, widths) */
    paragraph: Record<Str, unknown>;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
