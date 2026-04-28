<script lang="ts">
  /**
   * Drawer nested — wrapper for nested drawer-within-drawer.
   * Wraps vaul-svelte's `Drawer.NestedRoot` with bindable
   * `open` and `activeSnapPoint`.
   *
   * @module
   */

  import { Drawer as DrawerPrimitive } from 'vaul-svelte';

  let {
    /** Whether to scale the background when the drawer opens. */
    shouldScaleBackground = true,
    /** Whether the nested drawer is open. */
    open = $bindable(false),
    /** The currently active snap point for drawer positioning. */
    activeSnapPoint = $bindable(null),
    ...restProps
  }: DrawerPrimitive.RootProps = $props();
</script>

<DrawerPrimitive.NestedRoot {shouldScaleBackground} bind:open bind:activeSnapPoint {...restProps} />
