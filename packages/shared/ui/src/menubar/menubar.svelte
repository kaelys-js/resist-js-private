<!-- @convert-to-lens -->
<script lang="ts">
  /**
   * Menubar — application menu bar root composing menus
   * (File / Edit / View). Wraps Bits UI's `Menubar` primitive.
   *
   * @module
   */
  import { Menubar as MenubarPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: MenubarPrimitive.RootProps = $props();
</script>

<MenubarPrimitive.Root
  bind:ref
  data-slot="menubar"
  class={cn('bg-background flex h-9 items-center gap-1 rounded-md border p-1 shadow-xs', className)}
  {...restProps}
/>
