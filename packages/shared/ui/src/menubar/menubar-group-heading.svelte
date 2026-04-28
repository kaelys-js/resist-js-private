<script lang="ts">
  /**
   * Menubar.GroupHeading — non-interactive label above a
   * `Menubar.Group`. @module
   */
  import { Menubar as MenubarPrimitive } from 'bits-ui';
  import type { ComponentProps } from 'svelte';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    /** Whether to inset the heading for icon alignment. */
    inset,
    class: className,
    ...restProps
  }: ComponentProps<typeof MenubarPrimitive.GroupHeading> & {
    inset?: boolean;
  } = $props();
</script>

<MenubarPrimitive.GroupHeading
  bind:ref
  data-slot="menubar-group-heading"
  data-inset={inset}
  class={cn('px-2 py-1.5 text-sm font-medium data-[inset]:ps-8', className)}
  {...restProps}
/>
