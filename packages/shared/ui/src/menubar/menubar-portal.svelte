<script lang="ts">
  /**
   * Menubar.Portal — portal mount for Menubar floating
   * content. @module
   */
  import { Menubar as MenubarPrimitive } from 'bits-ui';

  let { ...restProps }: MenubarPrimitive.PortalProps = $props();
</script>

<MenubarPrimitive.Portal {...restProps} />
