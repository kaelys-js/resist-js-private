<script lang="ts">
  /**
   * Drawer portal — re-export of vaul-svelte's `Drawer.Portal`
   * so drawer content can be teleported to the document body,
   * escaping any clipped / stacking-context ancestors.
   *
   * @module
   */

  import { Drawer as DrawerPrimitive } from 'vaul-svelte';

  let { ...restProps }: DrawerPrimitive.PortalProps = $props();
</script>

<DrawerPrimitive.Portal {...restProps} />
