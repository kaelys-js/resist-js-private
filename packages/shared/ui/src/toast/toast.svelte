<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Toast title @values title */
    title,
    /** Toast message @values description */
    description,
    /** Toast type @values 'info', 'success', 'warning', 'error', 'loading' */
    type = 'info',
    /** Auto-dismiss time (ms) @values 0, 5000, 10000 */
    duration = 5000,
    /** Screen position @values 'bottom-right' */
    position = 'bottom-right',
    /** Action button config */
    action,
    /** Show close button */
    closable = true,
    children,
  }: {
    /** Toast title */
    title: Str;
    /** Toast message */
    description: Str;
    /** Toast type */
    type?: Str;
    /** Auto-dismiss time (ms) */
    duration?: Num;
    /** Screen position */
    position?: Str;
    /** Action button config */
    action: Record<Str, unknown>;
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
