<script lang="ts">
  /**
   * Drawer close — element that closes the surrounding
   * `Drawer.Root`. Wraps vaul-svelte's `Drawer.Close` with our
   * `data-slot` convention.
   *
   * @module
   */

  import { Drawer as DrawerPrimitive } from 'vaul-svelte';

  let { ref = $bindable(null), ...restProps }: DrawerPrimitive.CloseProps = $props();
</script>

<DrawerPrimitive.Close bind:ref data-slot="drawer-close" {...restProps} />
