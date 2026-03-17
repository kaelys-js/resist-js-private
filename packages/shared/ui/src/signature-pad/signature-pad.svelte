<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Signature data (Data URL or SVG) @values value */
    value,
    /** Disabled state */
    disabled = false,
    /** Drawing options (color, width, smoothing) */
    drawing,
    /** Output format @values 'image/png', 'image/svg+xml' */
    format = 'image/png',
    children,
  }: {
    /** Signature data (Data URL or SVG) */
    value: Str;
    /** Disabled state */
    disabled?: Bool;
    /** Drawing options (color, width, smoothing) */
    drawing: Record<Str, unknown>;
    /** Output format */
    format?: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
