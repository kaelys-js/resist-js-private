<!-- @convert-to-lens -->
<script lang="ts">
  /**
   * Drawer root — bottom-sheet / side drawer surface backed by
   * vaul-svelte. Wraps `Drawer.Root` with bindable `open` and
   * `activeSnapPoint` props plus the `shouldScaleBackground`
   * option.
   *
   * @module
   */

  import { Drawer as DrawerPrimitive } from 'vaul-svelte';

  let {
    /** Whether to scale the background when the drawer opens. */
    shouldScaleBackground = true,
    /** Whether the drawer is open. */
    open = $bindable(false),
    /** The currently active snap point for drawer positioning. */
    activeSnapPoint = $bindable(null),
    ...restProps
  }: DrawerPrimitive.RootProps = $props();
</script>

<DrawerPrimitive.Root {shouldScaleBackground} bind:open bind:activeSnapPoint {...restProps} />
