<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Tour step definitions (target, title, content) */
    steps,
    /** Controlled visibility */
    open,
    /** Current step index @values 0, 0, 10 */
    current = 0,
    /** Dim non-highlighted areas */
    mask = true,
    /** Show pointer arrow */
    arrow = true,
    /** Visual style @values 'default', 'primary' */
    type = 'default',
    /** Popover placement @values 'bottom' */
    placement = 'bottom',
    /** Padding around highlighted element */
    gap,
    /** Scroll behavior */
    scrollIntoViewOptions,
    children,
  }: {
    /** Tour step definitions (target, title, content) */
    steps: Str[];
    /** Controlled visibility */
    open: Bool;
    /** Current step index */
    current?: Num;
    /** Dim non-highlighted areas */
    mask?: Bool;
    /** Show pointer arrow */
    arrow?: Bool;
    /** Visual style */
    type?: Str;
    /** Popover placement */
    placement?: Str;
    /** Padding around highlighted element */
    gap: Record<Str, unknown>;
    /** Scroll behavior */
    scrollIntoViewOptions: Record<Str, unknown>;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
