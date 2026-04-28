<script lang="ts">
  /**
   * Drawer description — supporting body copy beneath the
   * drawer title. Wraps vaul-svelte's `Drawer.Description` with
   * muted-foreground / small-text styling.
   *
   * @module
   */

  import { Drawer as DrawerPrimitive } from 'vaul-svelte';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: DrawerPrimitive.DescriptionProps = $props();
</script>

<DrawerPrimitive.Description
  bind:ref
  data-slot="drawer-description"
  class={cn('text-muted-foreground text-sm', className)}
  {...restProps}
/>
