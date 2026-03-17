<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Notification items (icon, title, description, time) */
    notifications,
    /** Max visible notifications @values 0, 5, 10 */
    limit = 5,
    /** Animate entry/exit */
    animated = true,
    children,
  }: {
    /** Notification items (icon, title, description, time) */
    notifications: Str[];
    /** Max visible notifications */
    limit?: Num;
    /** Animate entry/exit */
    animated?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
