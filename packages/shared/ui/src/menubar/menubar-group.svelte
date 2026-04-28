<script lang="ts">
  /**
   * Menubar.Group — semantic wrapper for related menu items.
   * @module
   */
  import { Menubar as MenubarPrimitive } from 'bits-ui';

  let {
    ref = $bindable(null),
    ...restProps
  }: MenubarPrimitive.GroupProps & {
    inset?: boolean;
  } = $props();
</script>

<MenubarPrimitive.Group bind:ref data-slot="menubar-group" {...restProps} />
