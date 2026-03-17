<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Menu items */
    items,
    /** Open trigger @values 'click', 'hover', 'contextMenu' */
    trigger = 'click',
    /** Menu position @values 'bottomLeft' */
    placement = 'bottomLeft',
    /** Disabled state */
    disabled = false,
    /** Show arrow pointer */
    arrow = false,
    /** Controlled open state */
    open,
    /** Unmount on close */
    destroyPopupOnHide = false,
    children,
  }: {
    /** Menu items */
    items: Str[];
    /** Open trigger */
    trigger?: Str;
    /** Menu position */
    placement?: Str;
    /** Disabled state */
    disabled?: Bool;
    /** Show arrow pointer */
    arrow?: Bool;
    /** Controlled open state */
    open: Bool;
    /** Unmount on close */
    destroyPopupOnHide?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
