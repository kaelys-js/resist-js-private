<!-- @convert-to-lens -->
<script lang="ts">
  import type { Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Visual type @values 'primary', 'default' */
    type = 'default',
    /** Button shape @values 'circle', 'square' */
    shape = 'circle',
    /** Tooltip text @values tooltip */
    tooltip,
    /** Link URL @values href */
    href,
    /** Badge config */
    badge,
    /** Position styles */
    style,
    children,
  }: {
    /** Visual type */
    type?: Str;
    /** Button shape */
    shape?: Str;
    /** Tooltip text */
    tooltip: Str;
    /** Link URL */
    href: Str;
    /** Badge config */
    badge: Record<Str, unknown>;
    /** Position styles */
    style: Record<Str, unknown>;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
