<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Notification title @values title */
    title,
    /** Body content @values string, element */
    description,
    /** Notification type @values 'info', 'success', 'warning', 'error' */
    type = 'info',
    /** Screen position @values 'topRight' */
    placement = 'topRight',
    /** Auto-close time (seconds, null = persistent) @values 0, 50, 100 */
    duration = 4.5,
    /** Show close button */
    closable = true,
    children,
  }: {
    /** Notification title */
    title: Str;
    /** Body content */
    description: Str;
    /** Notification type */
    type?: Str;
    /** Screen position */
    placement?: Str;
    /** Auto-close time (seconds, null = persistent) */
    duration?: Num;
    /** Show close button */
    closable?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
