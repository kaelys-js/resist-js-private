<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Menu item definitions */
    items,
    /** Display mode @values 'vertical', 'horizontal', 'inline' */
    mode = 'vertical',
    /** Selected items @values string[] */
    selectedKeys,
    /** Open submenus @values string[] */
    openKeys,
    /** Color theme @values 'light', 'dark' */
    theme = 'light',
    /** Icon-only mode */
    collapsed = false,
    /** Enable selection */
    selectable = true,
    children,
  }: {
    /** Menu item definitions */
    items: Str[];
    /** Display mode */
    mode?: Str;
    /** Selected items */
    selectedKeys: Str;
    /** Open submenus */
    openKeys: Str;
    /** Color theme */
    theme?: Str;
    /** Icon-only mode */
    collapsed?: Bool;
    /** Enable selection */
    selectable?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
