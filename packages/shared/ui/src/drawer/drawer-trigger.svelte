<script lang="ts">
  /**
   * Drawer trigger — element that opens the surrounding
   * `Drawer.Root`. Wraps vaul-svelte's `Drawer.Trigger` with
   * our `data-slot` convention.
   *
   * @module
   */

  import { Drawer as DrawerPrimitive } from 'vaul-svelte';

  let { ref = $bindable(null), ...restProps }: DrawerPrimitive.TriggerProps = $props();
</script>

<DrawerPrimitive.Trigger bind:ref data-slot="drawer-trigger" {...restProps} />
