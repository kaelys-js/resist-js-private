<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Menu items (icon, label, command) */
    model,
    /** Expansion direction @values 'up', 'down', 'left', 'right' */
    direction = 'up',
    /** Layout pattern @values 'linear', 'circle', 'semi-circle', 'quarter-circle' */
    type = 'linear',
    /** Circle radius @values 0, 0, 10 */
    radius = 0,
    /** Show backdrop mask */
    mask = false,
    /** Disabled state */
    disabled = false,
    /** Controlled visibility */
    visible = false,
    /** Icon when closed @values showIcon */
    showIcon,
    /** Icon when open @values hideIcon */
    hideIcon,
    /** Stagger delay per item (ms) @values 0, 30, 60 */
    transitionDelay = 30,
    children,
  }: {
    /** Menu items (icon, label, command) */
    model: Str[];
    /** Expansion direction */
    direction?: Str;
    /** Layout pattern */
    type?: Str;
    /** Circle radius */
    radius?: Num;
    /** Show backdrop mask */
    mask?: Bool;
    /** Disabled state */
    disabled?: Bool;
    /** Controlled visibility */
    visible?: Bool;
    /** Icon when closed */
    showIcon: Str;
    /** Icon when open */
    hideIcon: Str;
    /** Stagger delay per item (ms) */
    transitionDelay?: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
