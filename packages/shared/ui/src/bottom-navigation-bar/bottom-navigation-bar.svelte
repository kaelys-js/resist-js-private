<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Navigation items (icon, label, href) */
    items,
    /** Currently active item @values activeItem */
    activeItem,
    /** Visual variant @values 'default', 'bordered', 'pill' */
    variant = 'default',
    /** Show text labels */
    showLabels = true,
    children,
  }: {
    /** Navigation items (icon, label, href) */
    items: Str[];
    /** Currently active item */
    activeItem: Str;
    /** Visual variant */
    variant?: Str;
    /** Show text labels */
    showLabels?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
