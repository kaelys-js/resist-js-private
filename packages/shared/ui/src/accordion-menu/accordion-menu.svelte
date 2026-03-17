<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Menu item definitions (label, icon, children) */
    items,
    /** Initially expanded sections @values string[] */
    defaultExpandedKeys,
    /** Allow multiple open sections */
    multiple = false,
    /** Chevron position @values 'start', 'end' */
    iconPosition = 'end',
    children,
  }: {
    /** Menu item definitions (label, icon, children) */
    items: Str[];
    /** Initially expanded sections */
    defaultExpandedKeys: Str;
    /** Allow multiple open sections */
    multiple?: Bool;
    /** Chevron position */
    iconPosition?: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
