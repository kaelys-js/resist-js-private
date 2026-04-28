<script lang="ts">
  /**
   * Drawer title — heading at the top of the drawer content.
   * Wraps vaul-svelte's `Drawer.Title` with semibold styling.
   *
   * @module
   */

  import { Drawer as DrawerPrimitive } from 'vaul-svelte';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: DrawerPrimitive.TitleProps = $props();
</script>

<DrawerPrimitive.Title
  bind:ref
  data-slot="drawer-title"
  class={cn('text-foreground font-semibold', className)}
  {...restProps}
/>
