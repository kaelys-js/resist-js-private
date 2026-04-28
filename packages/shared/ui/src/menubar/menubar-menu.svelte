<script lang="ts">
  /**
   * Menubar.Menu — single menu within the Menubar root
   * (e.g. File, Edit). @module
   */
  import { Menubar as MenubarPrimitive } from 'bits-ui';

  let { ...restProps }: MenubarPrimitive.MenuProps = $props();
</script>

<MenubarPrimitive.Menu {...restProps} />
